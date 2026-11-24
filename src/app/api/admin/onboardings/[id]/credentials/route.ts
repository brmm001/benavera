// src/app/api/admin/onboardings/[id]/credentials/route.ts
// POST: cria ou redefine credenciais de login da clínica e envia por e-mail via Resend.
// Se o credenciamento estiver em SUBMITTED/UNDER_REVIEW e approveIfSubmitted=true, aprova antes.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession, hasPermission } from '@/lib/auth';
import { getClientIP } from '@/lib/security';
import {
  canApproveOnboarding,
  getOnboardingById,
  updateOnboardingStatus,
} from '@/lib/onboarding-db';
import { provisionClinicAccountFromOnboarding } from '@/lib/clinic-credentials';
import { sendClinicCredentialsEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/onboarding-audit';
import { sql } from '@/lib/benavera-db';

const bodySchema = z.object({
  approveIfSubmitted: z.boolean().optional().default(false),
  resetPassword: z.boolean().optional().default(true),
});

const READY_STATUSES = new Set(['APPROVED', 'CONTRACT_PENDING', 'CONTRACT_SIGNED', 'ACTIVE']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!hasPermission(session.role, 'ACTIVATE_CLINIC')) {
    return NextResponse.json(
      { error: 'Apenas administradores Benavera podem gerar e enviar credenciais de acesso.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const rawBody = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
  }

  const ip = getClientIP(request);

  try {
    let onboarding = await getOnboardingById(id);
    if (!onboarding) {
      return NextResponse.json({ error: 'Credenciamento não encontrado.' }, { status: 404 });
    }

    // Se ainda estiver SUBMITTED ou UNDER_REVIEW e o admin autorizou aprovar junto
    if (
      (onboarding.status === 'SUBMITTED' || onboarding.status === 'UNDER_REVIEW') &&
      parsed.data.approveIfSubmitted
    ) {
      const { canApprove, pendingItems } = await canApproveOnboarding(id);
      if (!canApprove) {
        return NextResponse.json(
          {
            error: 'Não é possível aprovar o credenciamento: existem documentos obrigatórios pendentes.',
            pendingItems,
          },
          { status: 422 }
        );
      }

      const transition = await updateOnboardingStatus({
        id,
        newStatus: 'APPROVED',
        actorId: session.userId,
        actorName: session.name,
        actorRole: session.role,
        ip,
      });
      if (!transition.success) {
        return NextResponse.json({ error: transition.error || 'Erro ao aprovar credenciamento.' }, { status: 422 });
      }

      await sql`
        UPDATE onboarding_documents
        SET review_status = 'VALIDATED',
            reviewed_by = ${session.userId},
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE onboarding_id = ${id}
          AND storage_key IS NOT NULL
          AND review_status != 'VALIDATED'
      `;

      onboarding = (await getOnboardingById(id)) || onboarding;
    }

    if (!READY_STATUSES.has(onboarding.status)) {
      return NextResponse.json(
        {
          error: `O credenciamento precisa estar aprovado ou ativo para envio de credenciais (status atual: ${onboarding.status}).`,
        },
        { status: 422 }
      );
    }

    // Provisiona clínica e usuário CLINIC_ADMIN (gera senha temporária quando cria ou redefine)
    const provisioned = await provisionClinicAccountFromOnboarding(onboarding, {
      resetPassword: parsed.data.resetPassword,
    });

    if (!provisioned.temporaryPassword) {
      return NextResponse.json(
        { error: 'Não foi possível gerar senha temporária para envio.' },
        { status: 500 }
      );
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.benavera.com.br').replace(/\/$/, '');
    const loginUrl = `${baseUrl}/login`;

    const emailResult = await sendClinicCredentialsEmail({
      to: provisioned.email,
      clinicName: onboarding.trade_name,
      responsavel: onboarding.contact_name || provisioned.userName,
      loginEmail: provisioned.email,
      temporaryPassword: provisioned.temporaryPassword,
      loginUrl,
      isReset: provisioned.passwordReset,
    });

    await logAuditEvent({
      onboardingId: id,
      actorType: 'admin',
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role,
      action: 'credentials_sent',
      entityType: 'user',
      entityId: provisioned.userId,
      ip,
      metadata: {
        email: provisioned.email,
        user_created: provisioned.createdNewUser,
        password_reset: provisioned.passwordReset,
        email_sent: emailResult.sent,
        email_simulated: emailResult.simulated,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status: onboarding.status,
        credentials: {
          email: provisioned.email,
          loginUrl,
          userCreated: provisioned.createdNewUser,
          passwordReset: provisioned.passwordReset,
          temporaryPassword: provisioned.temporaryPassword,
          emailSent: emailResult.sent,
          emailSimulated: emailResult.simulated,
          emailError: emailResult.error || null,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[Admin Onboarding Credentials POST]', err);
    const message = err instanceof Error ? err.message : 'Erro ao enviar credenciais.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
