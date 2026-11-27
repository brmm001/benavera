'use client';
// src/app/assinar/[code]/page.tsx
// Fluxo público de Cadastro + Assinatura vinculado a um Representante ou Atendente.
// - Se o link tiver carência/trial (ex: 14 dias), a clínica entra no painel imediatamente sem cartão e paga ao final do período.
// - Sem trial, conclui o pagamento na Etapa 2 com Checkout Transparente do Mercado Pago (Cartão Recorrente, Pix ou Boleto).

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  CreditCard,
  QrCode,
  FileText,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { TransparentCardCheckout } from '@/components/TransparentCardCheckout';

interface PublicLinkData {
  id: string;
  code: string;
  sellerType: 'REPRESENTANTE' | 'ATENDENTE';
  sellerName: string;
  label: string | null;
  plan: {
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    price_annual: number;
    is_free: boolean;
    modules: { id: string; name: string; description: string }[];
  };
  billingCycle: 'MONTHLY' | 'ANNUAL';
  couponCode: string | null;
  discountPercent: number;
  trialDays: number;
  pricing: {
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
    appliedCoupon: string | null;
  };
}

interface CheckoutCreated {
  invoiceId: string | null;
  activatedImmediately?: boolean;
  freeActivated?: boolean;
  amount: number;
  paymentMethod?: string;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  pixExpiresAt?: string | null;
  boletoDigitableLine?: string | null;
  boletoPdfUrl?: string | null;
  boletoExpiresAt?: string | null;
}

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const ESPECIALIDADES = [
  'Odontologia & Implantes',
  'Cirurgia Plástica & Estética',
  'Oftalmologia & Cirurgias Oculares',
  'Ortopedia & Reabilitação',
  'Dermatologia & Procedimentos',
  'Outra Especialidade',
];

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function fmtCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function fmtCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

