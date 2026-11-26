// src/lib/email-reports.ts
// Agregadores de relatórios periódicos (semanal + mensal), resumo executivo diário,
// lembretes de vencimento D-3/D0, follow-ups atrasados e notificadores de eventos em tempo real.

import { sql } from './benavera-db';
import {
  dispatchEmail,
  getBaseUrl,
  getEmailSettings,
  isValidEmailAddress,
  resolveAdminAlertEmails,
  type EmailDispatchResult,
} from './email-engine';
import {
  buildAdminDailyExecutiveEmail,
  buildAtendenteFollowupAlertEmail,
  buildAtendentePeriodicReportEmail,
  buildClinicPeriodicReportEmail,
  buildRepresentantePeriodicReportEmail,
  fmtDateBr,
  sendAnalystAlertEmail,
  sendApplicationStatusEmail,
  sendClinicBillingReminderEmail,
  sendClinicPayoutEmail,
  sendPatientFinancingEmail,
  sendRepresentanteCommissionEmail,
  type AdminExecutivePayload,
  type AtendenteReportPayload,
  type ClinicReportPayload,
  type RepresentanteReportPayload,
} from './email';
import { getDashboard, syncComissoes } from './representantes-db';

export type ReportFrequency = 'weekly' | 'monthly';

export interface PeriodWindow {
  frequency: ReportFrequency;
  title: 'Semanal' | 'Mensal';
  start: Date;
  end: Date;
  label: string;
  key: string; // Ex.: 2026-W48 ou 2026-10
}

function getIsoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getPeriodWindow(frequency: ReportFrequency, refDate = new Date()): PeriodWindow {
  const end = new Date(refDate.getTime());
  if (frequency === 'monthly') {
    // Mês anterior fechado quando rodar no início do mês (dias 1..5); senão mês corrente até agora (para disparo manual)
    const dayOfMonth = refDate.getUTCDate();
    let start: Date;
    let windowEnd: Date;
    let key: string;
    if (dayOfMonth <= 5) {
      start = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() - 1, 1, 0, 0, 0));
      windowEnd = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), 0, 23, 59, 59));
      key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    } else {
      start = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), 1, 0, 0, 0));
      windowEnd = end;
      key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-MTD`;
    }
    const label = start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return {
      frequency,
      title: 'Mensal',
      start,
      end: windowEnd,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      key,
    };
  }

  // Semanal: últimos 7 dias
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const label = `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`;
  return {
    frequency: 'weekly',
    title: 'Semanal',
    start,
    end,
    label,
    key: getIsoWeekKey(end),
  };
}

const APPROVED_APP_STATUSES = [
  'PRE_APPROVED',
  'OFFERS_AVAILABLE',
  'OFFER_SELECTED',
  'CONTRACT_PENDING',
  'CONTRACT_SENT',
  'CONTRACT_SIGNED',
  'APPROVED',
  'PAYOUT_SCHEDULED',
  'PAYOUT_COMPLETED',
  'TREATMENT_RELEASED',
];

// ── 1. Relatório de Clínica ──────────────────────────────────────────────────

export async function buildClinicReport(
  clinicId: string,
  frequency: ReportFrequency,
  refDate = new Date()
): Promise<{
  to: string | null;
  notifEnabled: boolean;
  clinicName: string;
  window: PeriodWindow;
  payload: ClinicReportPayload;
  subject: string;
  html: string;
} | null> {
  const window = getPeriodWindow(frequency, refDate);
  const [clinicRows, appRows, payoutRows, subRows] = await Promise.all([
    sql`
      SELECT id, nome_fantasia, razao_social, email, email_financeiro, notif_email, ativo
      FROM clinics WHERE id = ${clinicId}::uuid LIMIT 1
    `,
    sql`
      SELECT status::text AS status, COALESCE(valor_financiado, 0) AS valor
      FROM applications
      WHERE clinic_id = ${clinicId}::uuid
        AND status::text <> 'DRAFT'
        AND created_at >= ${window.start.toISOString()}
        AND created_at <= ${window.end.toISOString()}
    `,
    sql`
      SELECT status::text AS status, COALESCE(valor_liquido_clinica, valor_financiado, 0) AS liquido, data_paga, created_at
      FROM payouts
      WHERE clinic_id = ${clinicId}::uuid
        AND (
          (status::text = 'PAID' AND COALESCE(data_paga::timestamptz, created_at) >= ${window.start.toISOString()})
          OR status::text IN ('AWAITING_CONTRACT', 'AWAITING_DISBURSEMENT', 'PENDING', 'SCHEDULED', 'PROCESSING')
        )
    `,
    sql`
      SELECT cs.status, cs.current_period_end, sp.name AS plan_name
      FROM clinic_subscriptions cs
      LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
      WHERE cs.clinic_id = ${clinicId}::uuid
      LIMIT 1
    `,
  ]);

  const clinic = clinicRows[0];
  if (!clinic) return null;

  const clinicName = String(clinic.nome_fantasia || clinic.razao_social || 'Clínica');
  const toCandidate = String(clinic.email || clinic.email_financeiro || '').trim().toLowerCase();
  const to = isValidEmailAddress(toCandidate) ? toCandidate : null;

  let propostasTotal = 0;
  let propostasAprovadas = 0;
  let volumeSolicitado = 0;
  let volumeAprovado = 0;

  for (const a of appRows) {
    propostasTotal++;
    const val = Number(a.valor || 0);
    volumeSolicitado += val;
    if (APPROVED_APP_STATUSES.includes(String(a.status))) {
      propostasAprovadas++;
      volumeAprovado += val;
    }
  }

  let repassesPagosValor = 0;
  let repassesPendentesValor = 0;
  for (const p of payoutRows) {
    const liq = Number(p.liquido || 0);
    if (String(p.status) === 'PAID') repassesPagosValor += liq;
    else repassesPendentesValor += liq;
  }

  const sub = subRows[0];
  const payload: ClinicReportPayload = {
    clinicName,
    periodLabel: window.label,
    periodTitle: window.title,
    propostasTotal,
    propostasAprovadas,
    taxaAprovacao: propostasTotal > 0 ? (propostasAprovadas / propostasTotal) * 100 : 0,
    volumeSolicitado,
    volumeAprovado,
    repassesPagosValor,
    repassesPendentesValor,
    planName: String(sub?.plan_name || 'Gratuito Completo'),
    subscriptionStatus: String(sub?.status || 'EXEMPT'),
    nextBillingDate: sub?.current_period_end ? fmtDateBr(String(sub.current_period_end)) : null,
  };

  const built = buildClinicPeriodicReportEmail(payload);
  return {
    to,
    notifEnabled: clinic.notif_email !== false,
    clinicName,
    window,
    payload,
    ...built,
  };
}

export async function sendClinicReport(
  clinicId: string,
  frequency: ReportFrequency,
  opts: { manual?: boolean; overrideTo?: string } = {}
): Promise<EmailDispatchResult> {
  const built = await buildClinicReport(clinicId, frequency);
  if (!built) return { sent: false, simulated: false, error: 'Clínica não encontrada.' };
  const targetEmail = opts.overrideTo || built.to;
  if (!targetEmail) return { sent: false, simulated: false, skipped: true, skipReason: 'no_email' };
  if (!opts.manual && !built.notifEnabled) {
    return { sent: false, simulated: false, skipped: true, skipReason: 'opted_out' };
  }

  return dispatchEmail({
    to: targetEmail,
    recipientName: built.clinicName,
    recipientType: 'CLINIC',
    recipientId: clinicId,
    category: 'REPORT',
    template: `clinic_report_${frequency}`,
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.manual ? null : `clinic_report:${frequency}:${clinicId}:${built.window.key}`,
    metadata: { frequency, periodKey: built.window.key, manual: Boolean(opts.manual) },
  });
}

export async function sendAllClinicReports(frequency: ReportFrequency, opts: { manual?: boolean } = {}) {
  const clinics = await sql`
    SELECT id FROM clinics WHERE ativo = TRUE AND (notif_email IS NULL OR notif_email = TRUE)
  `;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const c of clinics) {
    const res = await sendClinicReport(String(c.id), frequency, opts);
    if (res.sent || res.simulated) sent++;
    else if (res.skipped) skipped++;
    else failed++;
  }
  return { total: clinics.length, sent, skipped, failed };
}

// ── 2. Relatório de Representante (Vendedor Externo) ─────────────────────────

export async function buildRepresentanteReport(
  repId: string,
  frequency: ReportFrequency,
  refDate = new Date()
): Promise<{
  to: string | null;
  notifEnabled: boolean;
  repNome: string;
  window: PeriodWindow;
  payload: RepresentanteReportPayload;
  subject: string;
  html: string;
} | null> {
  const window = getPeriodWindow(frequency, refDate);
  const repRows = await sql`
    SELECT id, nome, email, notif_email, ativo FROM representantes WHERE id = ${repId}::uuid LIMIT 1
  `;
  const rep = repRows[0];
  if (!rep) return null;

  const dash = await getDashboard(repId, frequency === 'monthly' ? '30d' : '30d');
  const [periodApps, periodComs] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS total, COALESCE(SUM(a.valor_financiado), 0) AS volume
      FROM applications a
      JOIN representante_vinculos v ON v.clinic_id = a.clinic_id AND v.representante_id = ${repId}::uuid
      WHERE a.status::text <> 'DRAFT'
        AND a.created_at >= ${window.start.toISOString()}
        AND a.created_at <= ${window.end.toISOString()}
    `,
    sql`
      SELECT
        COALESCE(SUM(valor) FILTER (WHERE status <> 'CANCELADA'), 0) AS com_periodo,
        COALESCE(SUM(valor) FILTER (WHERE status = 'PAGA'), 0) AS com_paga
      FROM representante_comissoes
      WHERE representante_id = ${repId}::uuid
        AND created_at >= ${window.start.toISOString()}
        AND created_at <= ${window.end.toISOString()}
    `,
  ]);

  const clinicasInativas30d = dash.ranking
    .filter(r => r.vinculoAtivo && r.ativa && (r.diasSemAtividade === null || r.diasSemAtividade > 30))
    .map(r => ({ nome: r.nome, diasSemAtividade: r.diasSemAtividade }));

  const payload: RepresentanteReportPayload = {
    repNome: String(rep.nome),
    periodLabel: window.label,
    periodTitle: window.title,
    clinicasAtivas: dash.kpis.clinicasAtivas,
    clinicasInativas30d,
    propostasPeriodo: Number(periodApps[0]?.total || 0),
    volumePeriodo: Number(periodApps[0]?.volume || 0),
    comissaoPeriodo: Number(periodComs[0]?.com_periodo || 0),
    comissaoAReceber: dash.kpis.comissaoAReceber,
    comissaoPrevista: dash.kpis.comissaoPrevista,
    comissaoPagaPeriodo: Number(periodComs[0]?.com_paga || 0),
    topClinicas: dash.ranking
      .filter(r => r.vinculoAtivo)
      .slice(0, 5)
      .map(r => ({ nome: r.nome, volume: r.volume, comissao: r.comissao })),
  };

  const built = buildRepresentantePeriodicReportEmail(payload);
  const emailStr = String(rep.email || '').trim().toLowerCase();
  return {
    to: isValidEmailAddress(emailStr) ? emailStr : null,
    notifEnabled: rep.notif_email !== false,
    repNome: String(rep.nome),
    window,
    payload,
    ...built,
  };
}

