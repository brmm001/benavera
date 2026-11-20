// API: Metas e Comissões Internas da Clínica (separadas da correspondência bancária Benavera)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

export async function GET() {
  const g = await requireClinicModule('metas_comissoes');
  if (!g.ok) return g.response;

  const rows = await sql`
    SELECT * FROM clinic_consultants WHERE clinic_id = ${g.ctx.clinicId}::uuid ORDER BY fechamentos_valor DESC, nome ASC
  `;
  return NextResponse.json({ success: true, consultants: rows });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('metas_comissoes');
  if (!g.ok) return g.response;

  try {
    const body = await request.json().catch(() => ({}));
    const nome = String(body.nome || '').trim();
    if (!nome) return NextResponse.json({ error: 'Nome do consultor obrigatório.' }, { status: 400 });

    const rows = await sql`
      INSERT INTO clinic_consultants (clinic_id, nome, cargo, meta_mensal, comissao_percent, fechamentos_valor, fechamentos_qtd)
      VALUES (
        ${g.ctx.clinicId}::uuid, ${nome.slice(0, 150)},
        ${body.cargo ? String(body.cargo).slice(0, 100) : 'Consultor(a)'},
        ${Math.max(0, Number(body.meta_mensal) || 0)},
        ${Math.max(0, Math.min(100, Number(body.comissao_percent) || 0))},
        ${Math.max(0, Number(body.fechamentos_valor) || 0)},
        ${Math.max(0, Math.floor(Number(body.fechamentos_qtd) || 0))}
      )
      RETURNING *
    `;
    return NextResponse.json({ success: true, consultant: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[API Painel Metas POST]', err);
    return NextResponse.json({ error: 'Erro ao salvar consultor.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const g = await requireClinicModule('metas_comissoes');
  if (!g.ok) return g.response;
  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

  const rows = await sql`
    UPDATE clinic_consultants SET
      fechamentos_valor = COALESCE(${body.fechamentos_valor !== undefined ? Math.max(0, Number(body.fechamentos_valor) || 0) : null}, fechamentos_valor),
      fechamentos_qtd = COALESCE(${body.fechamentos_qtd !== undefined ? Math.max(0, Math.floor(Number(body.fechamentos_qtd) || 0)) : null}, fechamentos_qtd),
      meta_mensal = COALESCE(${body.meta_mensal !== undefined ? Math.max(0, Number(body.meta_mensal) || 0) : null}, meta_mensal),
      comissao_percent = COALESCE(${body.comissao_percent !== undefined ? Math.max(0, Number(body.comissao_percent) || 0) : null}, comissao_percent)
    WHERE id = ${body.id}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid
    RETURNING *
  `;
  return NextResponse.json({ success: true, consultant: rows[0] });
}
