// src/lib/email-engine.ts
// Motor centralizado de envio de e-mails via Resend com:
// - Auditoria completa na tabela `email_logs`
// - Deduplicação por `dedupe_key` (seguro contra reexecução de crons/webhooks)
// - Configurações dinâmicas em `email_settings`
// - Verificação criptográfica de webhooks do Resend (Svix HMAC-SHA256)
// - Suporte a `RESEND_API_BASE` para testes E2E isolados com servidor mock

import { createHmac, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { sql } from './benavera-db';

export type EmailRecipientType = 'CLINIC' | 'REPRESENTANTE' | 'ATENDENTE' | 'ADMIN' | 'PATIENT' | 'TEST';
export type EmailCategory =
  | 'REPORT'
  | 'BILLING'
  | 'PAYOUT'
  | 'COMMISSION'
  | 'FINANCING'
  | 'CREDENTIAL'
  | 'ALERT'
  | 'ONBOARDING'
  | 'TEST';

export interface EmailDispatchResult {
  sent: boolean;
  simulated: boolean;
  skipped?: boolean;
  skipReason?: string;
  id?: string;
  logId?: string;
  error?: string;
}

export interface EmailSettings {
  admin_alert_emails: string[];
  reply_to_email: string | null;
  enable_clinic_weekly_report: boolean;
  enable_clinic_monthly_report: boolean;
  enable_rep_weekly_report: boolean;
  enable_rep_monthly_report: boolean;
  enable_atendente_weekly_report: boolean;
  enable_atendente_monthly_report: boolean;
  enable_admin_daily_summary: boolean;
  enable_billing_reminders: boolean;
  enable_patient_emails: boolean;
  enable_financing_emails: boolean;
  enable_payout_emails: boolean;
  enable_commission_emails: boolean;
  updated_by: string | null;
  updated_at: string | null;
}

const DEFAULT_SETTINGS: EmailSettings = {
  admin_alert_emails: [],
  reply_to_email: null,
  enable_clinic_weekly_report: true,
  enable_clinic_monthly_report: true,
  enable_rep_weekly_report: true,
  enable_rep_monthly_report: true,
  enable_atendente_weekly_report: true,
  enable_atendente_monthly_report: true,
  enable_admin_daily_summary: true,
  enable_billing_reminders: true,
  enable_patient_emails: true,
  enable_financing_emails: true,
  enable_payout_emails: true,
  enable_commission_emails: true,
  updated_by: null,
  updated_at: null,
};

export function isResendConfigured(): boolean {
  return Boolean((process.env.RESEND_API_KEY || '').trim());
}

export function getFromEmail(): string {
  const configured = (process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || '').trim();
  return configured || 'Benavera <noreply@benavera.com.br>';
}

export function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.benavera.com.br')
    .trim()
    .replace(/\/$/, '');
}

