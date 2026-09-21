// app/api/admin/onboardings/[id]/audit/route.ts
// GET: histórico de auditoria do credenciamento

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { getAuditLogs } from '@/lib/onboarding-audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'VIEW_ONBOARDING_AUDIT')) {
    return NextResponse.json({ error: 'Sem permissão para visualizar auditoria.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const logs = await getAuditLogs(id, { limit: 200 });
    return NextResponse.json({ logs });
  } catch (err) {
    console.error('[Admin Audit GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar logs de auditoria.' }, { status: 500 });
  }
}