export async function sendRepresentanteReport(
  repId: string,
  frequency: ReportFrequency,
  opts: { manual?: boolean; overrideTo?: string } = {}
): Promise<EmailDispatchResult> {
  const built = await buildRepresentanteReport(repId, frequency);
  if (!built) return { sent: false, simulated: false, error: 'Representante não encontrado.' };
  const targetEmail = opts.overrideTo || built.to;
  if (!targetEmail) return { sent: false, simulated: false, skipped: true, skipReason: 'no_email' };
  if (!opts.manual && !built.notifEnabled) {
    return { sent: false, simulated: false, skipped: true, skipReason: 'opted_out' };
  }

  return dispatchEmail({
    to: targetEmail,
    recipientName: built.repNome,
    recipientType: 'REPRESENTANTE',
    recipientId: repId,
    category: 'REPORT',
    template: `rep_report_${frequency}`,
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.manual ? null : `rep_report:${frequency}:${repId}:${built.window.key}`,
    metadata: { frequency, periodKey: built.window.key, manual: Boolean(opts.manual) },
  });
}

export async function sendAllRepresentanteReports(frequency: ReportFrequency, opts: { manual?: boolean } = {}) {
  const reps = await sql`
    SELECT id FROM representantes WHERE ativo = TRUE AND (notif_email IS NULL OR notif_email = TRUE)
  `;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of reps) {
    const res = await sendRepresentanteReport(String(r.id), frequency, opts);
    if (res.sent || res.simulated) sent++;
    else if (res.skipped) skipped++;
    else failed++;
  }
  return { total: reps.length, sent, skipped, failed };
}

// ── 3. Relatório & Follow-ups de Atendentes (Comercial Interno) ──────────────

