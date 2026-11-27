// src/lib/mercadopago.ts
// Cliente HTTP seguro para API do Mercado Pago (Brasil):
// - Assinaturas recorrentes no cartão (/preapproval)
// - Pix nativo com QR Code (/v1/payments)
// - Checkout Pro / Boleto (/checkout/preferences)
// - Validação criptográfica de Webhook (x-signature HMAC-SHA256)

import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_MP_API_BASE = 'https://api.mercadopago.com';
const DEFAULT_TIMEOUT_MS = 15000;

function getAccessToken(): string {
  const token = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  if (!token) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurada no servidor.');
  }
  return token;
}

export function getMercadoPagoApiBase(): string {
  const configured = (process.env.MERCADOPAGO_API_BASE || '').trim().replace(/\/$/, '');
  if (!configured) return DEFAULT_MP_API_BASE;
  return configured;
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean((process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim());
}

export function getMercadoPagoPublicKey(): string {
  return (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY || '').trim();
}

export function getMercadoPagoWebhookSecret(): string {
  return (process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim();
}

export function sanitizeMercadoPagoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const isTestLocal =
      process.env.MERCADOPAGO_API_BASE &&
      (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
    if (isTestLocal && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      return parsed.toString();
    }
    if (parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const allowedHost =
      host.endsWith('.mercadopago.com.br') ||
      host.endsWith('.mercadopago.com') ||
      host === 'mercadopago.com.br' ||
      host === 'mercadopago.com' ||
      host.endsWith('.mercadolibre.com') ||
      host.endsWith('.mercadolivre.com.br');
    return allowedHost ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function mpRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT';
    body?: unknown;
    idempotencyKey?: string;
  } = {}
): Promise<T> {
  const token = getAccessToken();
  const base = getMercadoPagoApiBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.idempotencyKey) {
    headers['X-Idempotency-Key'] = options.idempotencyKey;
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    cache: 'no-store',
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      (typeof json.message === 'string' && json.message) ||
      (typeof json.error === 'string' && json.error) ||
      `Erro Mercado Pago HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

// ── Validação de assinatura HMAC-SHA256 do Webhook (x-signature) ─────────────

export interface VerifySignatureInput {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  nowMs?: number;
  maxAgeSeconds?: number;
}

export interface VerifySignatureResult {
  valid: boolean;
  reason?: string;
  ts?: number;
}

export function verifyMercadoPagoSignature(input: VerifySignatureInput): VerifySignatureResult {
  const { xSignature, xRequestId, dataId, secret, nowMs = Date.now(), maxAgeSeconds = 300 } = input;
  if (!secret) return { valid: false, reason: 'webhook_secret_missing' };
  if (!xSignature) return { valid: false, reason: 'missing_x_signature' };

  let tsRaw = '';
  let v1 = '';
  for (const part of xSignature.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim().toLowerCase();
    const v = part.slice(eq + 1).trim();
    if (k === 'ts') tsRaw = v;
    if (k === 'v1') v1 = v.toLowerCase();
  }

  if (!tsRaw || !v1 || !/^[0-9a-f]{64}$/.test(v1)) {
    return { valid: false, reason: 'malformed_x_signature' };
  }

  // Janela contra replay (suporta ts em segundos ou milissegundos)
  const tsNum = Number(tsRaw);
  if (!Number.isFinite(tsNum) || tsNum <= 0) {
    return { valid: false, reason: 'invalid_ts' };
  }
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
  if (maxAgeSeconds > 0 && Math.abs(nowMs - tsMs) > maxAgeSeconds * 1000) {
    return { valid: false, reason: 'timestamp_out_of_window', ts: tsNum };
  }

  // Template oficial do manifesto Mercado Pago:
  // id:[data.id_lowercase];request-id:[x-request-id];ts:[ts];
  const segments: string[] = [];
  if (dataId) segments.push(`id:${String(dataId).trim().toLowerCase()};`);
  if (xRequestId) segments.push(`request-id:${String(xRequestId).trim()};`);
  segments.push(`ts:${tsRaw};`);
  const manifest = segments.join('');

  const expectedHex = createHmac('sha256', secret).update(manifest).digest('hex');
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: 'signature_mismatch', ts: tsNum };
  }

  return { valid: true, ts: tsNum };
}

// ── 1. Assinatura recorrente no Cartão (/preapproval) ────────────────────────

export interface CreatePreapprovalInput {
  reason: string;
  externalReference: string;
  payerEmail: string;
  amount: number;
  frequency: number; // 1 para mensal, 12 para anual
  frequencyType: 'months';
  backUrl: string;
  idempotencyKey: string;
  /** Token gerado no navegador pelo Mercado Pago JS SDK v2 (Checkout Transparente PCI-compliant) */
  cardTokenId?: string | null;
}

export interface MpPreapprovalResponse {
  id: string;
  status: string;
  init_point?: string;
  sandbox_init_point?: string;
  external_reference?: string;
  payer_email?: string;
  next_payment_date?: string;
  auto_recurring?: {
    transaction_amount?: number;
    frequency?: number;
    frequency_type?: string;
  };
}

export async function createMpPreapproval(input: CreatePreapprovalInput): Promise<{
  id: string;
  status: string;
  checkoutUrl: string | null;
  raw: MpPreapprovalResponse;
}> {
  const token = (input.cardTokenId || '').trim();
  const payload: Record<string, unknown> = {
    reason: input.reason.slice(0, 250),
    external_reference: input.externalReference,
    payer_email: input.payerEmail,
    auto_recurring: {
      frequency: input.frequency,
      frequency_type: input.frequencyType,
      transaction_amount: Number(input.amount.toFixed(2)),
      currency_id: 'BRL',
    },
    back_url: input.backUrl,
    status: token ? 'authorized' : 'pending',
  };
  if (token) {
    payload.card_token_id = token;
  }

  const raw = await mpRequest<MpPreapprovalResponse>('/preapproval', {
    method: 'POST',
    body: payload,
    idempotencyKey: input.idempotencyKey,
  });

  const checkoutUrl = sanitizeMercadoPagoUrl(raw.init_point || raw.sandbox_init_point);
  return {
    id: String(raw.id),
    status: String(raw.status || (token ? 'authorized' : 'pending')),
    checkoutUrl,
    raw,
  };
}

export async function getMpPreapproval(id: string): Promise<MpPreapprovalResponse> {
  return mpRequest<MpPreapprovalResponse>(`/preapproval/${encodeURIComponent(id)}`);
}

export async function cancelMpPreapproval(id: string): Promise<MpPreapprovalResponse> {
  return mpRequest<MpPreapprovalResponse>(`/preapproval/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { status: 'cancelled' },
  });
}

