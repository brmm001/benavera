'use client';
// src/app/admin/emails/page.tsx — Central de E-mails, Relatórios, Pré-visualização, Configurações e Logs (Resend)

import React, { useCallback, useEffect, useState } from 'react';

interface EmailSettings {
  admin_alert_emails: string[];
  reply_to_email: string | null;
  enable_clinic_weekly_report: boolean;
  enable_clinic_monthly_report: boolean;
  enable_rep_weekly_report: boolean;
  enable_rep_monthly_report: boolean;
  enable_atendente_weekly_report: boolean;
  enable_atendente_monthly_report: boolean;
  enable_admin_daily_summary: boolean;
  enable_billing_reminders: boolean;
  enable_patient_emails: boolean;
  enable_financing_emails: boolean;
  enable_payout_emails: boolean;
  enable_commission_emails: boolean;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_type: string;
  category: string;
  template: string;
  subject: string;
  status: string;
  provider_id: string | null;
  error: string | null;
  can_resend: boolean;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  created_at: string;
}

interface TargetOption {
  id: string;
  name: string;
  email: string | null;
}

interface EmailsPayload {
  config: {
    resendConfigured: boolean;
    fromEmail: string;
    webhookConfigured: boolean;
  };
  settings: EmailSettings;
  stats: {
    total7d: number;
    total30d: number;
    sent30d: number;
    delivered30d: number;
    opened30d: number;
    bounced30d: number;
    failed30d: number;
    simulated30d: number;
  };
  logs: EmailLog[];
  targets: {
    clinics: TargetOption[];
    representantes: TargetOption[];
    atendentes: TargetOption[];
  };
}

const REPORT_OPTIONS = [
  { value: 'clinic_weekly', label: 'Relatório Semanal — Clínica', group: 'clinics' },
  { value: 'clinic_monthly', label: 'Relatório Mensal — Clínica', group: 'clinics' },
  { value: 'rep_weekly', label: 'Relatório Semanal — Representante', group: 'representantes' },
  { value: 'rep_monthly', label: 'Relatório Mensal — Representante', group: 'representantes' },
  { value: 'atendente_weekly', label: 'Relatório Semanal — Comercial/Atendente', group: 'atendentes' },
  { value: 'atendente_monthly', label: 'Relatório Mensal — Comercial/Atendente', group: 'atendentes' },
  { value: 'admin_daily', label: 'Resumo Executivo Diário — Diretoria', group: 'admin' },
] as const;

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  DELIVERED: { bg: '#ecfdf5', fg: '#047857', label: 'Entregue' },
  OPENED: { bg: '#eff6ff', fg: '#1d4ed8', label: 'Aberto' },
  CLICKED: { bg: '#eef2ff', fg: '#4338ca', label: 'Clicado' },
  SENT: { bg: '#f0f9ff', fg: '#0369a1', label: 'Enviado' },
  SIMULATED: { bg: '#fffbeb', fg: '#b45309', label: 'Simulado' },
  BOUNCED: { bg: '#fef2f2', fg: '#b91c1c', label: 'Bounce' },
  COMPLAINED: { bg: '#fef2f2', fg: '#991b1b', label: 'Spam' },
  FAILED: { bg: '#fef2f2', fg: '#dc2626', label: 'Falhou' },
  SKIPPED: { bg: '#f1f5f9', fg: '#64748b', label: 'Ignorado' },
};

