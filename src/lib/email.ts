// src/lib/email.ts
// Templates HTML responsivos e funções de envio via Resend (roteadas pelo email-engine com logs e deduplicação).

import {
  dispatchEmail,
  getBaseUrl,
  type EmailDispatchResult,
} from './email-engine';

export type { EmailDispatchResult };

export function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtBrlEmail(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

export function fmtDateBr(dateLike: string | Date | null | undefined): string {
  if (!dateLike) return '—';
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  if (Number.isNaN(d.getTime())) return String(dateLike);
  return d.toLocaleDateString('pt-BR');
}

function safeHref(url: string | null | undefined, fallbackPath = '/login'): string {
  const base = getBaseUrl();
  if (!url) return `${base}${fallbackPath}`;
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return escapeHtml(trimmed);
  if (trimmed.startsWith('/')) return escapeHtml(`${base}${trimmed}`);
  return `${base}${fallbackPath}`;
}

// ─── Layout Base & Helpers de Componentes ────────────────────────────────────

export function baseLayout(content: string, preheader = '', footerExtra = ''): string {
  const safePreheader = escapeHtml(preheader);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Benavera</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
${safePreheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;width:100%;">
  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="background:linear-gradient(135deg,#6370f1,#4040ca);background-color:#4040ca;border-radius:12px;padding:12px 20px;">
          <span style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.4px;">Benavera</span>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
    ${content}
  </td></tr>
  <tr><td style="padding:22px 8px;text-align:center;font-size:12px;color:#94a3b8;line-height:1.6;">
    <p style="margin:0;">Benavera Correspondentes Bancários LTDA — CNPJ: 69.952.939/0001-52</p>
    <p style="margin:4px 0 0;">Você recebeu este e-mail por estar cadastrado na plataforma Benavera.</p>
    ${footerExtra ? `<p style="margin:6px 0 0;">${footerExtra}</p>` : ''}
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function kpiGridHtml(items: Array<{ label: string; value: string; accent?: string }>): string {
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const a = items[i];
    const b = items[i + 1];
    rows.push(`
      <tr>
        <td width="50%" style="padding:6px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#64748b;margin-bottom:4px;">${escapeHtml(a.label)}</div>
            <div style="font-size:20px;font-weight:800;color:${a.accent || '#0f172a'};">${escapeHtml(a.value)}</div>
          </div>
        </td>
        <td width="50%" style="padding:6px;">
          ${b ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#64748b;margin-bottom:4px;">${escapeHtml(b.label)}</div>
            <div style="font-size:20px;font-weight:800;color:${b.accent || '#0f172a'};">${escapeHtml(b.value)}</div>
          </div>` : ''}
        </td>
      </tr>
    `);
  }
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:18px -6px;">${rows.join('')}</table>`;
}

function ctaButton(label: string, href: string, color = '#4040ca'): string {
  return `<div style="margin-top:22px;">
    <a href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;">
      ${escapeHtml(label)}
    </a>
  </div>`;
}

// ─── 1. Onboarding & Boas-vindas Clínica (retrocompatível) ──────────────────

export async function sendClinicWelcomeEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  loginUrl?: string;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, responsavel, loginUrl } = opts;
  const href = safeHref(loginUrl, '/login');
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <h1 style="font-size:23px;font-weight:800;color:#0f172a;margin:0 0 8px;">Bem-vindo à Benavera! 🎉</h1>
      <p style="font-size:15px;color:#475569;margin:0 0 20px;">Olá, <strong>${escapeHtml(responsavel)}</strong>!</p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 18px;">
        A clínica <strong>${escapeHtml(clinicName)}</strong> foi credenciada com sucesso na plataforma Benavera.
        Agora você pode enviar solicitações de financiamento para os seus pacientes de forma simples e rápida.
      </p>
      <div style="background:#f0f4ff;border-radius:10px;padding:18px;margin:20px 0;">
        <p style="font-size:14px;font-weight:700;color:#1e1b4b;margin:0 0 10px;">✅ Próximos passos:</p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
          <li>Acesse o portal e complete o perfil da clínica</li>
          <li>Adicione os membros da sua equipe</li>
          <li>Envie sua primeira solicitação de financiamento</li>
        </ul>
      </div>
      ${ctaButton('Acessar o Portal →', href)}
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'ONBOARDING',
    template: 'clinic_welcome',
    subject: `Bem-vindo à Benavera, ${clinicName}! 🎉`,
    html: baseLayout(content, `Sua clínica ${clinicName} foi credenciada com sucesso!`),
  });
}

export async function sendApplicationStatusEmail(opts: {
  to: string;
  patientName: string;
  clinicName: string;
  clinicId?: string;
  protocol: string;
  status: string;
  valor: number;
  portalUrl?: string;
  dedupeKey?: string;
}): Promise<EmailDispatchResult> {
  const { to, patientName, clinicName, clinicId, protocol, status, valor, portalUrl, dedupeKey } = opts;

  const STATUS_MESSAGES: Record<string, { title: string; msg: string; color: string; emoji: string }> = {
    SUBMITTED: { title: 'Solicitação Recebida', emoji: '📥', color: '#4040ca', msg: 'A solicitação foi registrada e já iniciou a pré-análise.' },
    PRE_ANALYSIS_APPROVED: { title: 'Pré-análise Aprovada!', emoji: '✅', color: '#10b981', msg: 'A solicitação passou pela pré-análise e segue para análise dos parceiros financeiros.' },
    OFFERS_AVAILABLE: { title: 'Ofertas Disponíveis!', emoji: '🎉', color: '#4040ca', msg: 'Há propostas de financiamento disponíveis para o paciente escolher. Acesse o portal para enviar o link.' },
    CONTRACT_SENT: { title: 'Contrato Enviado ao Paciente', emoji: '📩', color: '#4040ca', msg: 'O contrato digital foi enviado para assinatura do paciente.' },
    APPROVED: { title: 'Financiamento Aprovado!', emoji: '🏆', color: '#10b981', msg: 'Parabéns! O financiamento foi aprovado e seguirá para agendamento de repasse.' },
    CONTRACT_SIGNED: { title: 'Contrato Assinado!', emoji: '📝', color: '#10b981', msg: 'O paciente assinou o contrato com sucesso. O repasse será processado em breve.' },
    PAYOUT_SCHEDULED: { title: 'Repasse Agendado', emoji: '📅', color: '#4040ca', msg: 'O repasse referente a este contrato foi agendado para a conta cadastrada da clínica.' },
    PAYOUT_COMPLETED: { title: 'Repasse Realizado!', emoji: '💰', color: '#10b981', msg: 'O repasse referente a este financiamento foi concluído com sucesso.' },
    TREATMENT_RELEASED: { title: 'Tratamento Liberado!', emoji: '✨', color: '#10b981', msg: 'O contrato foi finalizado e o tratamento está liberado para execução.' },
    DECLINED: { title: 'Solicitação Recusada', emoji: '❌', color: '#ef4444', msg: 'Infelizmente a solicitação não foi aprovada pelo parceiro financeiro neste momento.' },
    PRE_ANALYSIS_DECLINED: { title: 'Pré-análise Recusada', emoji: '❌', color: '#ef4444', msg: 'A solicitação não passou pelos critérios de pré-análise. Acesse o portal para detalhes.' },
  };

  const info = STATUS_MESSAGES[status] || {
    title: 'Atualização do Financiamento',
    emoji: '📋',
    color: '#4040ca',
    msg: `O status da solicitação foi atualizado para: ${status}`,
  };

  const content = `
    <div style="border-top:4px solid ${info.color};padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">${info.emoji}</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 6px;">${escapeHtml(info.title)}</h1>
      <p style="font-size:13px;color:#64748b;margin:0 0 20px;">Protocolo: <strong>${escapeHtml(protocol)}</strong></p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 18px;">${escapeHtml(info.msg)}</p>
      ${kpiGridHtml([
        { label: 'Paciente', value: patientName },
        { label: 'Valor Financiado', value: fmtBrlEmail(valor), accent: info.color },
        { label: 'Clínica', value: clinicName },
        { label: 'Protocolo', value: protocol },
      ])}
      ${ctaButton('Ver detalhes no Portal →', safeHref(portalUrl, '/financiamentos'), info.color)}
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    recipientId: clinicId || null,
    category: 'FINANCING',
    template: `clinic_app_${status.toLowerCase()}`,
    subject: `${info.emoji} ${info.title} — Protocolo ${protocol}`,
    html: baseLayout(content, info.msg),
    dedupeKey: dedupeKey || null,
    metadata: { protocol, status, valor },
  });
}

export async function sendClinicFollowupEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  analista: string;
  credenciamentoUrl?: string;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, responsavel, analista, credenciamentoUrl } = opts;
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 14px;">Olá, ${escapeHtml(responsavel)}! 👋</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 14px;">
        Estamos em contato com a <strong>${escapeHtml(clinicName)}</strong> sobre a nossa solução de financiamento para clínicas.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px;">
        Com a Benavera, sua clínica oferece parcelamento sem burocracia para os pacientes, aumentando a aprovação e o ticket médio dos tratamentos.
      </p>
      ${ctaButton('Quero Credenciar Minha Clínica →', safeHref(credenciamentoUrl, '/credenciamento'))}
      <p style="font-size:13px;color:#94a3b8;margin-top:20px;">
        Qualquer dúvida, responda este e-mail ou fale com ${escapeHtml(analista)}.
      </p>
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'ONBOARDING',
    template: 'clinic_followup',
    subject: `${clinicName} — Financiamento sem burocracia para seus pacientes`,
    html: baseLayout(content, 'Aumente o ticket médio da sua clínica com a Benavera'),
  });
}

export async function sendAnalystAlertEmail(opts: {
  to: string;
  analystName: string;
  alertType: 'followup_overdue' | 'new_application' | 'sla_breach';
  entityName: string;
  entityUrl?: string;
  details?: string;
}): Promise<EmailDispatchResult> {
  const { to, analystName, alertType, entityName, entityUrl, details } = opts;
  const ALERT_CONFIG = {
    followup_overdue: { title: 'Follow-up Atrasado', emoji: '⏰', color: '#d97706', msg: `O follow-up com ${entityName} está atrasado.` },
    new_application: { title: 'Nova Solicitação', emoji: '📥', color: '#4040ca', msg: `Nova solicitação de financiamento recebida de ${entityName}.` },
    sla_breach: { title: 'SLA Violado', emoji: '🚨', color: '#dc2626', msg: `A solicitação de ${entityName} está acima do SLA esperado.` },
  };
  const cfg = ALERT_CONFIG[alertType];

  const content = `
    <div style="border-top:4px solid ${cfg.color};padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">${cfg.emoji}</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 6px;">${cfg.title}</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 14px;">Olá, <strong>${escapeHtml(analystName)}</strong>!</p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 14px;">${escapeHtml(cfg.msg)}</p>
      ${details ? `<div style="background:#f8fafc;border-radius:8px;padding:14px;border:1px solid #e2e8f0;font-size:13px;color:#475569;">${escapeHtml(details)}</div>` : ''}
      ${ctaButton('Abrir no Painel →', safeHref(entityUrl, '/admin'), cfg.color)}
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: analystName,
    recipientType: 'ADMIN',
    category: 'ALERT',
    template: `analyst_alert_${alertType}`,
    subject: `${cfg.emoji} ${cfg.title} — ${entityName}`,
    html: baseLayout(content, cfg.msg),
  });
}

