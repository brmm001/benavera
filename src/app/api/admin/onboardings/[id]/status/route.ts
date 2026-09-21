// app/api/admin/onboardings/[id]/status/route.ts
// POST: transição de status do credenciamento

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { getClientIP } from '@/lib/security';
import { getOnboardingById, updateOnboardingStatus, canApproveOnboarding } from '@/lib/onboarding-db';
import { sendOnboardingApprovedEmail, sendCorrectionRequestEmail } from '@/lib/email';
import { sql } from '@/lib/benavera-db';
import type { OnboardingStatus } from '@/lib/benavera-db';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum([
    'PRE_REGISTERED', 'INVITE_SENT', 'IN_PROGRESS', 'PENDING_DOCUMENTS',
    'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED',
    'CONTRACT_PENDING', 'CONTRACT_SIGNED', 'ACTIVE', 'REJECTED',
    'REVOKED', 'SUSPENDED',
  ]),
  reason: z.string().max(1000).optional(),
  message: z.string().max(2000).optional(),
  corrections: z.array(z.object({
    label: z.string(),
    message: z.string(),
  })).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
  }

  const { status, reason, message, corrections } = parsed.data;
  const ip = getClientIP(request);

  // Verificar permissões por ação
  if (status === 'APPROVED' && !hasPermission(session.role, 'APPROVE_ONBOARDING')) {
    return NextResponse.json({ error: 'Sem permissão para aprovar credenciamentos.' }, { status: 403 });
  }
  if (status === 'REJECTED' && !hasPermission(session.role, 'REJECT_ONBOARDING')) {
    return NextResponse.json({ error: 'Sem permissão para reprovar credenciamentos.' }, { status: 403 });
  }
  if (status === 'ACTIVE' && !hasPermission(session.role, 'ACTIVATE_CLINIC')) {
    return NextResponse.json({ error: 'Sem permissão para ativar clínica.' }, { status: 403 });
  }
  if (!hasPermission(session.role, 'VIEW_ONBOARDING_DETAIL')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const onboarding = await getOnboardingById(id);
    if (!onboarding) {
      return NextResponse.json({ error: 'Credenciamento não encontrado.' }, { status: 404 });
    }

    // Verificar requisitos para aprovação
    if (status === 'APPROVED') {
      const { canApprove, pendingItems } = await canApproveOnboarding(id);
      if (!canApprove) {
        return NextResponse.json({
          error: 'Não é possível aprovar: existem itens obrigatórios pendentes.',
          pendingItems,
        }, { status: 422 });
      }
    }

    const result = await updateOnboardingStatus({
      id,
      newStatus: status as OnboardingStatus,
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role,
      reason,
      message,
      ip,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Ações pós-transição
    if (status === 'APPROVED') {
      sendOnboardingApprovedEmail({
        to: onboarding.email,
        clinicName: onboarding.trade_name,
        responsavel: onboarding.contact_name,
      }).catch(err => console.warn('[Email Aprovação]', err));
    }

    if (status === 'CORRECTION_REQUIRED' && corrections?.length) {
      // Buscar convite ativo para gerar URL
      const inviteRows = await sql`
        SELECT i.id FROM onboarding_invites i
        WHERE i.onboarding_id = ${id} AND i.revoked_at IS NULL AND i.expires_at > NOW()
        ORDER BY i.created_at DESC LIMIT 1
      `;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.benavera.com.br';
      const inviteUrl = `${baseUrl}/c/${id}`;

      sendCorrectionRequestEmail({
        to: onboarding.email,
        clinicName: onboarding.trade_name,
        responsavel: onboarding.contact_name,
        corrections,
        inviteUrl,
      }).catch(err => console.warn('[Email Correção]', err));
    }

    if (status === 'ACTIVE') {
      // Criar clínica se não existir, ou ativar existente
      if (!onboarding.clinic_id) {
        const clinicRows = await sql`
          INSERT INTO clinics (nome_fantasia, razao_social, cnpj, email, cidade, estado, especialidade, ativo)
          VALUES (
            ${onboarding.trade_name},
            ${onboarding.legal_name || onboarding.trade_name},
            ${onboarding.cnpj || ''},
            ${onboarding.email},
            ${onboarding.city},
            ${onboarding.state},
            ${onboarding.specialty || 'Geral'},
            TRUE
          )
          RETURNING id
        `;
        const clinicId = String(clinicRows[0].id);
        await sql`UPDATE clinic_onboardings SET clinic_id = ${clinicId} WHERE id = ${id}`;
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error('[Admin Onboarding Status POST]', err);
    return NextResponse.json({ error: 'Erro ao atualizar status.' }, { status: 500 });
  }
}