export async function buildAtendenteReport(
  userId: string,
  frequency: ReportFrequency,
  refDate = new Date()
): Promise<{
  to: string | null;
  atendenteName: string;
  window: PeriodWindow;
  payload: AtendenteReportPayload;
  subject: string;
  html: string;
} | null> {
  const window = getPeriodWindow(frequency, refDate);
  const [userRows, leadsRows, commRows] = await Promise.all([
    sql`SELECT id, name, email, ativo FROM users WHERE id = ${userId}::uuid AND role = 'BENAVERA_COMERCIAL' LIMIT 1`,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE assigned_at >= ${window.start.toISOString()} AND assigned_at <= ${window.end.toISOString()})::int AS recebidos,
        COUNT(*) FILTER (WHERE status_comercial NOT IN ('perdido', 'parceiro_ativo'))::int AS em_andamento,
        COUNT(*) FILTER (WHERE status_comercial = 'parceiro_ativo' AND updated_at >= ${window.start.toISOString()})::int AS convertidos,
        COUNT(*) FILTER (
          WHERE status_comercial NOT IN ('perdido', 'parceiro_ativo')
            AND (
              (next_followup_at IS NOT NULL AND next_followup_at < NOW())
              OR (next_followup_at IS NULL AND COALESCE(last_contact_at, assigned_at, created_at) < NOW() - INTERVAL '48 hours')
            )
        )::int AS atrasados
      FROM clinic_leads
      WHERE assigned_to = ${userId}::uuid
    `,
    sql`
      SELECT
        COALESCE(SUM(valor) FILTER (WHERE status = 'aprovada'), 0) AS aprovada,
        COALESCE(SUM(valor) FILTER (WHERE status = 'paga' AND COALESCE(paga_at, updated_at) >= ${window.start.toISOString()}), 0) AS paga
      FROM commissions
      WHERE atendente_id = ${userId}::uuid
    `,
  ]);

  const user = userRows[0];
  if (!user) return null;

  const l = leadsRows[0] || {};
  const c = commRows[0] || {};
  const payload: AtendenteReportPayload = {
    atendenteName: String(user.name),
    periodLabel: window.label,
    periodTitle: window.title,
    leadsRecebidos: Number(l.recebidos || 0),
    leadsEmAndamento: Number(l.em_andamento || 0),
    leadsConvertidos: Number(l.convertidos || 0),
    followupsAtrasados: Number(l.atrasados || 0),
    comissaoAprovadaValor: Number(c.aprovada || 0),
    comissaoPagaValor: Number(c.paga || 0),
  };
  const built = buildAtendentePeriodicReportEmail(payload);
  const emailStr = String(user.email || '').trim().toLowerCase();

  return {
    to: isValidEmailAddress(emailStr) ? emailStr : null,
    atendenteName: String(user.name),
    window,
    payload,
    ...built,
  };
}

export async function sendAtendenteReport(
  userId: string,
  frequency: ReportFrequency,
  opts: { manual?: boolean; overrideTo?: string } = {}
): Promise<EmailDispatchResult> {
  const built = await buildAtendenteReport(userId, frequency);
  if (!built) return { sent: false, simulated: false, error: 'Atendente não encontrado.' };
  const targetEmail = opts.overrideTo || built.to;
  if (!targetEmail) return { sent: false, simulated: false, skipped: true, skipReason: 'no_email' };

  return dispatchEmail({
    to: targetEmail,
    recipientName: built.atendenteName,
    recipientType: 'ATENDENTE',
    recipientId: userId,
    category: 'REPORT',
    template: `atendente_report_${frequency}`,
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.manual ? null : `atendente_report:${frequency}:${userId}:${built.window.key}`,
    metadata: { frequency, periodKey: built.window.key, manual: Boolean(opts.manual) },
  });
}

export async function sendAllAtendenteReports(frequency: ReportFrequency, opts: { manual?: boolean } = {}) {
  const users = await sql`SELECT id FROM users WHERE role = 'BENAVERA_COMERCIAL' AND ativo = TRUE`;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const u of users) {
    const res = await sendAtendenteReport(String(u.id), frequency, opts);
    if (res.sent || res.simulated) sent++;
    else if (res.skipped) skipped++;
    else failed++;
  }
  return { total: users.length, sent, skipped, failed };
}

export async function sendOverdueFollowupAlerts(refDate = new Date()) {
  const dayKey = refDate.toISOString().slice(0, 10);
  const rows = await sql`
    SELECT cl.assigned_to, u.name AS atendente_name, u.email AS atendente_email,
           cl.nome_clinica, cl.nome_responsavel, cl.whatsapp, cl.email AS lead_email,
           GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(cl.next_followup_at, cl.last_contact_at, cl.assigned_at, cl.created_at))) / 86400))::int AS dias_parado
    FROM clinic_leads cl
    JOIN users u ON u.id = cl.assigned_to AND u.ativo = TRUE AND u.role = 'BENAVERA_COMERCIAL'
    WHERE cl.status_comercial NOT IN ('perdido', 'parceiro_ativo')
      AND (
        (cl.next_followup_at IS NOT NULL AND cl.next_followup_at < NOW())
        OR (cl.next_followup_at IS NULL AND COALESCE(cl.last_contact_at, cl.assigned_at, cl.created_at) < NOW() - INTERVAL '48 hours')
      )
    ORDER BY dias_parado DESC
  `;

  const byAtendente = new Map<
    string,
    { name: string; email: string; leads: Array<{ nome: string; contato: string; diasParado: number }> }
  >();
  for (const r of rows) {
    const uid = String(r.assigned_to);
    const cur = byAtendente.get(uid) || {
      name: String(r.atendente_name),
      email: String(r.atendente_email),
      leads: [],
    };
    cur.leads.push({
      nome: String(r.nome_clinica || r.nome_responsavel || 'Lead'),
      contato: String(r.whatsapp || r.lead_email || ''),
      diasParado: Number(r.dias_parado || 1),
    });
    byAtendente.set(uid, cur);
  }

  let sent = 0;
  let skipped = 0;
  for (const [uid, info] of byAtendente.entries()) {
    const built = buildAtendenteFollowupAlertEmail({ atendenteName: info.name, overdueLeads: info.leads });
    const res = await dispatchEmail({
      to: info.email,
      recipientName: info.name,
      recipientType: 'ATENDENTE',
      recipientId: uid,
      category: 'ALERT',
      template: 'atendente_followup_overdue',
      subject: built.subject,
      html: built.html,
      dedupeKey: `atendente_followup:${uid}:${dayKey}`,
      metadata: { count: info.leads.length },
    });
    if (res.sent || res.simulated) sent++;
    else skipped++;
  }
  return { totalAtendentes: byAtendente.size, sent, skipped };
}

// ── 4. Resumo Executivo Diário da Diretoria / Admin ──────────────────────────

export async function buildAdminExecutiveReport(refDate = new Date()): Promise<{
  dateKey: string;
  payload: AdminExecutivePayload;
  subject: string;
  html: string;
}> {
  const since24h = new Date(refDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dateKey = refDate.toISOString().slice(0, 10);
  const dateLabel = refDate.toLocaleDateString('pt-BR');

  const [leadsClinic, leadsPat, obRows, appRows, mrrRows, invRows, subStatusRows, repComRows, atComRows, payoutRows] =
    await Promise.all([
      sql`SELECT COUNT(*)::int AS total FROM clinic_leads WHERE created_at >= ${since24h}`,
      sql`SELECT COUNT(*)::int AS total FROM patient_leads WHERE created_at >= ${since24h}`,
      sql`SELECT COUNT(*)::int AS total FROM clinic_onboardings WHERE LOWER(status::text) IN ('submitted', 'under_review', 'pending_review', 'in_review')`,
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status::text = ANY(${APPROVED_APP_STATUSES}::text[]))::int AS aprovadas,
          COALESCE(SUM(valor_financiado) FILTER (WHERE status::text = ANY(${APPROVED_APP_STATUSES}::text[])), 0) AS vol_aprovado
        FROM applications
        WHERE status::text <> 'DRAFT' AND created_at >= ${since24h}
      `,
      sql`
        SELECT COALESCE(SUM(
          CASE
            WHEN cs.is_exempt THEN 0
            WHEN cs.custom_price IS NOT NULL THEN
              CASE WHEN cs.billing_cycle = 'ANNUAL' THEN cs.custom_price / 12.0 ELSE cs.custom_price END
            WHEN cs.billing_cycle = 'ANNUAL' THEN COALESCE(sp.price_annual, 0) / 12.0
            ELSE COALESCE(sp.price_monthly, 0)
          END * (1 - LEAST(100, GREATEST(0, COALESCE(cs.discount_percent, 0))) / 100.0)
        ), 0) AS mrr
        FROM clinic_subscriptions cs
        LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
        WHERE cs.status IN ('ACTIVE', 'GRACE') AND cs.is_exempt = FALSE
      `,
      sql`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'PAID' AND paid_at >= date_trunc('month', NOW())), 0) AS paid_month,
          COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) AS pending_total
        FROM saas_invoices
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'GRACE')::int AS grace,
          COUNT(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended
        FROM clinic_subscriptions
        WHERE is_exempt = FALSE
      `,
      sql`SELECT COALESCE(SUM(valor), 0) AS total FROM representante_comissoes WHERE status = 'A_RECEBER'`,
      sql`SELECT COALESCE(SUM(valor), 0) AS total FROM commissions WHERE status = 'aprovada'`,
      sql`SELECT COALESCE(SUM(COALESCE(valor_liquido_clinica, valor_financiado, 0)), 0) AS total FROM payouts WHERE status::text IN ('AWAITING_CONTRACT', 'AWAITING_DISBURSEMENT', 'PENDING', 'SCHEDULED', 'PROCESSING')`,
    ]);

  const payload: AdminExecutivePayload = {
    dateLabel,
    novosLeadsClinicas24h: Number(leadsClinic[0]?.total || 0),
    novosLeadsPacientes24h: Number(leadsPat[0]?.total || 0),
    onboardingsPendentes: Number(obRows[0]?.total || 0),
    propostas24h: Number(appRows[0]?.total || 0),
    propostasAprovadas24h: Number(appRows[0]?.aprovadas || 0),
    volumeAprovado24h: Number(appRows[0]?.vol_aprovado || 0),
    mrrAtual: Math.round(Number(mrrRows[0]?.mrr || 0) * 100) / 100,
    faturasPagasMes: Number(invRows[0]?.paid_month || 0),
    faturasPendentesTotal: Number(invRows[0]?.pending_total || 0),
    assinaturasCarencia: Number(subStatusRows[0]?.grace || 0),
    assinaturasSuspensas: Number(subStatusRows[0]?.suspended || 0),
    comissoesRepAReceber: Number(repComRows[0]?.total || 0),
    comissoesAtendentesAprovadas: Number(atComRows[0]?.total || 0),
    repassesPendentesValor: Number(payoutRows[0]?.total || 0),
  };

  const built = buildAdminDailyExecutiveEmail(payload);
  return { dateKey, payload, ...built };
}

