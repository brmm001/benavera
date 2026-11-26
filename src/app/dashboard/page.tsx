// src/app/dashboard/page.tsx — Página inicial personalizável da clínica
import { sql } from '@/lib/benavera-db';
import { getClinicContext } from '@/lib/clinic-modules';
import { ClinicDashboardClient } from '@/components/ClinicDashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const ctx = await getClinicContext();
  if (!ctx) return null;

  const cid = ctx.clinicId;
  const [statsRows, recentRows, recoveryRows, crmRows] = await Promise.all([
    sql`
      SELECT
        COUNT(*) FILTER (WHERE status::text <> 'DRAFT' AND created_at >= date_trunc('month', NOW())) AS total_mes,
        COALESCE(SUM(valor_financiado) FILTER (WHERE status::text <> 'DRAFT' AND created_at >= date_trunc('month', NOW())), 0) AS volume_solicitado,
        COALESCE(SUM(valor_financiado) FILTER (WHERE status::text IN ('APPROVED','CONTRACT_SIGNED','PAYOUT_SCHEDULED','PAYOUT_COMPLETED','TREATMENT_RELEASED')), 0) AS volume_aprovado,
        COUNT(*) FILTER (WHERE status::text IN ('APPROVED','CONTRACT_SIGNED','PAYOUT_SCHEDULED','PAYOUT_COMPLETED','TREATMENT_RELEASED'))::float /
          NULLIF(COUNT(*) FILTER (WHERE status::text IN ('APPROVED','CONTRACT_SIGNED','PAYOUT_SCHEDULED','PAYOUT_COMPLETED','TREATMENT_RELEASED','DECLINED','PRE_ANALYSIS_DECLINED')), 0) AS taxa_aprovacao
      FROM applications
      WHERE clinic_id = ${cid}::uuid
    `,
    sql`
      SELECT a.id, a.protocol, a.procedimento, a.valor_financiado, a.status::text AS status, a.created_at,
             COALESCE(p.nome, 'Paciente') AS patient_nome
      FROM applications a
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE a.clinic_id = ${cid}::uuid
      ORDER BY a.created_at DESC
      LIMIT 8
    `,
    sql`
      SELECT COUNT(*) AS c, COALESCE(SUM(valor), 0) AS v
      FROM clinic_recovery_items
      WHERE clinic_id = ${cid}::uuid AND status IN ('ABERTA', 'EM_CONTATO')
    `,
    sql`
      SELECT COUNT(*) AS c FROM clinic_crm_deals
      WHERE clinic_id = ${cid}::uuid AND stage NOT IN ('fechado', 'perdido')
    `,
  ]);

  const st = statsRows[0] || {};
  return (
    <ClinicDashboardClient
      userName={ctx.session.name}
      clinicName={ctx.session.clinicName || 'Clínica'}
      planName={ctx.planName}
      isClinicAdmin={ctx.session.role === 'CLINIC_ADMIN' || ctx.session.role === 'BENAVERA_ADMIN'}
      allowNewApplications={ctx.allowNewApplications}
      newApplicationsBlockReason={ctx.newApplicationsBlockReason}
      initialPrefs={ctx.preferences}
      modules={ctx.modules}
      kpis={{
        total_mes: Number(st.total_mes || 0),
        volume_solicitado: Number(st.volume_solicitado || 0),
        volume_aprovado: Number(st.volume_aprovado || 0),
        taxa_aprovacao: Number(st.taxa_aprovacao || 0) * 100,
        recovery_open_count: Number(recoveryRows[0]?.c || 0),
        recovery_open_value: Number(recoveryRows[0]?.v || 0),
        crm_open_count: Number(crmRows[0]?.c || 0),
      }}
      recentApps={recentRows.map((r) => ({
        id: String(r.id),
        protocol: String(r.protocol),
        patient_nome: String(r.patient_nome),
        procedimento: String(r.procedimento || 'Tratamento'),
        valor_financiado: Number(r.valor_financiado || 0),
        status: String(r.status),
        created_at: String(r.created_at),
      }))}
    />
  );
}
