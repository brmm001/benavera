// src/app/api/atendente/clinicas/[id]/route.ts
// Operações em uma clínica específica do atendente

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClinicaById, updateProspectClinica } from '@/lib/atendente-db';

function requireAtendente(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const err = requireAtendente(session);
  if (err) return err;

  const { id } = await params;
  // Admin pode ver qualquer; atendente só vê as suas
  const atendenteId = session!.role === 'BENAVERA_ADMIN' ? undefined : session!.userId;

  try {
    const clinic = await getClinicaById(id, atendenteId);
    if (!clinic) {
      return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, clinic });
  } catch (e) {
    console.error('[API Atendente Clinica GET]', e);
    return NextResponse.json({ error: 'Erro ao carregar clínica.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const err = requireAtendente(session);
  if (err) return err;

  const { id } = await params;

  try {
    const body = await request.json();
    // Atendente só edita a sua; admin pode editar qualquer
    const atendenteId = session!.role === 'BENAVERA_ADMIN' ? id : session!.userId;
    const updated = await updateProspectClinica(id, atendenteId, body);
    if (!updated) {
      return NextResponse.json({ error: 'Clínica não encontrada ou sem permissão.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API Atendente Clinica PATCH]', e);
    return NextResponse.json({ error: 'Erro ao atualizar clínica.' }, { status: 500 });
  }
}
