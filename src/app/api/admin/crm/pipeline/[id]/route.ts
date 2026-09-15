import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_ANALYST') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { stage, assigned_to, next_followup_at } = body;

  const VALID_STAGES = ['novo', 'em_contato', 'proposta_enviada', 'em_negociacao', 'credenciado', 'ativo', 'perdido'];

  if (stage && !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Estágio inválido.' }, { status: 400 });
  }

  try {
    // Registrar atividade automática de mudança de stage
    if (stage) {
      await sql`
        UPDATE clinic_leads
        SET pipeline_stage = ${stage}, updated_at = NOW()
        WHERE id = ${id}
      `;

      await sql`
        INSERT INTO crm_activities (entity_type, entity_id, actor_id, tipo, descricao, metadata)
        VALUES ('clinic_lead', ${id}, ${session.userId}::uuid, 'status_change',
          ${'Movido para: ' + stage},
          ${JSON.stringify({ new_stage: stage, actor: session.name })}::jsonb)
      `;
    }

    if (assigned_to !== undefined) {
      await sql`
        UPDATE clinic_leads
        SET assigned_to = ${assigned_to ? assigned_to : null}, updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    if (next_followup_at !== undefined) {
      await sql`
        UPDATE clinic_leads
        SET next_followup_at = ${next_followup_at}, updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[CRM Stage PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 });
  }
}
