// GET & PATCH /api/admin/emails — Dashboard de métricas, configurações e histórico de e-mails Resend
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import {
  getEmailSettings,
  getFromEmail,
  isResendConfigured,
  updateEmailSettings,
} from '@/lib/email-engine';

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session || !['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO', 'BENAVERA_SUPORTE'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const recipientType = (sp.get('recipientType') || '').trim().toUpperCase() || null;
  const category = (sp.get('category') || '').trim().toUpperCase() || null;
  const status = (sp.get('status') || '').trim().toUpperCase() || null;
  const search = (sp.get('search') || '').trim() || null;
  const searchWild = search ? `%${search}%` : null;

  try {
    const [settings, statsRows, logsRows, clinicsRows, repsRows, atendentesRows] = await Promise.all([
      getEmailSettings(),
      sql`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS total_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS total_30d,
          COUNT(*) FILTER (WHERE status IN ('SENT', 'DELIVERED', 'OPENED', 'CLICKED') AND created_at >= NOW() - INTERVAL '30 days')::int AS sent_30d,
          COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'OPENED', 'CLICKED') AND created_at >= NOW() - INTERVAL '30 days')::int AS delivered_30d,
          COUNT(*) FILTER (WHERE status IN ('OPENED', 'CLICKED') AND created_at >= NOW() - INTERVAL '30 days')::int AS opened_30d,
          COUNT(*) FILTER (WHERE status IN ('BOUNCED', 'COMPLAINED') AND created_at >= NOW() - INTERVAL '30 days')::int AS bounced_30d,
          COUNT(*) FILTER (WHERE status = 'FAILED' AND created_at >= NOW() - INTERVAL '30 days')::int AS failed_30d,
          COUNT(*) FILTER (WHERE status = 'SIMULATED' AND created_at >= NOW() - INTERVAL '30 days')::int AS simulated_30d
        FROM email_logs
      `,
      sql`
        SELECT id, recipient_email, recipient_name, recipient_type, recipient_id,
               category, template, subject, status, provider_id, error,
               (html_body IS NOT NULL) AS can_resend,
               delivered_at, opened_at, bounced_at, created_at
        FROM email_logs
        WHERE (${recipientType}::text IS NULL OR recipient_type = ${recipientType})
          AND (${category}::text IS NULL OR category = ${category})
          AND (${status}::text IS NULL OR status = ${status})
          AND (${searchWild}::text IS NULL OR recipient_email ILIKE ${searchWild} OR subject ILIKE ${searchWild} OR COALESCE(recipient_name, '') ILIKE ${searchWild})
        ORDER BY created_at DESC
        LIMIT 80
      `,
      sql`SELECT id, nome_fantasia AS name, COALESCE(email, email_financeiro) AS email FROM clinics WHERE ativo = TRUE ORDER BY nome_fantasia ASC LIMIT 200`,
      sql`SELECT id, nome AS name, email FROM representantes WHERE ativo = TRUE ORDER BY nome ASC LIMIT 200`,
      sql`SELECT id, name, email FROM users WHERE role = 'BENAVERA_COMERCIAL' AND ativo = TRUE ORDER BY name ASC LIMIT 200`,
    ]);

    const st = statsRows[0] || {};
    return NextResponse.json(
      {
        success: true,
        config: {
          resendConfigured: isResendConfigured(),
          fromEmail: getFromEmail(),
          webhookConfigured: Boolean((process.env.RESEND_WEBHOOK_SECRET || '').trim()),
        },
        settings,
        stats: {
          total7d: Number(st.total_7d || 0),
          total30d: Number(st.total_30d || 0),
          sent30d: Number(st.sent_30d || 0),
          delivered30d: Number(st.delivered_30d || 0),
          opened30d: Number(st.opened_30d || 0),
          bounced30d: Number(st.bounced_30d || 0),
          failed30d: Number(st.failed_30d || 0),
          simulated30d: Number(st.simulated_30d || 0),
        },
        logs: logsRows,
        targets: {
          clinics: clinicsRows,
          representantes: repsRows,
          atendentes: atendentesRows,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Admin Emails GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar central de e-mails.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Apenas o administrador pode alterar as configurações de e-mail.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const updated = await updateEmailSettings(
      {
        ...(Array.isArray(body.admin_alert_emails) ? { admin_alert_emails: body.admin_alert_emails.map(String) } : {}),
        ...(body.reply_to_email !== undefined ? { reply_to_email: body.reply_to_email ? String(body.reply_to_email) : null } : {}),
        ...(typeof body.enable_clinic_weekly_report === 'boolean' ? { enable_clinic_weekly_report: body.enable_clinic_weekly_report } : {}),
        ...(typeof body.enable_clinic_monthly_report === 'boolean' ? { enable_clinic_monthly_report: body.enable_clinic_monthly_report } : {}),
        ...(typeof body.enable_rep_weekly_report === 'boolean' ? { enable_rep_weekly_report: body.enable_rep_weekly_report } : {}),
        ...(typeof body.enable_rep_monthly_report === 'boolean' ? { enable_rep_monthly_report: body.enable_rep_monthly_report } : {}),
        ...(typeof body.enable_atendente_weekly_report === 'boolean' ? { enable_atendente_weekly_report: body.enable_atendente_weekly_report } : {}),
        ...(typeof body.enable_atendente_monthly_report === 'boolean' ? { enable_atendente_monthly_report: body.enable_atendente_monthly_report } : {}),
        ...(typeof body.enable_admin_daily_summary === 'boolean' ? { enable_admin_daily_summary: body.enable_admin_daily_summary } : {}),
        ...(typeof body.enable_billing_reminders === 'boolean' ? { enable_billing_reminders: body.enable_billing_reminders } : {}),
        ...(typeof body.enable_patient_emails === 'boolean' ? { enable_patient_emails: body.enable_patient_emails } : {}),
        ...(typeof body.enable_financing_emails === 'boolean' ? { enable_financing_emails: body.enable_financing_emails } : {}),
        ...(typeof body.enable_payout_emails === 'boolean' ? { enable_payout_emails: body.enable_payout_emails } : {}),
        ...(typeof body.enable_commission_emails === 'boolean' ? { enable_commission_emails: body.enable_commission_emails } : {}),
      },
      session.name
    );

    return NextResponse.json({ success: true, settings: updated }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[API Admin Emails PATCH]', err);
    return NextResponse.json({ error: 'Erro ao salvar configurações de e-mail.' }, { status: 500 });
  }
}
