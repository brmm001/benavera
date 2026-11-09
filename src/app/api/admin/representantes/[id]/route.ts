// PATCH atualiza representante / ações (resetSenha)
import { NextRequest, NextResponse } from 'next/server';
import { requireRepAdmin, isUuid } from '@/lib/rep-guards';
import { updateRepresentante, resetRepresentantePassword } from '@/lib/representantes-db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRepAdmin();
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'resetSenha') {
      const senha = await resetRepresentantePassword(id);
      if (!senha) return NextResponse.json({ error: 'Representante sem usuário de login.' }, { status: 400 });
      return NextResponse.json({ success: true, senhaTemporaria: senha });
    }

    const rep = await updateRepresentante(id, {
      nome: body.nome,
      documento: body.documento,
      telefone: body.telefone,
      chave_pix: body.chave_pix,
      tipo_pix: body.tipo_pix,
      comissao_percent: body.comissao_percent,
      periodo_meses: body.periodo_meses,
      mensalidade_percent: body.mensalidade_percent,
      bonus_ativacao: body.bonus_ativacao,
      observacoes: body.observacoes,
      ativo: typeof body.ativo === 'boolean' ? body.ativo : undefined,
    });
    if (!rep) return NextResponse.json({ error: 'Representante não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true, representante: rep });
  } catch (e) {
    console.error('[API Admin Representantes PATCH]', e);
    return NextResponse.json({ error: 'Erro ao atualizar representante.' }, { status: 500 });
  }
}

