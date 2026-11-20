// API: Gerador de Propostas Digitais (Orçamentos)
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

export async function GET() {
  const g = await requireClinicModule('propostas_digitais');
  if (!g.ok) return g.response;

  const [proposals, clinicRows] = await Promise.all([
    sql`SELECT * FROM clinic_digital_proposals WHERE clinic_id = ${g.ctx.clinicId}::uuid ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT nome_fantasia, razao_social, cnpj, telefone, cidade, estado FROM clinics WHERE id = ${g.ctx.clinicId}::uuid LIMIT 1`,
  ]);
  return NextResponse.json({ success: true, proposals, clinic: clinicRows[0] || null });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('propostas_digitais');
  if (!g.ok) return g.response;

  try {
    const body = await request.json().catch(() => ({}));
    const patientName = String(body.patient_name || '').trim();
    if (!patientName) return NextResponse.json({ error: 'Nome do paciente obrigatório.' }, { status: 400 });

    const procs = Array.isArray(body.procedimentos) ? body.procedimentos.slice(0, 30) : [];
    const subtotal = procs.reduce((s: number, p: { valor?: number; qtd?: number }) => s + (Number(p.valor) || 0) * (Number(p.qtd) || 1), 0);
    const desconto = Math.max(0, Math.min(subtotal, Number(body.desconto) || 0));
    const total = Math.max(0, subtotal - desconto);
    const token = randomBytes(16).toString('base64url');

    const rows = await sql`
      INSERT INTO clinic_digital_proposals (
        clinic_id, token, patient_name, patient_phone, patient_email, procedimentos, subtotal, desconto, total, condicoes, validade, status
      ) VALUES (
        ${g.ctx.clinicId}::uuid, ${token}, ${patientName.slice(0, 150)},
        ${body.patient_phone ? String(body.patient_phone).slice(0, 30) : null},
        ${body.patient_email ? String(body.patient_email).slice(0, 150) : null},
        ${JSON.stringify(procs)}::jsonb, ${subtotal}, ${desconto}, ${total},
        ${body.condicoes ? String(body.condicoes).slice(0, 1000) : null},
        ${body.validade || null}, 'ENVIADA'
      )
      RETURNING *
    `;
    return NextResponse.json({ success: true, proposal: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[API Painel Propostas Digitais POST]', err);
    return NextResponse.json({ error: 'Erro ao criar proposta digital.' }, { status: 500 });
  }
}
