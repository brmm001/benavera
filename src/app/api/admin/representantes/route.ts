// GET lista representantes · POST cria representante (+ usuário de login com senha temporária)
import { NextRequest, NextResponse } from 'next/server';
import { requireRepAdmin } from '@/lib/rep-guards';
import { createRepresentante, listRepresentantes } from '@/lib/representantes-db';

export async function GET() {
  const g = await requireRepAdmin({ financeiro: true });
  if (!g.ok) return g.response;
  try {
    return NextResponse.json({ success: true, representantes: await listRepresentantes() });
  } catch (e) {
    console.error('[API Admin Representantes GET]', e);
    return NextResponse.json({ error: 'Erro ao listar representantes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const g = await requireRepAdmin();
  if (!g.ok) return g.response;
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createRepresentante({
      nome: String(body.nome ?? ''),
      email: String(body.email ?? ''),
      documento: body.documento ?? null,
      telefone: body.telefone ?? null,
      chave_pix: body.chave_pix ?? null,
      tipo_pix: body.tipo_pix ?? null,
      comissao_percent: body.comissao_percent,
      periodo_meses: body.periodo_meses,
      mensalidade_percent: body.mensalidade_percent,
      bonus_ativacao: body.bonus_ativacao,
      observacoes: body.observacoes ?? null,
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, representante: result.representante, senhaTemporaria: result.senhaTemporaria });
  } catch (e) {
    console.error('[API Admin Representantes POST]', e);
    return NextResponse.json({ error: 'Erro ao criar representante.' }, { status: 500 });
  }
}

