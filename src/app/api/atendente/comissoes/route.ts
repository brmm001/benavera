// src/app/api/atendente/comissoes/route.ts
// Comissões do atendente autenticado (separando Mensalidades SaaS automáticas vs. Eventos manuais)

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAtendenteComissoes } from '@/lib/atendente-db';
import { listAtendenteSaasComissoes } from '@/lib/seller-links';
import { sql } from '@/lib/benavera-db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const [comissoes, saas, userRows] = await Promise.all([
      getAtendenteComissoes(session.userId),
      listAtendenteSaasComissoes({ atendenteUserId: session.userId }),
      sql`SELECT mensalidade_percent, comissao_periodo_meses, max_discount_percent, max_trial_days FROM users WHERE id = ${session.userId}::uuid LIMIT 1`,
    ]);

    const totais = comissoes.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + c.valor;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      comissoes,
      totais,
      saasComissoes: saas.comissoes,
      saasTotais: saas.totais,
      config: {
        mensalidadePercent: Number(userRows[0]?.mensalidade_percent || 0),
        periodoMeses: userRows[0]?.comissao_periodo_meses ?? null,
        maxDiscountPercent: Number(userRows[0]?.max_discount_percent || 0),
        maxTrialDays: Number(userRows[0]?.max_trial_days || 0),
      },
    });
  } catch (e) {
    console.error('[API Atendente Comissoes]', e);
    return NextResponse.json({ error: 'Erro ao carregar comissões.' }, { status: 500 });
  }
}
