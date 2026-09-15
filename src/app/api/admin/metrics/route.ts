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
  const period = searchParams.get('period') || '30'; // dias

  try {
    // ── Financiamentos ──────────────────────────────────────────────────────
    const appsByStatus = await sql`
      SELECT status, COUNT(*) as total, COALESCE(SUM(valor_tratamento), 0) as volume
      FROM applications
      GROUP BY status ORDER BY total DESC
    `;

    const appsByMonth = await sql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as total,
        COALESCE(SUM(valor_tratamento), 0) as volume,
        COALESCE(SUM(CASE WHEN status IN ('APPROVED','CONTRACT_SIGNED','PAYOUT_COMPLETED','TREATMENT_RELEASED') THEN valor_tratamento ELSE 0 END), 0) as aprovado
      FROM applications
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC
    `;

    const ticketByCategory = await sql`
      SELECT categoria, COUNT(*) as total, AVG(valor_tratamento) as avg_ticket
      FROM applications
      WHERE categoria IS NOT NULL
      GROUP BY categoria ORDER BY total DESC LIMIT 8
    `;

    // ── Pipeline CRM ────────────────────────────────────────────────────────
    const pipelineByStage = await sql`
      SELECT pipeline_stage as stage, COUNT(*) as total
      FROM clinic_leads GROUP BY pipeline_stage
    `;

    const clinicsByMonth = await sql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as total
      FROM clinic_leads
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC
    `;

    // ── Clínicas ────────────────────────────────────────────────────────────
    const totalClinics = await sql`SELECT COUNT(*) as total FROM clinics WHERE ativo = true`;
    const clinicsByEspecialidade = await sql`
      SELECT especialidade, COUNT(*) as total
      FROM clinics WHERE especialidade IS NOT NULL
      GROUP BY especialidade ORDER BY total DESC LIMIT 8
    `;
    const clinicsByEstado = await sql`
      SELECT estado, COUNT(*) as total
      FROM clinics WHERE estado IS NOT NULL
      GROUP BY estado ORDER BY total DESC LIMIT 10
    `;

    // ── Pacientes / Leads ───────────────────────────────────────────────────
    const patientsByStatus = await sql`
      SELECT status, COUNT(*) as total FROM patient_leads GROUP BY status
    `;
    const patientsByTratamento = await sql`
      SELECT categoria_tratamento as tratamento, COUNT(*) as total, AVG(valor_tratamento) as avg_valor
      FROM patient_leads WHERE categoria_tratamento IS NOT NULL
      GROUP BY tratamento ORDER BY total DESC LIMIT 8
    `;
    const patientsByOrigin = await sql`
      SELECT COALESCE(utm_source, origem_lead, 'Direto') as origem, COUNT(*) as total
      FROM patient_leads
      GROUP BY origem ORDER BY total DESC LIMIT 8
    `;

    // ── Repasses ────────────────────────────────────────────────────────────
    const payoutsSummary = await sql`
      SELECT
        status,
        COUNT(*) as total,
        COALESCE(SUM(valor_liquido_clinica), 0) as total_valor
      FROM payouts GROUP BY status
    `;

    const totalUsers = await sql`SELECT COUNT(*) as total FROM users WHERE ativo = true`;
    const totalApps = await sql`SELECT COUNT(*) as total FROM applications`;
    const totalVolume = await sql`SELECT COALESCE(SUM(valor_tratamento), 0) as total FROM applications WHERE status NOT IN ('CANCELLED','DECLINED')`;
    const avgTicket = await sql`SELECT COALESCE(AVG(valor_tratamento), 0) as avg FROM applications WHERE status NOT IN ('CANCELLED','DECLINED') AND valor_tratamento > 0`;

    return NextResponse.json({
      kpis: {
        totalClinics: Number(totalClinics[0]?.total || 0),
        totalUsers: Number(totalUsers[0]?.total || 0),
        totalApplications: Number(totalApps[0]?.total || 0),
        totalVolume: Number(totalVolume[0]?.total || 0),
        avgTicket: Number(avgTicket[0]?.avg || 0),
      },
      applications: {
        byStatus: appsByStatus.map(r => ({ status: r.status, total: Number(r.total), volume: Number(r.volume) })),
        byMonth: appsByMonth.map(r => ({ month: r.month, total: Number(r.total), volume: Number(r.volume), aprovado: Number(r.aprovado) })),
        byCategory: ticketByCategory.map(r => ({ categoria: r.categoria, total: Number(r.total), avgTicket: Number(r.avg_ticket) })),
      },
      pipeline: {
        byStage: pipelineByStage.map(r => ({ stage: r.stage, total: Number(r.total) })),
        byMonth: clinicsByMonth.map(r => ({ month: r.month, total: Number(r.total) })),
      },
      clinics: {
        byEspecialidade: clinicsByEspecialidade.map(r => ({ especialidade: r.especialidade, total: Number(r.total) })),
        byEstado: clinicsByEstado.map(r => ({ estado: r.estado, total: Number(r.total) })),
      },
      patients: {
        byStatus: patientsByStatus.map(r => ({ status: r.status, total: Number(r.total) })),
        byTratamento: patientsByTratamento.map(r => ({ tratamento: r.tratamento, total: Number(r.total), avgValor: Number(r.avg_valor) })),
        byOrigin: patientsByOrigin.map(r => ({ origem: r.origem, total: Number(r.total) })),
      },
      payouts: {
        summary: payoutsSummary.map(r => ({ status: r.status, total: Number(r.total), valor: Number(r.total_valor) })),
      },
    });
  } catch (err) {
    console.error('[Metrics API]', err);
    return NextResponse.json({ error: 'Erro ao calcular métricas.' }, { status: 500 });
  }
}
