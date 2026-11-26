'use client';
// src/app/painel/assinatura/page.tsx — Gestão de Mensalidade, Planos e Faturas via Mercado Pago

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, QrCode, Receipt, CheckCircle2, AlertTriangle, Copy, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  is_free: boolean;
  trial_days: number;
  module_ids: string[];
}

interface Subscription {
  id: string;
  plan_id: string | null;
  plan_name: string | null;
  status: string;
  billing_cycle: string;
  is_exempt: boolean;
  payment_method: string | null;
  current_period_end: string | null;
  grace_until: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  coupon_code: string | null;
  discount_percent: number;
  custom_price: number | null;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  cycle: string;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  mp_status: string | null;
  checkout_url: string | null;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_expires_at: string | null;
  coupon_code: string | null;
  created_at: string;
}

interface ActivePix {
  invoiceId: string;
  amount: number;
  qrCode: string | null;
  qrCodeBase64: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: 'Ativa', bg: '#d1fae5', color: '#047857' },
  EXEMPT: { label: 'Isenta / Cortesia', bg: '#eef2ff', color: '#4040ca' },
  TRIAL: { label: 'Período de teste', bg: '#e0f2fe', color: '#0369a1' },
  GRACE: { label: 'Em carência', bg: '#fef3c7', color: '#92400e' },
  PENDING_PAYMENT: { label: 'Aguardando pagamento', bg: '#fef3c7', color: '#92400e' },
  SUSPENDED: { label: 'Suspensa (inadimplente)', bg: '#fee2e2', color: '#b91c1c' },
  PAST_DUE: { label: 'Em atraso', bg: '#fee2e2', color: '#b91c1c' },
  CANCELLED: { label: 'Cancelada', bg: '#f1f5f9', color: '#475569' },
};

const INV_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PAID: { label: 'Pago', bg: '#d1fae5', color: '#047857' },
  PENDING: { label: 'Pendente', bg: '#fef3c7', color: '#92400e' },
  FAILED: { label: 'Recusado', bg: '#fee2e2', color: '#b91c1c' },
  REFUNDED: { label: 'Estornado', bg: '#f1f5f9', color: '#475569' },
  CANCELLED: { label: 'Cancelado', bg: '#f1f5f9', color: '#475569' },
};

