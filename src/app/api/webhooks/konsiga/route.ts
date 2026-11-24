// src/app/api/webhooks/konsiga/route.ts
// Endpoint de webhook/callback da Konsiga protegido por Basic Auth (timing-safe)
//
// A Konsiga envia callbacks com autenticação Basic Auth e payload:
//   { "Transacao": "uuid", "Status": "AGUARDANDO ASSINATURA DO CONTRATO PELO PACIENTE" }
//
// Variáveis de ambiente obrigatórias:
//   KONSIGA_WEBHOOK_USERNAME
//   KONSIGA_WEBHOOK_PASSWORD

import { NextRequest, NextResponse } from 'next/server';
import { handlePartnerWebhook } from '@/lib/partners/hub';
import {
  isValidKonsigaBasicAuth,
  normalizeKonsigaWebhookPayload,
} from '@/lib/partners/konsiga-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 65536;

export async function POST(request: NextRequest) {
  const expectedUser = process.env.KONSIGA_WEBHOOK_USERNAME || '';
  const expectedPass = process.env.KONSIGA_WEBHOOK_PASSWORD || '';

  if (!isValidKonsigaBasicAuth(request.headers.get('authorization'), expectedUser, expectedPass)) {
    return new NextResponse(null, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="konsiga"' },
    });
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const len = Number(contentLengthHeader);
    if (Number.isFinite(len) && len > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const normalizedBody = normalizeKonsigaWebhookPayload(rawBody);

  try {
    await handlePartnerWebhook('konsiga', normalizedBody);
  } catch (err) {
    console.error('[Webhook Konsiga]', err instanceof Error ? err.message : 'Erro interno');
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