// ── 2. Pagamento Pix Nativo (/v1/payments) ───────────────────────────────────

export interface CreatePixPaymentInput {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  payerFirstName?: string;
  payerDocument?: string | null;
  notificationUrl?: string;
  idempotencyKey: string;
  expiresInHours?: number;
}

export interface MpPaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  external_reference?: string;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  payment_method_id?: string;
  metadata?: Record<string, unknown>;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
      digitable_line?: string;
    };
  };
  barcode?: {
    content?: string;
  };
  transaction_details?: {
    external_resource_url?: string;
    digitable_line?: string;
    barcode?: {
      content?: string;
    };
  };
  preapproval_id?: string;
}

export async function createMpPixPayment(input: CreatePixPaymentInput): Promise<{
  id: string;
  status: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string;
  raw: MpPaymentResponse;
}> {
  const expiresAt = new Date(Date.now() + (input.expiresInHours || 24) * 60 * 60 * 1000).toISOString();
  const docDigits = (input.payerDocument || '').replace(/\D/g, '');
  const identification =
    docDigits.length === 11
      ? { type: 'CPF', number: docDigits }
      : docDigits.length === 14
        ? { type: 'CNPJ', number: docDigits }
        : undefined;

  const payload: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description.slice(0, 250),
    payment_method_id: 'pix',
    external_reference: input.externalReference,
    date_of_expiration: expiresAt,
    payer: {
      email: input.payerEmail,
      ...(input.payerFirstName ? { first_name: input.payerFirstName.slice(0, 60) } : {}),
      ...(identification ? { identification } : {}),
    },
  };
  if (input.notificationUrl) {
    payload.notification_url = input.notificationUrl;
  }

  const raw = await mpRequest<MpPaymentResponse>('/v1/payments', {
    method: 'POST',
    body: payload,
    idempotencyKey: input.idempotencyKey,
  });

  const txData = raw.point_of_interaction?.transaction_data;
  return {
    id: String(raw.id),
    status: String(raw.status || 'pending'),
    qrCode: txData?.qr_code || null,
    qrCodeBase64: txData?.qr_code_base64 || null,
    ticketUrl: sanitizeMercadoPagoUrl(txData?.ticket_url || raw.transaction_details?.external_resource_url),
    expiresAt: raw.date_of_expiration || expiresAt,
    raw,
  };
}

export async function getMpPayment(id: string): Promise<MpPaymentResponse> {
  return mpRequest<MpPaymentResponse>(`/v1/payments/${encodeURIComponent(id)}`);
}

// ── 2B. Boleto Bancário Nativo Transparente (/v1/payments · bolbradesco) ─────

export interface CreateBoletoPaymentInput {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  payerFullName: string;
  payerDocument: string;
  payerAddress: {
    zipCode: string;
    streetName: string;
    streetNumber: string;
    neighborhood: string;
    city: string;
    federalUnit: string;
  };
  notificationUrl?: string;
  idempotencyKey: string;
  expiresInDays?: number;
}

