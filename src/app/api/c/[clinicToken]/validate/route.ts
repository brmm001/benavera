// app/api/c/[token]/validate/route.ts
// POST: valida o token e inicia imediatamente a sessão de preenchimento da clínica (sem exigência de OTP)

import { NextRequest, NextResponse } from 'next/server';
import { validateInviteToken, recordInviteOpened, recordSessionValidated } from '@/lib/onboarding-tokens';
import { getClientIP } from '@/lib/security';
import { checkRateLimit } from '@/lib/rateLimit';
import { sql } from '@/lib/benavera-db';
import { SignJWT } from 'jose';

const CLINIC_SESSION_SECRET = new TextEncoder().encode(
  process.env.CLINIC_SESSION_SECRET || process.env.JWT_SECRET || 'clinic-session-secret-change-me'
);
const CLINIC_SESSION_COOKIE = 'benavera_clinic_session';
const CLINIC_SESSION_TTL = '24h';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clinicToken: string }> }
) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Rate limit por IP
  const rl = checkRateLimit(`validate_${ip}`, 60, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({
      error: 'Muitas tentativas. Tente novamente mais tarde.',
    }, { status: 429 });
  }

  const { clinicToken: token } = await params;

  // Validação básica do formato do token
  if (!token || token.length < 32 || token.length > 200) {
    return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });
  }

  const validation = await validateInviteToken(token);

  if (!validation.valid) {
    const messages: Record<string, string> = {
      not_found: 'Link inválido ou não encontrado.',
      expired: 'Este link expirou. Solicite um novo link à equipe Benavera.',
      revoked: 'Este link foi revogado. Solicite um novo link à equipe Benavera.',
    };
    return NextResponse.json({
      error: messages[validation.error || 'not_found'] || 'Link inválido.',
      code: validation.error,
    }, { status: validation.error === 'not_found' ? 404 : 410 });
  }

  const { invite } = validation;
  if (!invite) return NextResponse.json({ error: 'Link inválido.' }, { status: 400 });

  // Registrar abertura do link
  await recordInviteOpened(invite.id, invite.onboardingId, ip, userAgent);

  // Buscar dados da clínica
  const onboardingRows = await sql`
    SELECT email, trade_name, contact_name, phone, status
    FROM clinic_onboardings
    WHERE id = ${invite.onboardingId}
    LIMIT 1
  `;

  if (!onboardingRows[0]) {
    return NextResponse.json({ error: 'Credenciamento não encontrado.' }, { status: 404 });
  }

  const onboarding = onboardingRows[0];

  // Verificar se o credenciamento está em estado terminal
  const terminalStatuses = ['REJECTED', 'REVOKED', 'SUSPENDED'];
  if (terminalStatuses.includes(String(onboarding.status))) {
    return NextResponse.json({
      error: 'Este credenciamento não está disponível para preenchimento.',
      code: 'terminal_status',
    }, { status: 410 });
  }

  // Registrar validação da sessão
  await recordSessionValidated(invite.id);

  // Gerar JWT da sessão da clínica
  const clinicSessionToken = await new SignJWT({
    onboardingId: invite.onboardingId,
    inviteId: invite.id,
    type: 'clinic_session',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(CLINIC_SESSION_TTL)
    .sign(CLINIC_SESSION_SECRET);

  const response = NextResponse.json({
    success: true,
    inviteId: invite.id,
    onboardingId: invite.onboardingId,
    clinicName: String(onboarding.trade_name),
    redirect: `/c/${token}/formulario`,
  });

  response.cookies.set(CLINIC_SESSION_COOKIE, clinicSessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24h
  });

  return response;
}
