// API: CRM Comercial da Clínica (Kanban integrado)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

const VALID_STAGES = ['novo_paciente', 'avaliacao', 'orcamento', 'negociacao', 'financiamento', 'fechado', 'perdido'];

export async function GET() {
  const g = await requireClinicModule('crm');
  if (!g.ok) return g.response;

  const rows = await sql`
    SELECT * FROM clinic_crm_deals
    WHERE clinic_id = ${g.ctx.clinicId}::uuid
    ORDER BY updated_at DESC
    LIMIT 500
  `;
  return NextResponse.json({ success: true, deals: rows });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('crm');
  if (!g.ok) return g.response;

  try {
    const body = await request.json().catch(() => ({}));
    const patientName = String(body.patient_name || '').trim();
    if (!patientName) return NextResponse.json({ error: 'Nome do paciente é obrigatório.' }, { status: 400 });
    const stage = VALID_STAGES.includes(body.stage) ? body.stage : 'novo_paciente';

    const rows = await sql`
      INSERT INTO clinic_crm_deals (
        clinic_id, patient_name, patient_phone, patient_email, procedimento, valor, stage, responsavel, notas, custom_fields, next_action_at
      ) VALUES (
        ${g.ctx.clinicId}::uuid,
        ${patientName.slice(0, 150)},
        ${body.patient_phone ? String(body.patient_phone).slice(0, 30) : null},
        ${body.patient_email ? String(body.patient_email).slice(0, 150) : null},
        ${body.procedimento ? String(body.procedimento).slice(0, 150) : null},
        ${Math.max(0, Number(body.valor) || 0)},
        ${stage},
        ${body.responsavel ? String(body.responsavel).slice(0, 100) : g.ctx.session.name},
        ${body.notas ? String(body.notas).slice(0, 2000) : null},
        ${JSON.stringify(body.custom_fields && typeof body.custom_fields === 'object' ? body.custom_fields : {})}::jsonb,
        ${body.next_action_at || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ success: true, deal: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[API Painel CRM POST]', err);
    return NextResponse.json({ error: 'Erro ao criar oportunidade.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const g = await requireClinicModule('crm');
  if (!g.ok) return g.response;

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

    if (body.stage && !VALID_STAGES.includes(body.stage)) {
      return NextResponse.json({ error: 'Etapa inválida.' }, { status: 400 });
    }

    const rows = await sql`
      UPDATE clinic_crm_deals SET
        stage = COALESCE(${body.stage || null}, stage),
        responsavel = COALESCE(${body.responsavel !== undefined ? String(body.responsavel) : null}, responsavel),
        notas = COALESCE(${body.notas !== undefined ? String(body.notas) : null}, notas),
        valor = COALESCE(${body.valor !== undefined ? Math.max(0, Number(body.valor) || 0) : null}, valor),
        updated_at = NOW()
      WHERE id = ${id}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid
      RETURNING *
    `;
    if (!rows[0]) return NextResponse.json({ error: 'Oportunidade não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true, deal: rows[0] });
  } catch (err) {
    console.error('[API Painel CRM PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar oportunidade.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const g = await requireClinicModule('crm');
  if (!g.ok) return g.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

  await sql`DELETE FROM clinic_crm_deals WHERE id = ${id}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid`;
  return NextResponse.json({ success: true });
}
