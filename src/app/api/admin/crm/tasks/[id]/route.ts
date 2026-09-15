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
  const { status, assigned_to, title, description, priority, due_date } = body;

  try {
    if (status === 'done') {
      await sql`
        UPDATE crm_tasks SET status = 'done', completed_at = NOW() WHERE id = ${id}::uuid
      `;
    } else {
      await sql`
        UPDATE crm_tasks SET
          status = COALESCE(${status || null}, status),
          assigned_to = COALESCE(${assigned_to || null}, assigned_to),
          title = COALESCE(${title || null}, title),
          description = COALESCE(${description || null}, description),
          priority = COALESCE(${priority || null}, priority),
          due_date = COALESCE(${due_date || null}, due_date)
        WHERE id = ${id}::uuid
      `;
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Tasks PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar tarefa.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Apenas admins podem deletar tarefas.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    await sql`DELETE FROM crm_tasks WHERE id = ${id}::uuid`;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao deletar.' }, { status: 500 });
  }
}
