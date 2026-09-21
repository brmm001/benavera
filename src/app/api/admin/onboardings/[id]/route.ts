// app/api/admin/onboardings/[id]/route.ts
// GET: busca por ID | PATCH: atualiza dados do pré-cadastro

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { getClientIP } from '@/lib/security';
import { getOnboardingById, updateOnboardingData } from '@/lib/onboarding-db';
import { getAuditLogs } from '@/lib/onboarding-audit';
import { getOnboardingDocuments } from '@/lib/onboarding-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'VIEW_ONBOARDING_DETAIL')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const onboarding = await getOnboardingById(id);
    if (!onboarding) {
      return NextResponse.json({ error: 'Credenciamento não encontrado.' }, { status: 404 });
    }

    // Documentos e logs de auditoria
    const canViewDocs = hasPermission(session.role, 'VIEW_ONBOARDING_DOCUMENTS');
    const documents = canViewDocs ? await getOnboardingDocuments(id) : [];
    const canViewAudit = hasPermission(session.role, 'VIEW_ONBOARDING_AUDIT');
    const auditLogs = canViewAudit ? await getAuditLogs(id) : [];

    return NextResponse.json({ onboarding, documents, auditLogs });
  } catch (err) {
    console.error('[Admin Onboarding GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar credenciamento.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'VIEW_ONBOARDING_DETAIL')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    // Apenas campos de pré-cadastro admin podem ser atualizados por aqui
    const allowed = [
      'trade_name', 'legal_name', 'cnpj', 'contact_name', 'contact_cpf',
      'phone', 'email', 'city', 'state', 'specialty', 'average_ticket',
      'internal_notes', 'assigned_to',
    ];
    const filtered = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );

    await updateOnboardingData({
      id,
      data: filtered,
      ip: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Onboarding PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar credenciamento.' }, { status: 500 });
  }
}
