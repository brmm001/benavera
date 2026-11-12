import { getNeonClient } from '@/lib/neon';
import { cookies } from 'next/headers';
import type { Touch } from '@/lib/acquisition';

let ready: Promise<void> | undefined;
export async function ensureAcquisitionSchema() {
  const db = getNeonClient();
  if (!db) throw new Error('Acquisition database is unavailable');
  if (!ready) ready = (async () => {
    await db`CREATE TABLE IF NOT EXISTS bv_web_visitors (id UUID PRIMARY KEY, first_touch JSONB NOT NULL, last_touch JSONB NOT NULL, last_non_direct JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await db`CREATE TABLE IF NOT EXISTS bv_web_sessions (id UUID PRIMARY KEY, visitor_id UUID NOT NULL REFERENCES bv_web_visitors(id), touch JSONB NOT NULL, started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await db`CREATE TABLE IF NOT EXISTS bv_web_events (id BIGSERIAL PRIMARY KEY, session_id UUID NOT NULL REFERENCES bv_web_sessions(id), event_name TEXT NOT NULL, page_path TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await db`CREATE INDEX IF NOT EXISTS bv_web_events_date_idx ON bv_web_events(created_at, event_name)`;
    await db`CREATE INDEX IF NOT EXISTS bv_web_sessions_date_idx ON bv_web_sessions(started_at)`;
    await db`CREATE TABLE IF NOT EXISTS bv_lead_attribution (entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, session_id UUID NOT NULL REFERENCES bv_web_sessions(id), first_touch JSONB NOT NULL, last_touch JSONB NOT NULL, attributed_touch JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(entity_type, entity_id))`;
    await db`CREATE INDEX IF NOT EXISTS bv_lead_attribution_date_idx ON bv_lead_attribution(created_at)`;
    await db`CREATE TABLE IF NOT EXISTS bv_geo_observations (id BIGSERIAL PRIMARY KEY, engine TEXT NOT NULL, prompt TEXT NOT NULL, benavera_mentioned BOOLEAN NOT NULL, capim_mentioned BOOLEAN NOT NULL, source_url TEXT NOT NULL DEFAULT '', observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  })().catch(error => { ready = undefined; throw error; });
  await ready;
  return db;
}
export function validId(value?: string) { return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export async function startVisit(visitorId: string, sessionId: string, touch: Touch, newSession = true) {
  const db = await ensureAcquisitionSchema();
  const direct = touch.channel === 'Direto / não identificado';
  await db`INSERT INTO bv_web_visitors(id, first_touch, last_touch, last_non_direct)
    VALUES (${visitorId}::uuid, ${JSON.stringify(touch)}::jsonb, ${JSON.stringify(touch)}::jsonb, ${JSON.stringify(touch)}::jsonb)
    ON CONFLICT(id) DO UPDATE SET last_touch = CASE WHEN NOT ${direct} OR ${newSession} THEN EXCLUDED.last_touch ELSE bv_web_visitors.last_touch END,
      last_non_direct = CASE WHEN ${direct} THEN bv_web_visitors.last_non_direct ELSE EXCLUDED.last_non_direct END, updated_at = NOW()`;
  await db`INSERT INTO bv_web_sessions(id, visitor_id, touch) VALUES (${sessionId}::uuid, ${visitorId}::uuid, ${JSON.stringify(touch)}::jsonb)
    ON CONFLICT(id) DO UPDATE SET last_seen_at = NOW()`;
  await db`INSERT INTO bv_web_events(session_id, event_name, page_path) VALUES (${sessionId}::uuid, 'page_view', ${touch.landing})`;
}

// Called only after a successful server-side lead or clinic creation. Never trust IDs posted by the browser.
export async function attachAttribution(entityType: 'clinic_lead' | 'patient_lead' | 'clinic' | 'simulator_lead', entityId: string) {
  try {
    const jar = await cookies();
    if (!['analytics', 'all'].includes(jar.get('bv_consent')?.value || '')) return;
    const sid = jar.get('bv_sid')?.value;
    if (!validId(sid)) return;
    const db = await ensureAcquisitionSchema();
    await db`INSERT INTO bv_lead_attribution(entity_type, entity_id, session_id, first_touch, last_touch, attributed_touch)
      SELECT ${entityType}, ${entityId}, s.id, v.first_touch, v.last_touch, v.last_non_direct
      FROM bv_web_sessions s JOIN bv_web_visitors v ON v.id = s.visitor_id
      WHERE s.id = ${sid}::uuid AND s.last_seen_at > NOW() - INTERVAL '30 minutes'
      ON CONFLICT(entity_type, entity_id) DO NOTHING`;
  } catch { console.warn('[Acquisition] Attribution unavailable; primary operation preserved.'); }
}

export async function getAcquisitionReport(days: number) {
  const db = await ensureAcquisitionSchema();
  const [channels, events, campaigns, funnel, geo] = await Promise.all([
    db`SELECT touch->>'channel' AS channel, COUNT(*)::int AS sessions, COUNT(DISTINCT visitor_id)::int AS visitors
      FROM bv_web_sessions WHERE started_at >= NOW() - ${days} * INTERVAL '1 day' GROUP BY 1 ORDER BY sessions DESC`,
    db`SELECT event_name, COUNT(*)::int AS total FROM bv_web_events WHERE created_at >= NOW() - ${days} * INTERVAL '1 day' GROUP BY 1 ORDER BY total DESC`,
    db`SELECT touch->>'source' AS source, touch->>'campaign' AS campaign, touch->>'landing' AS landing, COUNT(*)::int AS sessions
      FROM bv_web_sessions WHERE started_at >= NOW() - ${days} * INTERVAL '1 day' GROUP BY 1,2,3 ORDER BY sessions DESC LIMIT 100`,
    db`WITH business AS (SELECT clinic_id::text AS clinic_id, COUNT(*) FILTER(WHERE status IN ('PAYOUT_COMPLETED', 'TREATMENT_RELEASED'))::int AS financed,
      COALESCE(SUM(valor_tratamento) FILTER(WHERE status IN ('PAYOUT_COMPLETED', 'TREATMENT_RELEASED')),0) AS volume FROM applications GROUP BY clinic_id)
      SELECT a.attributed_touch->>'channel' AS channel,
      COUNT(*) FILTER(WHERE a.entity_type IN ('clinic_lead','patient_lead','simulator_lead'))::int AS leads,
      COUNT(*) FILTER(WHERE a.entity_type='clinic')::int AS registrations,
      COUNT(*) FILTER(WHERE a.entity_type='clinic' AND c.ativo)::int AS active_clinics,
      COALESCE(SUM(b.financed) FILTER(WHERE a.entity_type='clinic'),0)::int AS financed,
      COALESCE(SUM(b.volume) FILTER(WHERE a.entity_type='clinic'),0) AS volume
      FROM bv_lead_attribution a LEFT JOIN clinics c ON a.entity_type='clinic' AND c.id::text=a.entity_id
      LEFT JOIN business b ON a.entity_type='clinic' AND b.clinic_id=a.entity_id
      WHERE a.created_at >= NOW() - ${days} * INTERVAL '1 day' GROUP BY 1 ORDER BY leads DESC`,
    db`SELECT id, engine, prompt, benavera_mentioned, capim_mentioned, source_url, observed_at FROM bv_geo_observations ORDER BY observed_at DESC LIMIT 100`,
  ]);
  return { channels, events, campaigns, funnel, geo };
}