export async function sendOTPEmail(opts: {
  to: string;
  clinicName: string;
  code: string;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, code } = opts;
  const content = `
    <div style="border-top:4px solid #6370f1;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">🔐</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Código de verificação</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px;">
        Para proteger os dados da <strong>${escapeHtml(clinicName)}</strong>, confirme seu acesso com o código abaixo.
      </p>
      <div style="background:#f0f4ff;border-radius:14px;padding:24px;text-align:center;margin:20px 0;border:2px dashed #c7d7fe;">
        <p style="font-size:40px;font-weight:900;letter-spacing:10px;color:#4040ca;margin:0;font-family:monospace;">${escapeHtml(code)}</p>
        <p style="font-size:13px;color:#64748b;margin:10px 0 0;">Válido por 10 minutos</p>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">
        Se você não solicitou este código, ignore este e-mail. Nunca compartilhe este código com ninguém.
      </p>
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'CREDENTIAL',
    template: 'onboarding_otp',
    subject: `${code} — Código de verificação Benavera`,
    html: baseLayout(content, 'Seu código de verificação para o credenciamento Benavera.'),
    redactBody: true,
  });
}

export async function sendOnboardingInviteEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, responsavel, inviteUrl, expiresAt } = opts;
  const expiryFormatted = expiresAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Olá, ${escapeHtml(responsavel)}! 👋</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 14px;">
        Estamos prontos para concluir o credenciamento da <strong>${escapeHtml(clinicName)}</strong> na Benavera.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px;">
        Seus dados básicos já estão preenchidos. Clique abaixo para enviar a documentação (Pessoa Física ou Jurídica).
      </p>
      ${ctaButton('Iniciar credenciamento →', safeHref(inviteUrl, '/credenciamento'))}
      <div style="background:#fef9ec;border-radius:10px;padding:14px;border:1px solid #fde68a;margin:20px 0 0;">
        <p style="font-size:13px;color:#92400e;margin:0;">⏱️ Este link expira em <strong>${escapeHtml(expiryFormatted)}</strong>.</p>
      </div>
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'ONBOARDING',
    template: 'onboarding_invite',
    subject: `${clinicName} — Complete seu credenciamento na Benavera`,
    html: baseLayout(content, `Finalize o credenciamento da ${clinicName} na Benavera.`),
  });
}

export async function sendCorrectionRequestEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  corrections: Array<{ label: string; message: string }>;
  inviteUrl: string;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, responsavel, corrections, inviteUrl } = opts;
  const correctionItems = corrections
    .map(c => `<li style="margin-bottom:10px;"><strong style="color:#0f172a;">${escapeHtml(c.label)}</strong><br/><span style="color:#475569;font-size:14px;">${escapeHtml(c.message)}</span></li>`)
    .join('');

  const content = `
    <div style="border-top:4px solid #f59e0b;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">📋</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Correção necessária</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${escapeHtml(responsavel)}</strong>! Identificamos pontos que precisam ser ajustados no credenciamento da <strong>${escapeHtml(clinicName)}</strong>.
      </p>
      <div style="background:#fef9ec;border-radius:10px;padding:18px;border:1px solid #fde68a;margin:18px 0;">
        <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 10px;">⚠️ Itens para correção:</p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.7;">${correctionItems}</ul>
      </div>
      ${ctaButton('Corrigir agora →', safeHref(inviteUrl, '/credenciamento'))}
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'ONBOARDING',
    template: 'onboarding_correction',
    subject: `${clinicName} — Correção necessária no credenciamento`,
    html: baseLayout(content, 'Verifique os itens que precisam ser corrigidos.'),
  });
}

export async function sendOnboardingSubmittedClinicEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, responsavel } = opts;
  const content = `
    <div style="border-top:4px solid #10b981;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">✅</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Credenciamento recebido!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 14px;">
        Olá, <strong>${escapeHtml(responsavel)}</strong>! Recebemos a documentação da <strong>${escapeHtml(clinicName)}</strong> com sucesso.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0;">
        Nossa equipe fará a validação das informações e documentos. Você será avisado por e-mail assim que a análise for concluída.
      </p>
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'ONBOARDING',
    template: 'onboarding_submitted_clinic',
    subject: `${clinicName} — Credenciamento recebido com sucesso`,
    html: baseLayout(content, 'Seu credenciamento foi recebido.'),
  });
}

export async function sendOnboardingSubmittedAlert(opts: {
  to: string;
  analystName: string;
  clinicName: string;
  adminUrl: string;
}): Promise<EmailDispatchResult> {
  const { to, analystName, clinicName, adminUrl } = opts;
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">📥</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Novo credenciamento para análise</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 14px;">Olá, <strong>${escapeHtml(analystName)}</strong>!</p>
      <p style="font-size:15px;color:#475569;margin:0 0 16px;">
        A clínica <strong>${escapeHtml(clinicName)}</strong> submeteu o credenciamento e aguarda análise.
      </p>
      ${ctaButton('Analisar credenciamento →', safeHref(adminUrl, '/admin/credenciamentos'))}
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: analystName,
    recipientType: 'ADMIN',
    category: 'ALERT',
    template: 'onboarding_submitted_alert',
    subject: `📥 Novo credenciamento — ${clinicName}`,
    html: baseLayout(content, `Novo credenciamento submetido por ${clinicName}.`),
  });
}

export async function sendOnboardingApprovedEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  loginEmail?: string;
  temporaryPassword?: string | null;
  loginUrl?: string;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, responsavel, loginEmail, temporaryPassword, loginUrl } = opts;
  const href = safeHref(loginUrl, '/login');
  const safeLoginEmail = escapeHtml(loginEmail || to);

  const credentialsBlock = temporaryPassword
    ? `<div style="background:#f8fafc;border-radius:12px;padding:18px;border:1px solid #cbd5e1;margin:20px 0;">
        <p style="font-size:12px;font-weight:700;color:#0f172a;text-transform:uppercase;margin:0 0 10px;">🔐 Seus dados de acesso ao Portal Benavera</p>
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>Link:</strong> <a href="${href}" style="color:#4040ca;">${href}</a></p>
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>E-mail:</strong> ${safeLoginEmail}</p>
        <p style="font-size:14px;color:#334155;margin:0;"><strong>Senha temporária:</strong> <code style="background:#e2e8f0;padding:3px 8px;border-radius:6px;font-family:monospace;font-weight:700;color:#0f172a;">${escapeHtml(temporaryPassword)}</code></p>
      </div>`
    : `<div style="background:#f0f4ff;border-radius:12px;padding:16px;border:1px solid #c7d7fe;margin:20px 0;">
        <p style="font-size:14px;color:#1e293b;margin:0;">Entre utilizando o e-mail <strong>${safeLoginEmail}</strong> e a senha cadastrada no credenciamento.</p>
      </div>`;

  const content = `
    <div style="border-top:4px solid #10b981;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">🎉</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Credenciamento aprovado!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 14px;">
        Parabéns, <strong>${escapeHtml(responsavel)}</strong>! O credenciamento da <strong>${escapeHtml(clinicName)}</strong> foi aprovado e seu acesso ao portal já está liberado.
      </p>
      ${credentialsBlock}
      ${ctaButton('Acessar o Portal Benavera →', href, '#10b981')}
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'CREDENTIAL',
    template: 'onboarding_approved',
    subject: `🎉 Credenciamento aprovado e acesso liberado — ${clinicName}`,
    html: baseLayout(content, `O credenciamento da ${clinicName} foi aprovado.`),
    redactBody: Boolean(temporaryPassword),
  });
}

