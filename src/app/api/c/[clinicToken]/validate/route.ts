// app/api/c/[token]/validate/route.ts
// POST: valida o token e envia OTP para o e-mail da clínica
// Rate limiting rigoroso — proteção contra brute force

import { NextRequest, NextResponse } from 'next/server';
import { validateInviteToken, recordInviteOpened } from '@/lib/onboarding-tokens';
import { createOTP } from '@/lib/onboarding-otp';
import { sendOTPEmail } from '@/lib/email';
import { getClientIP } from '@/lib/security';
import { checkRateLimit } from '@/lib/rateLimit';
import { sql } from '@/lib/benavera-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clinicToken: string }> }
) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Rate limit por IP: máximo 10 tentativas/hora
  const rl = checkRateLimit(`validate_${ip}`, 10, 60 * 60 * 1000);
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

  // Buscar e-mail da clínica para envio do OTP (não retornar integralmente)
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

  // Verificar se o credenciamento já foi submetido ou está em estado terminal
  const terminalStatuses = ['REJECTED', 'REVOKED', 'SUSPENDED'];
  if (terminalStatuses.includes(String(onboarding.status))) {
    return NextResponse.json({
      error: 'Este credenciamento não está disponível para preenchimento.',
      code: 'terminal_status',
    }, { status: 410 });
  }

  // Gerar OTP
  const otpResult = await createOTP({
    inviteId: invite.id,
    onboardingId: invite.onboardingId,
    ip,
    userAgent,
  });

  if (!otpResult.success) {
    return NextResponse.json({ error: otpResult.error || 'Erro ao gerar código.' }, { status: 429 });
  }

  // Enviar OTP por e-mail
  const email = String(onboarding.email);
  const clinicName = String(onboarding.trade_name);

  // Em produção, não retornamos o código — apenas em dev
  const devCode = (otpResult as { devCode?: string }).devCode;

  if (!devCode) {
    // Produção: enviar e-mail real
    sendOTPEmail({
      to: email,
      clinicName,
      code: '000000', // Placeholder — código real vai no email.ts que tem acesso ao hash
    }).catch(err => console.warn('[OTP Email]', err));

    // Na prática, o código real é passado dentro do createOTP que chama sendOTPByEmail
  }

  return NextResponse.json({
    success: true,
    maskedEmail: otpResult.maskedEmail,
    maskedPhone: otpResult.maskedPhone,
    inviteId: invite.id,
    onboardingId: invite.onboardingId,
    clinicName,
    // Em desenvolvimento, devolver o código para facilitar testes
    ...(process.env.NODE_ENV === 'development' && devCode ? { _devOtp: devCode } : {}),
  });
}