export async function sendAdminExecutiveSummary(opts: { manual?: boolean; overrideTo?: string; refDate?: Date } = {}) {
  const built = await buildAdminExecutiveReport(opts.refDate);
  const targets = opts.overrideTo ? [opts.overrideTo] : await resolveAdminAlertEmails();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const to of targets) {
    const res = await dispatchEmail({
      to,
      recipientName: 'Diretoria Benavera',
      recipientType: 'ADMIN',
      category: 'REPORT',
      template: 'admin_daily_executive',
      subject: built.subject,
      html: built.html,
      dedupeKey: opts.manual ? null : `admin_daily_exec:${to}:${built.dateKey}`,
      metadata: { dateKey: built.dateKey, manual: Boolean(opts.manual) },
    });
    if (res.sent || res.simulated) sent++;
    else if (res.skipped) skipped++;
    else failed++;
  }
  return { total: targets.length, sent, skipped, failed };
}

// ── 5. Lembretes Pré-vencimento de Mensalidades (D-3 e D0) ───────────────────

export async function sendDueBillingReminders(refDate = new Date()) {
  const rows = await sql`
    SELECT cs.clinic_id, cs.billing_cycle, cs.custom_price, cs.discount_percent,
           cs.current_period_end, sp.name AS plan_name, sp.price_monthly, sp.price_annual,
           c.nome_fantasia, COALESCE(c.email_financeiro, c.email) AS target_email
    FROM clinic_subscriptions cs
    JOIN clinics c ON c.id = cs.clinic_id AND c.ativo = TRUE
    LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
    WHERE cs.is_exempt = FALSE
      AND cs.cancel_at_period_end = FALSE
      AND cs.status = 'ACTIVE'
      AND cs.current_period_end IS NOT NULL
      AND cs.current_period_end >= ${refDate.toISOString()}::timestamptz - INTERVAL '6 hours'
      AND cs.current_period_end <= ${refDate.toISOString()}::timestamptz + INTERVAL '4 days'
  `;

  let sent = 0;
  let skipped = 0;
  for (const r of rows) {
    const endDate = new Date(String(r.current_period_end));
    const daysLeft = Math.ceil((endDate.getTime() - refDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysLeft !== 3 && daysLeft > 0) continue; // Apenas D-3 e D0 (<=0)

    const targetEmail = String(r.target_email || '').trim().toLowerCase();
    if (!isValidEmailAddress(targetEmail)) {
      skipped++;
      continue;
    }

    const base = r.custom_price !== null && r.custom_price !== undefined
      ? Number(r.custom_price)
      : String(r.billing_cycle) === 'ANNUAL'
        ? Number(r.price_annual || 0)
        : Number(r.price_monthly || 0);
    const discount = Math.min(100, Math.max(0, Number(r.discount_percent || 0)));
    const amount = Math.round(base * (1 - discount / 100) * 100) / 100;
    if (amount <= 0) {
      skipped++;
      continue;
    }

    const dueIso = endDate.toISOString().slice(0, 10);
    const stage = daysLeft <= 0 ? 'd0' : 'd3';
    const res = await sendClinicBillingReminderEmail({
      to: targetEmail,
      clinicId: String(r.clinic_id),
      clinicName: String(r.nome_fantasia || 'Clínica'),
      planName: String(r.plan_name || 'Plano Benavera'),
      amount,
      dueDate: fmtDateBr(endDate),
      daysLeft: Math.max(0, daysLeft),
      dedupeKey: `billing_reminder:${stage}:${r.clinic_id}:${dueIso}`,
    });
    if (res.sent || res.simulated) sent++;
    else skipped++;
  }
  return { checked: rows.length, sent, skipped };
}

// ── 6. Notificadores em Tempo Real (Financiamentos, Repasses, Comissões) ────

const NOTIFIABLE_CLINIC_STATUSES = new Set([
  'PRE_ANALYSIS_APPROVED',
  'OFFERS_AVAILABLE',
  'CONTRACT_SENT',
  'APPROVED',
  'CONTRACT_SIGNED',
  'PAYOUT_SCHEDULED',
  'PAYOUT_COMPLETED',
  'TREATMENT_RELEASED',
  'DECLINED',
  'PRE_ANALYSIS_DECLINED',
]);

const NOTIFIABLE_PATIENT_STATUSES = new Set([
  'SUBMITTED',
  'OFFERS_AVAILABLE',
  'CONTRACT_SENT',
  'APPROVED',
  'CONTRACT_SIGNED',
  'TREATMENT_RELEASED',
  'DECLINED',
]);

export async function notifyApplicationStatusEmails(
  applicationId: string,
  status: string,
  extra: { proposalToken?: string | null; contractUrl?: string | null; notifyAdminNew?: boolean } = {}
): Promise<void> {
  try {
    const settings = await getEmailSettings();
    const rows = await sql`
      SELECT a.id, a.protocol, a.procedimento, a.valor_financiado, a.contract_url,
             c.id AS clinic_id, c.nome_fantasia AS clinic_name, c.email AS clinic_email,
             c.email_financeiro AS clinic_email_fin, c.notif_email AS clinic_notif,
             p.id AS patient_id, p.nome AS patient_name, p.email AS patient_email
      FROM applications a
      JOIN clinics c ON c.id = a.clinic_id
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE a.id = ${applicationId}::uuid
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return;

    const base = getBaseUrl();
    const valor = Number(row.valor_financiado || 0);
    const protocol = String(row.protocol);
    const clinicName = String(row.clinic_name || 'Clínica');
    const patientName = String(row.patient_name || 'Paciente');

    // Buscar token ativo de proposta se não foi passado explicitamente
    let proposalUrl: string | null = extra.proposalToken ? `${base}/proposta/${extra.proposalToken}` : null;
    if (!proposalUrl && (status === 'OFFERS_AVAILABLE' || status === 'APPROVED' || status === 'CONTRACT_SENT')) {
      const tokRows = await sql`
        SELECT token FROM proposal_tokens
        WHERE application_id = ${applicationId}::uuid AND revogado = FALSE
        ORDER BY created_at DESC LIMIT 1
      `;
      if (tokRows[0]?.token) {
        proposalUrl = `${base}/proposta/${String(tokRows[0].token)}`;
      }
    }

    // 1) E-mail para a clínica
    if (settings.enable_financing_emails && row.clinic_notif !== false && NOTIFIABLE_CLINIC_STATUSES.has(status)) {
      const clinicTo = String(row.clinic_email || row.clinic_email_fin || '').trim().toLowerCase();
      if (isValidEmailAddress(clinicTo)) {
        await sendApplicationStatusEmail({
          to: clinicTo,
          clinicId: String(row.clinic_id),
          clinicName,
          patientName,
          protocol,
          status,
          valor,
          portalUrl: `${base}/financiamentos/${applicationId}`,
          dedupeKey: `app_clinic:${applicationId}:${status}`,
        });
      }
    }

    // 2) E-mail para o paciente (se tiver e-mail cadastrado)
    if (settings.enable_patient_emails && NOTIFIABLE_PATIENT_STATUSES.has(status)) {
      const patientTo = String(row.patient_email || '').trim().toLowerCase();
      if (isValidEmailAddress(patientTo)) {
        await sendPatientFinancingEmail({
          to: patientTo,
          patientId: row.patient_id ? String(row.patient_id) : null,
          patientName,
          clinicName,
          protocol,
          procedimento: String(row.procedimento || 'Tratamento'),
          valor,
          status,
          proposalUrl,
          contractUrl: extra.contractUrl || (row.contract_url ? String(row.contract_url) : null),
          dedupeKey: `app_patient:${applicationId}:${status}:${extra.proposalToken || 'std'}`,
        });
      }
    }

    // 3) Alerta para diretoria/analistas quando uma nova solicitação é criada
    if (extra.notifyAdminNew) {
      const adminEmails = await resolveAdminAlertEmails();
      for (const to of adminEmails) {
        await sendAnalystAlertEmail({
          to,
          analystName: 'Equipe Benavera',
          alertType: 'new_application',
          entityName: `${clinicName} — ${patientName}`,
          entityUrl: `${base}/admin/solicitacoes`,
          details: `Protocolo ${protocol} • Valor financiado: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        });
      }
    }
  } catch (err) {
    console.warn('[Email Notify Application]', err);
  }
}