export async function sendClinicCredentialsEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  loginEmail: string;
  temporaryPassword: string;
  loginUrl?: string;
  isReset?: boolean;
}): Promise<EmailDispatchResult> {
  const { to, clinicName, responsavel, loginEmail, temporaryPassword, loginUrl, isReset = false } = opts;
  const href = safeHref(loginUrl, '/login');
  const heading = isReset ? 'Suas novas credenciais de acesso' : 'Suas credenciais de acesso ao Portal Benavera';

  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">🔑</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">${heading}</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Olá, <strong>${escapeHtml(responsavel)}</strong>! Seguem os dados de acesso da <strong>${escapeHtml(clinicName)}</strong> no Portal Benavera.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:18px;border:1px solid #cbd5e1;margin:18px 0;">
        <p style="font-size:14px;color:#334155;margin:0 0 8px;"><strong>Portal:</strong> <a href="${href}" style="color:#4040ca;">${href}</a></p>
        <p style="font-size:14px;color:#334155;margin:0 0 8px;"><strong>E-mail:</strong> ${escapeHtml(loginEmail)}</p>
        <p style="font-size:14px;color:#334155;margin:0;"><strong>Senha de acesso:</strong> <code style="background:#e2e8f0;padding:4px 10px;border-radius:6px;font-family:monospace;font-weight:700;color:#0f172a;">${escapeHtml(temporaryPassword)}</code></p>
      </div>
      ${ctaButton('Entrar no Portal Benavera →', href)}
    </div>
  `;

  return dispatchEmail({
    to,
    recipientName: clinicName,
    recipientType: 'CLINIC',
    category: 'CREDENTIAL',
    template: isReset ? 'clinic_credentials_reset' : 'clinic_credentials',
    subject: `🔑 Dados de acesso ao Portal Benavera — ${clinicName}`,
    html: baseLayout(content, `Credenciais de acesso da ${clinicName} no Portal Benavera.`),
    redactBody: true,
  });
}

// ─── 2. Mensalidades & Cobranças SaaS (Mercado Pago) ─────────────────────────

export async function sendSubscriptionInvoiceEmail(opts: {
  to: string;
  clinicName: string;
  clinicId?: string;
  planName: string;
  amount: number;
  dueDate: string;
  paymentUrl: string;
  pixCopyPaste?: string | null;
}): Promise<EmailDispatchResult> {
  const pixBlock = opts.pixCopyPaste
    ? `<div style="background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #cbd5e1;margin:16px 0;">
        <p style="font-size:11px;font-weight:700;color:#475569;margin:0 0 6px;">PIX COPIA E COLA:</p>
        <p style="font-size:11px;font-family:monospace;word-break:break-all;color:#0f172a;margin:0;">${escapeHtml(opts.pixCopyPaste)}</p>
      </div>`
    : '';

  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">💳</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Fatura disponível — ${escapeHtml(opts.planName)}</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, equipe <strong>${escapeHtml(opts.clinicName)}</strong>! Sua fatura da mensalidade Benavera está disponível.
      </p>
      ${kpiGridHtml([
        { label: 'Plano', value: opts.planName },
        { label: 'Valor', value: fmtBrlEmail(opts.amount), accent: '#4040ca' },
        { label: 'Vencimento', value: opts.dueDate },
        { label: 'Pagamento', value: 'Pix, Cartão ou Boleto' },
      ])}
      ${pixBlock}
      ${ctaButton('Pagar Fatura Agora →', safeHref(opts.paymentUrl, '/painel/assinatura'))}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.clinicName,
    recipientType: 'CLINIC',
    recipientId: opts.clinicId || null,
    category: 'BILLING',
    template: 'subscription_invoice',
    subject: `💳 Fatura Benavera (${fmtBrlEmail(opts.amount)}) — ${opts.clinicName}`,
    html: baseLayout(content, `Sua fatura Benavera de ${fmtBrlEmail(opts.amount)} está disponível.`),
    metadata: { planName: opts.planName, amount: opts.amount, dueDate: opts.dueDate },
  });
}

export function buildClinicBillingReminderEmail(opts: {
  clinicName: string;
  planName: string;
  amount: number;
  dueDate: string;
  daysLeft: number;
  paymentUrl?: string;
}): { subject: string; html: string } {
  const isToday = opts.daysLeft <= 0;
  const accent = isToday ? '#d97706' : '#4040ca';
  const headline = isToday
    ? `Sua mensalidade Benavera vence hoje (${opts.dueDate})`
    : `Lembrete: sua mensalidade vence em ${opts.daysLeft} dias (${opts.dueDate})`;

  const content = `
    <div style="border-top:4px solid ${accent};padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">${isToday ? '⏰' : '📅'}</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">${escapeHtml(headline)}</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, equipe <strong>${escapeHtml(opts.clinicName)}</strong>! Passando para lembrar do vencimento da assinatura do plano <strong>${escapeHtml(opts.planName)}</strong>.
      </p>
      ${kpiGridHtml([
        { label: 'Plano', value: opts.planName },
        { label: 'Valor', value: fmtBrlEmail(opts.amount), accent },
        { label: 'Vencimento', value: opts.dueDate },
        { label: 'Meios aceitos', value: 'Pix, Cartão ou Boleto' },
      ])}
      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:12px 0 0;">
        Se sua assinatura já está no Cartão Recorrente ou se você já realizou o pagamento, basta desconsiderar este aviso.
      </p>
      ${ctaButton('Acessar Assinatura e Faturas →', safeHref(opts.paymentUrl, '/painel/assinatura'), accent)}
    </div>
  `;

  return {
    subject: `${isToday ? '⏰' : '📅'} ${headline} — ${opts.clinicName}`,
    html: baseLayout(content, `${headline}. Valor: ${fmtBrlEmail(opts.amount)}.`),
  };
}

export async function sendClinicBillingReminderEmail(opts: {
  to: string;
  clinicId: string;
  clinicName: string;
  planName: string;
  amount: number;
  dueDate: string;
  daysLeft: number;
  dedupeKey: string;
}): Promise<EmailDispatchResult> {
  const built = buildClinicBillingReminderEmail(opts);
  return dispatchEmail({
    to: opts.to,
    recipientName: opts.clinicName,
    recipientType: 'CLINIC',
    recipientId: opts.clinicId,
    category: 'BILLING',
    template: opts.daysLeft <= 0 ? 'billing_reminder_d0' : 'billing_reminder_d3',
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.dedupeKey,
    metadata: { daysLeft: opts.daysLeft, dueDate: opts.dueDate, amount: opts.amount },
  });
}

export async function sendSubscriptionPaymentConfirmedEmail(opts: {
  to: string;
  clinicName: string;
  clinicId?: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
}): Promise<EmailDispatchResult> {
  const content = `
    <div style="border-top:4px solid #10b981;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">✅</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Pagamento confirmado!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Recebemos o pagamento da assinatura da <strong>${escapeHtml(opts.clinicName)}</strong>. Seu acesso completo está ativo.
      </p>
      ${kpiGridHtml([
        { label: 'Plano', value: opts.planName },
        { label: 'Valor Pago', value: fmtBrlEmail(opts.amount), accent: '#059669' },
        { label: 'Próxima Renovação', value: opts.nextBillingDate },
        { label: 'Status', value: 'Ativa ✓', accent: '#059669' },
      ])}
      ${ctaButton('Ver assinatura e faturas →', safeHref(null, '/painel/assinatura'), '#059669')}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.clinicName,
    recipientType: 'CLINIC',
    recipientId: opts.clinicId || null,
    category: 'BILLING',
    template: 'subscription_paid',
    subject: `✅ Pagamento confirmado — Benavera (${fmtBrlEmail(opts.amount)})`,
    html: baseLayout(content, 'Pagamento da sua assinatura Benavera confirmado.'),
    metadata: { amount: opts.amount, nextBillingDate: opts.nextBillingDate },
  });
}

