// src/app/api/admin/atendentes/[id]/route.ts
// Admin: editar atendente individual

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAtendenteById, updateAtendenteConfig } from '@/lib/atendente-db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const { id } = await params;
  const atendente = await getAtendenteById(id);
  if (!atendente) return NextResponse.json({ error: 'Atendente não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, atendente });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { lead_limit, receiving_leads, ativo } = body;

  const updated = await updateAtendenteConfig(id, { lead_limit, receiving_leads, ativo });
  if (!updated) return NextResponse.json({ error: 'Atendente não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
