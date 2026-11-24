// src/lib/partners/konsiga-webhook.ts
// Helpers puros de autenticação Basic Auth e normalização de payload do callback da Konsiga

import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Valida cabeçalho Authorization Basic Auth em tempo constante (via SHA-256 + timingSafeEqual).
 */
export function isValidKonsigaBasicAuth(
  authHeader: string | null,
  expectedUser: string,
  expectedPass: string
): boolean {
  const user = expectedUser.trim();
  const pass = expectedPass.trim();

  if (!user || !pass || !authHeader) return false;

  const match = authHeader.match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!match?.[1]) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    return false;
  }

  const colonIdx = decoded.indexOf(':');
  if (colonIdx < 0) return false;

  const providedUser = decoded.slice(0, colonIdx);
  const providedPass = decoded.slice(colonIdx + 1);

  const hashProvided = createHash('sha256')
    .update(`${providedUser}\0${providedPass}`, 'utf8')
    .digest();
  const hashExpected = createHash('sha256')
    .update(`${user}\0${pass}`, 'utf8')
    .digest();

  return timingSafeEqual(hashProvided, hashExpected);
}

/**
 * Normaliza o payload de callback da Konsiga para o contrato esperado por `handlePartnerWebhook`.
 * Konsiga envia: `{ "Transacao": "uuid", "Status": "AGUARDANDO ASSINATURA..." }`
 * Hub espera:    `{ "transactionId": "...", "action"?: "...", "orderId"?: "...", "message"?: "..." }`
 */
export function normalizeKonsigaWebhookPayload(rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return rawBody;
    }

    const record = parsed as Record<string, unknown>;
    const rawTx = record.Transacao ?? record.transacao ?? record.transactionId;
    const rawStatus = record.Status ?? record.status ?? record.action;

    const transactionId = typeof rawTx === 'string' ? rawTx.trim() : '';
    const status = typeof rawStatus === 'string' ? rawStatus.trim() : '';

    return JSON.stringify({
      transactionId,
      ...(transactionId ? { orderId: transactionId } : {}),
      ...(status ? { action: status, message: status } : {}),
    });
  } catch {
    // Mantém rawBody para o hub registrar como INVALID_JSON
    return rawBody;
  }
}