export async function sendSubscriptionGraceWarningEmail(opts: {
  to: string;
  clinicName: string;
  clinicId?: string;
  graceDays: number;
  graceUntil: string;
  paymentUrl: string;
}): Promise<EmailDispatchResult> {
  const content = `
    <div style="border-top:4px solid #d97706;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">⏳</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Mensalidade em aberto — regularize em até ${opts.graceDays} dias</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 14px;">
        Identificamos uma pendência na mensalidade da <strong>${escapeHtml(opts.clinicName)}</strong>. Seu painel continua liberado durante a carência até <strong>${escapeHtml(opts.graceUntil)}</strong>.
      </p>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">
        Após essa data, novas solicitações de financiamento e os módulos do plano serão pausados (contratos e repasses anteriores permanecem livres para consulta).
      </p>
      ${ctaButton('Regularizar assinatura →', safeHref(opts.paymentUrl, '/painel/assinatura'), '#d97706')}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.clinicName,
    recipientType: 'CLINIC',
    recipientId: opts.clinicId || null,
    category: 'BILLING',
    template: 'subscription_grace',
    subject: `⏳ Pendência na mensalidade Benavera — ${opts.clinicName}`,
    html: baseLayout(content, `Regularize sua mensalidade Benavera até ${opts.graceUntil}.`),
  });
}

export async function sendSubscriptionSuspendedEmail(opts: {
  to: string;
  clinicName: string;
  clinicId?: string;
  paymentUrl: string;
}): Promise<EmailDispatchResult> {
  const content = `
    <div style="border-top:4px solid #dc2626;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">🔒</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Assinatura suspensa por pendência financeira</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 14px;">
        O prazo de carência da mensalidade da <strong>${escapeHtml(opts.clinicName)}</strong> foi encerrado. Novas solicitações e módulos pagos foram pausados temporariamente.
      </p>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">
        Seus contratos anteriores e repasses continuam livres para consulta. Assim que o pagamento via Pix ou Cartão for confirmado, o acesso total volta automaticamente.
      </p>
      ${ctaButton('Regularizar e reativar agora →', safeHref(opts.paymentUrl, '/painel/assinatura'), '#dc2626')}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.clinicName,
    recipientType: 'CLINIC',
    recipientId: opts.clinicId || null,
    category: 'BILLING',
    template: 'subscription_suspended',
    subject: `🔒 Assinatura Benavera suspensa — regularize para reativar`,
    html: baseLayout(content, 'Regularize sua assinatura Benavera para reativar o acesso imediato.'),
  });
}

// ─── 3. Repasses para Clínicas ───────────────────────────────────────────────

export function buildClinicPayoutEmail(opts: {
  clinicName: string;
  protocol: string;
  patientName: string;
  partnerName?: string | null;
  valorBruto: number;
  taxaBenavera: number;
  valorLiquido: number;
  status: 'SCHEDULED' | 'PAID';
  dataReferencia: string;
}): { subject: string; html: string } {
  const isPaid = opts.status === 'PAID';
  const accent = isPaid ? '#059669' : '#4040ca';
  const title = isPaid ? 'Repasse liquidado na conta da clínica!' : 'Repasse agendado para a sua clínica';
  const emoji = isPaid ? '💰' : '📅';

  const content = `
    <div style="border-top:4px solid ${accent};padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">${emoji}</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">${title}</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, equipe <strong>${escapeHtml(opts.clinicName)}</strong>! ${
          isPaid
            ? `Confirmamos a liquidação do repasse referente ao contrato <strong>${escapeHtml(opts.protocol)}</strong>.`
            : `O repasse referente ao contrato <strong>${escapeHtml(opts.protocol)}</strong> foi agendado.`
        }
      </p>
      ${kpiGridHtml([
        { label: 'Valor Líquido Clínica', value: fmtBrlEmail(opts.valorLiquido), accent },
        { label: isPaid ? 'Data do Pagamento' : 'Previsão de Pagamento', value: opts.dataReferencia },
        { label: 'Valor Financiado (Bruto)', value: fmtBrlEmail(opts.valorBruto) },
        { label: 'Taxa Benavera', value: fmtBrlEmail(opts.taxaBenavera) },
        { label: 'Paciente', value: opts.patientName },
        { label: 'Parceiro', value: opts.partnerName || 'Benavera' },
      ])}
      ${ctaButton('Ver extrato de repasses →', safeHref(null, '/repasses'), accent)}
    </div>
  `;

  return {
    subject: `${emoji} ${isPaid ? 'Repasse pago' : 'Repasse agendado'}: ${fmtBrlEmail(opts.valorLiquido)} — ${opts.protocol}`,
    html: baseLayout(content, `${title} (${fmtBrlEmail(opts.valorLiquido)}) — Protocolo ${opts.protocol}.`),
  };
}

export async function sendClinicPayoutEmail(opts: {
  to: string;
  clinicId: string;
  clinicName: string;
  protocol: string;
  patientName: string;
  partnerName?: string | null;
  valorBruto: number;
  taxaBenavera: number;
  valorLiquido: number;
  status: 'SCHEDULED' | 'PAID';
  dataReferencia: string;
  dedupeKey?: string;
}): Promise<EmailDispatchResult> {
  const built = buildClinicPayoutEmail(opts);
  return dispatchEmail({
    to: opts.to,
    recipientName: opts.clinicName,
    recipientType: 'CLINIC',
    recipientId: opts.clinicId,
    category: 'PAYOUT',
    template: opts.status === 'PAID' ? 'clinic_payout_paid' : 'clinic_payout_scheduled',
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.dedupeKey || null,
    metadata: { protocol: opts.protocol, valorLiquido: opts.valorLiquido, status: opts.status },
  });
}

// ─── 4. E-mails para Pacientes ───────────────────────────────────────────────

