// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const isBenaveraStaff = session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST';
  const clinicId = session.clinicId;

  try {
    if (isBenaveraStaff) {
      // Dashboard do backoffice Benavera
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayApps, inAnalysis, awaitingAction, approvedToday, slaOver15] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM applications WHERE created_at >= ${today.toISOString()}`,
        sql`SELECT COUNT(*) as count FROM applications WHERE status IN ('INTERNAL_REVIEW', 'LENDER_ANALYSIS', 'PRE_ANALYSIS', 'SUBMITTED_TO_LENDER')`,
        sql`SELECT COUNT(*) as count FROM applications WHERE status IN ('INTERNAL_REVIEW', 'AWAITING_CLINIC', 'AWAITING_DOCUMENTS') AND internal_decision = 'PENDING'`,
        sql`SELECT COUNT(*) as count FROM applications WHERE status IN ('APPROVED', 'CONTRACT_SIGNED', 'PAYOUT_SCHEDULED') AND DATE(created_at) = CURRENT_DATE`,
        sql`SELECT COUNT(*) as count FROM applications WHERE status NOT IN ('APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'CONTRACT_SIGNED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED') AND created_at < NOW() - INTERVAL '15 minutes'`,
      ]);

      const volumeStats = await sql`
        SELECT
          COALESCE(SUM(valor_financiado), 0) as volume_solicitado,
          COALESCE(SUM(CASE WHEN status IN ('APPROVED', 'CONTRACT_SIGNED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED') THEN valor_financiado END), 0) as volume_aprovado,
          COUNT(*) as total,
          COUNT(CASE WHEN status IN ('APPROVED', 'CONTRACT_SIGNED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED') THEN 1 END)::float / NULLIF(COUNT(*), 0) as taxa_aprovacao
        FROM applications
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `;

      const avgTime = await sql`
        SELECT
          AVG(EXTRACT(EPOCH FROM (pre_analysis_completed_at - created_at))/60) as avg_pre_analysis_min,
          AVG(EXTRACT(EPOCH FROM (proposal_generated_at - created_at))/60) as avg_to_proposal_min
        FROM applications
        WHERE pre_analysis_completed_at IS NOT NULL
      `;

      return NextResponse.json({
        type: 'benavera',
        today_apps: Number(todayApps[0]?.count || 0),
        in_analysis: Number(inAnalysis[0]?.count || 0),
        awaiting_action: Number(awaitingAction[0]?.count || 0),
        approved_today: Number(approvedToday[0]?.count || 0),
        sla_over_15: Number(slaOver15[0]?.count || 0),
        volume_solicitado: Number(volumeStats[0]?.volume_solicitado || 0),
        volume_aprovado: Number(volumeStats[0]?.volume_aprovado || 0),
        taxa_aprovacao: Number(volumeStats[0]?.taxa_aprovacao || 0),
        avg_pre_analysis_min: Number(avgTime[0]?.avg_pre_analysis_min || 0),
        avg_to_proposal_min: Number(avgTime[0]?.avg_to_proposal_min || 0),
      });
    } else {
      // Dashboard da clínica
      if (!clinicId) return NextResponse.json({ error: 'Clínica não identificada.' }, { status: 400 });

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const stats = await sql`
        SELECT
          COUNT(*) as total_mes,
          COALESCE(SUM(valor_financiado), 0) as volume_solicitado,
          COALESCE(SUM(CASE WHEN status IN ('APPROVED', 'CONTRACT_SIGNED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED') THEN valor_financiado END), 0) as volume_aprovado,
          COUNT(CASE WHEN status IN ('APPROVED', 'CONTRACT_SIGNED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED') THEN 1 END)::float / NULLIF(COUNT(*), 0) as taxa_aprovacao
        FROM applications
        WHERE clinic_id = ${clinicId} AND created_at >= ${monthStart.toISOString()}
      `;

      const recentApps = await sql`
        SELECT a.*, p.nome as patient_nome, p.cpf as patient_cpf, u.name as creator_name
        FROM applications a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        WHERE a.clinic_id = ${clinicId}
        ORDER BY a.created_at DESC LIMIT 10
      `;

      const s = stats[0];
      return NextResponse.json({
        type: 'clinic',
        total_mes: Number(s?.total_mes || 0),
        volume_solicitado: Number(s?.volume_solicitado || 0),
        volume_aprovado: Number(s?.volume_aprovado || 0),
        taxa_aprovacao: Number(s?.taxa_aprovacao || 0),
        recent_applications: recentApps.map(a => ({
          ...a,
          patient_cpf: String(a.patient_cpf || '').replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.***-$2'),
        })),
      });
    }
  } catch (err) {
    console.error('[Dashboard]', err);
    return NextResponse.json({ error: 'Erro ao carregar dashboard.' }, { status: 500 });
  }
}
