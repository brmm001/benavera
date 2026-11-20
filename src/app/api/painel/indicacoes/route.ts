// API: Indicações da Clínica
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

export async function GET() {
  const g = await requireClinicModule('indicacoes');
  if (!g.ok) return g.response;
  const rows = await sql`
    SELECT * FROM clinic_referrals WHERE clinic_id = ${g.ctx.clinicId}::uuid ORDER BY created_at DESC LIMIT 200
  `;
  return NextResponse.json({ success: true, referrals: rows });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('indicacoes');
  if (!g.ok) return g.response;
  const body = await request.json().catch(() => ({}));
  const indicador = String(body.indicador_nome || '').trim();
  const indicado = String(body.indicado_nome || '').trim();
  if (!indicador || !indicado) return NextResponse.json({ error: 'Nomes do indicador e indicado são obrigatórios.' }, { status: 400 });

  const rows = await sql`
    INSERT INTO clinic_referrals (clinic_id, indicador_nome, indicador_contato, indicado_nome, indicado_contato, origem, valor_estimado, responsavel, notas)
    VALUES (
      ${g.ctx.clinicId}::uuid, ${indicador.slice(0, 150)}, ${body.indicador_contato ? String(body.indicador_contato).slice(0, 80) : null},
      ${indicado.slice(0, 150)}, ${body.indicado_contato ? String(body.indicado_contato).slice(0, 80) : null},
      ${body.origem ? String(body.origem).slice(0, 80) : 'Paciente'},
      ${Math.max(0, Number(body.valor_estimado) || 0)},
      ${body.responsavel ? String(body.responsavel).slice(0, 100) : g.ctx.session.name},
      ${body.notas ? String(body.notas).slice(0, 1000) : null}
    )
    RETURNING *
  `;
  return NextResponse.json({ success: true, referral: rows[0] }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const g = await requireClinicModule('indicacoes');
  if (!g.ok) return g.response;
  const body = await request.json().catch(() => ({}));
  if (!body.id || !['NOVA', 'EM_CONTATO', 'CONVERTIDA', 'PERDIDA'].includes(body.status)) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }
  const rows = await sql`
    UPDATE clinic_referrals SET status = ${body.status} WHERE id = ${body.id}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid RETURNING *
  `;
  return NextResponse.json({ success: true, referral: rows[0] });
}
