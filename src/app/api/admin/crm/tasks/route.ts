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
  const status = searchParams.get('status') || 'open';
  const assignedTo = searchParams.get('assigned_to') || '';
  const entityId = searchParams.get('entity_id') || '';

  try {
    let rows;
    if (entityId) {
      rows = await sql`
        SELECT t.*, u.name as assigned_name, u2.name as created_name
        FROM crm_tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        LEFT JOIN users u2 ON u2.id = t.created_by
        WHERE t.entity_id = ${entityId}
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
          t.due_date ASC NULLS LAST
      `;
    } else if (assignedTo) {
      rows = await sql`
        SELECT t.*, u.name as assigned_name, u2.name as created_name
        FROM crm_tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        LEFT JOIN users u2 ON u2.id = t.created_by
        WHERE t.status = ${status} AND t.assigned_to = ${assignedTo}::uuid
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
          t.due_date ASC NULLS LAST
      `;
    } else {
      rows = await sql`
        SELECT t.*, u.name as assigned_name, u2.name as created_name
        FROM crm_tasks t
        LEFT JOIN users u ON u.id = t.assigned_to
        LEFT JOIN users u2 ON u2.id = t.created_by
        WHERE t.status = ${status}
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
          t.due_date ASC NULLS LAST
      `;
    }
    return NextResponse.json({ tasks: rows });
  } catch (err) {
    console.error('[Tasks GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar tarefas.' }, { status: 500 });
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
    const { title, description, entity_type, entity_id, assigned_to, priority, due_date } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 });

    const rows = await sql`
      INSERT INTO crm_tasks (title, description, entity_type, entity_id, assigned_to, created_by, priority, due_date)
      VALUES (
        ${title.trim()},
        ${description || null},
        ${entity_type || null},
        ${entity_id || null},
        ${assigned_to || null},
        ${session.userId}::uuid,
        ${priority || 'medium'},
        ${due_date || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ task: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[Tasks POST]', err);
    return NextResponse.json({ error: 'Erro ao criar tarefa.' }, { status: 500 });
  }
}
