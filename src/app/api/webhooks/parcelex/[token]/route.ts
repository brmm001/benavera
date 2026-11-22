// src/app/api/webhooks/parcelex/[token]/route.ts
// Endpoint de webhook da Parcelex protegido por token secreto no path (timing-safe)

import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { handlePartnerWebhook } from '@/lib/partners/hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 65536;
const MIN_TOKEN_LENGTH = 32;

function isValidWebhookToken(provided: string | undefined): boolean {
  const expected = (process.env.PARCELEX_WEBHOOK_TOKEN || '').trim();
  if (!expected || expected.length < MIN_TOKEN_LENGTH) return false;
  if (!provided || provided.length < MIN_TOKEN_LENGTH) return false;

  const hashA = createHash('sha256').update(provided, 'utf8').digest();
  const hashB = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(hashA, hashB);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isValidWebhookToken(token)) {
    return new NextResponse(null, { status: 404 });
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

  try {
    await handlePartnerWebhook('parcelex', rawBody);
  } catch (err) {
    console.error('[Webhook Parcelex]', err instanceof Error ? err.message : 'Erro interno');
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
