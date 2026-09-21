// lib/onboarding-tokens.ts
// Geração e validação de tokens de convite para credenciamento
// SEGURANÇA: O token nunca é armazenado em texto puro. Apenas seu hash SHA-256.

import { createHash, randomBytes } from 'crypto';
import { sql } from './benavera-db';
import { logAuditEvent } from './onboarding-audit';

const TOKEN_EXPIRY_DAYS = 7;
const TOKEN_BYTES = 48; // 96 chars hex — imprevisível e longo

// ── Gerar token seguro ───────────────────────────────────────────────────────
export function generateSecureToken(): { token: string; hash: string; prefix: string } {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  const prefix = token.substring(0, 8); // Apenas para lookup, não é secreto
  return { token, hash, prefix };
}

// ── Hashear token existente ──────────────────────────────────────────────────
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ── Criar convite no banco ────────────────────────────────────────────────────
export async function createInvite(params: {
  onboardingId: string;
  createdBy: string;
  expiryDays?: number;
}): Promise<{ token: string; inviteId: string; expiresAt: Date }> {
  const { token, hash, prefix } = generateSecureToken();
  const expiryDays = params.expiryDays ?? TOKEN_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const safeCreatedBy = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.createdBy)
    ? params.createdBy
    : 'a1000001-0001-4001-a001-000000000001';

  const rows = await sql`
    INSERT INTO onboarding_invites (
      onboarding_id, token_hash, token_prefix, expires_at, created_by
    ) VALUES (
      ${params.onboardingId}, ${hash}, ${prefix},
      ${expiresAt.toISOString()}, ${safeCreatedBy}
    )
    RETURNING id
  `;

  const inviteId = String(rows[0].id);

  await logAuditEvent({
    onboardingId: params.onboardingId,
    actorType: 'admin',
    actorId: params.createdBy,
    action: 'invite_created',
    entityType: 'invite',
    entityId: inviteId,
    metadata: { expires_at: expiresAt.toISOString(), expiry_days: expiryDays },
  });

  return { token, inviteId, expiresAt };
}

// ── Validar token de convite ──────────────────────────────────────────────────
export interface TokenValidationResult {
  valid: boolean;
  invite?: {
    id: string;
    onboardingId: string;
    expiresAt: Date;
    openedAt: Date | null;
    sessionCount: number;
  };
  error?: 'not_found' | 'expired' | 'revoked';
}

export async function validateInviteToken(token: string): Promise<TokenValidationResult> {
  // Proteção: token deve ter comprimento mínimo esperado
  if (!token || token.length < 16) {
    return { valid: false, error: 'not_found' };
  }

  const hash = hashToken(token);

  const rows = await sql`
    SELECT id, onboarding_id, expires_at, opened_at, revoked_at, session_count
    FROM onboarding_invites
    WHERE token_hash = ${hash}
    LIMIT 1
  `;

  if (!rows[0]) {
    return { valid: false, error: 'not_found' };
  }

  const invite = rows[0];

  if (invite.revoked_at) {
    return { valid: false, error: 'revoked' };
  }

  if (new Date(String(invite.expires_at)) < new Date()) {
    return { valid: false, error: 'expired' };
  }

  return {
    valid: true,
    invite: {
      id: String(invite.id),
      onboardingId: String(invite.onboarding_id),
      expiresAt: new Date(String(invite.expires_at)),
      openedAt: invite.opened_at ? new Date(String(invite.opened_at)) : null,
      sessionCount: Number(invite.session_count),
    },
  };
}

// ── Registrar abertura do link ────────────────────────────────────────────────
export async function recordInviteOpened(
  inviteId: string,
  onboardingId: string,
  ip: string,
  userAgent: string
): Promise<void> {
  await sql`
    UPDATE onboarding_invites
    SET
      opened_at = COALESCE(opened_at, NOW()),
      last_seen_at = NOW()
    WHERE id = ${inviteId}
  `;

  await logAuditEvent({
    onboardingId,
    actorType: 'clinic',
    actorId: 'clinic_session',
    action: 'invite_opened',
    entityType: 'invite',
    entityId: inviteId,
    ip,
    userAgent,
  });
}

// ── Registrar sessão validada (OTP OK) ───────────────────────────────────────
export async function recordSessionValidated(inviteId: string): Promise<void> {
  await sql`
    UPDATE onboarding_invites
    SET session_count = session_count + 1, last_seen_at = NOW()
    WHERE id = ${inviteId}
  `;
}

// ── Revogar convite ───────────────────────────────────────────────────────────
export async function revokeInvite(
  inviteId: string,
  revokedBy: string,
  onboardingId: string
): Promise<void> {
  await sql`
    UPDATE onboarding_invites
    SET revoked_at = NOW(), revoked_by = ${revokedBy}
    WHERE id = ${inviteId} AND revoked_at IS NULL
  `;

  await logAuditEvent({
    onboardingId,
    actorType: 'admin',
    actorId: revokedBy,
    action: 'invite_revoked',
    entityType: 'invite',
    entityId: inviteId,
  });
}

// ── Revogar todos os convites ativos de um onboarding ────────────────────────
export async function revokeAllInvites(
  onboardingId: string,
  revokedBy: string
): Promise<void> {
  const safeRevokedBy = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(revokedBy)
    ? revokedBy
    : 'a1000001-0001-4001-a001-000000000001';

  await sql`
    UPDATE onboarding_invites
    SET revoked_at = NOW(), revoked_by = ${safeRevokedBy}
    WHERE onboarding_id = ${onboardingId} AND revoked_at IS NULL
  `;
}

// ── Buscar convite ativo de um onboarding ─────────────────────────────────────
export async function getActiveInvite(onboardingId: string): Promise<{
  id: string;
  expiresAt: Date;
  openedAt: Date | null;
  sessionCount: number;
} | null> {
  const rows = await sql`
    SELECT id, expires_at, opened_at, session_count
    FROM onboarding_invites
    WHERE onboarding_id = ${onboardingId}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!rows[0]) return null;

  return {
    id: String(rows[0].id),
    expiresAt: new Date(String(rows[0].expires_at)),
    openedAt: rows[0].opened_at ? new Date(String(rows[0].opened_at)) : null,
    sessionCount: Number(rows[0].session_count),
  };
}