export function buildPatientFinancingEmail(opts: {
  patientName: string;
  clinicName: string;
  protocol: string;
  procedimento: string;
  valor: number;
  status: string;
  proposalUrl?: string | null;
  contractUrl?: string | null;
}): { subject: string; html: string } {
  const MAP: Record<string, { emoji: string; color: string; title: string; body: string; ctaLabel?: string; ctaUrl?: string }> = {
    SUBMITTED: {
      emoji: '📋',
      color: '#4040ca',
      title: 'Recebemos sua solicitação de parcelamento',
      body: `Sua solicitação de parcelamento na clínica ${opts.clinicName} foi registrada com sucesso e já está em análise.`,
    },
    OFFERS_AVAILABLE: {
      emoji: '🎉',
      color: '#4040ca',
      title: 'Você tem propostas de parcelamento disponíveis!',
      body: `Boas notícias! Já existem condições aprovadas para o seu tratamento na ${opts.clinicName}. Clique abaixo para conferir as parcelas e escolher a melhor opção.`,
      ctaLabel: 'Ver minhas propostas →',
      ctaUrl: opts.proposalUrl || undefined,
    },
    CONTRACT_SENT: {
      emoji: '✍️',
      color: '#4040ca',
      title: 'Seu contrato está pronto para assinatura digital',
      body: `Falta apenas um passo! Revise e assine seu contrato digital para liberar seu tratamento na ${opts.clinicName}.`,
      ctaLabel: 'Assinar contrato agora →',
      ctaUrl: opts.contractUrl || opts.proposalUrl || undefined,
    },
    APPROVED: {
      emoji: '🏆',
      color: '#059669',
      title: 'Seu financiamento foi aprovado!',
      body: `Parabéns! Seu financiamento para ${opts.procedimento} na ${opts.clinicName} foi aprovado.`,
      ctaLabel: opts.contractUrl ? 'Abrir contrato →' : opts.proposalUrl ? 'Acompanhar proposta →' : undefined,
      ctaUrl: opts.contractUrl || opts.proposalUrl || undefined,
    },
    CONTRACT_SIGNED: {
      emoji: '✅',
      color: '#059669',
      title: 'Contrato assinado com sucesso!',
      body: `Confirmamos a assinatura do seu contrato com a ${opts.clinicName}. Em breve a clínica será avisada para agendar o início do seu tratamento.`,
    },
    TREATMENT_RELEASED: {
      emoji: '✨',
      color: '#059669',
      title: 'Tratamento liberado!',
      body: `Tudo certo! O seu parcelamento com a ${opts.clinicName} foi concluído e o tratamento está liberado.`,
    },
    DECLINED: {
      emoji: 'ℹ️',
      color: '#64748b',
      title: 'Atualização sobre sua solicitação de crédito',
      body: `No momento, não conseguimos aprovar o financiamento pelas políticas atuais dos nossos parceiros. Fale com a equipe da ${opts.clinicName} para conhecer outras opções de pagamento.`,
    },
  };

  const info = MAP[opts.status] || {
    emoji: '📋',
    color: '#4040ca',
    title: 'Atualização do seu parcelamento Benavera',
    body: `Há uma nova atualização na sua solicitação na ${opts.clinicName}.`,
  };

  const content = `
    <div style="border-top:4px solid ${info.color};padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">${info.emoji}</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">${escapeHtml(info.title)}</h1>
      <p style="font-size:15px;color:#475569;margin:0 0 12px;">Olá, <strong>${escapeHtml(opts.patientName)}</strong>!</p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 18px;">${escapeHtml(info.body)}</p>
      ${kpiGridHtml([
        { label: 'Clínica', value: opts.clinicName },
        { label: 'Valor', value: fmtBrlEmail(opts.valor), accent: info.color },
        { label: 'Tratamento', value: opts.procedimento || 'Tratamento' },
        { label: 'Protocolo', value: opts.protocol },
      ])}
      ${info.ctaLabel && info.ctaUrl ? ctaButton(info.ctaLabel, safeHref(info.ctaUrl, '/'), info.color) : ''}
    </div>
  `;

  return {
    subject: `${info.emoji} ${info.title} — ${opts.clinicName}`,
    html: baseLayout(content, info.body),
  };
}

export async function sendPatientFinancingEmail(opts: {
  to: string;
  patientId?: string | null;
  patientName: string;
  clinicName: string;
  protocol: string;
  procedimento: string;
  valor: number;
  status: string;
  proposalUrl?: string | null;
  contractUrl?: string | null;
  dedupeKey?: string;
}): Promise<EmailDispatchResult> {
  const built = buildPatientFinancingEmail(opts);
  return dispatchEmail({
    to: opts.to,
    recipientName: opts.patientName,
    recipientType: 'PATIENT',
    recipientId: opts.patientId || null,
    category: 'FINANCING',
    template: `patient_app_${opts.status.toLowerCase()}`,
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.dedupeKey || null,
    metadata: { protocol: opts.protocol, status: opts.status },
  });
}

// ─── 5. E-mails para Representantes (Vendedores Externos) ────────────────────

export async function sendRepresentanteWelcomeEmail(opts: {
  to: string;
  repId: string;
  nome: string;
  senhaTemporaria: string;
  codigoIndicacao: string;
  comissaoPercent: number;
  mensalidadePercent: number;
}): Promise<EmailDispatchResult> {
  const base = getBaseUrl();
  const loginUrl = `${base}/representante/login`;
  const refUrl = `${base}/credenciamento?ref=${encodeURIComponent(opts.codigoIndicacao)}`;

  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">🤝</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Bem-vindo ao time de Representantes Benavera!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Olá, <strong>${escapeHtml(opts.nome)}</strong>! Seu acesso exclusivo ao Portal do Representante já está ativo.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:18px;border:1px solid #cbd5e1;margin:16px 0;">
        <p style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;margin:0 0 10px;">🔑 Dados de Acesso</p>
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>Portal:</strong> <a href="${loginUrl}" style="color:#4040ca;">${loginUrl}</a></p>
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>E-mail:</strong> ${escapeHtml(opts.to)}</p>
        <p style="font-size:14px;color:#334155;margin:0;"><strong>Senha temporária:</strong> <code style="background:#e2e8f0;padding:3px 8px;border-radius:6px;font-family:monospace;font-weight:700;">${escapeHtml(opts.senhaTemporaria)}</code></p>
      </div>
      <div style="background:#f0f4ff;border-radius:12px;padding:18px;border:1px solid #c7d7fe;margin:16px 0;">
        <p style="font-size:12px;font-weight:700;color:#3730a3;text-transform:uppercase;margin:0 0 8px;">🚀 Seu Código e Link de Indicação</p>
        <p style="font-size:15px;font-weight:800;color:#4040ca;margin:0 0 6px;font-family:monospace;">${escapeHtml(opts.codigoIndicacao)}</p>
        <p style="font-size:13px;color:#334155;margin:0 0 8px;word-break:break-all;"><a href="${refUrl}" style="color:#4040ca;">${refUrl}</a></p>
        <p style="font-size:12px;color:#64748b;margin:0;">Comissão padrão: <strong>${opts.comissaoPercent}%</strong> sobre financiamentos${opts.mensalidadePercent > 0 ? ` + <strong>${opts.mensalidadePercent}%</strong> sobre mensalidades` : ''}.</p>
      </div>
      ${ctaButton('Acessar Portal do Representante →', loginUrl)}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.nome,
    recipientType: 'REPRESENTANTE',
    recipientId: opts.repId,
    category: 'CREDENTIAL',
    template: 'rep_welcome',
    subject: `🤝 Seu acesso ao Portal do Representante Benavera`,
    html: baseLayout(content, 'Credenciais e link de indicação do Representante Benavera.'),
    redactBody: true,
  });
}

export async function sendRepresentantePasswordResetEmail(opts: {
  to: string;
  repId: string;
  nome: string;
  senhaTemporaria: string;
}): Promise<EmailDispatchResult> {
  const loginUrl = `${getBaseUrl()}/representante/login`;
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">🔑</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Nova senha de acesso gerada</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Olá, <strong>${escapeHtml(opts.nome)}</strong>! Uma nova senha temporária foi gerada para sua conta de Representante Benavera.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:18px;border:1px solid #cbd5e1;margin:16px 0;">
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>E-mail:</strong> ${escapeHtml(opts.to)}</p>
        <p style="font-size:14px;color:#334155;margin:0;"><strong>Nova senha:</strong> <code style="background:#e2e8f0;padding:3px 8px;border-radius:6px;font-family:monospace;font-weight:700;">${escapeHtml(opts.senhaTemporaria)}</code></p>
      </div>
      ${ctaButton('Entrar no Portal →', loginUrl)}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.nome,
    recipientType: 'REPRESENTANTE',
    recipientId: opts.repId,
    category: 'CREDENTIAL',
    template: 'rep_password_reset',
    subject: `🔑 Nova senha de acesso — Representante Benavera`,
    html: baseLayout(content, 'Sua nova senha temporária de acesso ao Portal do Representante.'),
    redactBody: true,
  });
}

