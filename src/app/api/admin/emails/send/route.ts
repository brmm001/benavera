// POST /api/admin/emails/send — Teste de entrega, pré-visualização HTML, disparo manual e reenvio
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth';
import { resendLoggedEmail } from '@/lib/email-engine';
import { sendTestEmail } from '@/lib/email';
import {
  buildAdminExecutiveReport,
  buildAtendenteReport,
  buildClinicReport,
  buildRepresentanteReport,
  runScheduledEmailCron,
  sendAdminExecutiveSummary,
  sendAllAtendenteReports,
  sendAllClinicReports,
  sendAllRepresentanteReports,
  sendAtendenteReport,
  sendClinicReport,
  sendRepresentanteReport,
} from '@/lib/email-reports';

const REPORT_TYPES = [
  'clinic_weekly',
  'clinic_monthly',
  'rep_weekly',
  'rep_monthly',
  'atendente_weekly',
  'atendente_monthly',
  'admin_daily',
] as const;

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('test'),
    to: z.string().email('E-mail inválido.'),
    recipientName: z.string().max(120).optional(),
  }),
  z.object({
    action: z.literal('preview'),
    reportType: z.enum(REPORT_TYPES),
    targetId: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal('send_report'),
    reportType: z.enum(REPORT_TYPES),
    targetId: z.string().uuid().optional(),
    overrideTo: z.string().email().optional(),
    batch: z.boolean().optional().default(false),
  }),
  z.object({
    action: z.literal('resend'),
    logId: z.string().uuid('ID de log inválido.'),
  }),
  z.object({
    action: z.literal('run_cron'),
    forceWeekly: z.boolean().optional().default(false),
    forceMonthly: z.boolean().optional().default(false),
  }),
]);

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session || !['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos.', details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  try {
    if (data.action === 'test') {
      const result = await sendTestEmail({
        to: data.to,
        recipientName: data.recipientName,
        triggeredBy: session.name,
      });
      return NextResponse.json({ success: result.sent || result.simulated, result }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (data.action === 'resend') {
      const result = await resendLoggedEmail(data.logId, session.name);
      return NextResponse.json({ success: result.sent || result.simulated, result }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (data.action === 'run_cron') {
      if (session.role !== 'BENAVERA_ADMIN') {
        return NextResponse.json({ error: 'Apenas administrador pode executar o cron completo.' }, { status: 403 });
      }
      const summary = await runScheduledEmailCron({
        forceWeekly: data.forceWeekly,
        forceMonthly: data.forceMonthly,
      });
      return NextResponse.json({ success: true, summary }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (data.action === 'preview') {
      if (data.reportType === 'admin_daily') {
        const built = await buildAdminExecutiveReport();
        return NextResponse.json({ success: true, subject: built.subject, html: built.html }, { headers: { 'Cache-Control': 'no-store' } });
      }
      if (!data.targetId) {
        return NextResponse.json({ error: 'Selecione um destinatário para pré-visualizar este relatório.' }, { status: 400 });
      }
      if (data.reportType === 'clinic_weekly' || data.reportType === 'clinic_monthly') {
        const built = await buildClinicReport(data.targetId, data.reportType === 'clinic_monthly' ? 'monthly' : 'weekly');
        if (!built) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });
        return NextResponse.json({ success: true, to: built.to, subject: built.subject, html: built.html });
      }
      if (data.reportType === 'rep_weekly' || data.reportType === 'rep_monthly') {
        const built = await buildRepresentanteReport(data.targetId, data.reportType === 'rep_monthly' ? 'monthly' : 'weekly');
        if (!built) return NextResponse.json({ error: 'Representante não encontrado.' }, { status: 404 });
        return NextResponse.json({ success: true, to: built.to, subject: built.subject, html: built.html });
      }
      const built = await buildAtendenteReport(data.targetId, data.reportType === 'atendente_monthly' ? 'monthly' : 'weekly');
      if (!built) return NextResponse.json({ error: 'Comercial não encontrado.' }, { status: 404 });
      return NextResponse.json({ success: true, to: built.to, subject: built.subject, html: built.html });
    }

    // action === 'send_report'
    if (data.reportType === 'admin_daily') {
      const res = await sendAdminExecutiveSummary({ manual: true, overrideTo: data.overrideTo });
      return NextResponse.json({ success: true, result: res }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const freq = data.reportType.endsWith('_monthly') ? 'monthly' : 'weekly';

    if (data.batch) {
      if (data.reportType.startsWith('clinic_')) {
        const res = await sendAllClinicReports(freq, { manual: true });
        return NextResponse.json({ success: true, result: res });
      }
      if (data.reportType.startsWith('rep_')) {
        const res = await sendAllRepresentanteReports(freq, { manual: true });
        return NextResponse.json({ success: true, result: res });
      }
      const res = await sendAllAtendenteReports(freq, { manual: true });
      return NextResponse.json({ success: true, result: res });
    }

    if (!data.targetId) {
      return NextResponse.json({ error: 'Informe o destinatário ou ative envio em lote.' }, { status: 400 });
    }

    if (data.reportType.startsWith('clinic_')) {
      const res = await sendClinicReport(data.targetId, freq, { manual: true, overrideTo: data.overrideTo });
      return NextResponse.json({ success: res.sent || res.simulated, result: res });
    }
    if (data.reportType.startsWith('rep_')) {
      const res = await sendRepresentanteReport(data.targetId, freq, { manual: true, overrideTo: data.overrideTo });
      return NextResponse.json({ success: res.sent || res.simulated, result: res });
    }
    const res = await sendAtendenteReport(data.targetId, freq, { manual: true, overrideTo: data.overrideTo });
    return NextResponse.json({ success: res.sent || res.simulated, result: res });
  } catch (err) {
    console.error('[API Admin Emails Send]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar envio.' },
      { status: 500 }
    );
  }
}
