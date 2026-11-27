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
import { sql } from '@/lib/benavera-db';
import { sendAtendenteCommissionEmail } from '@/lib/email';
import { listAtendenteSaasComissoes, updateAtendenteSaasComissaoStatus } from '@/lib/seller-links';

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
    const [comissoes, regras, saas] = await Promise.all([
      getAllComissoes({ status, atendente_id }),
      getCommissionRules(),
      listAtendenteSaasComissoes({ atendenteUserId: atendente_id }),
    ]);

    const totais = comissoes.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + c.valor;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      comissoes,
      totais,
      regras,
      saasComissoes: saas.comissoes,
      saasTotais: saas.totais,
    });
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
    const { id, status, justificativa, kind, comprovante_url } = body;

    if (kind === 'saas') {
      if (!id || !['PAGA', 'CANCELADA', 'A_RECEBER'].includes(String(status))) {
        return NextResponse.json({ error: 'id e status SaaS válido (PAGA, CANCELADA ou A_RECEBER) são obrigatórios.' }, { status: 400 });
      }
      const ok = await updateAtendenteSaasComissaoStatus({
        id: String(id),
        status: String(status) as 'PAGA' | 'CANCELADA' | 'A_RECEBER',
        observacao: justificativa ?? null,
        comprovanteUrl: comprovante_url ?? null,
        pagoPor: session!.name,
      });
      if (!ok) return NextResponse.json({ error: 'Comissão SaaS não encontrada.' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (!id || !status) {
      return NextResponse.json({ error: 'id e status são obrigatórios.' }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    // Atendente não pode aprovar própria comissão — garantido pois apenas admin/financeiro chegam aqui
    const updated = await updateComissaoStatus(id, status, session!.userId, justificativa);
    if (!updated) return NextResponse.json({ error: 'Comissão não encontrada.' }, { status: 404 });

    if (status === 'aprovada' || status === 'paga') {
      await (async () => {
        const rows = await sql`
          SELECT c.id, c.atendente_id, c.atendente_name, c.evento, c.valor, u.email
          FROM commissions c
          JOIN users u ON u.id = c.atendente_id
          WHERE c.id = ${id} LIMIT 1
        `;
        const cm = rows[0];
        if (cm?.email) {
          await sendAtendenteCommissionEmail({
            to: String(cm.email),
            userId: String(cm.atendente_id),
            atendenteName: String(cm.atendente_name || 'Comercial'),
            evento: String(cm.evento || 'Comissão'),
            valor: Number(cm.valor || 0),
            status,
            justificativa: justificativa || null,
            commissionId: String(cm.id),
          });
        }
      })().catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API Admin Comissoes PATCH]', e);
    return NextResponse.json({ error: 'Erro ao atualizar comissão.' }, { status: 500 });
  }
}