export async function sendRepresentanteClinicLinkedEmail(opts: {
  to: string;
  repId: string;
  repNome: string;
  clinicName: string;
  comissaoPercent: number;
  mensalidadePercent: number;
  periodoMeses: number | null;
}): Promise<EmailDispatchResult> {
  const content = `
    <div style="border-top:4px solid #10b981;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">🏥</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Nova clínica vinculada à sua carteira!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${escapeHtml(opts.repNome)}</strong>! A clínica <strong>${escapeHtml(opts.clinicName)}</strong> agora faz parte da sua carteira na Benavera.
      </p>
      ${kpiGridHtml([
        { label: 'Clínica', value: opts.clinicName },
        { label: 'Vigência', value: opts.periodoMeses ? `${opts.periodoMeses} meses` : 'Vitalício' },
        { label: 'Comissão Financiamento', value: `${opts.comissaoPercent}%`, accent: '#059669' },
        { label: 'Comissão Mensalidade', value: `${opts.mensalidadePercent}%`, accent: '#4040ca' },
      ])}
      ${ctaButton('Ver minhas clínicas →', safeHref(null, '/representante/clinicas'), '#059669')}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.repNome,
    recipientType: 'REPRESENTANTE',
    recipientId: opts.repId,
    category: 'COMMISSION',
    template: 'rep_clinic_linked',
    subject: `🏥 Nova clínica na sua carteira: ${opts.clinicName}`,
    html: baseLayout(content, `A clínica ${opts.clinicName} foi vinculada à sua carteira Benavera.`),
  });
}

export function buildRepresentanteCommissionEmail(opts: {
  repNome: string;
  clinicName: string;
  tipo: 'FINANCIAMENTO' | 'MENSALIDADE' | 'BONUS';
  baseValor: number;
  percent: number;
  valorComissao: number;
  saldoAReceber: number;
}): { subject: string; html: string } {
  const tipoLabel = opts.tipo === 'MENSALIDADE' ? 'Mensalidade SaaS' : opts.tipo === 'BONUS' ? 'Bônus de Ativação' : 'Financiamento Liquidado';
  const content = `
    <div style="border-top:4px solid #10b981;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">💸</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Nova comissão liberada: ${fmtBrlEmail(opts.valorComissao)}</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Parabéns, <strong>${escapeHtml(opts.repNome)}</strong>! Uma nova comissão entrou no seu saldo <strong>A Receber</strong>.
      </p>
      ${kpiGridHtml([
        { label: 'Valor da Comissão', value: fmtBrlEmail(opts.valorComissao), accent: '#059669' },
        { label: 'Saldo Total a Receber', value: fmtBrlEmail(opts.saldoAReceber), accent: '#4040ca' },
        { label: 'Clínica', value: opts.clinicName },
        { label: 'Origem', value: `${tipoLabel}${opts.percent > 0 ? ` (${opts.percent}%)` : ''}` },
      ])}
      ${ctaButton('Acompanhar meu financeiro →', safeHref(null, '/representante/financeiro'), '#059669')}
    </div>
  `;

  return {
    subject: `💸 Nova comissão liberada (${fmtBrlEmail(opts.valorComissao)}) — ${opts.clinicName}`,
    html: baseLayout(content, `Nova comissão de ${fmtBrlEmail(opts.valorComissao)} liberada da clínica ${opts.clinicName}.`),
  };
}

export async function sendRepresentanteCommissionEmail(opts: {
  to: string;
  repId: string;
  repNome: string;
  clinicName: string;
  tipo: 'FINANCIAMENTO' | 'MENSALIDADE' | 'BONUS';
  baseValor: number;
  percent: number;
  valorComissao: number;
  saldoAReceber: number;
  dedupeKey?: string;
}): Promise<EmailDispatchResult> {
  const built = buildRepresentanteCommissionEmail(opts);
  return dispatchEmail({
    to: opts.to,
    recipientName: opts.repNome,
    recipientType: 'REPRESENTANTE',
    recipientId: opts.repId,
    category: 'COMMISSION',
    template: 'rep_commission_unlocked',
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.dedupeKey || null,
    metadata: { tipo: opts.tipo, valorComissao: opts.valorComissao, clinicName: opts.clinicName },
  });
}

export function buildRepresentantePaymentReceiptEmail(opts: {
  repNome: string;
  totalPago: number;
  qtdComissoes: number;
  pagoEm: string;
  observacao?: string | null;
  comprovanteUrl?: string | null;
}): { subject: string; html: string } {
  const content = `
    <div style="border-top:4px solid #059669;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">🏦</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Pagamento de comissões realizado!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${escapeHtml(opts.repNome)}</strong>! Registramos o pagamento das suas comissões Benavera.
      </p>
      ${kpiGridHtml([
        { label: 'Total Pago', value: fmtBrlEmail(opts.totalPago), accent: '#059669' },
        { label: 'Data do Pagamento', value: opts.pagoEm },
        { label: 'Comissões Liquidadas', value: `${opts.qtdComissoes} item(ns)` },
        { label: 'Status', value: 'Pago ✓', accent: '#059669' },
      ])}
      ${opts.observacao ? `<div style="background:#f8fafc;border-radius:10px;padding:14px;border:1px solid #e2e8f0;font-size:13px;color:#475569;margin-top:12px;"><strong>Observação:</strong> ${escapeHtml(opts.observacao)}</div>` : ''}
      ${opts.comprovanteUrl ? ctaButton('Ver comprovante →', safeHref(opts.comprovanteUrl, '/representante/financeiro'), '#059669') : ctaButton('Ver extrato financeiro →', safeHref(null, '/representante/financeiro'), '#059669')}
    </div>
  `;

  return {
    subject: `🏦 Pagamento de comissões confirmado: ${fmtBrlEmail(opts.totalPago)}`,
    html: baseLayout(content, `Pagamento de ${fmtBrlEmail(opts.totalPago)} em comissões Benavera registrado.`),
  };
}

export async function sendRepresentantePaymentReceiptEmail(opts: {
  to: string;
  repId: string;
  repNome: string;
  totalPago: number;
  qtdComissoes: number;
  pagoEm: string;
  observacao?: string | null;
  comprovanteUrl?: string | null;
  pagamentoId?: string;
}): Promise<EmailDispatchResult> {
  const built = buildRepresentantePaymentReceiptEmail(opts);
  return dispatchEmail({
    to: opts.to,
    recipientName: opts.repNome,
    recipientType: 'REPRESENTANTE',
    recipientId: opts.repId,
    category: 'COMMISSION',
    template: 'rep_payment_receipt',
    subject: built.subject,
    html: built.html,
    dedupeKey: opts.pagamentoId ? `rep_payment:${opts.pagamentoId}` : null,
    metadata: { totalPago: opts.totalPago, qtdComissoes: opts.qtdComissoes, pagamentoId: opts.pagamentoId },
  });
}

// ─── 6. E-mails para Atendentes / Comerciais Internos ────────────────────────

export async function sendAtendenteWelcomeEmail(opts: {
  to: string;
  userId: string;
  name: string;
  password: string;
}): Promise<EmailDispatchResult> {
  const loginUrl = `${getBaseUrl()}/atendente/login`;
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">🚀</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Bem-vindo à equipe Comercial Benavera!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Olá, <strong>${escapeHtml(opts.name)}</strong>! Seu acesso ao Painel Comercial / Atendente já está liberado.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:18px;border:1px solid #cbd5e1;margin:16px 0;">
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>Painel:</strong> <a href="${loginUrl}" style="color:#4040ca;">${loginUrl}</a></p>
        <p style="font-size:14px;color:#334155;margin:0 0 6px;"><strong>E-mail:</strong> ${escapeHtml(opts.to)}</p>
        <p style="font-size:14px;color:#334155;margin:0;"><strong>Senha inicial:</strong> <code style="background:#e2e8f0;padding:3px 8px;border-radius:6px;font-family:monospace;font-weight:700;">${escapeHtml(opts.password)}</code></p>
      </div>
      ${ctaButton('Acessar Painel Comercial →', loginUrl)}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.name,
    recipientType: 'ATENDENTE',
    recipientId: opts.userId,
    category: 'CREDENTIAL',
    template: 'atendente_welcome',
    subject: `🚀 Seu acesso ao Painel Comercial Benavera`,
    html: baseLayout(content, 'Credenciais de acesso ao Painel Comercial Benavera.'),
    redactBody: true,
  });
}

export async function sendAtendenteLeadAssignedEmail(opts: {
  to: string;
  userId: string;
  atendenteName: string;
  leadTipo: 'clinic' | 'patient';
  leadName: string;
  leadContact?: string | null;
  leadId: string;
}): Promise<EmailDispatchResult> {
  const tipoLabel = opts.leadTipo === 'clinic' ? 'Clínica interessada' : 'Paciente interessado';
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">🎯</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Novo lead atribuído a você!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${escapeHtml(opts.atendenteName)}</strong>! Um novo lead acabou de entrar na sua fila de atendimento.
      </p>
      ${kpiGridHtml([
        { label: 'Tipo', value: tipoLabel },
        { label: 'Nome / Clínica', value: opts.leadName },
        { label: 'Contato', value: opts.leadContact || 'Ver no painel' },
        { label: 'Ação recomendada', value: 'Primeiro contato rápido', accent: '#4040ca' },
      ])}
      ${ctaButton('Atender lead agora →', safeHref(null, '/atendente/leads'))}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.atendenteName,
    recipientType: 'ATENDENTE',
    recipientId: opts.userId,
    category: 'ALERT',
    template: 'atendente_lead_assigned',
    subject: `🎯 Novo lead na sua fila: ${opts.leadName}`,
    html: baseLayout(content, `Novo lead (${tipoLabel}) atribuído: ${opts.leadName}.`),
    dedupeKey: `lead_assigned:${opts.leadTipo}:${opts.leadId}:${opts.userId}`,
  });
}

export async function sendAtendenteCommissionEmail(opts: {
  to: string;
  userId: string;
  atendenteName: string;
  evento: string;
  valor: number;
  status: 'aprovada' | 'paga';
  justificativa?: string | null;
  commissionId: string;
}): Promise<EmailDispatchResult> {
  const isPaid = opts.status === 'paga';
  const accent = isPaid ? '#059669' : '#4040ca';
  const title = isPaid ? 'Sua comissão foi paga!' : 'Sua comissão foi aprovada!';

  const content = `
    <div style="border-top:4px solid ${accent};padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">${isPaid ? '💰' : '✅'}</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">${title}</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${escapeHtml(opts.atendenteName)}</strong>! Atualização na sua comissão comercial:
      </p>
      ${kpiGridHtml([
        { label: 'Valor', value: fmtBrlEmail(opts.valor), accent },
        { label: 'Status', value: isPaid ? 'Paga ✓' : 'Aprovada ✓', accent },
        { label: 'Evento', value: opts.evento },
        { label: 'Observação', value: opts.justificativa || '—' },
      ])}
      ${ctaButton('Ver minhas comissões →', safeHref(null, '/atendente/comissoes'), accent)}
    </div>
  `;

  return dispatchEmail({
    to: opts.to,
    recipientName: opts.atendenteName,
    recipientType: 'ATENDENTE',
    recipientId: opts.userId,
    category: 'COMMISSION',
    template: isPaid ? 'atendente_commission_paid' : 'atendente_commission_approved',
    subject: `${isPaid ? '💰' : '✅'} Comissão ${opts.status}: ${fmtBrlEmail(opts.valor)}`,
    html: baseLayout(content, `${title} Valor: ${fmtBrlEmail(opts.valor)}.`),
    dedupeKey: `atendente_comm:${opts.commissionId}:${opts.status}`,
  });
}

export function buildAtendenteFollowupAlertEmail(opts: {
  atendenteName: string;
  overdueLeads: Array<{ nome: string; contato: string; diasParado: number }>;
}): { subject: string; html: string } {
  const rows = opts.overdueLeads
    .slice(0, 12)
    .map(
      l => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(l.nome)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;">${escapeHtml(l.contato || '—')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700;color:#b45309;text-align:right;">${l.diasParado}d sem retorno</td>
      </tr>`
    )
    .join('');

  const content = `
    <div style="border-top:4px solid #d97706;padding:36px;">
      <div style="font-size:30px;margin-bottom:10px;">⏰</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Você tem ${opts.overdueLeads.length} lead(s) aguardando follow-up</h1>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Olá, <strong>${escapeHtml(opts.atendenteName)}</strong>! Retome contato hoje para aumentar sua taxa de credenciamento:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Clínica / Lead</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;">Contato</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;">Tempo</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${ctaButton('Abrir minha fila de leads →', safeHref(null, '/atendente/leads'), '#d97706')}
    </div>
  `;

  return {
    subject: `⏰ ${opts.overdueLeads.length} lead(s) aguardando seu follow-up hoje`,
    html: baseLayout(content, `Você tem ${opts.overdueLeads.length} leads pendentes de contato.`),
  };
}

