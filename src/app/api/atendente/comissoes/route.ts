// src/app/api/atendente/comissoes/route.ts
// Comissões do atendente autenticado

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAtendenteComissoes } from '@/lib/atendente-db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const comissoes = await getAtendenteComissoes(session.userId);

    // Calcular totais por status
    const totais = comissoes.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + c.valor;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ success: true, comissoes, totais });
  } catch (e) {
    console.error('[API Atendente Comissoes]', e);
    return NextResponse.json({ error: 'Erro ao carregar comissões.' }, { status: 500 });
  }
}
