// app/api/c/[token]/submit/route.ts
// POST: submissão final do credenciamento

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { validateInviteToken } from '@/lib/onboarding-tokens';
import { getOnboardingById, updateOnboardingStatus, recordAcceptance } from '@/lib/onboarding-db';
import { getOnboardingDocuments } from '@/lib/onboarding-db';
import { logAuditEvent } from '@/lib/onboarding-audit';
import { sendOnboardingSubmittedClinicEmail, sendOnboardingSubmittedAlert } from '@/lib/email';
import { getClientIP } from '@/lib/security';
import { sql } from '@/lib/benavera-db';
import { z } from 'zod';

const CLINIC_SESSION_SECRET = new TextEncoder().encode(
  process.env.CLINIC_SESSION_SECRET || process.env.JWT_SECRET || 'clinic-session-secret-change-me'
);
const CLINIC_SESSION_COOKIE = 'benavera_clinic_session';

async function getClinicSession(request: NextRequest, clinicToken?: string) {
  const token = request.cookies.get(CLINIC_SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, CLINIC_SESSION_SECRET);
      if (payload.type === 'clinic_session') {
        return { onboardingId: String(payload.onboardingId), inviteId: String(payload.inviteId) };
      }
    } catch { /* fallback */ }
  }

  // Fallback direto pelo token do link
  if (clinicToken) {
    const validation = await validateInviteToken(clinicToken);
    if (validation.valid && validation.invite) {
      return { onboardingId: validation.invite.onboardingId, inviteId: validation.invite.id };
    }
  }

  return null;
}

// Schema dos aceites obrigatórios
const submitSchema = z.object({
  acceptances: z.array(z.object({
    type: z.string(),
    version: z.string(),
  })).min(1, 'Aceites obrigatórios não foram registrados.'),
});

// Declarações obrigatórias que precisam ser aceitas
const REQUIRED_ACCEPTANCES = [
  'declaration_1_veracidade',
  'declaration_2_autenticidade',
  'declaration_3_representacao',
  'declaration_4_regularidade',
  'declaration_5_alteracoes',
  'declaration_6_no_ficticio',
  'declaration_7_no_inexistentes',
  'declaration_8_no_inflacao',
  'declaration_9_no_cpf_terceiros',
  'declaration_10_no_simulacao',
  'declaration_11_no_contornar',
  'declaration_12_credito_parceiro',
  'declaration_13_aprovacao_nao_garantida',
  'privacy_policy',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clinicToken: string }> }
) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  const { clinicToken: token } = await params;
  const session = await getClinicSession(request, token);
  if (!session) {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados de aceite inválidos.', details: parsed.error.flatten() }, { status: 400 });
  }

  const { onboardingId } = session;

  try {
    const onboarding = await getOnboardingById(onboardingId);
    if (!onboarding) {
      return NextResponse.json({ error: 'Credenciamento não encontrado.' }, { status: 404 });
    }

    // Verificar que não está em estado terminal ou já submetido
    const nonSubmittableStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED', 'REVOKED'];
    if (nonSubmittableStatuses.includes(onboarding.status)) {
      return NextResponse.json({
        error: 'Este credenciamento já foi submetido ou está em um estado que não permite nova submissão.',
      }, { status: 422 });
    }

    // Verificar aceites obrigatórios
    const acceptedTypes = new Set(parsed.data.acceptances.map(a => a.type));
    const missingAcceptances = REQUIRED_ACCEPTANCES.filter(r => !acceptedTypes.has(r));
    if (missingAcceptances.length > 0) {
      return NextResponse.json({
        error: 'Todas as declarações obrigatórias devem ser aceitas antes de enviar.',
        missing: missingAcceptances,
      }, { status: 422 });
    }

    // Verificar documentos obrigatórios
    const docs = await getOnboardingDocuments(onboardingId);
    const missingDocs = docs.filter(d => d.is_required && !d.storage_key);
    if (missingDocs.length > 0) {
      return NextResponse.json({
        error: 'Existem documentos obrigatórios pendentes de envio.',
        pendingDocuments: missingDocs.map(d => d.document_label),
      }, { status: 422 });
    }

    // Registrar todos os aceites
    for (const acceptance of parsed.data.acceptances) {
      await recordAcceptance({
        onboardingId,
        acceptanceType: acceptance.type,
        documentVersion: acceptance.version,
        ip,
        userAgent,
        sessionToken: session.inviteId,
      });
    }

    // Registrar auditoria
    await logAuditEvent({
      onboardingId,
      actorType: 'clinic',
      actorId: 'clinic_session',
      action: 'onboarding_submitted',
      entityType: 'onboarding',
      entityId: onboardingId,
      ip,
      userAgent,
      metadata: {
        accepted_count: parsed.data.acceptances.length,
        documents_count: docs.filter(d => d.storage_key).length,
      },
    });

    // Atualizar status
    await updateOnboardingStatus({
      id: onboardingId,
      newStatus: 'SUBMITTED',
      actorId: 'clinic_session',
      actorName: onboarding.trade_name,
      actorRole: 'clinic',
      ip,
    });

    // Emails de confirmação (não bloqueiam o fluxo)
    sendOnboardingSubmittedClinicEmail({
      to: onboarding.email,
      clinicName: onboarding.trade_name,
      responsavel: onboarding.contact_name,
    }).catch(err => console.warn('[Email Submitted Clinic]', err));

    // Notificar analistas (buscar todos com role compliance/admin)
    const analystRows = await sql`
      SELECT email, name FROM users
      WHERE role IN ('BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE') AND ativo = TRUE
      LIMIT 5
    `;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.benavera.com.br';
    for (const analyst of analystRows) {
      sendOnboardingSubmittedAlert({
        to: String(analyst.email),
        analystName: String(analyst.name),
        clinicName: onboarding.trade_name,
        adminUrl: `${baseUrl}/admin/credenciamentos/${onboardingId}`,
      }).catch(err => console.warn('[Email Alert Analyst]', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Credenciamento enviado com sucesso. Nossa equipe entrará em contato.',
    });
  } catch (err) {
    console.error('[Clinic Submit POST]', err);
    return NextResponse.json({ error: 'Erro ao enviar credenciamento. Tente novamente.' }, { status: 500 });
  }
}
