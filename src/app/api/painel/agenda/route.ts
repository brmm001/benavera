// API: Agenda Comercial da Clínica
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

export async function GET() {
  const g = await requireClinicModule('agenda_comercial');
  if (!g.ok) return g.response;
  const rows = await sql`
    SELECT * FROM clinic_crm_tasks WHERE clinic_id = ${g.ctx.clinicId}::uuid
    ORDER BY completed ASC, due_at ASC NULLS LAST, created_at DESC LIMIT 200
  `;
  return NextResponse.json({ success: true, tasks: rows });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('agenda_comercial');
  if (!g.ok) return g.response;
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) return NextResponse.json({ error: 'Título obrigatório.' }, { status: 400 });

  const rows = await sql`
    INSERT INTO clinic_crm_tasks (clinic_id, deal_id, title, type, due_at, assigned_to_name, notes)
    VALUES (
      ${g.ctx.clinicId}::uuid, ${body.deal_id || null}, ${title.slice(0, 200)},
      ${['retorno', 'ligacao', 'whatsapp', 'consulta', 'proposta'].includes(body.type) ? body.type : 'retorno'},
      ${body.due_at || null}, ${body.assigned_to_name ? String(body.assigned_to_name).slice(0, 100) : g.ctx.session.name},
      ${body.notes ? String(body.notes).slice(0, 1000) : null}
    )
    RETURNING *
  `;
  return NextResponse.json({ success: true, task: rows[0] }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const g = await requireClinicModule('agenda_comercial');
  if (!g.ok) return g.response;
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

  const rows = await sql`
    UPDATE clinic_crm_tasks SET completed = COALESCE(${typeof body.completed === 'boolean' ? body.completed : null}, completed)
    WHERE id = ${body.id}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid
    RETURNING *
  `;
  return NextResponse.json({ success: true, task: rows[0] });
}
