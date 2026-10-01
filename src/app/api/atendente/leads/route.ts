// src/app/api/atendente/leads/route.ts
// Leads do atendente autenticado (somente seus próprios)

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAtendenteClinicLeads, getAtendentePatientLeads } from '@/lib/atendente-db';

function requireAtendente(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const err = requireAtendente(session);
  if (err) return err;

  const atendenteId = session!.userId;
  const searchParams = request.nextUrl.searchParams;
  const tipo = searchParams.get('tipo') || 'clinic';
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    if (tipo === 'patient') {
      const leads = await getAtendentePatientLeads(atendenteId, { limit, offset });
      return NextResponse.json({ success: true, leads });
    } else {
      const leads = await getAtendenteClinicLeads(atendenteId, { search, status, limit, offset });
      return NextResponse.json({ success: true, leads });
    }
  } catch (err) {
    console.error('[API Atendente Leads]', err);
    return NextResponse.json({ error: 'Erro ao carregar leads.' }, { status: 500 });
  }
}
