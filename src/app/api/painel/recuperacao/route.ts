// API: Recuperação de Orçamentos (isolada por clinic_id e protegida por requireClinicModule)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

export async function GET() {
  const g = await requireClinicModule('recuperacao');
  if (!g.ok) return g.response;

  const rows = await sql`
    SELECT * FROM clinic_recovery_items
    WHERE clinic_id = ${g.ctx.clinicId}::uuid
    ORDER BY
      CASE WHEN status IN ('ABERTA','EM_CONTATO') THEN 0 ELSE 1 END,
      valor DESC,
      created_at DESC
    LIMIT 500
  `;
  return NextResponse.json({ success: true, items: rows });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('recuperacao');
  if (!g.ok) return g.response;

  try {
    const body = await request.json().catch(() => ({}));

    // Importação em lote (CSV)
    if (Array.isArray(body.bulk)) {
      let inserted = 0;
      for (const raw of body.bulk.slice(0, 200)) {
        const patientName = String(raw.patient_name || '').trim();
        const procedimento = String(raw.procedimento || 'Tratamento').trim();
        if (!patientName) continue;
        await sql`
          INSERT INTO clinic_recovery_items (clinic_id, patient_name, patient_phone, patient_email, procedimento, valor, motivo, notas)
          VALUES (
            ${g.ctx.clinicId}::uuid,
            ${patientName.slice(0, 150)},
            ${raw.patient_phone ? String(raw.patient_phone).slice(0, 30) : null},
            ${raw.patient_email ? String(raw.patient_email).slice(0, 150) : null},
            ${procedimento.slice(0, 150)},
            ${Math.max(0, Number(raw.valor) || 0)},
            ${raw.motivo ? String(raw.motivo).slice(0, 200) : 'Importado via planilha'},
            ${raw.notas ? String(raw.notas).slice(0, 1000) : null}
          )
        `;
        inserted++;
      }
      return NextResponse.json({ success: true, inserted });
    }

    const patientName = String(body.patient_name || '').trim();
    const procedimento = String(body.procedimento || '').trim();
    if (!patientName || !procedimento) {
      return NextResponse.json({ error: 'Nome do paciente e procedimento são obrigatórios.' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO clinic_recovery_items (
        clinic_id, patient_name, patient_phone, patient_email, procedimento, valor, motivo, lembrete_em, notas
      ) VALUES (
        ${g.ctx.clinicId}::uuid,
        ${patientName.slice(0, 150)},
        ${body.patient_phone ? String(body.patient_phone).slice(0, 30) : null},
        ${body.patient_email ? String(body.patient_email).slice(0, 150) : null},
        ${procedimento.slice(0, 150)},
        ${Math.max(0, Number(body.valor) || 0)},
        ${body.motivo ? String(body.motivo).slice(0, 200) : null},
        ${body.lembrete_em || null},
        ${body.notas ? String(body.notas).slice(0, 1000) : null}
      )
      RETURNING *
    `;
    return NextResponse.json({ success: true, item: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[API Painel Recuperacao POST]', err);
    return NextResponse.json({ error: 'Erro ao cadastrar oportunidade.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const g = await requireClinicModule('recuperacao');
  if (!g.ok) return g.response;

  try {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

    const existing = await sql`
      SELECT * FROM clinic_recovery_items WHERE id = ${id}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid LIMIT 1
    `;
    if (!existing[0]) return NextResponse.json({ error: 'Oportunidade não encontrada.' }, { status: 404 });

    const cur = existing[0];
    const nextStatus = ['ABERTA', 'EM_CONTATO', 'RECUPERADA', 'PERDIDA'].includes(body.status) ? body.status : String(cur.status);
    let historico = Array.isArray(cur.historico) ? [...cur.historico] : [];
    let tentativas = Number(cur.tentativas || 0);
    let ultimoContato = cur.ultimo_contato_em;

    if (body.contato_nota) {
      tentativas += 1;
      ultimoContato = new Date().toISOString();
      historico = [
        { data: ultimoContato, por: g.ctx.session.name, nota: String(body.contato_nota).slice(0, 500) },
        ...historico,
      ].slice(0, 50);
    }

    const rows = await sql`
      UPDATE clinic_recovery_items SET
        status = ${nextStatus},
        tentativas = ${tentativas},
        ultimo_contato_em = ${ultimoContato},
        historico = ${JSON.stringify(historico)}::jsonb,
        notas = COALESCE(${body.notas !== undefined ? String(body.notas) : null}, notas),
        lembrete_em = COALESCE(${body.lembrete_em !== undefined ? body.lembrete_em : null}, lembrete_em),
        updated_at = NOW()
      WHERE id = ${id}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid
      RETURNING *
    `;
    return NextResponse.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error('[API Painel Recuperacao PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 });
  }
}
