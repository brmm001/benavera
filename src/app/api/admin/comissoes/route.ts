// src/app/api/admin/comissoes/route.ts
// Admin: todas as comissões, com filtros e aprovação

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAllComissoes,
  createComissao,
  updateComissaoStatus,
  getCommissionRules,
} from '@/lib/atendente-db';
import type { CommissionStatus } from '@/lib/atendente-db';

const VALID_STATUSES: CommissionStatus[] = ['pendente', 'aprovada', 'paga', 'recusada', 'estornada'];

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_FINANCEIRO')) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const err = requireAdmin(session);
  if (err) return err;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const atendente_id = searchParams.get('atendente_id') || undefined;

  try {
    const [comissoes, regras] = await Promise.all([
      getAllComissoes({ status, atendente_id }),
      getCommissionRules(),
    ]);

    const totais = comissoes.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + c.valor;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ success: true, comissoes, totais, regras });
  } catch (e) {
    console.error('[API Admin Comissoes GET]', e);
    return NextResponse.json({ error: 'Erro ao carregar comissões.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Apenas o administrador pode criar comissões.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { prospect_clinic_id, atendente_id, atendente_name, evento, valor, regra_id } = body;

    if (!prospect_clinic_id || !atendente_id || !evento || !valor) {
      return NextResponse.json({ error: 'Campos obrigatórios: clínica, atendente, evento, valor.' }, { status: 400 });
    }

    const result = await createComissao({
      prospect_clinic_id,
      atendente_id,
      atendente_name,
      evento,
      valor: Number(valor),
      regra_id,
      gerada_por: session.userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, commission: result.commission }, { status: 201 });
  } catch (e) {
    console.error('[API Admin Comissoes POST]', e);
    return NextResponse.json({ error: 'Erro ao criar comissão.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  const err = requireAdmin(session);
  if (err) return err;

  try {
    const body = await request.json();
    const { id, status, justificativa } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id e status são obrigatórios.' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    // Atendente não pode aprovar própria comissão — garantido pois apenas admin/financeiro chegam aqui
    const updated = await updateComissaoStatus(id, status, session!.userId, justificativa);
    if (!updated) return NextResponse.json({ error: 'Comissão não encontrada.' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API Admin Comissoes PATCH]', e);
    return NextResponse.json({ error: 'Erro ao atualizar comissão.' }, { status: 500 });
  }
}
