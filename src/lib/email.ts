import { Resend } from 'resend';

// Lazy instantiation — evita crash no build sem RESEND_API_KEY
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'RESEND_API_KEY não configurada. Adicione nas variáveis de ambiente do Render/Vercel.'
    );
  }
  return new Resend(key);
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Benavera <noreply@benavera.com.br>';

// ─── Templates ─────────────────────────────────────────────────────────────

function baseLayout(content: string, preheader = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Benavera</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <!-- Logo -->
  <tr><td style="padding-bottom:24px;">
    <div style="background:linear-gradient(135deg,#6370f1,#4040ca);border-radius:12px;padding:14px 20px;display:inline-flex;align-items:center;gap:10px;">
      <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Benavera</span>
    </div>
  </td></tr>
  <!-- Content card -->
  <tr><td style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 0;text-align:center;font-size:12px;color:#94a3b8;">
    <p style="margin:0;">Benavera — Financiamento Odontológico</p>
    <p style="margin:4px 0 0;">Você recebeu este email porque está cadastrado na plataforma Benavera.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Email: Boas-vindas Clínica Credenciada ─────────────────────────────────

export async function sendClinicWelcomeEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  loginUrl?: string;
}) {
  const { to, clinicName, responsavel, loginUrl = 'https://www.benavera.com.br/login' } = opts;

  const content = `
    <div style="padding:40px;">
      <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 8px;">Bem-vindo à Benavera! 🎉</h1>
      <p style="font-size:16px;color:#475569;margin:0 0 24px;">Olá, <strong>${responsavel}</strong>!</p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px;">
        A clínica <strong>${clinicName}</strong> foi credenciada com sucesso na plataforma Benavera.
        Agora você pode enviar solicitações de financiamento para os seus pacientes de forma simples e rápida.
      </p>
      <div style="background:#f0f4ff;border-radius:10px;padding:20px;margin:24px 0;">
        <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 12px;">✅ Próximos passos:</p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
          <li>Acesse o portal e complete o perfil da clínica</li>
          <li>Adicione os membros da sua equipe</li>
          <li>Envie sua primeira solicitação de financiamento</li>
        </ul>
      </div>
      <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#6370f1,#4040ca);color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;margin-top:8px;">
        Acessar o Portal →
      </a>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">
        Tem dúvidas? Fale com nossa equipe pelo WhatsApp ou responda este e-mail.
      </p>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Bem-vindo à Benavera, ${clinicName}! 🎉`,
    html: baseLayout(content, `Sua clínica ${clinicName} foi credenciada com sucesso!`),
  });
}

// ─── Email: Notificação de Status de Financiamento ──────────────────────────