// ─── 7. Relatórios Periódicos (Clínica, Representante, Comercial, Diretoria) ─

export interface ClinicReportPayload {
  clinicName: string;
  periodLabel: string;
  periodTitle: 'Semanal' | 'Mensal';
  propostasTotal: number;
  propostasAprovadas: number;
  taxaAprovacao: number;
  volumeSolicitado: number;
  volumeAprovado: number;
  repassesPagosValor: number;
  repassesPendentesValor: number;
  planName: string;
  subscriptionStatus: string;
  nextBillingDate: string | null;
}

export function buildClinicPeriodicReportEmail(d: ClinicReportPayload): { subject: string; html: string } {
  const statusLabel =
    d.subscriptionStatus === 'ACTIVE' ? 'Ativa'
      : d.subscriptionStatus === 'GRACE' ? 'Em carência (regularize)'
      : d.subscriptionStatus === 'SUSPENDED' ? 'Suspensa'
      : d.subscriptionStatus === 'TRIAL' ? 'Teste gratuito'
      : 'Gratuita / Isenta';

  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#4040ca;margin-bottom:6px;">
        Relatório ${escapeHtml(d.periodTitle)} • ${escapeHtml(d.periodLabel)}
      </div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Desempenho da ${escapeHtml(d.clinicName)}</h1>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Confira o resumo das suas solicitações de financiamento, repasses e assinatura no período.
      </p>
      ${kpiGridHtml([
        { label: 'Solicitações Enviadas', value: String(d.propostasTotal) },
        { label: 'Aprovadas / Taxa', value: `${d.propostasAprovadas} (${d.taxaAprovacao.toFixed(0)}%)`, accent: '#059669' },
        { label: 'Volume Solicitado', value: fmtBrlEmail(d.volumeSolicitado) },
        { label: 'Volume Aprovado', value: fmtBrlEmail(d.volumeAprovado), accent: '#4040ca' },
        { label: 'Repasses Recebidos', value: fmtBrlEmail(d.repassesPagosValor), accent: '#059669' },
        { label: 'Repasses a Receber', value: fmtBrlEmail(d.repassesPendentesValor), accent: '#d97706' },
      ])}
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-top:16px;font-size:13px;color:#475569;">
        <strong>Assinatura:</strong> ${escapeHtml(d.planName)} (${escapeHtml(statusLabel)})
        ${d.nextBillingDate ? ` • <strong>Próximo vencimento:</strong> ${escapeHtml(d.nextBillingDate)}` : ''}
      </div>
      ${ctaButton('Abrir Painel da Clínica →', safeHref(null, '/dashboard'))}
    </div>
  `;

  return {
    subject: `📊 Relatório ${d.periodTitle} Benavera (${d.periodLabel}) — ${d.clinicName}`,
    html: baseLayout(
      content,
      `Resumo ${d.periodTitle.toLowerCase()}: ${d.propostasTotal} solicitações e ${fmtBrlEmail(d.repassesPagosValor)} em repasses.`,
      `Gerencie preferências de e-mail em <a href="${safeHref(null, '/configuracoes')}" style="color:#64748b;">Configurações</a>.`
    ),
  };
}

export interface RepresentanteReportPayload {
  repNome: string;
  periodLabel: string;
  periodTitle: 'Semanal' | 'Mensal';
  clinicasAtivas: number;
  clinicasInativas30d: Array<{ nome: string; diasSemAtividade: number | null }>;
  propostasPeriodo: number;
  volumePeriodo: number;
  comissaoPeriodo: number;
  comissaoAReceber: number;
  comissaoPrevista: number;
  comissaoPagaPeriodo: number;
  topClinicas: Array<{ nome: string; volume: number; comissao: number }>;
}

export function buildRepresentantePeriodicReportEmail(d: RepresentanteReportPayload): { subject: string; html: string } {
  const topRows = d.topClinicas
    .slice(0, 5)
    .map(
      c => `<tr>
        <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(c.nome)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569;text-align:right;">${fmtBrlEmail(c.volume)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#059669;text-align:right;">${fmtBrlEmail(c.comissao)}</td>
      </tr>`
    )
    .join('');

  const inactiveBlock = d.clinicasInativas30d.length > 0
    ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-top:16px;">
        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px;">⚠️ ${d.clinicasInativas30d.length} clínica(s) sem propostas há mais de 30 dias:</div>
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">
          ${d.clinicasInativas30d.slice(0, 6).map(c => escapeHtml(c.nome)).join(' • ')}${d.clinicasInativas30d.length > 6 ? ` (+${d.clinicasInativas30d.length - 6})` : ''}
        </p>
      </div>`
    : '';

  const content = `
    <div style="border-top:4px solid #059669;padding:36px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#059669;margin-bottom:6px;">
        Relatório ${escapeHtml(d.periodTitle)} do Representante • ${escapeHtml(d.periodLabel)}
      </div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Resumo da sua carteira, ${escapeHtml(d.repNome)}</h1>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 18px;">
        Veja como suas clínicas performaram e o resumo das suas comissões.
      </p>
      ${kpiGridHtml([
        { label: 'Saldo a Receber', value: fmtBrlEmail(d.comissaoAReceber), accent: '#059669' },
        { label: 'Comissão Prevista', value: fmtBrlEmail(d.comissaoPrevista), accent: '#4040ca' },
        { label: 'Pago no Período', value: fmtBrlEmail(d.comissaoPagaPeriodo) },
        { label: 'Clínicas Ativas', value: String(d.clinicasAtivas) },
        { label: 'Propostas no Período', value: String(d.propostasPeriodo) },
        { label: 'Volume Gerado', value: fmtBrlEmail(d.volumePeriodo) },
      ])}
      ${topRows ? `
        <div style="margin-top:18px;">
          <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:#64748b;margin:0 0 8px;">Top Clínicas da Carteira</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <thead><tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">Clínica</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;">Volume</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;">Comissão</th>
            </tr></thead>
            <tbody>${topRows}</tbody>
          </table>
        </div>` : ''}
      ${inactiveBlock}
      ${ctaButton('Abrir Portal do Representante →', safeHref(null, '/representante'), '#059669')}
    </div>
  `;

  return {
    subject: `📈 Relatório ${d.periodTitle} (${d.periodLabel}) — Saldo a receber: ${fmtBrlEmail(d.comissaoAReceber)}`,
    html: baseLayout(
      content,
      `Seu resumo ${d.periodTitle.toLowerCase()}: ${fmtBrlEmail(d.comissaoAReceber)} a receber e ${d.clinicasAtivas} clínicas ativas.`,
      `Preferências em <a href="${safeHref(null, '/representante/perfil')}" style="color:#64748b;">Meu Perfil</a>.`
    ),
  };
}

