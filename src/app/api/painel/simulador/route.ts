// API: Simulador Inteligente da Clínica
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';
import { getSimulatorConfig } from '@/lib/simulator-db';

export async function GET() {
  const g = await requireClinicModule('simulador');
  if (!g.ok) return g.response;

  const [partners, saved, config] = await Promise.all([
    sql`SELECT id, nome, ticket_minimo, ticket_maximo, prazo_maximo, comissao_benavera_percent FROM financial_partners WHERE ativo = TRUE ORDER BY prioridade ASC`,
    sql`SELECT * FROM clinic_saved_simulations WHERE clinic_id = ${g.ctx.clinicId}::uuid ORDER BY created_at DESC LIMIT 30`,
    getSimulatorConfig().catch(() => null),
  ]);
  return NextResponse.json({ success: true, partners, saved, config });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('simulador');
  if (!g.ok) return g.response;

  try {
    const body = await request.json().catch(() => ({}));
    const valor = Math.max(100, Number(body.valor) || 0);
    const parcelas = Math.max(1, Math.min(60, Math.floor(Number(body.parcelas) || 12)));
    const valorParcela = Math.max(0, Number(body.valor_parcela) || 0);
    const taxaMensal = Math.max(0, Number(body.taxa_mensal) || 0);
    const repasseLiquido = Math.max(0, Number(body.repasse_liquido) || 0);
    const token = randomBytes(12).toString('base64url');

    const rows = await sql`
      INSERT INTO clinic_saved_simulations (clinic_id, patient_name, valor, parcelas, valor_parcela, taxa_mensal, repasse_liquido, share_token, notas)
      VALUES (
        ${g.ctx.clinicId}::uuid,
        ${body.patient_name ? String(body.patient_name).slice(0, 150) : null},
        ${valor}, ${parcelas}, ${valorParcela}, ${taxaMensal}, ${repasseLiquido}, ${token},
        ${body.notas ? String(body.notas).slice(0, 500) : null}
      )
      RETURNING *
    `;
    return NextResponse.json({ success: true, simulation: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[API Painel Simulador POST]', err);
    return NextResponse.json({ error: 'Erro ao salvar simulação.' }, { status: 500 });
  }
}