export async function notifyRepresentanteUnlockedCommission(params: {
  clinicId: string;
  tipo: 'FINANCIAMENTO' | 'MENSALIDADE' | 'BONUS';
  refId: string;
}): Promise<void> {
  try {
    const settings = await getEmailSettings();
    if (!settings.enable_commission_emails) return;

    const rows = await sql`
      SELECT rc.id, rc.representante_id, rc.base_valor, rc.percent, rc.valor, rc.status,
             r.nome AS rep_nome, r.email AS rep_email, r.notif_email,
             c.nome_fantasia AS clinic_name,
             (SELECT COALESCE(SUM(valor), 0) FROM representante_comissoes WHERE representante_id = rc.representante_id AND status = 'A_RECEBER') AS saldo_a_receber
      FROM representante_comissoes rc
      JOIN representantes r ON r.id = rc.representante_id AND r.ativo = TRUE
      JOIN clinics c ON c.id = rc.clinic_id
      WHERE rc.clinic_id = ${params.clinicId}::uuid
        AND rc.tipo = ${params.tipo}
        AND rc.ref = ${params.refId}
        AND rc.status = 'A_RECEBER'
      LIMIT 1
    `;
    const r = rows[0];
    if (!r || r.notif_email === false) return;

    const repEmail = String(r.rep_email || '').trim().toLowerCase();
    if (!isValidEmailAddress(repEmail)) return;

    await sendRepresentanteCommissionEmail({
      to: repEmail,
      repId: String(r.representante_id),
      repNome: String(r.rep_nome),
      clinicName: String(r.clinic_name || 'Clínica'),
      tipo: params.tipo,
      baseValor: Number(r.base_valor || 0),
      percent: Number(r.percent || 0),
      valorComissao: Number(r.valor || 0),
      saldoAReceber: Number(r.saldo_a_receber || 0),
      dedupeKey: `rep_comm_unlocked:${r.id}`,
    });
  } catch (err) {
    console.warn('[Email Notify Rep Commission]', err);
  }
}

