import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export const PIPELINE_STAGES = [
  { id: 'novo', label: 'Novo Lead', color: '#64748b' },
  { id: 'em_contato', label: 'Em Contato', color: '#3b82f6' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', color: '#8b5cf6' },
  { id: 'em_negociacao', label: 'Em Negociação', color: '#f59e0b' },
  { id: 'credenciado', label: 'Credenciado', color: '#10b981' },
  { id: 'ativo', label: 'Parceiro Ativo', color: '#059669' },
  { id: 'perdido', label: 'Perdido', color: '#ef4444' },
];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_ANALYST') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const assigned = searchParams.get('assigned') || '';

  try {
    let rows;
    if (search && assigned) {
      rows = await sql`
        SELECT cl.*,
               u.name as assigned_name,
               u.email as assigned_email
        FROM clinic_leads cl
        LEFT JOIN users u ON u.id = cl.assigned_to
        WHERE (cl.nome_clinica ILIKE ${'%' + search + '%'} OR cl.nome_responsavel ILIKE ${'%' + search + '%'})
          AND cl.assigned_to = ${assigned}::uuid
        ORDER BY cl.updated_at DESC
      `;
    } else if (search) {
      rows = await sql`
        SELECT cl.*,
               u.name as assigned_name,
               u.email as assigned_email
        FROM clinic_leads cl
        LEFT JOIN users u ON u.id = cl.assigned_to
        WHERE cl.nome_clinica ILIKE ${'%' + search + '%'} OR cl.nome_responsavel ILIKE ${'%' + search + '%'}
        ORDER BY cl.updated_at DESC
      `;
    } else if (assigned) {
      rows = await sql`
        SELECT cl.*,
               u.name as assigned_name,
               u.email as assigned_email
        FROM clinic_leads cl
        LEFT JOIN users u ON u.id = cl.assigned_to
        WHERE cl.assigned_to = ${assigned}::uuid
        ORDER BY cl.updated_at DESC
      `;
    } else {
      rows = await sql`
        SELECT cl.*,
               u.name as assigned_name,
               u.email as assigned_email
        FROM clinic_leads cl
        LEFT JOIN users u ON u.id = cl.assigned_to
        ORDER BY cl.updated_at DESC
      `;
    }

    // Agrupar por estágio
    const grouped: Record<string, typeof rows> = {};
    for (const stage of PIPELINE_STAGES) {
      grouped[stage.id] = [];
    }
    for (const row of rows) {
      const stage = (row.pipeline_stage as string) || 'novo';
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(row);
    }

    return NextResponse.json({ stages: PIPELINE_STAGES, cards: grouped, total: rows.length });
  } catch (err) {
    console.error('[CRM Pipeline GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar pipeline.' }, { status: 500 });
  }
}