export default function AssinarViaLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [link, setLink] = useState<PublicLinkData | null>(null);
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpConfigured, setMpConfigured] = useState(false);

  const [stage, setStage] = useState<'REGISTER' | 'CHECKOUT' | 'DONE'>('REGISTER');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dados cadastrais
  const [personType, setPersonType] = useState<'PJ' | 'PF'>('PJ');
  const [nomeClinica, setNomeClinica] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cpf, setCpf] = useState('');
  const [especialidade, setEspecialidade] = useState(ESPECIALIDADES[0]);
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Pós-cadastro
  const [onboardingUrl, setOnboardingUrl] = useState('/dashboard');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'CARD_RECURRING' | 'PIX' | 'BOLETO'>('CARD_RECURRING');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutCreated | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    fetch(`/api/assinar/${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setLoadError(data.error || 'Link de assinatura indisponível.');
          return;
        }
        setLink(data.link);
        setMpPublicKey(data.mpPublicKey || '');
        setMpConfigured(Boolean(data.mpConfigured));
      })
      .catch(() => setLoadError('Erro ao carregar oferta. Tente novamente.'))
      .finally(() => setLoading(false));
  }, [code]);

  // Polling de confirmação automática para Pix
  useEffect(() => {
    if (stage !== 'CHECKOUT' || !checkoutResult?.invoiceId || !checkoutResult.pixQrCode) return;
    const invId = checkoutResult.invoiceId;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/painel/assinatura/faturas/${invId}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'PAID') {
          clearInterval(timer);
          setStage('DONE');
        }
      } catch {
        // silencioso
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [stage, checkoutResult]);

  async function handleCepChange(raw: string) {
    const formatted = fmtCEP(raw);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (r.ok) {
          const d = await r.json();
          if (!d.erro) {
            if (d.logradouro) setRua(d.logradouro);
            if (d.bairro) setBairro(d.bairro);
            if (d.localidade) setCidade(d.localidade);
            if (d.uf) setEstado(d.uf);
          }
        }
      } catch {
        // silencioso
      }
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/assinar/${encodeURIComponent(code)}/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personType,
          nomeClinica,
          cnpj: personType === 'PJ' ? cnpj : null,
          cpf: personType === 'PF' ? cpf : null,
          especialidade,
          cep,
          rua,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          nomeResponsavel,
          whatsapp,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Erro ao criar cadastro.');
        return;
      }
      setOnboardingUrl(data.onboardingUrl || '/dashboard');
      setTrialEndsAt(data.trialEndsAt || null);
      if (data.nextStep === 'DASHBOARD') {
        setStage('DONE');
      } else {
        setStage('CHECKOUT');
      }
    } catch {
      setFormError('Erro de conexão ao enviar cadastro.');
    } finally {
      setSubmitting(false);
    }
  }

  async function executeCheckout(extra?: { cardTokenId?: string; payerEmail?: string }) {
    if (!link) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/painel/assinatura/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: link.plan.id,
          cycle: link.billingCycle,
          paymentMethod: payMethod,
          couponCode: link.couponCode || undefined,
          payerEmail: extra?.payerEmail || email,
          cardTokenId: extra?.cardTokenId || undefined,
          payerName: nomeResponsavel || nomeClinica,
          payerDocument: personType === 'PJ' ? cnpj : cpf,
          payerAddress: {
            zipCode: cep,
            streetName: rua,
            streetNumber: numero || 'S/N',
            neighborhood: bairro || 'Centro',
            city: cidade,
            federalUnit: estado,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível processar o pagamento.');
      }
      setCheckoutResult(data);
      if (data.activatedImmediately || data.freeActivated) {
        setStage('DONE');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no checkout.';
      setCheckoutError(msg);
      throw err;
    } finally {
      setCheckoutLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '5px',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
        Carregando oferta de assinatura…
      </div>
    );
  }

  if (loadError || !link) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '460px', width: '100%', background: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <AlertTriangle size={36} color="#dc2626" style={{ margin: '0 auto 12px' }} />
          <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Link indisponível</h1>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b' }}>{loadError || 'Este link não foi encontrado.'}</p>
          <Link href="/credenciamento" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: '10px', background: '#4040ca', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
            Ir para credenciamento padrão
          </Link>
        </div>
      </div>
    );
  }

  const cycleLabel = link.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensal';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)', padding: '32px 16px 64px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #4040ca, #10b981)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '17px' }}>B</div>
            <div>
              <strong style={{ fontSize: '18px', color: '#0f172a', display: 'block', lineHeight: 1.1 }}>Benavera</strong>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Adesão direta via consultor</span>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#475569', background: '#fff', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            Indicação: <strong>{link.sellerName}</strong> · Código <code>{link.code}</code>
          </div>
        </div>

        {/* Grid principal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(290px, 0.9fr)', gap: '24px', alignItems: 'start' }}>
          {/* Coluna principal */}
          <div style={{ background: '#fff', borderRadius: '18px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(15,23,42,0.05)' }}>
            {/* Stepper */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { key: 'REGISTER', num: '1', label: 'Cadastro da clínica' },
                ...(link.trialDays === 0 && !link.pricing.isFree ? [{ key: 'CHECKOUT', num: '2', label: 'Pagamento transparente' }] : []),
                { key: 'DONE', num: link.trialDays > 0 || link.pricing.isFree ? '2' : '3', label: 'Painel liberado' },
              ].map(s => {
                const active = stage === s.key;
                const passed = (stage === 'CHECKOUT' && s.key === 'REGISTER') || (stage === 'DONE' && s.key !== 'DONE');
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: active ? '#eef2ff' : passed ? '#ecfdf5' : '#f8fafc', color: active ? '#4040ca' : passed ? '#047857' : '#94a3b8', border: `1px solid ${active ? '#c7d2fe' : passed ? '#a7f3d0' : '#e2e8f0'}` }}>
                    <span>{passed ? '✓' : s.num}</span>
                    <span>{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* ETAPA 1: CADASTRO */}
            {stage === 'REGISTER' && (
              <form onSubmit={handleRegister}>
                <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                  Crie a conta da sua clínica
                </h1>
                <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b' }}>
                  {link.trialDays > 0
                    ? `Comece com ${link.trialDays} dias de teste grátis sem precisar de cartão agora. Os módulos do plano são liberados na hora.`
                    : 'Após o cadastro, finalize o pagamento na etapa seguinte para liberar todos os módulos imediatamente.'}
                </p>

                {formError && (
                  <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  {(['PJ', 'PF'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPersonType(t)}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: `1.5px solid ${personType === t ? '#4040ca' : '#e2e8f0'}`,
                        background: personType === t ? '#eef2ff' : '#f8fafc',
                        color: personType === t ? '#1e1b4b' : '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'PJ' ? '🏢 Pessoa Jurídica (CNPJ)' : '👤 Profissional Autônomo (CPF)'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>{personType === 'PF' ? 'Nome do consultório / profissional *' : 'Nome fantasia da clínica *'}</label>
                    <input required value={nomeClinica} onChange={e => setNomeClinica(e.target.value)} style={inputStyle} placeholder="Ex: Clínica Sorriso Prime" />
                  </div>

                  <div>
                    <label style={labelStyle}>{personType === 'PF' ? 'CPF *' : 'CNPJ *'}</label>
                    <input
                      required
                      value={personType === 'PF' ? cpf : cnpj}
                      onChange={e => (personType === 'PF' ? setCpf(fmtCPF(e.target.value)) : setCnpj(fmtCNPJ(e.target.value)))}
                      style={inputStyle}
                      placeholder={personType === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Especialidade</label>
                    <select value={especialidade} onChange={e => setEspecialidade(e.target.value)} style={inputStyle}>
                      {ESPECIALIDADES.map(es => <option key={es} value={es}>{es}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Nome do responsável *</label>
                    <input required value={nomeResponsavel} onChange={e => setNomeResponsavel(e.target.value)} style={inputStyle} placeholder="Nome completo" />
                  </div>

                  <div>
                    <label style={labelStyle}>WhatsApp *</label>
                    <input required value={whatsapp} onChange={e => setWhatsapp(fmtPhone(e.target.value))} style={inputStyle} placeholder="(11) 99999-9999" />
                  </div>

                  <div>
                    <label style={labelStyle}>E-mail de acesso *</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="contato@clinica.com.br" />
                  </div>

                  <div>
                    <label style={labelStyle}>Senha de acesso (mín. 6 caracteres) *</label>
                    <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="Crie uma senha" />
                  </div>

                  <div>
                    <label style={labelStyle}>CEP</label>
                    <input value={cep} onChange={e => handleCepChange(e.target.value)} style={inputStyle} placeholder="00000-000" />
                  </div>

                  <div>
                    <label style={labelStyle}>Rua / Logradouro</label>
                    <input value={rua} onChange={e => setRua(e.target.value)} style={inputStyle} placeholder="Rua..." />
                  </div>

                  <div>
                    <label style={labelStyle}>Número</label>
                    <input value={numero} onChange={e => setNumero(e.target.value)} style={inputStyle} placeholder="123" />
                  </div>

                  <div>
                    <label style={labelStyle}>Bairro</label>
                    <input value={bairro} onChange={e => setBairro(e.target.value)} style={inputStyle} placeholder="Centro" />
                  </div>

                  <div>
                    <label style={labelStyle}>Cidade</label>
                    <input value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} placeholder="São Paulo" />
                  </div>

                  <div>
                    <label style={labelStyle}>UF</label>
                    <select value={estado} onChange={e => setEstado(e.target.value)} style={inputStyle}>
                      {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: '22px',
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #4040ca, #2563eb)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {submitting
                    ? 'Criando conta…'
                    : link.trialDays > 0
                      ? `Criar conta e começar ${link.trialDays} dias grátis`
                      : link.pricing.isFree
                        ? 'Criar conta e liberar acesso'
                        : 'Continuar para o pagamento'}
                  <ArrowRight size={17} />
                </button>
              </form>
            )}

            {/* ETAPA 2: CHECKOUT TRANSPARENTE */}
            {stage === 'CHECKOUT' && (
              <div>
                <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                  Finalize sua assinatura
                </h1>
                <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#64748b' }}>
                  Conta criada! Escolha a forma de pagamento para ativar o plano <strong>{link.plan.name}</strong> imediatamente.
                </p>

                {checkoutError && (
                  <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                    {checkoutError}
                  </div>
                )}

                {!mpConfigured ? (
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '13px' }}>
                    Gateway de pagamento temporariamente indisponível. Você já pode acessar <Link href="/painel/assinatura" style={{ fontWeight: 700, color: '#4040ca' }}>Assinatura e Faturas</Link> no seu painel.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                      {[
                        { id: 'CARD_RECURRING' as const, label: 'Cartão Recorrente', sub: 'Renovação automática', Icon: CreditCard },
                        { id: 'PIX' as const, label: 'Pix Instantâneo', sub: 'Aprovação na hora', Icon: QrCode },
                        { id: 'BOLETO' as const, label: 'Boleto Bancário', sub: 'Compensação 1-2 dias', Icon: FileText },
                      ].map(m => {
                        const active = payMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => { setPayMethod(m.id); setCheckoutResult(null); setCheckoutError(null); }}
                            style={{
                              padding: '12px',
                              borderRadius: '12px',
                              border: `1.5px solid ${active ? '#4040ca' : '#e2e8f0'}`,
                              background: active ? '#eef2ff' : '#fff',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <m.Icon size={18} color={active ? '#4040ca' : '#64748b'} style={{ marginBottom: '6px' }} />
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{m.label}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{m.sub}</div>
                          </button>
                        );
                      })}
                    </div>

                    {payMethod === 'CARD_RECURRING' && (
                      <TransparentCardCheckout
                        publicKey={mpPublicKey}
                        amount={link.pricing.finalAmount}
                        payerEmail={email}
                        planName={link.plan.name}
                        cycleLabel={cycleLabel}
                        onTokenSubmit={async ({ cardTokenId, payerEmail }) => {
                          await executeCheckout({ cardTokenId, payerEmail });
                        }}
                      />
                    )}

                    {payMethod === 'PIX' && !checkoutResult?.pixQrCode && (
                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={() => executeCheckout()}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#059669', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        {checkoutLoading ? 'Gerando QR Code Pix…' : `Gerar Pix de ${brl(link.pricing.finalAmount)}`}
                      </button>
                    )}

                    {payMethod === 'PIX' && checkoutResult?.pixQrCode && (
                      <div style={{ padding: '20px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #86efac', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                          Escaneie o QR Code ou copie o código Pix (confirmação automática)
                        </p>
                        {checkoutResult.pixQrCodeBase64 && (
                          <img
                            src={`data:image/png;base64,${checkoutResult.pixQrCodeBase64}`}
                            alt="QR Code Pix"
                            style={{ width: '200px', height: '200px', margin: '0 auto 12px', borderRadius: '10px', background: '#fff', padding: '8px' }}
                          />
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input readOnly value={checkoutResult.pixQrCode} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} />
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(checkoutResult.pixQrCode || '');
                              setCopiedText(true);
                              setTimeout(() => setCopiedText(false), 2000);
                            }}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                          >
                            {copiedText ? <Check size={15} /> : <Copy size={15} />}
                            {copiedText ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#15803d' }}>
                          ⏳ Aguardando confirmação do pagamento…
                        </p>
                      </div>
                    )}

                    {payMethod === 'BOLETO' && !checkoutResult?.boletoDigitableLine && (
                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={() => executeCheckout()}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#1e293b', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        {checkoutLoading ? 'Emitindo boleto…' : `Emitir boleto de ${brl(link.pricing.finalAmount)}`}
                      </button>
                    )}

                    {payMethod === 'BOLETO' && checkoutResult?.boletoDigitableLine && (
                      <div style={{ padding: '20px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Boleto emitido com sucesso</p>
                        <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#64748b' }}>
                          Assim que o boleto compensar, todos os módulos do seu plano serão ativados automaticamente.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <input readOnly value={checkoutResult.boletoDigitableLine} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} />
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(checkoutResult.boletoDigitableLine || '');
                              setCopiedText(true);
                              setTimeout(() => setCopiedText(false), 2000);
                            }}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#4040ca', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {copiedText ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {checkoutResult.boletoPdfUrl && (
                            <a href={checkoutResult.boletoPdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', background: '#0f172a', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}>
                              Abrir PDF do boleto <ExternalLink size={14} />
                            </a>
                          )}
                          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', color: '#0f172a', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}>
                            Ir para o painel
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ETAPA 3: CONCLUÍDO */}
            {stage === 'DONE' && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                  {trialEndsAt ? `Período de teste de ${link.trialDays} dias ativado!` : 'Assinatura ativada com sucesso!'}
                </h1>
                <p style={{ margin: '0 0 18px', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                  Todos os módulos do plano <strong>{link.plan.name}</strong> já estão liberados no seu painel.
                  {trialEndsAt && (
                    <>
                      <br />
                      Seu período grátis vai até <strong>{new Date(trialEndsAt).toLocaleDateString('pt-BR')}</strong> — você só escolhe a forma de pagamento ao final desse prazo.
                    </>
                  )}
                </p>

                <div style={{ textAlign: 'left', padding: '14px 16px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '13px', marginBottom: '22px' }}>
                  <strong>Próximo passo para financiamentos:</strong> sua conta já está liberada para usar os módulos de gestão, CRM, simulador e ferramentas comerciais. Para enviar <strong>novas propostas de financiamento</strong>, basta enviar os documentos de credenciamento.
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href="/dashboard"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 22px', borderRadius: '12px', background: '#4040ca', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: '14px' }}
                  >
                    Acessar meu painel agora <ArrowRight size={16} />
                  </Link>
                  <Link
                    href={onboardingUrl}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 22px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}
                  >
                    Enviar documentos de credenciamento
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Coluna lateral: Resumo da oferta */}
          <div style={{ background: '#0f172a', color: '#fff', borderRadius: '18px', padding: '24px', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(16,185,129,0.18)', color: '#6ee7b7', fontSize: '11px', fontWeight: 700, marginBottom: '12px' }}>
              <Sparkles size={13} /> Oferta exclusiva do consultor
            </div>

            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800 }}>{link.plan.name}</h2>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
              {link.plan.description || `Plano ${cycleLabel.toLowerCase()} Benavera`}
            </p>

            {link.trialDays > 0 && (
              <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.35)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#6ee7b7', fontSize: '14px' }}>
                  <Clock size={15} /> {link.trialDays} dias grátis para testar
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                  Comece hoje sem informar cartão. Cobrança somente ao final do período de teste.
                </p>
              </div>
            )}

            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', marginBottom: '6px' }}>
                <span>Plano ({cycleLabel})</span>
                <span style={link.pricing.discountAmount > 0 ? { textDecoration: 'line-through' } : undefined}>{brl(link.pricing.baseAmount)}</span>
              </div>
              {link.discountPercent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#6ee7b7', marginBottom: '4px' }}>
                  <span>Desconto do consultor ({link.discountPercent}%)</span>
                  <span>Aplicado</span>
                </div>
              )}
              {link.pricing.appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#6ee7b7', marginBottom: '4px' }}>
                  <span>Cupom {link.pricing.appliedCoupon}</span>
                  <span>Aplicado</span>
                </div>
              )}
              {link.pricing.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#6ee7b7', marginBottom: '6px' }}>
                  <span>Economia total</span>
                  <span>- {brl(link.pricing.discountAmount)}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{link.trialDays > 0 ? 'Após o período grátis' : 'Total a pagar'}</span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>
                  {link.pricing.isFree ? 'Grátis' : brl(link.pricing.finalAmount)}
                  {!link.pricing.isFree && <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>/{link.billingCycle === 'ANNUAL' ? 'ano' : 'mês'}</span>}
                </span>
              </div>
            </div>

            {link.plan.modules.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.55)' }}>
                  Módulos liberados imediatamente
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {link.plan.modules.slice(0, 10).map(m => (
                    <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.88)' }}>
                      <Check size={14} color="#34d399" style={{ flexShrink: 0 }} />
                      <span>{m.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.65)', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <ShieldCheck size={16} color="#34d399" style={{ flexShrink: 0 }} />
              <span>Pagamento seguro e recorrente via Mercado Pago. Cancele quando quiser no seu painel.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