export async function sendApplicationStatusEmail(opts: {
  to: string;
  patientName: string;
  clinicName: string;
  protocol: string;
  status: string;
  valor: number;
  portalUrl?: string;
}) {
  const { to, patientName, clinicName, protocol, status, valor, portalUrl = 'https://www.benavera.com.br/login' } = opts;

  const STATUS_MESSAGES: Record<string, { title: string; msg: string; color: string; emoji: string }> = {
    PRE_ANALYSIS_APPROVED: { title: 'Pré-análise Aprovada!', emoji: '✅', color: '#10b981', msg: 'A solicitação passou pela pré-análise e será encaminhada aos nossos parceiros financeiros.' },
    OFFERS_AVAILABLE: { title: 'Ofertas Disponíveis!', emoji: '🎉', color: '#6370f1', msg: 'Há propostas de financiamento disponíveis para análise. Acesse o portal para visualizar.' },
    APPROVED: { title: 'Financiamento Aprovado!', emoji: '🏆', color: '#10b981', msg: 'Parabéns! O financiamento foi aprovado. O contrato será enviado em breve.' },
    CONTRACT_SIGNED: { title: 'Contrato Assinado', emoji: '📝', color: '#6370f1', msg: 'O contrato foi assinado com sucesso. O repasse será processado em breve.' },
    PAYOUT_COMPLETED: { title: 'Repasse Realizado!', emoji: '💰', color: '#10b981', msg: 'O repasse referente a este financiamento foi realizado com sucesso.' },
    DECLINED: { title: 'Solicitação Recusada', emoji: '❌', color: '#ef4444', msg: 'Infelizmente a solicitação não foi aprovada neste momento. Entre em contato para saber mais.' },
    PRE_ANALYSIS_DECLINED: { title: 'Pré-análise Recusada', emoji: '❌', color: '#ef4444', msg: 'A solicitação não passou pelos critérios de pré-análise. Entre em contato para orientações.' },
  };

  const info = STATUS_MESSAGES[status] || { title: 'Atualização do Financiamento', emoji: '📋', color: '#6370f1', msg: `O status da solicitação foi atualizado para: ${status}` };

  const fmtValor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const content = `
    <div style="border-top:4px solid ${info.color};padding:40px;">
      <div style="font-size:36px;margin-bottom:12px;">${info.emoji}</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">${info.title}</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 24px;">Protocolo: <strong>${protocol}</strong></p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px;">${info.msg}</p>
      <div style="background:#f8fafc;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #e2e8f0;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div><span style="font-size:11px;color:#94a3b8;display:block;">PACIENTE</span><strong style="font-size:14px;color:#0f172a;">${patientName}</strong></div>
          <div><span style="font-size:11px;color:#94a3b8;display:block;">CLÍNICA</span><strong style="font-size:14px;color:#0f172a;">${clinicName}</strong></div>
          <div><span style="font-size:11px;color:#94a3b8;display:block;">VALOR</span><strong style="font-size:14px;color:#0f172a;">${fmtValor}</strong></div>
        </div>
      </div>
      <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#6370f1,#4040ca);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:8px;">
        Ver no Portal →
      </a>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${info.emoji} ${info.title} — Protocolo ${protocol}`,
    html: baseLayout(content, info.msg),
  });
}

// ─── Email: Followup de Lead de Clínica ────────────────────────────────────

export async function sendClinicFollowupEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  analista: string;
  credenciamentoUrl?: string;
}) {
  const { to, clinicName, responsavel, analista, credenciamentoUrl = 'https://www.benavera.com.br/credenciamento' } = opts;

  const content = `
    <div style="padding:40px;">
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px;">Olá, ${responsavel}! 👋</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Estamos em contato com a <strong>${clinicName}</strong> sobre a nossa solução de financiamento odontológico.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
        Com a Benavera, sua clínica oferece financiamento sem burocracia para os pacientes, aumentando a taxa de conversão e o ticket médio dos tratamentos.
      </p>
      <div style="background:#f0f4ff;border-radius:10px;padding:20px;margin:20px 0;">
        <p style="font-size:14px;font-weight:700;color:#4040ca;margin:0 0 10px;">🚀 Por que clínicas escolhem a Benavera?</p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
          <li>Aprovação em até 2 horas</li>
          <li>Sem risco para a clínica</li>
          <li>Repasse garantido após assinatura do contrato</li>
          <li>Plataforma 100% digital</li>
        </ul>
      </div>
      <a href="${credenciamentoUrl}" style="display:inline-block;background:linear-gradient(135deg,#6370f1,#4040ca);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:8px;">
        Quero Credenciar Minha Clínica →
      </a>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">
        Qualquer dúvida, responda este e-mail ou fale com ${analista} diretamente.
      </p>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${clinicName} — Financiamento sem burocracia para seus pacientes`,
    html: baseLayout(content, 'Aumente o ticket médio da sua clínica com a Benavera'),
  });
}

// ─── Email: Alerta interno para analista ────────────────────────────────────

