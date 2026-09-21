// app/api/admin/onboardings/[id]/invite/route.ts
// POST: gerar link de credenciamento | DELETE: revogar link

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, hasPermission } from '@/lib/auth';
import { getOnboardingById } from '@/lib/onboarding-db';
import {
  createInvite,
  revokeAllInvites,
  getActiveInvite,
} from '@/lib/onboarding-tokens';
import { updateOnboardingStatus } from '@/lib/onboarding-db';
import { sendOnboardingInviteEmail } from '@/lib/email';
import { logAuditEvent } from '@/lib/onboarding-audit';
import { getClientIP } from '@/lib/security';
import type { OnboardingStatus } from '@/lib/benavera-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'MANAGE_ONBOARDING_INVITES')) {
    return NextResponse.json({ error: 'Sem permissão para gerar convites.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { sendEmail?: boolean; expiryDays?: number };
  const ip = getClientIP(request);

  try {
    const onboarding = await getOnboardingById(id);
    if (!onboarding) {
      return NextResponse.json({ error: 'Credenciamento não encontrado.' }, { status: 404 });
    }

    // Verificar status: só pode gerar link em estados válidos
    const validStatuses: OnboardingStatus[] = [
      'PRE_REGISTERED', 'INVITE_SENT', 'INVITE_OPENED', 'IN_PROGRESS',
      'PENDING_DOCUMENTS', 'CORRECTION_REQUIRED',
    ];
    if (!validStatuses.includes(onboarding.status)) {
      return NextResponse.json({
        error: `Não é possível gerar link para credenciamento com status: ${onboarding.status}`,
      }, { status: 422 });
    }

    // Revogar convites anteriores
    await revokeAllInvites(id, session.userId);

    // Criar novo convite
    const { token, inviteId, expiresAt } = await createInvite({
      onboardingId: id,
      createdBy: session.userId,
      expiryDays: body.expiryDays,
    });

    // Construir URL do convite (não contém dados pessoais)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.benavera.com.br';
    const inviteUrl = `${baseUrl}/c/${token}`;

    // Atualizar status se estava em PRE_REGISTERED
    if (onboarding.status === 'PRE_REGISTERED') {
      await updateOnboardingStatus({
        id,
        newStatus: 'INVITE_SENT',
        actorId: session.userId,
        actorName: session.name,
        actorRole: session.role,
        ip,
      });
    }

    await logAuditEvent({
      onboardingId: id,
      actorType: 'admin',
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role,
      action: 'invite_sent',
      entityType: 'invite',
      entityId: inviteId,
      ip,
      metadata: { expires_at: expiresAt.toISOString(), email_sent: body.sendEmail ?? false },
    });

    // Enviar e-mail se solicitado
    if (body.sendEmail !== false) {
      sendOnboardingInviteEmail({
        to: onboarding.email,
        clinicName: onboarding.trade_name,
        responsavel: onboarding.contact_name,
        inviteUrl,
        expiresAt,
      }).catch(err => console.warn('[Email Convite]', err));
    }

    return NextResponse.json({
      success: true,
      inviteId,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    }, { status: 201 });
  } catch (err) {
    console.error('[Admin Invite POST]', err);
    return NextResponse.json({ error: 'Erro ao gerar convite.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'MANAGE_ONBOARDING_INVITES')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await revokeAllInvites(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Invite DELETE]', err);
    return NextResponse.json({ error: 'Erro ao revogar convite.' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'MANAGE_ONBOARDING_INVITES')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id } = await params;

  const invite = await getActiveInvite(id);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.benavera.com.br';

  return NextResponse.json({ invite });
}