export async function notifyPayoutEmails(payoutId: string, status: 'SCHEDULED' | 'PAID'): Promise<void> {
  try {
    const settings = await getEmailSettings();
    const rows = await sql`
      SELECT py.*, a.protocol, p.nome AS patient_name,
             c.nome_fantasia AS clinic_name, COALESCE(c.email_financeiro, c.email) AS clinic_email,
             fp.nome AS partner_name
      FROM payouts py
      LEFT JOIN applications a ON a.id = py.application_id
      LEFT JOIN patients p ON p.id = a.patient_id
      JOIN clinics c ON c.id = py.clinic_id
      LEFT JOIN financial_partners fp ON fp.id = py.partner_id
      WHERE py.id = ${payoutId}::uuid
      LIMIT 1
    `;
    const py = rows[0];
    if (!py) return;

    // 1) E-mail para a clínica (financeiro)
    if (settings.enable_payout_emails) {
      const to = String(py.clinic_email || '').trim().toLowerCase();
      if (isValidEmailAddress(to)) {
        await sendClinicPayoutEmail({
          to,
          clinicId: String(py.clinic_id),
          clinicName: String(py.clinic_name || 'Clínica'),
          protocol: String(py.protocol || payoutId.slice(0, 8)),
          patientName: String(py.patient_name || 'Paciente'),
          partnerName: py.partner_name ? String(py.partner_name) : null,
          valorBruto: Number(py.valor_financiado ?? py.valor_tratamento ?? 0),
          taxaBenavera: Number(py.taxa_benavera ?? 0),
          valorLiquido: Number(py.valor_liquido_clinica ?? py.valor_financiado ?? 0),
          status,
          dataReferencia: fmtDateBr(status === 'PAID' ? (py.data_paga || new Date()) : (py.data_prevista || new Date())),
          dedupeKey: `payout_clinic:${payoutId}:${status}`,
        });
      }
    }

    // 2) Se repasse foi PAID, sincronizar comissões e notificar representante vinculado
    if (status === 'PAID') {
      await syncComissoes(null);
      await notifyRepresentanteUnlockedCommission({
        clinicId: String(py.clinic_id),
        tipo: 'FINANCIAMENTO',
        refId: payoutId,
      });
    }
  } catch (err) {
    console.warn('[Email Notify Payout]', err);
  }
}

