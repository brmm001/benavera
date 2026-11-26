// POST /api/webhooks/resend — Rastreamento de entregas, aberturas e bounces via Resend (Svix HMAC-SHA256)
import { NextRequest, NextResponse } from 'next/server';
import { processResendWebhookEvent, verifyResendSvixSignature } from '@/lib/email-engine';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIP } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = checkRateLimit(`resend_webhook_${ip}`, 200, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const secret = (process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET não configurada.');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
  }

  const sigCheck = verifyResendSvixSignature({
    svixId: request.headers.get('svix-id'),
    svixTimestamp: request.headers.get('svix-timestamp'),
    svixSignature: request.headers.get('svix-signature'),
    rawBody,
    secret,
  });

  if (!sigCheck.valid) {
    return NextResponse.json({ error: 'Invalid signature.', reason: sigCheck.reason }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  try {
    const result = await processResendWebhookEvent(body);
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (err) {
    console.error('[Resend Webhook] Erro ao processar evento:', err);
    return NextResponse.json({ error: 'Error processing webhook.' }, { status: 500 });
  }
}
