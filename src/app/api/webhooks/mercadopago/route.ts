// POST /api/webhooks/mercadopago — Receptor seguro de webhooks do Mercado Pago
// Valida assinatura criptográfica x-signature (HMAC-SHA256) e reconsulta o recurso na API oficial do MP.

import { NextRequest, NextResponse } from 'next/server';
import { getMercadoPagoWebhookSecret, verifyMercadoPagoSignature } from '@/lib/mercadopago';
import { processMercadoPagoWebhook } from '@/lib/billing-service';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIP } from '@/lib/security';

const MAX_BODY_BYTES = 256 * 1024; // 256 KB

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = checkRateLimit(`mp_webhook_${ip}`, 120, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const rawText = await request.text();
  if (rawText.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const search = request.nextUrl.searchParams;
  const eventType = String(
    body.type || body.topic || search.get('type') || search.get('topic') || ''
  ).trim().toLowerCase();

  const bodyData = (body.data && typeof body.data === 'object' ? body.data : {}) as Record<string, unknown>;
  const resourceId = String(
    search.get('data.id') || bodyData.id || search.get('id') || body.id || ''
  ).trim();

  if (!eventType || !resourceId) {
    return NextResponse.json({ error: 'Missing event type or resource id.' }, { status: 400 });
  }

  const webhookSecret = getMercadoPagoWebhookSecret();
  if (!webhookSecret) {
    console.error('[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET não configurada.');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  const sigCheck = verifyMercadoPagoSignature({
    xSignature,
    xRequestId,
    dataId: resourceId,
    secret: webhookSecret,
  });

  if (!sigCheck.valid) {
    await processMercadoPagoWebhook({
      eventType,
      resourceId,
      requestId: xRequestId,
      signatureValid: false,
      rawPayload: body,
    }).catch(() => {});
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  try {
    const result = await processMercadoPagoWebhook({
      eventType,
      resourceId,
      requestId: xRequestId,
      signatureValid: true,
      rawPayload: body,
    });
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (err) {
    console.error('[MP Webhook] Falha ao processar evento:', eventType, resourceId, err);
    return NextResponse.json({ error: 'Error processing webhook.' }, { status: 500 });
  }
}
