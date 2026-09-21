// lib/onboarding-audit.ts
// Serviço de auditoria para o módulo de credenciamento — append-only

import { sql } from './benavera-db';
import type { SessionPayload } from './auth';

// ── Ações de auditoria ────────────────────────────────────────────────────────
export type AuditAction =
  | 'onboarding_created'
  | 'onboarding_updated'
  | 'onboarding_status_changed'
  | 'invite_created'
  | 'invite_sent'
  | 'invite_opened'
  | 'invite_revoked'
  | 'otp_sent'
  | 'otp_validated'
  | 'otp_failed'
  | 'otp_max_attempts_reached'
  | 'field_changed_critical'
  | 'document_uploaded'
  | 'document_replaced'
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_validated'
  | 'document_correction_requested'
  | 'document_rejected'
  | 'onboarding_submitted'
  | 'onboarding_approved'
  | 'onboarding_rejected'
  | 'correction_requested'
  | 'contract_generated'
  | 'contract_signed'
  | 'clinic_activated'
  | 'clinic_suspended'
  | 'session_started'
  | 'session_expired';

export interface AuditEventParams {
  onboardingId?: string;
  actorType: 'admin' | 'clinic' | 'system';
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

// ── Registrar evento de auditoria ─────────────────────────────────────────────
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    await sql`
      INSERT INTO onboarding_audit_logs (
        onboarding_id, actor_type, actor_id, actor_name, actor_role,
        action, entity_type, entity_id, metadata, ip, user_agent
      ) VALUES (
        ${params.onboardingId || null},
        ${params.actorType},
        ${params.actorId || null},
        ${params.actorName || null},
        ${params.actorRole || null},
        ${params.action},
        ${params.entityType || null},
        ${params.entityId || null},
        ${params.metadata ? JSON.stringify(params.metadata) : null},
        ${params.ip || null},
        ${params.userAgent || null}
      )
    `;
  } catch (err) {
    // Auditoria nunca deve quebrar o fluxo principal — apenas loga o erro
    console.error('[AuditLog] Falha ao registrar evento:', params.action, err);
  }
}

// ── Helper para eventos de admin ─────────────────────────────────────────────
export function auditFromSession(
  session: SessionPayload,
  ip?: string,
  userAgent?: string
): Pick<AuditEventParams, 'actorType' | 'actorId' | 'actorName' | 'actorRole' | 'ip' | 'userAgent'> {
  return {
    actorType: 'admin',
    actorId: session.userId,
    actorName: session.name,
    actorRole: session.role,
    ip,
    userAgent,
  };
}

// ── Buscar logs de auditoria ──────────────────────────────────────────────────
export async function getAuditLogs(
  onboardingId: string,
  options?: { limit?: number; action?: AuditAction }
): Promise<Array<{
  id: string;
  actor_type: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}>> {
  const limit = options?.limit || 100;
  const action = options?.action;

  const rows = action
    ? await sql`
        SELECT id, actor_type, actor_name, actor_role, action,
               entity_type, metadata, ip, created_at
        FROM onboarding_audit_logs
        WHERE onboarding_id = ${onboardingId} AND action = ${action}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT id, actor_type, actor_name, actor_role, action,
               entity_type, metadata, ip, created_at
        FROM onboarding_audit_logs
        WHERE onboarding_id = ${onboardingId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

  return rows.map(r => ({
    id: String(r.id),
    actor_type: String(r.actor_type),
    actor_name: r.actor_name ? String(r.actor_name) : null,
    actor_role: r.actor_role ? String(r.actor_role) : null,
    action: String(r.action),
    entity_type: r.entity_type ? String(r.entity_type) : null,
    metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) as Record<string, unknown> : null,
    ip: r.ip ? String(r.ip) : null,
    created_at: String(r.created_at),
  }));
}