export async function sendAnalystAlertEmail(opts: {
  to: string;
  analystName: string;
  alertType: 'followup_overdue' | 'new_application' | 'sla_breach';
  entityName: string;
  entityUrl?: string;
  details?: string;
}) {
  const { to, analystName, alertType, entityName, entityUrl = 'https://www.benavera.com.br/admin', details } = opts;

  const ALERT_CONFIG = {
    followup_overdue: { title: 'Followup Atrasado', emoji: '⏰', color: '#f59e0b', msg: `O followup com ${entityName} está atrasado.` },
    new_application: { title: 'Nova Solicitação', emoji: '📥', color: '#6370f1', msg: `Nova solicitação de financiamento recebida de ${entityName}.` },
    sla_breach: { title: 'SLA Violado', emoji: '🚨', color: '#ef4444', msg: `A solicitação de ${entityName} está acima do SLA esperado.` },
  };

  const cfg = ALERT_CONFIG[alertType];

  const content = `
    <div style="border-top:4px solid ${cfg.color};padding:40px;">
      <div style="font-size:32px;margin-bottom:12px;">${cfg.emoji}</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">${cfg.title}</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;">Olá, <strong>${analystName}</strong>!</p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">${cfg.msg}</p>
      ${details ? `<div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;font-size:13px;color:#475569;">${details}</div>` : ''}
      <a href="${entityUrl}" style="display:inline-block;background:${cfg.color};color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:20px;">
        Ver no Painel →
      </a>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${cfg.emoji} ${cfg.title} — ${entityName}`,
    html: baseLayout(content),
  });
}

// ─── Email: OTP de verificação ──────────────────────────────────────────────

export async function sendOTPEmail(opts: {
  to: string;
  clinicName: string;
  code: string;
}) {
  const { to, clinicName, code } = opts;

  const content = `
    <div style="border-top:4px solid #6370f1;padding:40px;">
      <div style="font-size:36px;margin-bottom:12px;">🔐</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Código de verificação</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
        Para proteger os dados da <strong>${clinicName}</strong>, confirme seu acesso com o código abaixo.
      </p>
      <div style="background:#f0f4ff;border-radius:14px;padding:28px;text-align:center;margin:24px 0;border:2px dashed #c7d7fe;">
        <p style="font-size:42px;font-weight:900;letter-spacing:12px;color:#4040ca;margin:0;font-family:monospace;">${code}</p>
        <p style="font-size:13px;color:#64748b;margin:12px 0 0;">Válido por 10 minutos</p>
      </div>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">
        Se você não solicitou este código, ignore este e-mail. Nunca compartilhe este código com ninguém.<br/>
        A Benavera nunca solicitará este código por telefone ou WhatsApp.
      </p>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${code} — Código de verificação Benavera`,
    html: baseLayout(content, `Seu código de verificação para o credenciamento Benavera.`),
  });
}

// ─── Email: Convite de credenciamento ──────────────────────────────────────

export async function sendOnboardingInviteEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const { to, clinicName, responsavel, inviteUrl, expiresAt } = opts;
  const expiryFormatted = expiresAt.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const content = `
    <div style="padding:40px;">
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Olá, ${responsavel}! 👋</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Estamos prontos para concluir o credenciamento da <strong>${clinicName}</strong> na Benavera.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
        Seus dados básicos já estão preenchidos. Clique no botão abaixo para iniciar o preenchimento.
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#6370f1,#4040ca);color:#fff;font-weight:700;font-size:15px;padding:16px 36px;border-radius:12px;text-decoration:none;margin-bottom:24px;">
        Iniciar credenciamento →
      </a>
      <div style="background:#fef9ec;border-radius:10px;padding:16px;border:1px solid #fde68a;margin:24px 0;">
        <p style="font-size:13px;color:#92400e;margin:0;">
          ⏱️ Este link expira em <strong>${expiryFormatted}</strong>.
        </p>
      </div>
      <div style="background:#f0faf8;border-radius:10px;padding:16px;border:1px solid #b4e6de;margin:0;">
        <p style="font-size:13px;color:#1e6560;margin:0;">
          🔒 Seus dados são enviados por conexão segura (HTTPS). Uma verificação de identidade será solicitada.
        </p>
      </div>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${clinicName} — Complete seu credenciamento na Benavera`,
    html: baseLayout(content, `Finalize o credenciamento da ${clinicName} na Benavera.`),
  });
}

// ─── Email: Correção solicitada ────────────────────────────────────────────

export async function sendCorrectionRequestEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
  corrections: Array<{ label: string; message: string }>;
  inviteUrl: string;
}) {
  const { to, clinicName, responsavel, corrections, inviteUrl } = opts;

  const correctionItems = corrections.map(c => `
    <li style="margin-bottom:12px;">
      <strong style="color:#0f172a;">${c.label}</strong><br/>
      <span style="color:#475569;font-size:14px;">${c.message}</span>
    </li>
  `).join('');

  const content = `
    <div style="border-top:4px solid #f59e0b;padding:40px;">
      <div style="font-size:32px;margin-bottom:12px;">📋</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Correção necessária</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${responsavel}</strong>! Identificamos pontos que precisam ser corrigidos no credenciamento da <strong>${clinicName}</strong>.
      </p>
      <div style="background:#fef9ec;border-radius:10px;padding:20px;border:1px solid #fde68a;margin:20px 0;">
        <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 12px;">⚠️ Itens para correção:</p>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">${correctionItems}</ul>
      </div>
      <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#6370f1,#4040ca);color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Corrigir agora →
      </a>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${clinicName} — Correção necessária no credenciamento`,
    html: baseLayout(content, `Verifique os itens que precisam ser corrigidos.`),
  });
}

// ─── Email: Credenciamento recebido (clínica) ──────────────────────────────

export async function sendOnboardingSubmittedClinicEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
}) {
  const { to, clinicName, responsavel } = opts;

  const content = `
    <div style="border-top:4px solid #10b981;padding:40px;">
      <div style="font-size:36px;margin-bottom:12px;">✅</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Credenciamento recebido!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Olá, <strong>${responsavel}</strong>! Recebemos o credenciamento da <strong>${clinicName}</strong> com sucesso.
      </p>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 24px;">
        Nossa equipe fará a validação das informações e documentos. Você será avisado quando a análise for concluída.
      </p>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">
        Buscamos concentrar toda a documentação necessária nesta etapa. Em situações excepcionais, 
        alterações cadastrais, exigências regulatórias, prevenção à fraude ou solicitações do parceiro 
        financeiro poderão exigir atualização ou documentação complementar.
      </p>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${clinicName} — Credenciamento recebido com sucesso`,
    html: baseLayout(content, `Seu credenciamento foi recebido.`),
  });
}

// ─── Email: Alerta interno — submissão recebida ────────────────────────────

export async function sendOnboardingSubmittedAlert(opts: {
  to: string;
  analystName: string;
  clinicName: string;
  adminUrl: string;
}) {
  const { to, analystName, clinicName, adminUrl } = opts;

  const content = `
    <div style="border-top:4px solid #6370f1;padding:40px;">
      <div style="font-size:32px;margin-bottom:12px;">📥</div>
      <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">Novo credenciamento para análise</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;">Olá, <strong>${analystName}</strong>!</p>
      <p style="font-size:15px;color:#475569;margin:0 0 16px;">
        A clínica <strong>${clinicName}</strong> submeteu o credenciamento e aguarda análise.
      </p>
      <a href="${adminUrl}" style="display:inline-block;background:#6370f1;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
        Analisar credenciamento →
      </a>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `📥 Novo credenciamento — ${clinicName}`,
    html: baseLayout(content),
  });
}

// ─── Email: Credenciamento aprovado ──────────────────────────────────────

export async function sendOnboardingApprovedEmail(opts: {
  to: string;
  clinicName: string;
  responsavel: string;
}) {
  const { to, clinicName, responsavel } = opts;

  const content = `
    <div style="border-top:4px solid #10b981;padding:40px;">
      <div style="font-size:36px;margin-bottom:12px;">🎉</div>
      <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">Credenciamento aprovado!</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">
        Parabéns, <strong>${responsavel}</strong>! O credenciamento da <strong>${clinicName}</strong> foi aprovado.
      </p>
      <div style="background:#f0faf8;border-radius:10px;padding:20px;border:1px solid #b4e6de;">
        <p style="font-size:14px;color:#1e6560;margin:0;">
          ⚠️ A aprovação cadastral e a ativação operacional são etapas separadas. 
          A concessão de crédito depende do parceiro financeiro e não é garantida pela Benavera.
        </p>
      </div>
    </div>
  `;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🎉 Credenciamento aprovado — ${clinicName}`,
    html: baseLayout(content, `O credenciamento da ${clinicName} foi aprovado.`),
  });
}