// ── 7. Orquestrador do Cron Unificado (/api/cron/emails) ─────────────────────

export async function runScheduledEmailCron(opts: {
  now?: Date;
  forceWeekly?: boolean;
  forceMonthly?: boolean;
} = {}) {
  const now = opts.now || new Date();
  const settings = await getEmailSettings();

  // Horário de Brasília aproximado (UTC-3) para dia da semana e dia do mês
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const isMonday = brt.getUTCDay() === 1;
  const isFirstOfMonth = brt.getUTCDate() === 1;

  const runWeekly = Boolean(opts.forceWeekly) || isMonday;
  const runMonthly = Boolean(opts.forceMonthly) || isFirstOfMonth;

  const summary: Record<string, unknown> = {
    executedAt: now.toISOString(),
    ranWeekly: runWeekly,
    ranMonthly: runMonthly,
  };

  if (settings.enable_billing_reminders) {
    summary.billingReminders = await sendDueBillingReminders(now);
  }

  summary.overdueFollowups = await sendOverdueFollowupAlerts(now);

  if (settings.enable_admin_daily_summary) {
    summary.adminDailySummary = await sendAdminExecutiveSummary({ refDate: now });
  }

  if (runWeekly) {
    if (settings.enable_clinic_weekly_report) {
      summary.clinicWeekly = await sendAllClinicReports('weekly');
    }
    if (settings.enable_rep_weekly_report) {
      summary.repWeekly = await sendAllRepresentanteReports('weekly');
    }
    if (settings.enable_atendente_weekly_report) {
      summary.atendenteWeekly = await sendAllAtendenteReports('weekly');
    }
  }

  if (runMonthly) {
    if (settings.enable_clinic_monthly_report) {
      summary.clinicMonthly = await sendAllClinicReports('monthly');
    }
    if (settings.enable_rep_monthly_report) {
      summary.repMonthly = await sendAllRepresentanteReports('monthly');
    }
    if (settings.enable_atendente_monthly_report) {
      summary.atendenteMonthly = await sendAllAtendenteReports('monthly');
    }
  }

  return summary;
}
