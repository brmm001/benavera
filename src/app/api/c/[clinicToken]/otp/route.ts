// app/api/c/[token]/otp/route.ts
// POST: verifica o OTP e inicia a sessão de preenchimento

import { NextRequest, NextResponse } from 'next/server';
import { validateInviteToken, recordSessionValidated } from '@/lib/onboarding-tokens';
import { verifyOTP } from '@/lib/onboarding-otp';
import { getClientIP } from '@/lib/security';
import { checkRateLimit } from '@/lib/rateLimit';
import { SignJWT } from 'jose';
import { z } from 'zod';

// JWT separado para sessão da clínica (não é o JWT admin)
const CLINIC_SESSION_SECRET = new TextEncoder().encode(
  process.env.CLINIC_SESSION_SECRET || process.env.JWT_SECRET || 'clinic-session-secret-change-me'
);
const CLINIC_SESSION_TTL = '24h';
const CLINIC_SESSION_COOKIE = 'benavera_clinic_session';

const otpSchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d{6}$/, 'Código deve conter apenas números'),
  inviteId: z.string().uuid(),
  onboardingId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clinicToken: string }> }
) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Rate limit rigoroso por IP para OTP
  const rl = checkRateLimit(`otp_verify_ip_${ip}`, 15, 15 * 60 * 1000); // 15 tentativas / 15min
  if (!rl.allowed) {
    return NextResponse.json({
      error: 'Muitas tentativas incorretas. Aguarde alguns minutos.',
    }, { status: 429 });
  }

  const { clinicToken: token } = await params;
  const body = await request.json();
  const parsed = otpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
  }

  const { code, inviteId, onboardingId } = parsed.data;

  // Re-validar o token de convite (segurança dupla — não confiar apenas no inviteId)
  const validation = await validateInviteToken(token);
  if (!validation.valid || validation.invite?.id !== inviteId || validation.invite?.onboardingId !== onboardingId) {
    return NextResponse.json({ error: 'Sessão inválida. Acesse o link novamente.' }, { status: 401 });
  }

  // Verificar OTP
  const result = await verifyOTP({
    inviteId,
    onboardingId,
    code,
    ip,
    userAgent,
  });

  if (!result.valid) {
    const messages: Record<string, string> = {
      not_found: 'Código expirado ou não encontrado. Solicite um novo código.',
      expired: 'Código expirado. Solicite um novo código.',
      max_attempts: 'Número máximo de tentativas atingido. Solicite um novo código.',
      invalid: `Código incorreto.${result.attemptsLeft !== undefined ? ` ${result.attemptsLeft} tentativa(s) restante(s).` : ''}`,
    };
    return NextResponse.json({
      error: messages[result.error || 'invalid'] || 'Código inválido.',
      code: result.error,
      attemptsLeft: result.attemptsLeft,
    }, { status: 401 });
  }

  // OTP válido — registrar sessão e emitir JWT da clínica
  await recordSessionValidated(inviteId);

  const clinicSessionToken = await new SignJWT({
    onboardingId,
    inviteId,
    type: 'clinic_session',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(CLINIC_SESSION_TTL)
    .sign(CLINIC_SESSION_SECRET);

  const response = NextResponse.json({ success: true, onboardingId });

  response.cookies.set(CLINIC_SESSION_COOKIE, clinicSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24h
    path: '/',
  });

  return response;
}
