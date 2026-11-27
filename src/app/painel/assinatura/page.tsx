'use client';
// src/app/painel/assinatura/page.tsx — Checkout Transparente Mercado Pago (Cartão Recorrente Brick, Pix Nativo e Boleto Nativo)

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  QrCode,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { TransparentCardCheckout } from '@/components/TransparentCardCheckout';

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

interface ClinicBillingProfile {
  id: string;
  nome_fantasia: string;
  razao_social: string | null;
  responsavel: string | null;
  email: string | null;
  email_financeiro: string | null;
  document: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
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
  boleto_digitable_line: string | null;
  boleto_barcode: string | null;
  boleto_pdf_url: string | null;
  boleto_expires_at: string | null;
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

interface ActiveBoleto {
  invoiceId: string;
  amount: number;
  digitableLine: string | null;
  pdfUrl: string | null;
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
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [graceDays, setGraceDays] = useState(7);
  const [clinic, setClinic] = useState<ClinicBillingProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [couponCode, setCouponCode] = useState('');
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Checkout Transparente ativo na tela
  const [activePix, setActivePix] = useState<ActivePix | null>(null);
  const [activeBoleto, setActiveBoleto] = useState<ActiveBoleto | null>(null);
  const [cardCheckoutPlan, setCardCheckoutPlan] = useState<Plan | null>(null);
  const [boletoFormPlan, setBoletoFormPlan] = useState<Plan | null>(null);
  const [boletoForm, setBoletoForm] = useState({
    payerName: '',
    payerEmail: '',
    payerDocument: '',
    zipCode: '',
    streetName: '',
    streetNumber: '',
    neighborhood: '',
    city: '',
    federalUnit: '',
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [wasBlockedRedirect, setWasBlockedRedirect] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/painel/assinatura', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setMpConfigured(Boolean(data.mercadoPagoConfigured));
        setMpPublicKey(data.mercadoPagoPublicKey || null);
        setGraceDays(Number(data.graceDays || 7));
        setClinic(data.clinic || null);
        setSubscription(data.subscription || null);
        setPlans(data.plans || []);
        setInvoices(data.invoices || []);
        if (data.clinic) {
          setBoletoForm((prev) => ({
            payerName: prev.payerName || data.clinic.responsavel || data.clinic.razao_social || data.clinic.nome_fantasia || '',
            payerEmail: prev.payerEmail || data.clinic.email_financeiro || data.clinic.email || '',
            payerDocument: prev.payerDocument || data.clinic.document || '',
            zipCode: prev.zipCode || data.clinic.cep || '',
            streetName: prev.streetName || data.clinic.logradouro || '',
            streetNumber: prev.streetNumber || data.clinic.numero || '',
            neighborhood: prev.neighborhood || data.clinic.bairro || '',
            city: prev.city || data.clinic.cidade || '',
            federalUnit: prev.federalUnit || data.clinic.estado || '',
          }));
        }
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
        .then((r) => r.json())
        .then((d) => {
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
      } catch {
        /* silencioso */
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [activePix, load, router]);

  function openCardTransparent(plan: Plan) {
    setBannerMsg(null);
    setActivePix(null);
    setActiveBoleto(null);
    setBoletoFormPlan(null);
    if (!mpPublicKey) {
      // Fallback seguro se Public Key ainda não estiver definida na Vercel
      handleCheckout(plan.id, 'CARD_RECURRING');
      return;
    }
    setCardCheckoutPlan(plan);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openBoletoTransparent(plan: Plan) {
    setBannerMsg(null);
    setActivePix(null);
    setActiveBoleto(null);
    setCardCheckoutPlan(null);
    setBoletoFormPlan(plan);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleCheckout(
    planId: string,
    paymentMethod: 'CARD_RECURRING' | 'PIX' | 'BOLETO',
    extra?: {
      cardTokenId?: string;
      payerEmail?: string;
      payerName?: string;
      payerDocument?: string;
      payerAddress?: {
        zipCode: string;
        streetName: string;
        streetNumber: string;
        neighborhood: string;
        city: string;
        federalUnit: string;
      };
    }
  ) {
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
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMsg({ type: 'err', text: data.error || 'Não foi possível processar o pagamento.' });
        return;
      }
      if (data.freeActivated) {
        setBannerMsg({ type: 'ok', text: 'Plano gratuito ativado com sucesso!' });
        await load();
        router.refresh();
        return;
      }
      if (data.activatedImmediately) {
        setCardCheckoutPlan(null);
        setBannerMsg({
          type: 'ok',
          text: 'Assinatura recorrente no cartão aprovada na hora! Seu acesso completo está liberado.',
        });
        await load();
        router.refresh();
        return;
      }
      if (paymentMethod === 'PIX') {
        setCardCheckoutPlan(null);
        setBoletoFormPlan(null);
        setActiveBoleto(null);
        setActivePix({
          invoiceId: data.invoiceId,
          amount: data.amount,
          qrCode: data.pixQrCode || null,
          qrCodeBase64: data.pixQrCodeBase64 || null,
          checkoutUrl: data.checkoutUrl || null,
          expiresAt: data.pixExpiresAt || null,
        });
        await load();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (paymentMethod === 'BOLETO' && (data.boletoDigitableLine || data.boletoPdfUrl)) {
        setBoletoFormPlan(null);
        setActivePix(null);
        setCardCheckoutPlan(null);
        setActiveBoleto({
          invoiceId: data.invoiceId,
          amount: data.amount,
          digitableLine: data.boletoDigitableLine || null,
          pdfUrl: data.boletoPdfUrl || data.checkoutUrl || null,
          expiresAt: data.boletoExpiresAt || null,
        });
        setBannerMsg({
          type: 'ok',
          text: 'Boleto bancário gerado! Copie a linha digitável ou abra o PDF abaixo. A compensação libera o painel automaticamente.',
        });
        await load();
        return;
      }
      if (paymentMethod === 'CARD_RECURRING' && extra?.cardTokenId) {
        setCardCheckoutPlan(null);
        setBannerMsg({
          type: 'warn',
          text: 'Cartão enviado para validação do Mercado Pago. Assim que autorizado, sua assinatura será ativada automaticamente.',
        });
        await load();
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setBannerMsg({ type: 'warn', text: 'Cobrança gerada. Verifique a lista de faturas abaixo.' });
        await load();
      }
    } catch {
      setBannerMsg({ type: 'err', text: 'Erro de conexão ao processar cobrança.' });
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleCheckInvoiceNow(invoiceId: string, label: string) {
    const res = await fetch(`/api/painel/assinatura/faturas/${invoiceId}/status`, { cache: 'no-store' });
    const d = await res.json();
    if (d.invoice?.status === 'PAID') {
      setActivePix(null);
      setActiveBoleto(null);
      setBannerMsg({ type: 'ok', text: `${label} confirmado! Assinatura ativa e painel liberado.` });
      load();
      router.refresh();
    } else {
      setBannerMsg({
        type: 'warn',
        text: `${label} ainda não compensado pelo Mercado Pago. Assim que compensar, a liberação acontece automaticamente.`,
      });
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
          text: d.keepUntilPeriodEnd
            ? 'Renovação cancelada. Seu acesso continua normalmente até o fim do ciclo atual.'
            : 'Assinatura cancelada.',
        });
        await load();
        router.refresh();
      } else {
        setBannerMsg({ type: 'err', text: d.error || 'Erro ao cancelar assinatura.' });
      }
    } finally {
      setCancelling(false);
    }
  }

  async function handleCopyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 3000);
  }

  const stKey = subscription?.status || 'EXEMPT';
  const stMeta = STATUS_META[stKey] || STATUS_META.EXEMPT;

  if (loading) {
    return (
      <div className="bv-page">
        <div className="bv-card">Carregando dados da assinatura…</div>
      </div>
    );
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Assinatura e Faturas</h1>
          <p className="bv-subtitle">
            Checkout Transparente Mercado Pago: assine no cartão recorrente, pague no Pix ou emita boleto sem sair do painel.
          </p>
        </div>
        <span className="bv-badge" style={{ background: stMeta.bg, color: stMeta.color, fontSize: '12px', padding: '6px 12px' }}>
          {stMeta.label}
        </span>
      </div>

      {wasBlockedRedirect && (
        <div
          className="bv-card"
          style={{
            marginBottom: '18px',
            background: '#fef2f2',
            borderColor: '#fecaca',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>
              Acesso pausado por pendência na mensalidade
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.55 }}>
              Para voltar a criar novos financiamentos e usar os módulos pagos do painel, regularize sua assinatura abaixo.
              Seus{' '}
              <Link href="/financiamentos" style={{ color: '#991b1b', fontWeight: '700' }}>
                contratos anteriores
              </Link>{' '}
              e{' '}
              <Link href="/repasses" style={{ color: '#991b1b', fontWeight: '700' }}>
                repasses
              </Link>{' '}
              continuam livres para consulta.
            </div>
          </div>
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

      {/* Checkout Transparente: Cartão Recorrente (Mercado Pago Brick) */}
      {cardCheckoutPlan && mpPublicKey && (
        <div className="bv-card" style={{ marginBottom: '22px', borderColor: '#4040ca', background: '#fafbff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#4040ca" /> Assinar {cardCheckoutPlan.name} —{' '}
                {brl(cycle === 'ANNUAL' ? Number(cardCheckoutPlan.price_annual) : Number(cardCheckoutPlan.price_monthly))}
                /{cycle === 'ANNUAL' ? 'ano' : 'mês'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                Cobrança recorrente automática no cartão. Você pode cancelar a renovação a qualquer momento.
              </p>
            </div>
            <button type="button" className="bv-btn ghost sm" onClick={() => setCardCheckoutPlan(null)}>
              <X size={14} /> Fechar
            </button>
          </div>

          <TransparentCardCheckout
            publicKey={mpPublicKey}
            amount={cycle === 'ANNUAL' ? Number(cardCheckoutPlan.price_annual) : Number(cardCheckoutPlan.price_monthly)}
            payerEmail={clinic?.email_financeiro || clinic?.email || ''}
            planName={cardCheckoutPlan.name}
            cycleLabel={cycle === 'ANNUAL' ? 'Anual' : 'Mensal'}
            onTokenSubmit={async ({ cardTokenId, payerEmail }) => {
              await handleCheckout(cardCheckoutPlan.id, 'CARD_RECURRING', {
                cardTokenId,
                payerEmail,
              });
            }}
          />
        </div>
      )}

      {/* Checkout Transparente: Formulário de Emissão de Boleto Bancário Nativo */}
      {boletoFormPlan && (
        <form
          className="bv-card"
          style={{ marginBottom: '22px', borderColor: '#4040ca', background: '#fafbff' }}
          onSubmit={async (e) => {
            e.preventDefault();
            await handleCheckout(boletoFormPlan.id, 'BOLETO', {
              payerName: boletoForm.payerName,
              payerEmail: boletoForm.payerEmail,
              payerDocument: boletoForm.payerDocument,
              payerAddress: {
                zipCode: boletoForm.zipCode,
                streetName: boletoForm.streetName,
                streetNumber: boletoForm.streetNumber,
                neighborhood: boletoForm.neighborhood,
                city: boletoForm.city,
                federalUnit: boletoForm.federalUnit,
              },
            });
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} color="#4040ca" /> Emitir Boleto Bancário — {boletoFormPlan.name} (
                {brl(cycle === 'ANNUAL' ? Number(boletoFormPlan.price_annual) : Number(boletoFormPlan.price_monthly))})
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                Confirme os dados exigidos pelo Banco Central para emissão do boleto registrado.
              </p>
            </div>
            <button type="button" className="bv-btn ghost sm" onClick={() => setBoletoFormPlan(null)}>
              <X size={14} /> Fechar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Nome / Razão Social *</label>
              <input className="bv-input" required value={boletoForm.payerName} onChange={(e) => setBoletoForm({ ...boletoForm, payerName: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>CPF ou CNPJ *</label>
              <input className="bv-input" required placeholder="00.000.000/0001-00" value={boletoForm.payerDocument} onChange={(e) => setBoletoForm({ ...boletoForm, payerDocument: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>E-mail financeiro *</label>
              <input className="bv-input" type="email" required value={boletoForm.payerEmail} onChange={(e) => setBoletoForm({ ...boletoForm, payerEmail: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>CEP *</label>
              <input className="bv-input" required placeholder="00000-000" value={boletoForm.zipCode} onChange={(e) => setBoletoForm({ ...boletoForm, zipCode: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Logradouro (Rua/Av.) *</label>
              <input className="bv-input" required value={boletoForm.streetName} onChange={(e) => setBoletoForm({ ...boletoForm, streetName: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Número *</label>
              <input className="bv-input" required value={boletoForm.streetNumber} onChange={(e) => setBoletoForm({ ...boletoForm, streetNumber: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Bairro *</label>
              <input className="bv-input" required value={boletoForm.neighborhood} onChange={(e) => setBoletoForm({ ...boletoForm, neighborhood: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Cidade *</label>
              <input className="bv-input" required value={boletoForm.city} onChange={(e) => setBoletoForm({ ...boletoForm, city: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>UF *</label>
              <input className="bv-input" required maxLength={2} placeholder="SP" value={boletoForm.federalUnit} onChange={(e) => setBoletoForm({ ...boletoForm, federalUnit: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <button type="submit" className="bv-btn sm" disabled={Boolean(busyPlan)}>
            <Receipt size={14} /> {busyPlan === `${boletoFormPlan.id}:BOLETO` ? 'Emitindo boleto…' : 'Emitir Boleto Agora'}
          </button>
        </form>
      )}

      {/* Card Boleto Emitido (Transparente) */}
      {activeBoleto && (
        <div className="bv-card" style={{ marginBottom: '22px', borderColor: '#6370f1', background: '#fafbff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="#4040ca" /> Boleto Bancário — {brl(activeBoleto.amount)}
            </h3>
            <button type="button" className="bv-btn ghost sm" onClick={() => setActiveBoleto(null)}>Fechar</button>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#475569' }}>
            Copie a linha digitável abaixo para pagar no aplicativo do seu banco ou abra o boleto em PDF para impressão.
            {activeBoleto.expiresAt ? ` Vencimento: ${new Date(activeBoleto.expiresAt).toLocaleDateString('pt-BR')}.` : ''}
          </p>
          {activeBoleto.digitableLine && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input readOnly value={activeBoleto.digitableLine} className="bv-input" style={{ fontFamily: 'monospace', fontSize: '12px' }} />
              <button type="button" className="bv-btn sm" onClick={() => handleCopyText(activeBoleto.digitableLine || '', 'boleto')}>
                <Copy size={14} /> {copiedCode === 'boleto' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activeBoleto.pdfUrl && (
              <a href={activeBoleto.pdfUrl} target="_blank" rel="noreferrer" className="bv-btn sm">
                <ExternalLink size={14} /> Abrir / Baixar PDF do Boleto
              </a>
            )}
            <button type="button" className="bv-btn soft sm" onClick={() => handleCheckInvoiceNow(activeBoleto.invoiceId, 'Boleto')}>
              <RefreshCw size={14} /> Verificar compensação
            </button>
          </div>
        </div>
      )}

      {/* Card Pix Ativo (Transparente) */}
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
                  <input readOnly value={activePix.qrCode} className="bv-input" style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                  <button type="button" className="bv-btn sm" onClick={() => handleCopyText(activePix.qrCode || '', 'pix')}>
                    <Copy size={14} /> {copiedCode === 'pix' ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="bv-btn soft sm" onClick={() => handleCheckInvoiceNow(activePix.invoiceId, 'Pix')}>
                  <RefreshCw size={14} /> Já paguei — verificar agora
                </button>
              </div>
            </div>
          </div>
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
              <span>
                Ciclo:{' '}
                <strong>
                  {subscription?.billing_cycle === 'ANNUAL' ? 'Anual' : subscription?.billing_cycle === 'MONTHLY' ? 'Mensal' : 'Gratuito'}
                </strong>
              </span>
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
                <span>
                  Forma: <strong>{subscription.payment_method === 'CARD_RECURRING' ? 'Cartão Recorrente' : subscription.payment_method}</strong>
                </span>
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

      {/* Escolha de Plano e Pagamento Transparente */}
      <div className="bv-card" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>Planos disponíveis</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              <ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Checkout Transparente Mercado Pago (Cartão, Pix e Boleto). Carência de {graceDays} dias em caso de atraso.
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
              <button type="button" className={`bv-btn sm ${cycle === 'MONTHLY' ? '' : 'ghost'}`} onClick={() => setCycle('MONTHLY')}>
                Mensal
              </button>
              <button type="button" className={`bv-btn sm ${cycle === 'ANNUAL' ? '' : 'ghost'}`} onClick={() => setCycle('ANNUAL')}>
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
                      onClick={() => openCardTransparent(p)}
                    >
                      <CreditCard size={14} />{' '}
                      {busyPlan === `${p.id}:CARD_RECURRING` ? 'Processando…' : 'Assinar no Cartão (Recorrente)'}
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
                        onClick={() => openBoletoTransparent(p)}
                      >
                        <Receipt size={14} /> {busyPlan === `${p.id}:BOLETO` ? 'Emitindo…' : 'Boleto'}
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
                            onClick={() => {
                              setActiveBoleto(null);
                              setActivePix({
                                invoiceId: inv.id,
                                amount: Number(inv.amount),
                                qrCode: inv.pix_qr_code,
                                qrCodeBase64: inv.pix_qr_code_base64,
                                checkoutUrl: inv.checkout_url,
                                expiresAt: inv.pix_expires_at,
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            Ver Pix
                          </button>
                        )}
                        {inv.status === 'PENDING' && !inv.pix_qr_code && (inv.boleto_digitable_line || inv.boleto_pdf_url) && (
                          <button
                            type="button"
                            className="bv-btn soft sm"
                            onClick={() => {
                              setActivePix(null);
                              setActiveBoleto({
                                invoiceId: inv.id,
                                amount: Number(inv.amount),
                                digitableLine: inv.boleto_digitable_line,
                                pdfUrl: inv.boleto_pdf_url || inv.checkout_url,
                                expiresAt: inv.boleto_expires_at,
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            Ver Boleto
                          </button>
                        )}
                        {inv.status === 'PENDING' && !inv.pix_qr_code && !inv.boleto_digitable_line && !inv.boleto_pdf_url && inv.checkout_url && (
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
