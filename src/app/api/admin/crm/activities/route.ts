import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_ANALYST') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entity_id');
  const entityType = searchParams.get('entity_type') || 'clinic_lead';
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

  try {
    let rows;
    if (entityId) {
      rows = await sql`
        SELECT a.*, u.name as actor_name, u.email as actor_email
        FROM crm_activities a
        LEFT JOIN users u ON u.id = a.actor_id
        WHERE a.entity_id = ${entityId} AND a.entity_type = ${entityType}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT a.*, u.name as actor_name, u.email as actor_email
        FROM crm_activities a
        LEFT JOIN users u ON u.id = a.actor_id
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ activities: rows });
  } catch (err) {
    console.error('[CRM Activities GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar atividades.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_ANALYST') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { entity_type, entity_id, tipo, descricao, metadata } = body;

    const VALID_TIPOS = ['call', 'email', 'whatsapp', 'note', 'meeting', 'document', 'status_change'];

    if (!entity_type || !entity_id || !tipo) {
      return NextResponse.json({ error: 'entity_type, entity_id e tipo são obrigatórios.' }, { status: 400 });
    }
    if (!VALID_TIPOS.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO crm_activities (entity_type, entity_id, actor_id, tipo, descricao, metadata)
      VALUES (
        ${entity_type}, ${entity_id}, ${session.userId}::uuid,
        ${tipo}, ${descricao || null},
        ${metadata ? JSON.stringify(metadata) : null}::jsonb
      )
      RETURNING *
    `;

    // Atualizar last_contact_at se for interação real (não nota interna)
    if (['call', 'email', 'whatsapp', 'meeting'].includes(tipo) && entity_type === 'clinic_lead') {
      await sql`
        UPDATE clinic_leads SET last_contact_at = NOW(), updated_at = NOW() WHERE id = ${entity_id}
      `;
    }

    return NextResponse.json({ activity: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[CRM Activities POST]', err);
    return NextResponse.json({ error: 'Erro ao registrar atividade.' }, { status: 500 });
  }
}