export default function AdminEmailsPage() {
  const [data, setData] = useState<EmailsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'dispatch' | 'logs' | 'settings'>('dispatch');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Filtros de logs
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Disparo de teste
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Disparo/Preview de relatório
  const [reportType, setReportType] = useState<(typeof REPORT_OPTIONS)[number]['value']>('clinic_weekly');
  const [targetId, setTargetId] = useState('');
  const [overrideTo, setOverrideTo] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string; to?: string | null } | null>(null);

  // Configurações
  const [settingsDraft, setSettingsDraft] = useState<EmailSettings | null>(null);
  const [adminEmailsText, setAdminEmailsText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterType) qs.set('recipientType', filterType);
      if (filterCategory) qs.set('category', filterCategory);
      if (filterStatus) qs.set('status', filterStatus);
      if (filterSearch.trim()) qs.set('search', filterSearch.trim());

      const res = await fetch(`/api/admin/emails?${qs.toString()}`, { cache: 'no-store' });
      const d = await res.json();
      if (res.ok && d.success) {
        setData(d);
        setSettingsDraft(d.settings);
        setAdminEmailsText((d.settings.admin_alert_emails || []).join(', '));
      }
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory, filterStatus, filterSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const currentGroup = REPORT_OPTIONS.find(o => o.value === reportType)?.group || 'admin';
  const targetList: TargetOption[] =
    currentGroup === 'clinics'
      ? data?.targets.clinics || []
      : currentGroup === 'representantes'
        ? data?.targets.representantes || []
        : currentGroup === 'atendentes'
          ? data?.targets.atendentes || []
          : [];

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setBusyAction('test');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', to: testEmail.trim(), recipientName: testName.trim() || undefined }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({
          type: 'ok',
          text: d.result?.simulated
            ? 'E-mail de teste simulado (configure RESEND_API_KEY para envio real).'
            : `E-mail de teste enviado para ${testEmail.trim()}!`,
        });
        load();
      } else {
        setFeedback({ type: 'err', text: d.result?.error || d.error || 'Falha ao enviar teste.' });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePreview() {
    setBusyAction('preview');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          reportType,
          targetId: currentGroup === 'admin' ? undefined : targetId || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setPreview({ subject: d.subject, html: d.html, to: d.to });
      } else {
        setFeedback({ type: 'err', text: d.error || 'Não foi possível gerar pré-visualização.' });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendReport() {
    if (batchMode && !confirm(`Confirmar envio em lote de "${REPORT_OPTIONS.find(o => o.value === reportType)?.label}" para todos os destinatários elegíveis?`)) {
      return;
    }
    setBusyAction('send_report');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_report',
          reportType,
          targetId: !batchMode && currentGroup !== 'admin' ? targetId || undefined : undefined,
          overrideTo: !batchMode && overrideTo.trim() ? overrideTo.trim() : undefined,
          batch: batchMode,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        const info = d.result?.total !== undefined
          ? `Lote concluído: ${d.result.sent} enviado(s), ${d.result.skipped || 0} ignorado(s), ${d.result.failed || 0} falha(s).`
          : d.result?.simulated
            ? 'Relatório simulado (RESEND_API_KEY ausente).'
            : 'Relatório enviado com sucesso!';
        setFeedback({ type: 'ok', text: info });
        load();
      } else {
        setFeedback({ type: 'err', text: d.result?.error || d.error || 'Erro ao enviar relatório.' });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRunCron(forceWeekly: boolean, forceMonthly: boolean) {
    if (!confirm('Executar agora a rotina automática de e-mails (com deduplicação ativa)?')) return;
    setBusyAction('cron');
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_cron', forceWeekly, forceMonthly }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({ type: 'ok', text: `Rotina executada: ${JSON.stringify(d.summary)}` });
        load();
      } else {
        setFeedback({ type: 'err', text: d.error || 'Erro ao executar rotina.' });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleResend(logId: string) {
    setBusyAction(`resend:${logId}`);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', logId }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback({ type: 'ok', text: 'E-mail reenviado com sucesso!' });
        load();
      } else {
        setFeedback({ type: 'err', text: d.result?.error || d.error || 'Falha ao reenviar.' });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsDraft) return;
    setBusyAction('settings');
    setFeedback(null);
    try {
      const adminList = adminEmailsText
        .split(/[,;\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settingsDraft, admin_alert_emails: adminList }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setSettingsDraft(d.settings);
        setFeedback({ type: 'ok', text: 'Configurações de e-mail salvas com sucesso!' });
      } else {
        setFeedback({ type: 'err', text: d.error || 'Erro ao salvar configurações.' });
      }
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
            Central de E-mails &amp; Relatórios (Resend)
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Disparos automáticos para Clínicas, Pacientes, Representantes, Comerciais e Diretoria — relatórios, pagamentos, cobranças e rastreamento de entrega.
          </p>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: data.config.resendConfigured ? '#ecfdf5' : '#fffbeb', color: data.config.resendConfigured ? '#047857' : '#92400e', border: `1px solid ${data.config.resendConfigured ? '#a7f3d0' : '#fde68a'}` }}>
              {data.config.resendConfigured ? '✓ Resend conectado' : '⚠ Configurar RESEND_API_KEY'}
            </span>
            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: data.config.webhookConfigured ? '#eff6ff' : '#f8fafc', color: data.config.webhookConfigured ? '#1d4ed8' : '#64748b', border: '1px solid #e2e8f0' }}>
              {data.config.webhookConfigured ? '✓ Webhook Svix ativo' : 'Webhook Svix opcional'}
            </span>
          </div>
        )}
      </div>

      {feedback && (
        <div style={{ marginBottom: '18px', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: feedback.type === 'ok' ? '#ecfdf5' : '#fef2f2', color: feedback.type === 'ok' ? '#065f46' : '#991b1b', border: `1px solid ${feedback.type === 'ok' ? '#a7f3d0' : '#fecaca'}` }}>
          {feedback.text}
        </div>
      )}

      {/* KPIs */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'Enviados (7 dias)', val: data.stats.total7d, color: '#0f172a' },
            { label: 'Enviados (30 dias)', val: data.stats.sent30d, color: '#4040ca' },
            { label: 'Entregues (Webhook)', val: data.stats.delivered30d, color: '#059669' },
            { label: 'Abertos / Clicados', val: data.stats.opened30d, color: '#1d4ed8' },
            { label: 'Bounces / Falhas', val: data.stats.bounced30d + data.stats.failed30d, color: data.stats.bounced30d + data.stats.failed30d > 0 ? '#dc2626' : '#64748b' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: k.color, marginTop: '6px' }}>{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        {[
          { id: 'dispatch', label: 'Relatórios, Preview & Teste' },
          { id: 'logs', label: `Histórico de Envios (${data?.logs.length || 0})` },
          { id: 'settings', label: 'Configurações & Automação' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: '700',
              background: tab === t.id ? '#4040ca' : '#f1f5f9',
              color: tab === t.id ? '#fff' : '#475569',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Relatórios, Preview & Teste */}
      {tab === 'dispatch' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Card: Relatórios e Disparo */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                Pré-visualizar &amp; Disparar Relatórios
              </h2>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Tipo de relatório</label>
              <select
                value={reportType}
                onChange={e => {
                  setReportType(e.target.value as typeof reportType);
                  setTargetId('');
                  setPreview(null);
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '12px' }}
              >
                {REPORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {currentGroup !== 'admin' && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', marginBottom: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={batchMode} onChange={e => setBatchMode(e.target.checked)} />
                    Enviar em lote para todos os destinatários ativos deste grupo
                  </label>

                  {!batchMode && (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Destinatário específico</label>
                      <select
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '12px' }}
                      >
                        <option value="">Selecione...</option>
                        {targetList.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.email ? `(${t.email})` : '(sem e-mail)'}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </>
              )}

              {!batchMode && (
                <>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Redirecionar envio para outro e-mail (opcional — ótimo para teste)
                  </label>
                  <input
                    type="email"
                    value={overrideTo}
                    onChange={e => setOverrideTo(e.target.value)}
                    placeholder="Deixe vazio para usar o e-mail oficial"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' }}
                  />
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!batchMode && (
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={busyAction !== null || (currentGroup !== 'admin' && !targetId)}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #4040ca', background: '#fff', color: '#4040ca', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {busyAction === 'preview' ? 'Gerando...' : '👁 Pré-visualizar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSendReport}
                  disabled={busyAction !== null || (!batchMode && currentGroup !== 'admin' && !targetId)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#4040ca', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  {busyAction === 'send_report' ? 'Enviando...' : batchMode ? '🚀 Disparar Lote' : '✉ Enviar Agora'}
                </button>
              </div>
            </div>

            {/* Card: Teste rápido Resend */}
            <form onSubmit={handleSendTest} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <h2 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Teste Rápido de Entrega (Resend)
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>
                Remetente atual: <strong>{data?.config.fromEmail || '—'}</strong>
              </p>
              <input
                type="email"
                required
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="seu-email@dominio.com.br"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }}
              />
              <input
                type="text"
                value={testName}
                onChange={e => setTestName(e.target.value)}
                placeholder="Seu nome (opcional)"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' }}
              />
              <button
                type="submit"
                disabled={busyAction !== null}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: 'none', background: '#059669', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                {busyAction === 'test' ? 'Enviando teste...' : 'Enviar E-mail de Teste'}
              </button>
            </form>

            {/* Card: Acionar Cron manual */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Rotina Automática (Cron Diário às 08h30)
              </h2>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                Diário: lembretes D-3/D0, follow-ups atrasados e resumo da diretoria. Segundas: relatórios semanais. Dia 1º: fechamento mensal. Deduplicação impede envios repetidos no mesmo período.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleRunCron(false, false)} disabled={busyAction !== null} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  Rodar Diário
                </button>
                <button type="button" onClick={() => handleRunCron(true, false)} disabled={busyAction !== null} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  + Forçar Semanal
                </button>
                <button type="button" onClick={() => handleRunCron(false, true)} disabled={busyAction !== null} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  + Forçar Mensal
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', minHeight: '540px' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Pré-visualização do E-mail</div>
              {preview && (
                <div style={{ marginTop: '4px', fontSize: '13px', color: '#0f172a' }}>
                  <strong>Assunto:</strong> {preview.subject}
                  {preview.to ? <span style={{ color: '#64748b' }}> • Destino: {preview.to}</span> : null}
                </div>
              )}
            </div>
            {preview ? (
              <iframe
                title="Preview de E-mail"
                srcDoc={preview.html}
                sandbox=""
                style={{ width: '100%', height: '640px', border: 'none', display: 'block', background: '#f8fafc' }}
              />
            ) : (
              <div style={{ padding: '80px 32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                Selecione um relatório à esquerda e clique em <strong>Pré-visualizar</strong> para conferir o layout exato antes de enviar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Logs */}
      {tab === 'logs' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Buscar e-mail, nome ou assunto..."
              style={{ flex: '1 1 220px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <option value="">Todos públicos</option>
              <option value="CLINIC">Clínicas</option>
              <option value="PATIENT">Pacientes</option>
              <option value="REPRESENTANTE">Representantes</option>
              <option value="ATENDENTE">Comerciais</option>
              <option value="ADMIN">Diretoria/Admin</option>
              <option value="TEST">Teste</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <option value="">Todas categorias</option>
              <option value="REPORT">Relatórios</option>
              <option value="BILLING">Mensalidades</option>
              <option value="PAYOUT">Repasses</option>
              <option value="COMMISSION">Comissões</option>
              <option value="FINANCING">Financiamentos</option>
              <option value="CREDENTIAL">Credenciais/OTP</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="ALERT">Alertas</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
              <option value="">Todos status</option>
              <option value="SENT">Enviado</option>
              <option value="DELIVERED">Entregue</option>
              <option value="OPENED">Aberto</option>
              <option value="BOUNCED">Bounce</option>
              <option value="FAILED">Falhou</option>
              <option value="SIMULATED">Simulado</option>
            </select>
            <button type="button" onClick={load} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
              Atualizar
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando histórico...</div>
          ) : !data || data.logs.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Nenhum e-mail registrado com os filtros atuais.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Data</th>
                    <th style={{ padding: '12px 14px' }}>Destinatário</th>
                    <th style={{ padding: '12px 14px' }}>Público / Tipo</th>
                    <th style={{ padding: '12px 14px' }}>Assunto</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map(log => {
                    const st = STATUS_STYLE[log.status] || { bg: '#f1f5f9', fg: '#475569', label: log.status };
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#64748b' }}>
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{log.recipient_name || log.recipient_email}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{log.recipient_email}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '600', color: '#334155' }}>{log.recipient_type}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{log.category} • {log.template}</div>
                        </td>
                        <td style={{ padding: '12px 14px', maxWidth: '340px' }}>
                          <div style={{ color: '#0f172a', fontWeight: '500' }}>{log.subject}</div>
                          {log.error && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px' }}>{log.error}</div>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '4px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: st.bg, color: st.fg }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {log.can_resend ? (
                            <button
                              type="button"
                              disabled={busyAction === `resend:${log.id}`}
                              onClick={() => handleResend(log.id)}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              {busyAction === `resend:${log.id}` ? '...' : 'Reenviar'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Sensível</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Configurações */}
      {tab === 'settings' && settingsDraft && (
        <form onSubmit={handleSaveSettings} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', maxWidth: '820px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
            Destinatários da Diretoria &amp; Automações
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              E-mails da Diretoria / Alertas (separados por vírgula)
            </label>
            <input
              type="text"
              value={adminEmailsText}
              onChange={e => setAdminEmailsText(e.target.value)}
              placeholder="diretoria@benavera.com.br, financeiro@benavera.com.br"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Se vazio, o sistema usa automaticamente os e-mails dos administradores ativos cadastrados.
            </span>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Reply-To padrão (e-mail que recebe respostas dos clientes)
            </label>
            <input
              type="email"
              value={settingsDraft.reply_to_email || ''}
              onChange={e => setSettingsDraft({ ...settingsDraft, reply_to_email: e.target.value || null })}
              placeholder="contato@benavera.com.br"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '22px' }}>
            {(
              [
                ['enable_admin_daily_summary', 'Resumo Executivo Diário (Diretoria)'],
                ['enable_clinic_weekly_report', 'Relatório Semanal — Clínicas'],
                ['enable_clinic_monthly_report', 'Relatório Mensal — Clínicas'],
                ['enable_rep_weekly_report', 'Relatório Semanal — Representantes'],
                ['enable_rep_monthly_report', 'Relatório Mensal — Representantes'],
                ['enable_atendente_weekly_report', 'Relatório Semanal — Comerciais'],
                ['enable_atendente_monthly_report', 'Relatório Mensal — Comerciais'],
                ['enable_billing_reminders', 'Lembretes de Mensalidade (D-3 e D0)'],
                ['enable_patient_emails', 'E-mails automáticos para Pacientes'],
                ['enable_financing_emails', 'Status de Financiamento para Clínicas'],
                ['enable_payout_emails', 'Avisos de Repasse Agendado / Pago'],
                ['enable_commission_emails', 'Avisos de Comissões (Rep. e Comerciais)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(settingsDraft[key])}
                  onChange={e => setSettingsDraft({ ...settingsDraft, [key]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fe', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '12px', color: '#1e1b4b', lineHeight: 1.6 }}>
            <strong>Webhook de Rastreamento (Resend → Webhooks):</strong><br />
            URL: <code>https://www.benavera.com.br/api/webhooks/resend</code><br />
            Eventos: <code>email.delivered</code>, <code>email.bounced</code>, <code>email.complained</code>, <code>email.opened</code>, <code>email.clicked</code>
          </div>

          <button
            type="submit"
            disabled={busyAction === 'settings'}
            style={{ padding: '11px 22px', borderRadius: '8px', border: 'none', background: '#4040ca', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
          >
            {busyAction === 'settings' ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      )}
    </div>
  );
}
