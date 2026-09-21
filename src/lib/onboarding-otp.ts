// lib/onboarding-otp.ts
// Sistema OTP para verificação de identidade antes do credenciamento
// SEGURANÇA: OTP armazenado como hash bcrypt, nunca em texto puro.

import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { sql } from './benavera-db';
import { maskPII } from './security';
import { logAuditEvent } from './onboarding-audit';
import { checkRateLimit } from './rateLimit';

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_BCRYPT_ROUNDS = 10;
// Rate limit: no máximo 3 OTPs gerados por hora por invite
const OTP_GENERATION_LIMIT = 3;
const OTP_GENERATION_WINDOW_MS = 60 * 60 * 1000;

// ── Gerar OTP de 6 dígitos ────────────────────────────────────────────────────
function generateOTPCode(): string {
  const code = randomInt(0, 1000000);
  return code.toString().padStart(6, '0');
}

// ── Criar novo OTP ────────────────────────────────────────────────────────────
export async function createOTP(params: {
  inviteId: string;
  onboardingId: string;
  ip: string;
  userAgent: string;
}): Promise<{ success: boolean; error?: string; maskedEmail?: string; maskedPhone?: string }> {
  // Rate limit por invite
  const rateLimitKey = `otp_gen_${params.inviteId}`;
  const rl = checkRateLimit(rateLimitKey, OTP_GENERATION_LIMIT, OTP_GENERATION_WINDOW_MS);
  if (!rl.allowed) {
    return { success: false, error: `Muitas tentativas. Tente novamente em ${rl.resetInSeconds}s.` };
  }

  // Buscar dados da clínica para mascarar contato
  const onboardingRows = await sql`
    SELECT email, phone FROM clinic_onboardings WHERE id = ${params.onboardingId} LIMIT 1
  `;
  if (!onboardingRows[0]) {
    return { success: false, error: 'Credenciamento não encontrado.' };
  }

  const email = String(onboardingRows[0].email);
  const phone = String(onboardingRows[0].phone);

  // Invalidar OTPs anteriores do mesmo invite
  await sql`
    UPDATE onboarding_otp_attempts
    SET invalidated_at = NOW()
    WHERE invite_id = ${params.inviteId} AND invalidated_at IS NULL AND validated_at IS NULL
  `;

  // Gerar e hashear o OTP
  const code = generateOTPCode();
  const hash = await bcrypt.hash(code, OTP_BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await sql`
    INSERT INTO onboarding_otp_attempts (
      invite_id, otp_hash, expires_at, max_attempts, ip, user_agent
    ) VALUES (
      ${params.inviteId}, ${hash}, ${expiresAt.toISOString()},
      ${OTP_MAX_ATTEMPTS}, ${params.ip}, ${params.userAgent}
    )
  `;

  await logAuditEvent({
    onboardingId: params.onboardingId,
    actorType: 'system',
    action: 'otp_sent',
    entityType: 'invite',
    entityId: params.inviteId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: { masked_email: maskPII(email) },
  });

  return {
    success: true,
    maskedEmail: maskPII(email),
    maskedPhone: maskPII(phone),
    // Retornamos o código APENAS em dev para testes — NUNCA em produção
    ...(process.env.NODE_ENV === 'development' ? { devCode: code } : {}),
  } as { success: boolean; maskedEmail: string; maskedPhone: string };
}

// ── Enviar OTP por e-mail (delega para email.ts) ───────────────────────────────
export async function sendOTPByEmail(params: {
  to: string;
  clinicName: string;
  code: string;
}): Promise<void> {
  // Import dinâmico para evitar dependência circular
  const { sendOTPEmail } = await import('./email');
  await sendOTPEmail({ to: params.to, clinicName: params.clinicName, code: params.code });
}

// ── Verificar OTP ─────────────────────────────────────────────────────────────
export interface OTPVerifyResult {
  valid: boolean;
  error?: 'not_found' | 'expired' | 'max_attempts' | 'invalid';
  attemptsLeft?: number;
}

export async function verifyOTP(params: {
  inviteId: string;
  onboardingId: string;
  code: string;
  ip: string;
  userAgent: string;
}): Promise<OTPVerifyResult> {
  // Rate limit por IP para brute force
  const rl = checkRateLimit(`otp_verify_${params.ip}`, 20, 60 * 1000);
  if (!rl.allowed) {
    return { valid: false, error: 'max_attempts' };
  }

  // Buscar OTP ativo mais recente para este invite
  const rows = await sql`
    SELECT id, otp_hash, expires_at, attempts, max_attempts, validated_at, invalidated_at
    FROM onboarding_otp_attempts
    WHERE invite_id = ${params.inviteId}
      AND invalidated_at IS NULL
      AND validated_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (!rows[0]) {
    return { valid: false, error: 'not_found' };
  }

  const attempt = rows[0];
  const attemptId = String(attempt.id);

  // Verificar expiração
  if (new Date(String(attempt.expires_at)) < new Date()) {
    return { valid: false, error: 'expired' };
  }

  // Verificar máximo de tentativas
  if (Number(attempt.attempts) >= Number(attempt.max_attempts)) {
    await logAuditEvent({
      onboardingId: params.onboardingId,
      actorType: 'clinic',
      action: 'otp_max_attempts_reached',
      entityType: 'invite',
      entityId: params.inviteId,
      ip: params.ip,
    });
    return { valid: false, error: 'max_attempts' };
  }

  // Incrementar tentativa ANTES de verificar (previne timing attacks)
  await sql`
    UPDATE onboarding_otp_attempts
    SET attempts = attempts + 1
    WHERE id = ${attemptId}
  `;

  const newAttempts = Number(attempt.attempts) + 1;

  // Verificar código
  const codeMatch = await bcrypt.compare(params.code, String(attempt.otp_hash));
  if (!codeMatch) {
    await logAuditEvent({
      onboardingId: params.onboardingId,
      actorType: 'clinic',
      action: 'otp_failed',
      entityType: 'invite',
      entityId: params.inviteId,
      ip: params.ip,
      metadata: { attempts: newAttempts, max_attempts: Number(attempt.max_attempts) },
    });
    return {
      valid: false,
      error: 'invalid',
      attemptsLeft: Number(attempt.max_attempts) - newAttempts,
    };
  }

  // OTP válido — marcar como usado (replay protection)
  await sql`
    UPDATE onboarding_otp_attempts
    SET validated_at = NOW(), invalidated_at = NOW()
    WHERE id = ${attemptId}
  `;

  await logAuditEvent({
    onboardingId: params.onboardingId,
    actorType: 'clinic',
    action: 'otp_validated',
    entityType: 'invite',
    entityId: params.inviteId,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  return { valid: true };
}
