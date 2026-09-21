// app/api/c/[token]/data/route.ts
// GET: busca dados do onboarding para preenchimento
// PATCH: atualiza dados (autosave)

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getClientIP } from '@/lib/security';
import { getOnboardingByToken, updateOnboardingData, calculateProgress, getOnboardingDocuments } from '@/lib/onboarding-db';
import { validateInviteToken } from '@/lib/onboarding-tokens';

const CLINIC_SESSION_SECRET = new TextEncoder().encode(
  process.env.CLINIC_SESSION_SECRET || process.env.JWT_SECRET || 'clinic-session-secret-change-me'
);
const CLINIC_SESSION_COOKIE = 'benavera_clinic_session';

async function getClinicSession(
  request: NextRequest,
  clinicToken?: string
): Promise<{
  onboardingId: string;
  inviteId: string;
} | null> {
  const token = request.cookies.get(CLINIC_SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, CLINIC_SESSION_SECRET);
      if (payload.type === 'clinic_session') {
        return {
          onboardingId: String(payload.onboardingId),
          inviteId: String(payload.inviteId),
        };
      }
    } catch {
      // fallback
    }
  }

  // Fallback direto pelo token da URL (sem necessidade de OTP)
  if (clinicToken) {
    const validation = await validateInviteToken(clinicToken);
    if (validation.valid && validation.invite) {
      return {
        onboardingId: validation.invite.onboardingId,
        inviteId: validation.invite.id,
      };
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clinicToken: string }> }
) {
  const { clinicToken: token } = await params;
  const session = await getClinicSession(request, token);
  if (!session) {
    return NextResponse.json({ error: 'Sessão inválida. Acesse o link novamente.' }, { status: 401 });
  }

  try {
    const data = await getOnboardingByToken(session.onboardingId);
    if (!data) {
      return NextResponse.json({ error: 'Credenciamento não encontrado.' }, { status: 404 });
    }

    // Buscar documentos (sem storage_key ou sha256)
    const rawDocs = await getOnboardingDocuments(session.onboardingId);
    const documents = rawDocs.map(({ storage_key: _, sha256: __, ...safe }) => safe);

    return NextResponse.json({ data, documents });
  } catch (err) {
    console.error('[Clinic Data GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar dados.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clinicToken: string }> }
) {
  const { clinicToken: token } = await params;
  const session = await getClinicSession(request, token);
  if (!session) {
    return NextResponse.json({ error: 'Sessão inválida. Acesse o link novamente.' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Verificar que não há campos de dados de pacientes
    const forbiddenFields = ['paciente', 'prontuario', 'diagnostico', 'exame', 'patient_cpf'];
    const hasForbidden = forbiddenFields.some(f => f in body);
    if (hasForbidden) {
      return NextResponse.json({
        error: 'Campos não permitidos detectados. Este formulário é exclusivo para dados da clínica.',
      }, { status: 400 });
    }

    await updateOnboardingData({
      id: session.onboardingId,
      data: body,
      sessionToken: session.inviteId,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
    });

    const progress = await calculateProgress(session.onboardingId);

    return NextResponse.json({ success: true, progress });
  } catch (err) {
    console.error('[Clinic Data PATCH]', err);
    return NextResponse.json({ error: 'Erro ao salvar dados.' }, { status: 500 });
  }
}