export async function createMpBoletoPayment(input: CreateBoletoPaymentInput): Promise<{
  id: string;
  status: string;
  digitableLine: string | null;
  barcode: string | null;
  pdfUrl: string | null;
  expiresAt: string;
  raw: MpPaymentResponse;
}> {
  const docDigits = (input.payerDocument || '').replace(/\D/g, '');
  if (docDigits.length !== 11 && docDigits.length !== 14) {
    throw new Error('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para emitir o boleto.');
  }
  const zipDigits = (input.payerAddress.zipCode || '').replace(/\D/g, '');
  if (zipDigits.length !== 8) {
    throw new Error('Informe um CEP válido (8 dígitos) para emitir o boleto.');
  }
  const uf = (input.payerAddress.federalUnit || '').trim().toUpperCase().slice(0, 2);
  if (!input.payerAddress.streetName?.trim() || !input.payerAddress.city?.trim() || uf.length !== 2) {
    throw new Error('Informe rua, cidade e UF completos para emitir o boleto bancário.');
  }

  const nameParts = (input.payerFullName || 'Clínica Benavera').trim().split(/\s+/).filter(Boolean);
  const firstName = (nameParts[0] || 'Clínica').slice(0, 60);
  const lastName = (nameParts.slice(1).join(' ') || 'Benavera').slice(0, 60);
  const expiresAt = new Date(Date.now() + (input.expiresInDays || 3) * 24 * 60 * 60 * 1000).toISOString();

  const payload: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description.slice(0, 250),
    payment_method_id: 'bolbradesco',
    external_reference: input.externalReference,
    date_of_expiration: expiresAt,
    payer: {
      email: input.payerEmail,
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: docDigits.length === 11 ? 'CPF' : 'CNPJ',
        number: docDigits,
      },
      address: {
        zip_code: zipDigits,
        street_name: input.payerAddress.streetName.trim().slice(0, 120),
        street_number: (input.payerAddress.streetNumber || 'S/N').trim().slice(0, 20),
        neighborhood: (input.payerAddress.neighborhood || 'Centro').trim().slice(0, 80),
        city: input.payerAddress.city.trim().slice(0, 80),
        federal_unit: uf,
      },
    },
  };
  if (input.notificationUrl) {
    payload.notification_url = input.notificationUrl;
  }

  const raw = await mpRequest<MpPaymentResponse>('/v1/payments', {
    method: 'POST',
    body: payload,
    idempotencyKey: input.idempotencyKey,
  });

  const barcode = raw.barcode?.content || raw.transaction_details?.barcode?.content || null;
  const digitableLine =
    raw.transaction_details?.digitable_line ||
    raw.point_of_interaction?.transaction_data?.digitable_line ||
    barcode;
  const pdfUrl = sanitizeMercadoPagoUrl(
    raw.transaction_details?.external_resource_url ||
      raw.point_of_interaction?.transaction_data?.ticket_url
  );

  return {
    id: String(raw.id),
    status: String(raw.status || 'pending'),
    digitableLine,
    barcode,
    pdfUrl,
    expiresAt: raw.date_of_expiration || expiresAt,
    raw,
  };
}

// ── 3. Checkout Pro / Boleto (/checkout/preferences) ─────────────────────────

export interface CreateCheckoutPreferenceInput {
  title: string;
  description: string;
  amount: number;
  externalReference: string;
  payerEmail: string;
  backUrlSuccess: string;
  backUrlPending: string;
  backUrlFailure: string;
  notificationUrl?: string;
  idempotencyKey: string;
}

export interface MpPreferenceResponse {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
}

export async function createMpCheckoutPreference(input: CreateCheckoutPreferenceInput): Promise<{
  id: string;
  checkoutUrl: string | null;
  raw: MpPreferenceResponse;
}> {
  const payload: Record<string, unknown> = {
    items: [
      {
        title: input.title.slice(0, 250),
        description: input.description.slice(0, 250),
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(input.amount.toFixed(2)),
      },
    ],
    payer: { email: input.payerEmail },
    external_reference: input.externalReference,
    back_urls: {
      success: input.backUrlSuccess,
      pending: input.backUrlPending,
      failure: input.backUrlFailure,
    },
    auto_return: 'approved',
  };
  if (input.notificationUrl) {
    payload.notification_url = input.notificationUrl;
  }

  const raw = await mpRequest<MpPreferenceResponse>('/checkout/preferences', {
    method: 'POST',
    body: payload,
    idempotencyKey: input.idempotencyKey,
  });

  return {
    id: String(raw.id),
    checkoutUrl: sanitizeMercadoPagoUrl(raw.init_point || raw.sandbox_init_point),
    raw,
  };
}

export interface MpAuthorizedPaymentResponse {
  id: number | string;
  preapproval_id?: string;
  status: string;
  transaction_amount?: number;
  external_reference?: string;
  payment?: {
    id?: number | string;
    status?: string;
  };
}

export async function getMpAuthorizedPayment(id: string): Promise<MpAuthorizedPaymentResponse> {
  return mpRequest<MpAuthorizedPaymentResponse>(`/authorized_payments/${encodeURIComponent(id)}`);
}
