// API: Indicadores Comerciais da Clínica (dados reais agregados, sem mock)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

export async function GET(request: NextRequest) {
  const g = await requireClinicModule('indicadores');
  if (!g.ok) return g.response;

  const days = Math.min(365, Math.max(7, Number(request.nextUrl.searchParams.get('days')) || 90));
  const cid = g.ctx.clinicId;

  const [apps, deals, recovery, digitalProps, monthly] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status::text <> 'DRAFT') AS total,
        COUNT(*) FILTER (WHERE status::text IN ('APPROVED','CONTRACT_SIGNED','PAYOUT_SCHEDULED','PAYOUT_COMPLETED','TREATMENT_RELEASED')) AS aprovadas,
        COUNT(*) FILTER (WHERE status::text IN ('DECLINED','PRE_ANALYSIS_DECLINED')) AS recusadas,
        COALESCE(SUM(valor_financiado) FILTER (WHERE status::text IN ('APPROVED','CONTRACT_SIGNED','PAYOUT_SCHEDULED','PAYOUT_COMPLETED','TREATMENT_RELEASED')), 0) AS volume_financiado,
        COALESCE(AVG(valor_financiado) FILTER (WHERE status::text <> 'DRAFT'), 0) AS ticket_medio
      FROM applications
      WHERE clinic_id = ${cid}::uuid AND created_at >= NOW() - (${days}::int * INTERVAL '1 day')
    `,
    sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE stage = 'fechado') AS fechados,
        COUNT(*) FILTER (WHERE stage = 'perdido') AS perdidos,
        COALESCE(SUM(valor) FILTER (WHERE stage = 'fechado'), 0) AS valor_fechado
      FROM clinic_crm_deals
      WHERE clinic_id = ${cid}::uuid AND created_at >= NOW() - (${days}::int * INTERVAL '1 day')
    `,
    sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'RECUPERADA') AS recuperadas,
        COALESCE(SUM(valor) FILTER (WHERE status = 'RECUPERADA'), 0) AS valor_recuperado
      FROM clinic_recovery_items
      WHERE clinic_id = ${cid}::uuid AND created_at >= NOW() - (${days}::int * INTERVAL '1 day')
    `,
    sql`
      SELECT COUNT(*) AS emitidas, COUNT(*) FILTER (WHERE status = 'ACEITA') AS aceitas
      FROM clinic_digital_proposals
      WHERE clinic_id = ${cid}::uuid AND created_at >= NOW() - (${days}::int * INTERVAL '1 day')
    `,
    sql`
      SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS mes,
             COUNT(*) AS qtd,
             COALESCE(SUM(valor_financiado), 0) AS volume
      FROM applications
      WHERE clinic_id = ${cid}::uuid AND status::text <> 'DRAFT' AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY 1 ORDER BY 1 ASC
    `,
  ]);

  const a = apps[0] || {};
  const d = deals[0] || {};
  const r = recovery[0] || {};
  const dp = digitalProps[0] || {};

  const orcEmitidos = Number(dp.emitidas || 0) + Number(d.total || 0);
  const orcFechados = Number(dp.aceitas || 0) + Number(d.fechados || 0);

  return NextResponse.json({
    success: true,
    days,
    metrics: {
      orcamentos_emitidos: orcEmitidos,
      orcamentos_fechados: orcFechados,
      taxa_conversao: orcEmitidos > 0 ? (orcFechados / orcEmitidos) * 100 : 0,
      vendas_perdidas: Number(d.perdidos || 0) + Number(a.recusadas || 0),
      valor_recuperado: Number(r.valor_recuperado || 0),
      valor_financiado: Number(a.volume_financiado || 0),
      ticket_medio: Number(a.ticket_medio || 0),
      propostas_financiamento: Number(a.total || 0),
      propostas_aprovadas: Number(a.aprovadas || 0),
    },
    monthly: monthly.map((m) => ({ mes: String(m.mes), qtd: Number(m.qtd), volume: Number(m.volume) })),
  });
}