export interface AtendenteReportPayload {
  atendenteName: string;
  periodLabel: string;
  periodTitle: 'Semanal' | 'Mensal';
  leadsRecebidos: number;
  leadsEmAndamento: number;
  leadsConvertidos: number;
  followupsAtrasados: number;
  comissaoAprovadaValor: number;
  comissaoPagaValor: number;
}

export function buildAtendentePeriodicReportEmail(d: AtendenteReportPayload): { subject: string; html: string } {
  const content = `
    <div style="border-top:4px solid #4040ca;padding:36px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#4040ca;margin-bottom:6px;">
        Relatório Comercial ${escapeHtml(d.periodTitle)} • ${escapeHtml(d.periodLabel)}
      </div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Seu desempenho, ${escapeHtml(d.atendenteName)}</h1>
      ${kpiGridHtml([
        { label: 'Leads Recebidos', value: String(d.leadsRecebidos) },
        { label: 'Convertidos (Parceiro Ativo)', value: String(d.leadsConvertidos), accent: '#059669' },
        { label: 'Em Andamento', value: String(d.leadsEmAndamento) },
        { label: 'Follow-ups Atrasados', value: String(d.followupsAtrasados), accent: d.followupsAtrasados > 0 ? '#d97706' : '#059669' },
        { label: 'Comissão Aprovada', value: fmtBrlEmail(d.comissaoAprovadaValor), accent: '#4040ca' },
        { label: 'Comissão Paga', value: fmtBrlEmail(d.comissaoPagaValor), accent: '#059669' },
      ])}
      ${ctaButton('Abrir Painel Comercial →', safeHref(null, '/atendente'))}
    </div>
  `;

  return {
    subject: `🎯 Relatório Comercial ${d.periodTitle} (${d.periodLabel}) — ${d.atendenteName}`,
    html: baseLayout(content, `${d.leadsRecebidos} leads recebidos, ${d.leadsConvertidos} convertidos.`),
  };
}

export interface AdminExecutivePayload {
  dateLabel: string;
  novosLeadsClinicas24h: number;
  novosLeadsPacientes24h: number;
  onboardingsPendentes: number;
  propostas24h: number;
  propostasAprovadas24h: number;
  volumeAprovado24h: number;
  mrrAtual: number;
  faturasPagasMes: number;
  faturasPendentesTotal: number;
  assinaturasCarencia: number;
  assinaturasSuspensas: number;
  comissoesRepAReceber: number;
  comissoesAtendentesAprovadas: number;
  repassesPendentesValor: number;
}

export function buildAdminDailyExecutiveEmail(d: AdminExecutivePayload): { subject: string; html: string } {
  const content = `
    <div style="border-top:4px solid #0f172a;padding:36px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#4040ca;margin-bottom:6px;">
        Resumo Executivo Diário • ${escapeHtml(d.dateLabel)}
      </div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Painel Benavera — Últimas 24h &amp; Financeiro</h1>
      <p style="font-size:14px;color:#475569;margin:0 0 18px;">
        Visão consolidada de operação, credenciamentos, mensalidades SaaS e obrigações de pagamento.
      </p>
      ${kpiGridHtml([
        { label: 'Novos Leads (24h)', value: `${d.novosLeadsClinicas24h} clínicas • ${d.novosLeadsPacientes24h} pac.` },
        { label: 'Credenciamentos p/ Analisar', value: String(d.onboardingsPendentes), accent: d.onboardingsPendentes > 0 ? '#d97706' : '#059669' },
        { label: 'Propostas (24h)', value: `${d.propostas24h} (${d.propostasAprovadas24h} aprov.)` },
        { label: 'Volume Aprovado (24h)', value: fmtBrlEmail(d.volumeAprovado24h), accent: '#059669' },
        { label: 'MRR Atual (SaaS)', value: fmtBrlEmail(d.mrrAtual), accent: '#4040ca' },
        { label: 'Recebido Mensalidades (Mês)', value: fmtBrlEmail(d.faturasPagasMes), accent: '#059669' },
        { label: 'Faturas em Aberto', value: fmtBrlEmail(d.faturasPendentesTotal), accent: '#d97706' },
        { label: 'Carência / Suspensas', value: `${d.assinaturasCarencia} carência • ${d.assinaturasSuspensas} susp.`, accent: d.assinaturasSuspensas > 0 ? '#dc2626' : '#475569' },
        { label: 'Comissões Rep. a Pagar', value: fmtBrlEmail(d.comissoesRepAReceber) },
        { label: 'Comissões Comerciais', value: fmtBrlEmail(d.comissoesAtendentesAprovadas) },
      ])}
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:13px;color:#475569;">
        <strong>Repasses pendentes às clínicas:</strong> ${fmtBrlEmail(d.repassesPendentesValor)}
      </div>
      ${ctaButton('Abrir Painel Administrativo →', safeHref(null, '/admin'), '#0f172a')}
    </div>
  `;

  return {
    subject: `📊 Resumo Diário Benavera (${d.dateLabel}) — MRR ${fmtBrlEmail(d.mrrAtual)} | ${d.propostas24h} propostas`,
    html: baseLayout(content, `Resumo executivo Benavera ${d.dateLabel}: MRR ${fmtBrlEmail(d.mrrAtual)}.`),
  };
}

// ─── 8. E-mail de Teste ──────────────────────────────────────────────────────

export function buildTestEmail(opts: { recipientName?: string; triggeredBy: string }): { subject: string; html: string } {
  const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const content = `
    <div style="border-top:4px solid #10b981;padding:36px;">
      <div style="font-size:32px;margin-bottom:10px;">✅</div>
      <h1 style="font-size:21px;font-weight:800;color:#0f172a;margin:0 0 8px;">Teste de envio Resend — Funcionando!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá${opts.recipientName ? `, <strong>${escapeHtml(opts.recipientName)}</strong>` : ''}! Este é um e-mail de teste disparado pela Central de E-mails da Benavera.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;font-size:13px;color:#065f46;">
        <strong>Disparado por:</strong> ${escapeHtml(opts.triggeredBy)}<br/>
        <strong>Data/hora:</strong> ${escapeHtml(nowStr)}
      </div>
    </div>
  `;
  return {
    subject: `✅ Teste do sistema de e-mails Benavera (${nowStr})`,
    html: baseLayout(content, 'E-mail de teste do motor Resend da Benavera.'),
  };
}

export async function sendTestEmail(opts: { to: string; recipientName?: string; triggeredBy: string }): Promise<EmailDispatchResult> {
  const built = buildTestEmail(opts);
  return dispatchEmail({
    to: opts.to,
    recipientName: opts.recipientName || opts.to,
    recipientType: 'TEST',
    category: 'TEST',
    template: 'admin_test_email',
    subject: built.subject,
    html: built.html,
    metadata: { triggeredBy: opts.triggeredBy },
  });
}