export function isValidEmailAddress(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  const s = email.trim().toLowerCase();
  return s.length >= 5 && s.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

// ── Configurações globais de e-mail (tabela `email_settings`) ────────────────

export async function getEmailSettings(): Promise<EmailSettings> {
  try {
    const rows = await sql`SELECT * FROM email_settings WHERE id = 'default' LIMIT 1`;
    const r = rows[0];
    if (!r) return { ...DEFAULT_SETTINGS };
    return {
      admin_alert_emails: Array.isArray(r.admin_alert_emails) ? (r.admin_alert_emails as string[]).filter(isValidEmailAddress) : [],
      reply_to_email: r.reply_to_email ? String(r.reply_to_email) : null,
      enable_clinic_weekly_report: r.enable_clinic_weekly_report !== false,
      enable_clinic_monthly_report: r.enable_clinic_monthly_report !== false,
      enable_rep_weekly_report: r.enable_rep_weekly_report !== false,
      enable_rep_monthly_report: r.enable_rep_monthly_report !== false,
      enable_atendente_weekly_report: r.enable_atendente_weekly_report !== false,
      enable_atendente_monthly_report: r.enable_atendente_monthly_report !== false,
      enable_admin_daily_summary: r.enable_admin_daily_summary !== false,
      enable_billing_reminders: r.enable_billing_reminders !== false,
      enable_patient_emails: r.enable_patient_emails !== false,
      enable_financing_emails: r.enable_financing_emails !== false,
      enable_payout_emails: r.enable_payout_emails !== false,
      enable_commission_emails: r.enable_commission_emails !== false,
      updated_by: r.updated_by ? String(r.updated_by) : null,
      updated_at: r.updated_at ? String(r.updated_at) : null,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateEmailSettings(
  patch: Partial<Omit<EmailSettings, 'updated_at' | 'updated_by'>>,
  actorName: string
): Promise<EmailSettings> {
  const cur = await getEmailSettings();
  const next: EmailSettings = {
    ...cur,
    ...patch,
    admin_alert_emails: patch.admin_alert_emails !== undefined
      ? Array.from(new Set(patch.admin_alert_emails.map(e => e.trim().toLowerCase()).filter(isValidEmailAddress)))
      : cur.admin_alert_emails,
    reply_to_email: patch.reply_to_email !== undefined
      ? (patch.reply_to_email && isValidEmailAddress(patch.reply_to_email) ? patch.reply_to_email.trim().toLowerCase() : null)
      : cur.reply_to_email,
    updated_by: actorName,
    updated_at: new Date().toISOString(),
  };

  await sql`
    INSERT INTO email_settings (
      id, admin_alert_emails, reply_to_email,
      enable_clinic_weekly_report, enable_clinic_monthly_report,
      enable_rep_weekly_report, enable_rep_monthly_report,
      enable_atendente_weekly_report, enable_atendente_monthly_report,
      enable_admin_daily_summary, enable_billing_reminders,
      enable_patient_emails, enable_financing_emails,
      enable_payout_emails, enable_commission_emails,
      updated_by, updated_at
    ) VALUES (
      'default', ${next.admin_alert_emails}, ${next.reply_to_email},
      ${next.enable_clinic_weekly_report}, ${next.enable_clinic_monthly_report},
      ${next.enable_rep_weekly_report}, ${next.enable_rep_monthly_report},
      ${next.enable_atendente_weekly_report}, ${next.enable_atendente_monthly_report},
      ${next.enable_admin_daily_summary}, ${next.enable_billing_reminders},
      ${next.enable_patient_emails}, ${next.enable_financing_emails},
      ${next.enable_payout_emails}, ${next.enable_commission_emails},
      ${actorName}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      admin_alert_emails = EXCLUDED.admin_alert_emails,
      reply_to_email = EXCLUDED.reply_to_email,
      enable_clinic_weekly_report = EXCLUDED.enable_clinic_weekly_report,
      enable_clinic_monthly_report = EXCLUDED.enable_clinic_monthly_report,
      enable_rep_weekly_report = EXCLUDED.enable_rep_weekly_report,
      enable_rep_monthly_report = EXCLUDED.enable_rep_monthly_report,
      enable_atendente_weekly_report = EXCLUDED.enable_atendente_weekly_report,
      enable_atendente_monthly_report = EXCLUDED.enable_atendente_monthly_report,
      enable_admin_daily_summary = EXCLUDED.enable_admin_daily_summary,
      enable_billing_reminders = EXCLUDED.enable_billing_reminders,
      enable_patient_emails = EXCLUDED.enable_patient_emails,
      enable_financing_emails = EXCLUDED.enable_financing_emails,
      enable_payout_emails = EXCLUDED.enable_payout_emails,
      enable_commission_emails = EXCLUDED.enable_commission_emails,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
  `;

  return next;
}

export async function resolveAdminAlertEmails(): Promise<string[]> {
  const settings = await getEmailSettings();
  if (settings.admin_alert_emails.length > 0) {
    return settings.admin_alert_emails;
  }
  const envList = (process.env.ADMIN_ALERT_EMAILS || process.env.ADMIN_ALERT_EMAIL || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(isValidEmailAddress);
  if (envList.length > 0) return Array.from(new Set(envList));

  try {
    const admins = await sql`
      SELECT email FROM users
      WHERE role = 'BENAVERA_ADMIN' AND ativo = TRUE AND email IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 5
    `;
    return Array.from(new Set(admins.map(a => String(a.email).trim().toLowerCase()).filter(isValidEmailAddress)));
  } catch {
    return [];
  }
}

// ── Transporte Resend (SDK em produção + HTTP direto quando RESEND_API_BASE estiver definido em testes) ──

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
  tags?: Array<{ name: string; value: string }>;
}): Promise<{ id?: string; simulated: boolean; error?: string }> {
  const key = (process.env.RESEND_API_KEY || '').trim();
  const from = getFromEmail();

  if (!key) {
    console.warn('[Email] RESEND_API_KEY não configurada. Envio simulado para:', params.to);
    return {
      id: 'simulated-email-id',
      simulated: true,
      error: 'RESEND_API_KEY não configurada no servidor (envio apenas simulado).',
    };
  }

  const customBase = (process.env.RESEND_API_BASE || '').trim().replace(/\/$/, '');
  if (customBase) {
    try {
      const payload: Record<string, unknown> = {
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      };
      if (params.replyTo) payload.reply_to = params.replyTo;
      if (params.tags && params.tags.length > 0) payload.tags = params.tags;

      const res = await fetch(`${customBase}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = text ? (JSON.parse(text) as Record<string, unknown>) : {}; } catch {}

      if (!res.ok) {
        return {
          simulated: false,
          error: String(data.message || data.error || `Resend HTTP ${res.status}`),
        };
      }
      return {
        id: data.id ? String(data.id) : undefined,
        simulated: false,
      };
    } catch (err) {
      return {
        simulated: false,
        error: err instanceof Error ? err.message : 'Erro de conexão ao Resend.',
      };
    }
  }

  try {
    const resend = new Resend(key);
    const res = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
      ...(params.tags && params.tags.length > 0 ? { tags: params.tags } : {}),
    });

    if (res.error) {
      return {
        simulated: false,
        error: res.error.message || res.error.name || 'Erro desconhecido no Resend.',
      };
    }
    return {
      id: res.data?.id,
      simulated: false,
    };
  } catch (err) {
    return {
      simulated: false,
      error: err instanceof Error ? err.message : 'Erro ao enviar e-mail.',
    };
  }
}

// ── Despachante unificado com log + deduplicação ─────────────────────────────

export interface DispatchEmailInput {
  to: string;
  recipientName?: string | null;
  recipientType: EmailRecipientType;
  recipientId?: string | null;
  category: EmailCategory;
  template: string;
  subject: string;
  html: string;
  dedupeKey?: string | null;
  redactBody?: boolean;
  skipLog?: boolean;
  metadata?: Record<string, unknown>;
  replyTo?: string | null;
}

export async function dispatchEmail(input: DispatchEmailInput): Promise<EmailDispatchResult> {
  const to = String(input.to || '').trim().toLowerCase();
  if (!isValidEmailAddress(to)) {
    return { sent: false, simulated: false, skipped: true, skipReason: 'invalid_email', error: 'E-mail de destino inválido.' };
  }

  // Deduplicação (impede envios repetidos em crons ou retries)
  if (input.dedupeKey) {
    try {
      const existing = await sql`
        SELECT id FROM email_logs
        WHERE dedupe_key = ${input.dedupeKey} AND status NOT IN ('FAILED', 'SKIPPED')
        LIMIT 1
      `;
      if (existing.length > 0) {
        return {
          sent: false,
          simulated: false,
          skipped: true,
          skipReason: 'duplicate',
          logId: String(existing[0].id),
        };
      }
    } catch {
      // Se falhar leitura do log, segue com envio para não bloquear transacional
    }
  }

  let replyTo = input.replyTo || (process.env.EMAIL_REPLY_TO || '').trim() || null;
  if (!replyTo) {
    try {
      const s = await getEmailSettings();
      replyTo = s.reply_to_email;
    } catch {}
  }

  const tags = [
    { name: 'category', value: input.category.toLowerCase().replace(/[^a-z0-9_-]/g, '_') },
    { name: 'recipient_type', value: input.recipientType.toLowerCase().replace(/[^a-z0-9_-]/g, '_') },
    { name: 'template', value: input.template.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 64) },
  ];

  const sendRes = await sendViaResend({
    to,
    subject: input.subject,
    html: input.html,
    replyTo,
    tags,
  });

  const status = sendRes.simulated ? 'SIMULATED' : sendRes.error ? 'FAILED' : 'SENT';
  let logId: string | undefined;

  if (!input.skipLog) {
    try {
      const bodyToStore = input.redactBody ? null : input.html;
      const inserted = await sql`
        INSERT INTO email_logs (
          recipient_email, recipient_name, recipient_type, recipient_id,
          category, template, subject, html_body, status, provider_id, error, dedupe_key, metadata
        ) VALUES (
          ${to}, ${input.recipientName || null}, ${input.recipientType}, ${input.recipientId || null},
          ${input.category}, ${input.template}, ${input.subject}, ${bodyToStore},
          ${status}, ${sendRes.id && sendRes.id !== 'simulated-email-id' ? sendRes.id : null},
          ${sendRes.error || null}, ${input.dedupeKey || null},
          ${JSON.stringify(input.metadata || {})}::jsonb
        )
        RETURNING id
      `;
      logId = inserted[0] ? String(inserted[0].id) : undefined;
    } catch (logErr) {
      console.warn('[EmailLog] Falha ao gravar log:', logErr);
    }
  }

  return {
    sent: status === 'SENT',
    simulated: sendRes.simulated,
    id: sendRes.id,
    logId,
    error: sendRes.error,
  };
}

export async function resendLoggedEmail(logId: string, actorName: string): Promise<EmailDispatchResult> {
  const rows = await sql`SELECT * FROM email_logs WHERE id = ${logId}::uuid LIMIT 1`;
  const orig = rows[0];
  if (!orig) {
    return { sent: false, simulated: false, error: 'Registro de e-mail não encontrado.' };
  }
  if (!orig.html_body) {
    return {
      sent: false,
      simulated: false,
      error: 'Este e-mail contém dados sensíveis (credencial/OTP) que não são armazenados para reenvio direto. Gere novamente na tela de origem.',
    };
  }

  return dispatchEmail({
    to: String(orig.recipient_email),
    recipientName: orig.recipient_name ? String(orig.recipient_name) : null,
    recipientType: String(orig.recipient_type) as EmailRecipientType,
    recipientId: orig.recipient_id ? String(orig.recipient_id) : null,
    category: String(orig.category) as EmailCategory,
    template: String(orig.template),
    subject: String(orig.subject),
    html: String(orig.html_body),
    metadata: {
      resent_from_log_id: logId,
      resent_by: actorName,
    },
  });
}

// ── Verificação de Webhook Resend (Svix HMAC-SHA256) ─────────────────────────

export interface VerifySvixInput {
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  rawBody: string;
  secret: string;
  nowMs?: number;
  maxAgeSeconds?: number;
}

export function verifyResendSvixSignature(input: VerifySvixInput): { valid: boolean; reason?: string } {
  const { svixId, svixTimestamp, svixSignature, rawBody, secret, nowMs = Date.now(), maxAgeSeconds = 300 } = input;
  if (!secret) return { valid: false, reason: 'webhook_secret_missing' };
  if (!svixId || !svixTimestamp || !svixSignature) return { valid: false, reason: 'missing_svix_headers' };

  const tsNum = Number(svixTimestamp);
  if (!Number.isFinite(tsNum) || tsNum <= 0) return { valid: false, reason: 'invalid_timestamp' };
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
  if (maxAgeSeconds > 0 && Math.abs(nowMs - tsMs) > maxAgeSeconds * 1000) {
    return { valid: false, reason: 'timestamp_out_of_window' };
  }

  const secretBody = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const keyBytes = secret.startsWith('whsec_') ? Buffer.from(secretBody, 'base64') : Buffer.from(secretBody, 'utf8');
  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', keyBytes).update(signedPayload, 'utf8').digest('base64');
  const expectedBuf = Buffer.from(expected, 'utf8');

  const candidates = svixSignature.split(/\s+/).filter(Boolean);
  for (const cand of candidates) {
    const comma = cand.indexOf(',');
    if (comma === -1) continue;
    const version = cand.slice(0, comma);
    const sigVal = cand.slice(comma + 1);
    if (version !== 'v1' || !sigVal) continue;
    const providedBuf = Buffer.from(sigVal, 'utf8');
    if (providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: 'signature_mismatch' };
}

export async function processResendWebhookEvent(payload: Record<string, unknown>): Promise<{ updated: boolean; eventType: string; emailId: string | null }> {
  const eventType = String(payload.type || '').trim().toLowerCase();
  const data = (payload.data && typeof payload.data === 'object' ? payload.data : {}) as Record<string, unknown>;
  const emailId = data.email_id ? String(data.email_id) : null;

  if (!emailId || !eventType) {
    return { updated: false, eventType, emailId };
  }

  const STATUS_MAP: Record<string, string> = {
    'email.delivered': 'DELIVERED',
    'email.bounced': 'BOUNCED',
    'email.complained': 'COMPLAINED',
    'email.opened': 'OPENED',
    'email.clicked': 'CLICKED',
    'email.delivery_delayed': 'SENT',
  };

  const nextStatus = STATUS_MAP[eventType];
  if (!nextStatus) {
    return { updated: false, eventType, emailId };
  }

  const bounceObj = (data.bounce && typeof data.bounce === 'object' ? data.bounce : {}) as Record<string, unknown>;
  const bounceReason = bounceObj.message ? String(bounceObj.message) : null;

  const updatedRows = await sql`
    UPDATE email_logs
    SET
      status = CASE
        WHEN status IN ('BOUNCED', 'COMPLAINED') AND ${nextStatus} IN ('DELIVERED', 'OPENED', 'CLICKED') THEN status
        ELSE ${nextStatus}
      END,
      delivered_at = CASE WHEN ${eventType} = 'email.delivered' THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END,
      opened_at = CASE WHEN ${eventType} IN ('email.opened', 'email.clicked') THEN COALESCE(opened_at, NOW()) ELSE opened_at END,
      bounced_at = CASE WHEN ${eventType} IN ('email.bounced', 'email.complained') THEN COALESCE(bounced_at, NOW()) ELSE bounced_at END,
      error = COALESCE(${bounceReason}, error),
      metadata = metadata || ${JSON.stringify({ last_resend_event: eventType, last_event_at: new Date().toISOString() })}::jsonb,
      updated_at = NOW()
    WHERE provider_id = ${emailId}
    RETURNING id
  `;

  return { updated: updatedRows.length > 0, eventType, emailId };
}
