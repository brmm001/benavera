// src/app/api/proposta/[token]/konsiga/refresh-link/route.ts
// Permite ao paciente consultar sob demanda o status e o link de assinatura na Konsiga (com cooldown anti-abuso)

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { PartnerHttpError } from '@/lib/partners/http';
import { syncPartnerStatus } from '@/lib/partners/hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REFRESH_COOLDOWN_MS = 15_000;
const lastRefreshByApp = new Map<string, number>();

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const tokenRows = await sql`
      SELECT pt.application_id
      FROM proposal_tokens pt
      WHERE pt.token = ${token}
        AND pt.revogado = false
        AND pt.expires_at > NOW()
      LIMIT 1
    `;
    if (!tokenRows[0]) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }

    const applicationId = String(tokenRows[0].application_id);
    const now = Date.now();
    const prev = lastRefreshByApp.get(applicationId) ?? 0;
    if (now - prev < REFRESH_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Aguarde alguns segundos antes de consultar novamente.' },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    lastRefreshByApp.set(applicationId, now);
    if (lastRefreshByApp.size > 1000) {
      for (const [k, ts] of lastRefreshByApp) {
        if (now - ts > REFRESH_COOLDOWN_MS * 4) lastRefreshByApp.delete(k);
      }
    }

    const synced = await syncPartnerStatus(applicationId, 'konsiga');
    if (!synced.success) {
      return NextResponse.json(
        { error: synced.error || 'Não foi possível consultar o status na Konsiga.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        externalStatus: synced.externalStatus || null,
        externalStep: synced.externalStep || null,
        signingUrl: synced.signingUrl || null,
        appStatus: synced.appStatus || null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[Proposta Konsiga Refresh]', err instanceof Error ? err.message : 'erro');
    const safeMsg =
      err instanceof PartnerHttpError && err.status >= 400 && err.status < 500
        ? err.message
        : 'Não foi possível consultar o status agora. Tente novamente em instantes.';
    return NextResponse.json(
      { error: safeMsg },
      { status: err instanceof PartnerHttpError && err.status < 500 ? err.status : 500 }
    );
  }
}
