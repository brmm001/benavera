// GET /api/assinar/[code] — Carrega oferta pública segura de um link de cadastro + assinatura de vendedor
import { NextRequest, NextResponse } from 'next/server';
import { resolvePublicSellerSignupLink } from '@/lib/seller-links';
import { getMercadoPagoPublicKey, isMercadoPagoConfigured } from '@/lib/mercadopago';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const resolved = await resolvePublicSellerSignupLink(code);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      link: resolved.link,
      mpPublicKey: getMercadoPagoPublicKey(),
      mpConfigured: isMercadoPagoConfigured(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
