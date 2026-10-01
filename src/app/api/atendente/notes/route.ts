// src/app/api/atendente/notes/route.ts
// Notas de atendimento - criar e listar

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createNote, getNotes } from '@/lib/atendente-db';
import type { NoteType } from '@/lib/atendente-db';

const VALID_TYPES: NoteType[] = ['nota', 'contato', 'agendamento', 'proposta', 'encerramento'];

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

  const lead_id = request.nextUrl.searchParams.get('lead_id') || undefined;
  const prospect_clinic_id = request.nextUrl.searchParams.get('prospect_clinic_id') || undefined;

  try {
    const notes = await getNotes(session!.userId, { lead_id, prospect_clinic_id });
    return NextResponse.json({ success: true, notes });
  } catch (e) {
    console.error('[API Notes GET]', e);
    return NextResponse.json({ error: 'Erro ao carregar notas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const err = requireAtendente(session);
  if (err) return err;

  try {
    const body = await request.json();
    const { lead_id, prospect_clinic_id, tipo, conteudo, proxima_data } = body;

    if (!conteudo?.trim()) {
      return NextResponse.json({ error: 'Conteúdo é obrigatório.' }, { status: 400 });
    }
    if (!lead_id && !prospect_clinic_id) {
      return NextResponse.json({ error: 'lead_id ou prospect_clinic_id é obrigatório.' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de nota inválido.' }, { status: 400 });
    }

    const note = await createNote({
      lead_id,
      prospect_clinic_id,
      atendente_id: session!.userId,
      tipo,
      conteudo,
      proxima_data,
    });

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (e) {
    console.error('[API Notes POST]', e);
    return NextResponse.json({ error: 'Erro ao criar nota.' }, { status: 500 });
  }
}
