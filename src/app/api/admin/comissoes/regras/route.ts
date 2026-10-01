// src/app/api/admin/comissoes/regras/route.ts
// Admin: regras de comissão configuráveis

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCommissionRules, createCommissionRule } from '@/lib/atendente-db';
import { sql } from '@/lib/benavera-db';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const rules = await getCommissionRules();
  return NextResponse.json({ success: true, rules });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const body = await request.json();
  const { nome, evento, valor } = body;

  if (!nome || !evento || !valor) {
    return NextResponse.json({ error: 'Nome, evento e valor são obrigatórios.' }, { status: 400 });
  }

  const VALID_EVENTOS = ['cadastro_validado', 'primeira_operacao'];
  if (!VALID_EVENTOS.includes(evento)) {
    return NextResponse.json({ error: `Evento inválido. Use: ${VALID_EVENTOS.join(', ')}` }, { status: 400 });
  }

  const rule = await createCommissionRule({
    nome,
    evento,
    valor: Number(valor),
    created_by: session.userId,
  });

  return NextResponse.json({ success: true, rule }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ativa } = body;
  if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 });

  await sql`UPDATE commission_rules SET ativa = ${ativa}, updated_at = NOW() WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
