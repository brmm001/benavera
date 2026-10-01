// src/app/api/admin/atendentes/distribuicao/route.ts
// Admin: estatísticas e log de distribuição de leads

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDistributionStats } from '@/lib/lead-distribution';
import { sql } from '@/lib/benavera-db';

async function getDistribuicaoLogExport(limit: number) {
  return sql`
    SELECT dl.*, u.name as atendente_name
    FROM lead_distribution_log dl
    LEFT JOIN users u ON u.id = dl.atendente_id
    ORDER BY dl.created_at DESC
    LIMIT ${limit}
  `;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
  }

  try {
    const [stats, log] = await Promise.all([
      getDistributionStats(),
      getDistribuicaoLogExport(200),
    ]);

    return NextResponse.json({ success: true, stats, log });
  } catch (e) {
    console.error('[API Admin Distribuicao]', e);
    return NextResponse.json({ error: 'Erro ao carregar dados de distribuição.' }, { status: 500 });
  }
}