export default function PainelAssinaturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mpConfigured, setMpConfigured] = useState(true);
  const [graceDays, setGraceDays] = useState(7);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [couponCode, setCouponCode] = useState('');
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [activePix, setActivePix] = useState<ActivePix | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [wasBlockedRedirect, setWasBlockedRedirect] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/painel/assinatura', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setMpConfigured(Boolean(data.mercadoPagoConfigured));
        setGraceDays(Number(data.graceDays || 7));
        setSubscription(data.subscription || null);
        setPlans(data.plans || []);
        setInvoices(data.invoices || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('blocked') === '1') {
      setWasBlockedRedirect(true);
    }
    const mpStatus = sp.get('mp_status');
    const returnedInvoice = sp.get('invoice');
    if (returnedInvoice) {
      fetch(`/api/painel/assinatura/faturas/${returnedInvoice}/status`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => {
          if (d.invoice?.status === 'PAID') {
            setBannerMsg({ type: 'ok', text: 'Pagamento confirmado! Seu plano e módulos foram liberados.' });
            load();
            router.refresh();
          } else if (mpStatus === 'failure') {
            setBannerMsg({ type: 'err', text: 'O pagamento não foi concluído no Mercado Pago. Você pode tentar novamente.' });
          } else if (mpStatus) {
            setBannerMsg({ type: 'warn', text: 'Aguardando confirmação do Mercado Pago. Assim que aprovar, seu acesso é liberado automaticamente.' });
          }
        })
        .catch(() => {});
    }
  }, [load, router]);

  // Polling automático enquanto um QR Code Pix estiver aberto
  useEffect(() => {
    if (!activePix) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/painel/assinatura/faturas/${activePix.invoiceId}/status`, { cache: 'no-store' });
        const d = await res.json();
        if (d.invoice?.status === 'PAID') {
          setActivePix(null);
          setBannerMsg({ type: 'ok', text: 'Pix confirmado! Sua assinatura foi ativada e o painel está totalmente liberado.' });
          load();
          router.refresh();
        }
      } catch { /* silencioso */ }
    }, 4500);
    return () => clearInterval(timer);
  }, [activePix, load, router]);

  async function handleCheckout(planId: string, paymentMethod: 'CARD_RECURRING' | 'PIX' | 'BOLETO') {
    setBusyPlan(`${planId}:${paymentMethod}`);
    setBannerMsg(null);
    try {
      const res = await fetch('/api/painel/assinatura/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          cycle,
          paymentMethod,
          couponCode: couponCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMsg({ type: 'err', text: data.error || 'Não foi possível iniciar o pagamento.' });
        return;
      }
      if (data.freeActivated) {
        setBannerMsg({ type: 'ok', text: 'Plano gratuito ativado com sucesso!' });
        await load();
        router.refresh();
        return;
      }
      if (paymentMethod === 'PIX') {
        setActivePix({
          invoiceId: data.invoiceId,
          amount: data.amount,
          qrCode: data.pixQrCode || null,
          qrCodeBase64: data.pixQrCodeBase64 || null,
          checkoutUrl: data.checkoutUrl || null,
          expiresAt: data.pixExpiresAt || null,
        });
        await load();
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setBannerMsg({ type: 'warn', text: 'Cobrança gerada, mas sem link de redirecionamento. Verifique a lista de faturas abaixo.' });
        await load();
      }
    } catch {
      setBannerMsg({ type: 'err', text: 'Erro de conexão ao gerar cobrança.' });
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleCheckPixNow() {
    if (!activePix) return;
    const res = await fetch(`/api/painel/assinatura/faturas/${activePix.invoiceId}/status`, { cache: 'no-store' });
    const d = await res.json();
    if (d.invoice?.status === 'PAID') {
      setActivePix(null);
      setBannerMsg({ type: 'ok', text: 'Pagamento Pix confirmado! Assinatura ativa.' });
      load();
      router.refresh();
    } else {
      setBannerMsg({ type: 'warn', text: 'Pagamento ainda não compensado pelo Mercado Pago. Aguarde alguns segundos e tente novamente.' });
    }
  }

  async function handleCancel() {
    if (!confirm('Deseja cancelar a renovação automática? Seu acesso permanecerá ativo até o fim do período já pago.')) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/painel/assinatura/cancelar', { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        setBannerMsg({
          type: 'warn',
          text: d.keepUntilPeriodEnd && d.currentPeriodEnd
            ? `Renovação cancelada. Seu acesso segue ativo até ${new Date(d.currentPeriodEnd).toLocaleDateString('pt-BR')}.`
            : 'Assinatura cancelada.',
        });
        load();
        router.refresh();
      } else {
        setBannerMsg({ type: 'err', text: d.error || 'Não foi possível cancelar.' });
      }
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <div className="bv-page"><div className="bv-card">Carregando assinatura e faturas…</div></div>;
  }

  const stKey = subscription?.status || 'EXEMPT';
  const stMeta = STATUS_META[stKey] || { label: stKey, bg: '#f1f5f9', color: '#475569' };

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Assinatura e Mensalidades</h1>
          <p className="bv-subtitle">
            Gerencie seu plano, pague com Cartão Recorrente, Pix ou Boleto via Mercado Pago e acompanhe suas faturas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="bv-badge" style={{ background: stMeta.bg, color: stMeta.color, padding: '6px 12px', fontSize: '12px' }}>
            {stMeta.label}
          </span>
        </div>
      </div>

      {wasBlockedRedirect && (
        <div className="bv-card" style={{ marginBottom: '18px', background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b', fontSize: '13px' }}>
          <strong>Acesso restrito por pendência na mensalidade:</strong> escolha um plano ou pague sua fatura abaixo para reativar imediatamente novas solicitações de financiamento e os módulos do painel. Seus{' '}
          <Link href="/financiamentos" style={{ color: '#991b1b', fontWeight: '700' }}>contratos antigos</Link> e{' '}
          <Link href="/repasses" style={{ color: '#991b1b', fontWeight: '700' }}>repasses</Link> continuam livres para consulta.
        </div>
      )}

      {bannerMsg && (
        <div
          className="bv-card"
          style={{
            marginBottom: '18px',
            background: bannerMsg.type === 'ok' ? '#ecfdf5' : bannerMsg.type === 'warn' ? '#fffbeb' : '#fef2f2',
            borderColor: bannerMsg.type === 'ok' ? '#a7f3d0' : bannerMsg.type === 'warn' ? '#fde68a' : '#fecaca',
            color: bannerMsg.type === 'ok' ? '#065f46' : bannerMsg.type === 'warn' ? '#92400e' : '#991b1b',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          {bannerMsg.text}
        </div>
      )}

      {!mpConfigured && (
        <div className="bv-card" style={{ marginBottom: '18px', background: '#fffbeb', borderColor: '#fde68a', color: '#92400e', fontSize: '13px' }}>
          <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Pagamento online em ativação. Entre em contato com o suporte Benavera caso precise regularizar agora.
        </div>
      )}

      {/* Resumo da assinatura atual */}
      <div className="bv-card" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
              Plano atual
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1c1d4c', marginBottom: '6px' }}>
              {subscription?.plan_name || 'Gratuito Completo'}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>Ciclo: <strong>{subscription?.billing_cycle === 'ANNUAL' ? 'Anual' : subscription?.billing_cycle === 'MONTHLY' ? 'Mensal' : 'Gratuito'}</strong></span>
              {subscription?.current_period_end && (
                <span>
                  {subscription.cancel_at_period_end ? 'Acesso até:' : 'Próxima renovação:'}{' '}
                  <strong>{new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</strong>
                </span>
              )}
              {subscription?.grace_until && subscription.status === 'GRACE' && (
                <span style={{ color: '#b45309' }}>
                  Carência ({graceDays} dias) até: <strong>{new Date(subscription.grace_until).toLocaleDateString('pt-BR')}</strong>
                </span>
              )}
              {subscription?.payment_method && (
                <span>Forma: <strong>{subscription.payment_method === 'CARD_RECURRING' ? 'Cartão Recorrente' : subscription.payment_method}</strong></span>
              )}
            </div>
          </div>

          {subscription && !subscription.is_exempt && subscription.status === 'ACTIVE' && !subscription.cancel_at_period_end && (
            <button type="button" className="bv-btn ghost sm" disabled={cancelling} onClick={handleCancel}>
              {cancelling ? 'Cancelando…' : 'Cancelar renovação'}
            </button>
          )}
        </div>
      </div>

      {/* Modal / Card Pix Ativo */}
      {activePix && (
        <div className="bv-card" style={{ marginBottom: '22px', borderColor: '#6370f1', background: '#fafbff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={18} color="#4040ca" /> Pague com Pix — {brl(activePix.amount)}
            </h3>
            <button type="button" className="bv-btn ghost sm" onClick={() => setActivePix(null)}>Fechar</button>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            {activePix.qrCodeBase64 && (
              <img
                src={`data:image/png;base64,${activePix.qrCodeBase64}`}
                alt="QR Code Pix Mercado Pago"
                style={{ width: '180px', height: '180px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', padding: '8px' }}
              />
            )}
            <div style={{ flex: 1, minWidth: '240px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#475569' }}>
                Escaneie o QR Code no aplicativo do seu banco ou copie o código Pix abaixo. A liberação do painel é automática em poucos segundos.
              </p>
              {activePix.qrCode && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    readOnly
                    value={activePix.qrCode}
                    className="bv-input"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                  <button
                    type="button"
                    className="bv-btn sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(activePix.qrCode || '');
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 3000);
                    }}
                  >
                    <Copy size={14} /> {copiedPix ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="bv-btn soft sm" onClick={handleCheckPixNow}>
                  <RefreshCw size={14} /> Já paguei — verificar agora
                </button>
                {activePix.checkoutUrl && (
                  <a href={activePix.checkoutUrl} target="_blank" rel="noreferrer" className="bv-btn ghost sm">
                    <ExternalLink size={14} /> Abrir no Mercado Pago
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Escolha de Plano e Pagamento */}
      <div className="bv-card" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>Planos disponíveis</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              <ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Pagamento processado com segurança pelo Mercado Pago. Carência de {graceDays} dias em caso de atraso.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="bv-input"
              style={{ width: '160px', padding: '7px 10px', fontSize: '12px' }}
              placeholder="Cupom (opcional)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            />
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '9px' }}>
              <button
                type="button"
                className={`bv-btn sm ${cycle === 'MONTHLY' ? '' : 'ghost'}`}
                onClick={() => setCycle('MONTHLY')}
              >
                Mensal
              </button>
              <button
                type="button"
                className={`bv-btn sm ${cycle === 'ANNUAL' ? '' : 'ghost'}`}
                onClick={() => setCycle('ANNUAL')}
              >
                Anual
              </button>
            </div>
          </div>
        </div>

        <div className="bv-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {plans.map((p) => {
            const price = cycle === 'ANNUAL' ? Number(p.price_annual || 0) : Number(p.price_monthly || 0);
            const isCurrent = subscription?.plan_id === p.id && ['ACTIVE', 'EXEMPT', 'TRIAL'].includes(stKey);
            return (
              <div
                key={p.id}
                style={{
                  border: `1.5px solid ${isCurrent ? '#6370f1' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  padding: '20px',
                  background: isCurrent ? '#fafbff' : 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>{p.name}</h3>
                    {isCurrent && (
                      <span className="bv-badge" style={{ background: '#eef2ff', color: '#4040ca' }}>
                        <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Atual
                      </span>
                    )}
                  </div>
                  {p.description && <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b' }}>{p.description}</p>}
                  <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>
                    {p.is_free || price <= 0 ? 'Gratuito' : brl(price)}
                    {!p.is_free && price > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                        /{cycle === 'ANNUAL' ? 'ano' : 'mês'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {p.module_ids.length} módulos incluídos{p.trial_days > 0 ? ` · ${p.trial_days} dias de teste` : ''}
                  </div>
                </div>

                {p.is_free || price <= 0 ? (
                  <button
                    type="button"
                    className="bv-btn soft sm"
                    disabled={isCurrent || Boolean(busyPlan)}
                    onClick={() => handleCheckout(p.id, 'PIX')}
                  >
                    {isCurrent ? 'Plano ativo' : 'Ativar plano gratuito'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      className="bv-btn sm"
                      disabled={Boolean(busyPlan)}
                      onClick={() => handleCheckout(p.id, 'CARD_RECURRING')}
                    >
                      <CreditCard size={14} />{' '}
                      {busyPlan === `${p.id}:CARD_RECURRING` ? 'Abrindo Mercado Pago…' : 'Assinar no Cartão (Recorrente)'}
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        type="button"
                        className="bv-btn soft sm"
                        disabled={Boolean(busyPlan)}
                        onClick={() => handleCheckout(p.id, 'PIX')}
                      >
                        <QrCode size={14} /> {busyPlan === `${p.id}:PIX` ? 'Gerando…' : 'Pagar Pix'}
                      </button>
                      <button
                        type="button"
                        className="bv-btn ghost sm"
                        disabled={Boolean(busyPlan)}
                        onClick={() => handleCheckout(p.id, 'BOLETO')}
                      >
                        <Receipt size={14} /> {busyPlan === `${p.id}:BOLETO` ? 'Abrindo…' : 'Boleto / MP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de faturas */}
      <div className="bv-card">
        <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>
          Histórico de Faturas ({invoices.length})
        </h2>
        {invoices.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Nenhuma fatura gerada até o momento.</p>
        ) : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ciclo</th>
                  <th>Meio</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const st = INV_STATUS[inv.status] || { label: inv.status, bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div>{new Date(inv.created_at).toLocaleDateString('pt-BR')}</div>
                        {inv.paid_at && (
                          <div style={{ fontSize: '11px', color: '#059669' }}>
                            Pago em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td>{inv.cycle === 'ANNUAL' ? 'Anual' : 'Mensal'}</td>
                      <td>{inv.payment_method === 'CARD_RECURRING' ? 'Cartão Recorrente' : inv.payment_method || '—'}</td>
                      <td style={{ fontWeight: '700' }}>
                        {brl(Number(inv.amount))}
                        {inv.coupon_code && <div style={{ fontSize: '11px', color: '#6370f1' }}>Cupom {inv.coupon_code}</div>}
                      </td>
                      <td>
                        <span className="bv-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {inv.status === 'PENDING' && inv.pix_qr_code && (
                          <button
                            type="button"
                            className="bv-btn soft sm"
                            onClick={() =>
                              setActivePix({
                                invoiceId: inv.id,
                                amount: Number(inv.amount),
                                qrCode: inv.pix_qr_code,
                                qrCodeBase64: inv.pix_qr_code_base64,
                                checkoutUrl: inv.checkout_url,
                                expiresAt: inv.pix_expires_at,
                              })
                            }
                          >
                            Ver Pix
                          </button>
                        )}
                        {inv.status === 'PENDING' && !inv.pix_qr_code && inv.checkout_url && (
                          <a href={inv.checkout_url} target="_blank" rel="noreferrer" className="bv-btn soft sm">
                            Pagar →
                          </a>
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
    </div>
  );
}
