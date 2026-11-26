'use client';
// src/app/admin/clinicas/[id]/page.tsx — Controle individual da clínica pelo administrador Benavera
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import '@/app/painel/clinic-panel.css';
import type { ResolvedModule } from '@/lib/clinic-modules';

interface ClinicControlResponse {
  clinic: {
    id: string;
    person_type?: 'PJ' | 'PF';
    nome_fantasia: string;
    razao_social: string;
    responsavel: string | null;
    email: string | null;
    cnpj: string;
    ativo: boolean;
    allow_new_applications?: boolean;
    new_applications_block_reason?: string | null;
  };
  subscription: { plan_id: string | null; status: string; billing_cycle: string; custom_price: number | null; discount_percent: number; is_exempt: boolean; notes: string | null } | null;
  plans: { id: string; name: string }[];
  users: { id: string; name: string; email: string; role: string; ativo: boolean }[];
  auditLogs: { id: string; actor_name: string | null; scope: string; target_id: string; action: string; created_at: string }[];
  entitlements: { planName: string; subscriptionStatus: string; allowNewApplications?: boolean; modules: ResolvedModule[] };
}

export default function AdminClinicaControlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ClinicControlResponse | null>(null);
  const [msg, setMsg] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [savingFinancing, setSavingFinancing] = useState(false);
  const [invoices, setInvoices] = useState<Array<{ id: string; amount: number; status: string; cycle: string; payment_method: string | null; due_date: string | null; paid_at: string | null; checkout_url: string | null; pix_qr_code: string | null; created_at: string }>>([]);
  const [billingMethod, setBillingMethod] = useState<'PIX' | 'CARD_RECURRING' | 'BOLETO'>('PIX');
  const [billingBusy, setBillingBusy] = useState(false);
  const [lastChargeLink, setLastChargeLink] = useState<string | null>(null);
  const [sub, setSub] = useState({ plan_id: '', status: 'EXEMPT', billing_cycle: 'LIFETIME_FREE', custom_price: '', discount_percent: '0', is_exempt: true, notes: '' });

  async function load() {
    const [res, invRes] = await Promise.all([
      fetch(`/api/admin/clinicas/${id}/controle`),
      fetch(`/api/admin/clinicas/${id}/cobranca`),
    ]);
    const d = await res.json();
    if (res.ok) {
      setData(d);
      setBlockReason(d.clinic?.new_applications_block_reason || '');
      if (d.subscription) {
        setSub({
          plan_id: d.subscription.plan_id || '',
          status: d.subscription.status || 'EXEMPT',
          billing_cycle: d.subscription.billing_cycle || 'LIFETIME_FREE',
          custom_price: d.subscription.custom_price ?? '',
          discount_percent: String(d.subscription.discount_percent ?? 0),
          is_exempt: Boolean(d.subscription.is_exempt),
          notes: d.subscription.notes || '',
        });
      }
    }
    if (invRes.ok) {
      const invData = await invRes.json();
      setInvoices(invData.invoices || []);
    }
  }
  useEffect(() => { load(); }, [id]);

  async function generateCharge() {
    if (!sub.plan_id) {
      alert('Selecione um plano pago antes de gerar a cobrança.');
      return;
    }
    setBillingBusy(true);
    setLastChargeLink(null);
    try {
      const res = await fetch(`/api/admin/clinicas/${id}/cobranca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          planId: sub.plan_id,
          cycle: sub.billing_cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
          paymentMethod: billingMethod,
          sendEmail: true,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || 'Erro ao gerar cobrança.');
      } else {
        setMsg(`Cobrança gerada (${billingMethod}) e enviada por e-mail para a clínica.`);
        setLastChargeLink(d.checkoutUrl || d.pixQrCode || null);
        load();
      }
    } finally {
      setBillingBusy(false);
    }
  }

  async function markInvoicePaid(invoiceId: string) {
    if (!confirm('Confirmar baixa manual desta fatura como PAGA? Isso ativa a assinatura e gera comissão do representante (se houver).')) return;
    setBillingBusy(true);
    try {
      const res = await fetch(`/api/admin/clinicas/${id}/cobranca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid', invoiceId }),
      });
      if (res.ok) {
        setMsg('Fatura baixada manualmente como PAGA e assinatura ativada.');
        load();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao baixar fatura.');
      }
    } finally {
      setBillingBusy(false);
    }
  }

  async function toggleNewApplications(allow: boolean) {
    setSavingFinancing(true);
    try {
      const res = await fetch(`/api/admin/clinicas/${id}/controle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'financing_access',
          allow_new_applications: allow,
          block_reason: blockReason,
        }),
      });
      if (res.ok) {
        setMsg(allow ? 'Criação de novos financiamentos liberada para esta clínica.' : 'Criação de novos financiamentos bloqueada (acesso ao restante do painel mantido).');
        load();
      }
    } finally {
      setSavingFinancing(false);
    }
  }

  async function setModuleState(moduleId: string, adminState: string) {
    const res = await fetch(`/api/admin/clinicas/${id}/controle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'override', module_id: moduleId, admin_state: adminState }),
    });
    if (res.ok) {
      setMsg(`Módulo ${moduleId} alterado para ${adminState}.`);
      load();
    }
  }

  async function saveSubscription(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/admin/clinicas/${id}/controle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'subscription', ...sub }),
    });
    if (res.ok) {
      setMsg('Assinatura e condições comerciais da clínica atualizadas.');
      load();
    }
  }

  if (!data) return <div className="bv-page"><div className="bv-card">Carregando controle da clínica…</div></div>;

  return (
    <div className="bv-page">
      <div style={{ marginBottom: '12px' }}>
        <Link href="/admin/clinicas" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>← Voltar às clínicas</Link>
      </div>
      <div className="bv-header">
        <div>
          <h1 className="bv-title">{data.clinic.nome_fantasia || data.clinic.razao_social}</h1>
          <p className="bv-subtitle">
            Responsável: {data.clinic.responsavel || '—'} · {data.clinic.person_type === 'PF' ? 'CPF' : 'CNPJ'} {data.clinic.cnpj} · Plano efetivo: <strong>{data.entitlements.planName}</strong>
          </p>
        </div>
      </div>

      {msg && <div className="bv-card" style={{ marginBottom: '16px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', fontSize: '13px', fontWeight: '600' }}>{msg}</div>}

      {/* Permissão de Novos Financiamentos */}
      <div className="bv-card" style={{ marginBottom: '20px', borderColor: data.clinic.allow_new_applications === false ? '#fde68a' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '800' }}>Permissão de Novos Financiamentos</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Bloqueia ou libera a criação de novas solicitações (/novo-financiamento e POST /api/applications) sem afetar o restante do painel.
            </p>
          </div>
          <span
            className="bv-badge"
            style={
              data.clinic.allow_new_applications === false
                ? { background: '#fef3c7', color: '#92400e' }
                : { background: '#d1fae5', color: '#047857' }
            }
          >
            {data.clinic.allow_new_applications === false ? '🔒 Bloqueado' : '✓ Liberado'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <label className="bv-label">Mensagem exibida à clínica quando bloqueado</label>
            <input
              className="bv-input"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="A criação de novos financiamentos está temporariamente bloqueada para esta conta."
            />
          </div>
          {data.clinic.allow_new_applications === false ? (
            <button
              type="button"
              className="bv-btn"
              disabled={savingFinancing}
              onClick={() => toggleNewApplications(true)}
            >
              {savingFinancing ? 'Salvando…' : '✓ Liberar novos financiamentos'}
            </button>
          ) : (
            <button
              type="button"
              className="bv-btn danger"
              disabled={savingFinancing}
              onClick={() => toggleNewApplications(false)}
            >
              {savingFinancing ? 'Salvando…' : '🔒 Bloquear novos financiamentos'}
            </button>
          )}
        </div>
      </div>

      {/* Assinatura individual */}
      <form onSubmit={saveSubscription} className="bv-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Plano e Condições Comerciais</h3>
        <div className="bv-grid bv-cols-3" style={{ marginBottom: '12px' }}>
          <div>
            <label className="bv-label">Plano</label>
            <select className="bv-select" value={sub.plan_id} onChange={(e) => setSub({ ...sub, plan_id: e.target.value })}>
              <option value="">Padrão gratuito</option>
              {data.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="bv-label">Situação</label>
            <select className="bv-select" value={sub.status} onChange={(e) => setSub({ ...sub, status: e.target.value })}>
              <option value="EXEMPT">Isenta / Gratuita</option>
              <option value="ACTIVE">Ativa</option>
              <option value="TRIAL">Período de teste (Trial)</option>
              <option value="GRACE">Cortesia</option>
              <option value="SUSPENDED">Suspensa</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="bv-label">Ciclo</label>
            <select className="bv-select" value={sub.billing_cycle} onChange={(e) => setSub({ ...sub, billing_cycle: e.target.value })}>
              <option value="LIFETIME_FREE">Gratuito vitalício</option>
              <option value="MONTHLY">Mensal</option>
              <option value="ANNUAL">Anual</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </div>
          <div><label className="bv-label">Preço especial (R$)</label><input className="bv-input" type="number" step="0.01" placeholder="Usar do plano" value={sub.custom_price} onChange={(e) => setSub({ ...sub, custom_price: e.target.value })} /></div>
          <div><label className="bv-label">Desconto (%)</label><input className="bv-input" type="number" step="1" value={sub.discount_percent} onChange={(e) => setSub({ ...sub, discount_percent: e.target.value })} /></div>
          <div><label className="bv-label">Observações comerciais</label><input className="bv-input" value={sub.notes} onChange={(e) => setSub({ ...sub, notes: e.target.value })} /></div>
        </div>
        <button className="bv-btn">Salvar assinatura da clínica</button>
      </form>

      {/* Cobranças e Faturas Mercado Pago */}
      <div className="bv-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: '800' }}>Cobranças &amp; Faturas (Mercado Pago)</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Gere link/Pix do plano selecionado acima, envie por e-mail ou dê baixa manual.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="bv-select"
              style={{ width: '170px', padding: '7px 10px' }}
              value={billingMethod}
              onChange={(e) => setBillingMethod(e.target.value as 'PIX' | 'CARD_RECURRING' | 'BOLETO')}
            >
              <option value="PIX">Pix (QR Code)</option>
              <option value="CARD_RECURRING">Cartão Recorrente</option>
              <option value="BOLETO">Boleto / Checkout Pro</option>
            </select>
            <button type="button" className="bv-btn sm" disabled={billingBusy} onClick={generateCharge}>
              {billingBusy ? 'Gerando…' : '💳 Gerar e enviar cobrança'}
            </button>
          </div>
        </div>

        {lastChargeLink && (
          <div style={{ background: '#f0f4ff', border: '1px solid #c7d7fe', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', wordBreak: 'break-all' }}>
            <strong>Link / Pix gerado:</strong> {lastChargeLink}
          </div>
        )}

        {invoices.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Nenhuma fatura registrada para esta clínica.</p>
        ) : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead><tr><th>Data</th><th>Ciclo</th><th>Meio</th><th>Valor</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{new Date(inv.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>{inv.cycle}</td>
                    <td>{inv.payment_method || '—'}</td>
                    <td style={{ fontWeight: '700' }}>{Number(inv.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>
                      <span className="bv-badge" style={inv.status === 'PAID' ? { background: '#d1fae5', color: '#047857' } : { background: '#fef3c7', color: '#92400e' }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {inv.status !== 'PAID' && (
                        <button type="button" className="bv-btn soft sm" disabled={billingBusy} onClick={() => markInvoicePaid(inv.id)}>
                          Dar baixa manual
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Controle de Módulos */}
      <div className="bv-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Controle Individual de Módulos</h3>
        <div className="bv-table-wrap">
          <table className="bv-table">
            <thead><tr><th>Módulo</th><th>Regra atual</th><th>Estado efetivo</th><th>Alterar regra</th></tr></thead>
            <tbody>
              {data.entitlements.modules.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong><div style={{ fontSize: '11px', color: '#64748b' }}>{m.reason}</div></td>
                  <td><span className="bv-badge" style={{ background: '#f1f5f9', color: '#334155' }}>{m.adminState}</span></td>
                  <td><span className="bv-badge" style={m.effectiveEnabled ? { background: '#d1fae5', color: '#047857' } : { background: '#fef2f2', color: '#dc2626' }}>{m.effectiveEnabled ? 'Habilitado' : 'Inativo'}</span></td>
                  <td>
                    <select className="bv-select" style={{ width: '210px', padding: '6px 8px' }} value={m.adminState} onChange={(e) => setModuleState(m.id, e.target.value)}>
                      <option value="AVAILABLE">Disponível (clínica escolhe)</option>
                      <option value="REQUIRED">Obrigatório</option>
                      <option value="EXCEPTION_FREE">Liberado como exceção</option>
                      <option value="BLOCKED">Bloqueado pela Benavera</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usuários + Auditoria */}
      <div className="bv-grid bv-cols-2">
        <div className="bv-card">
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Usuários ({data.users.length})</h3>
          {data.users.map((u) => (
            <div key={u.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              <div><strong>{u.name}</strong><div style={{ fontSize: '11px', color: '#64748b' }}>{u.email} · {u.role}</div></div>
              <span className="bv-badge" style={u.ativo ? { background: '#d1fae5', color: '#047857' } : { background: '#f1f5f9', color: '#64748b' }}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
          ))}
        </div>
        <div className="bv-card">
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Histórico de auditoria</h3>
          {data.auditLogs.length === 0 ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>Nenhuma alteração registrada ainda.</p> : data.auditLogs.map((a) => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
              <strong>{a.action}</strong> ({a.target_id}) · <span style={{ color: '#64748b' }}>{a.actor_name || 'Sistema'} · {new Date(a.created_at).toLocaleString('pt-BR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
