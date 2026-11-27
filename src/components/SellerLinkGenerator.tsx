'use client';
// src/components/SellerLinkGenerator.tsx
// Gerador compartilhado de links de Cadastro + Assinatura para Representantes e Atendentes.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Check, Link2, Plus, Power, MessageCircle, Sparkles } from 'lucide-react';

interface PlanOption {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  is_free: boolean;
}

interface CouponOption {
  code: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
}

interface SellerInfo {
  type: 'REPRESENTANTE' | 'ATENDENTE';
  name: string;
  codigoIndicacao: string;
  comissaoPercent: number;
  mensalidadePercent: number;
  periodoMeses: number | null;
  maxDiscountPercent: number;
  maxTrialDays: number;
}

interface LinkItem {
  id: string;
  code: string;
  label: string | null;
  plan_name: string;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  coupon_code: string | null;
  discount_percent: number;
  trial_days: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  pricing: {
    baseAmount: number;
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
    appliedCoupon: string | null;
  };
  estimated_commission: number;
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function pctFmt(v: number) {
  return `${(v || 0).toFixed(2).replace('.', ',')}%`;
}

export function SellerLinkGenerator({ apiBase }: { apiBase: '/api/representante/links' | '/api/atendente/links' }) {
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [coupons, setCoupons] = useState<CouponOption[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [origin, setOrigin] = useState('https://www.benavera.com.br');

  // Form
  const [label, setLabel] = useState('');
  const [planId, setPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [trialDays, setTrialDays] = useState('0');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSeller(data.seller);
        setPlans(data.plans || []);
        setCoupons(data.coupons || []);
        setLinks(data.links || []);
        if (!planId && data.plans?.length) {
          const firstPaid = data.plans.find((p: PlanOption) => !p.is_free) || data.plans[0];
          setPlanId(firstPaid.id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, planId]);

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const selectedPlan = useMemo(() => plans.find(p => p.id === planId) || null, [plans, planId]);
  const selectedCoupon = useMemo(
    () => coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase()) || null,
    [coupons, couponCode]
  );

  const preview = useMemo(() => {
    if (!selectedPlan) return { base: 0, final: 0, commission: 0 };
    const base = billingCycle === 'ANNUAL' ? selectedPlan.price_annual : selectedPlan.price_monthly;
    if (selectedPlan.is_free || base <= 0) return { base: 0, final: 0, commission: 0 };
    const disc = Math.min(100, Math.max(0, Number(discountPercent.replace(',', '.')) || 0));
    let running = Math.round(base * (1 - disc / 100) * 100) / 100;
    if (selectedCoupon) {
      if (selectedCoupon.discount_type === 'FIXED') {
        running = Math.max(0, Math.round((running - selectedCoupon.discount_value) * 100) / 100);
      } else {
        running = Math.round(running * (1 - Math.min(100, selectedCoupon.discount_value) / 100) * 100) / 100;
      }
    }
    const comm = seller ? Math.round((running * seller.mensalidadePercent) / 100 * 100) / 100 : 0;
    return { base, final: Math.max(0, running), commission: comm };
  }, [selectedPlan, billingCycle, discountPercent, selectedCoupon, seller]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setCreatedLink(null);
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim() || null,
          planId,
          billingCycle,
          couponCode: couponCode.trim() || null,
          discountPercent: Number(discountPercent.replace(',', '.')) || 0,
          trialDays: Math.floor(Number(trialDays) || 0),
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          expiresInDays: expiresInDays.trim() ? Number(expiresInDays) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar link.');
        return;
      }
      setCreatedLink(data.link);
      setLabel('');
      await load();
    } catch {
      setError('Erro de conexão ao gerar link.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: LinkItem) {
    await fetch(apiBase, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    await load();
  }

  function fullUrl(code: string) {
    return `${origin}/assinar/${code}`;
  }

  async function copyUrl(item: LinkItem) {
    try {
      await navigator.clipboard.writeText(fullUrl(item.code));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  function whatsappUrl(item: LinkItem) {
    const cycleLabel = item.billing_cycle === 'ANNUAL' ? 'anual' : 'mensal';
    const trialMsg = item.trial_days > 0 ? ` com ${item.trial_days} dias grátis (sem precisar de cartão agora)` : '';
    const msg = `Olá! Segue o link exclusivo da Benavera para cadastro e assinatura do plano ${item.plan_name} (${cycleLabel})${trialMsg}: ${fullUrl(item.code)}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    fontSize: '13.5px',
    border: '1px solid #cbd5e1',
    borderRadius: '9px',
    background: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '5px',
  };

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando gerador de links…</div>;
  }

  return (
    <div style={{ maxWidth: '1060px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link2 size={24} color="#059669" /> Links de Cadastro + Assinatura
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
          Gere links personalizados já vinculados à sua conta. A clínica se cadastra, ativa o plano com os módulos SaaS liberados na hora e sua comissão de mensalidade entra separada automaticamente.
        </p>
      </div>

      {/* Condições e alçadas */}
      {seller && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '22px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '3px solid #059669' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sua comissão de mensalidade</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{pctFmt(seller.mensalidadePercent)}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {seller.periodoMeses ? `Durante ${seller.periodoMeses} meses por clínica` : 'Recorrente vitalícia enquanto ativa'}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '3px solid #4040ca' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Alçada de desconto</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3730a3', marginTop: '4px' }}>Até {pctFmt(seller.maxDiscountPercent)}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {seller.maxDiscountPercent > 0 ? 'Autorizado pelo admin' : 'Sem desconto direto liberado'}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Alçada de carência (teste grátis)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>Até {seller.maxTrialDays} dias</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {seller.maxTrialDays > 0 ? 'Clínica entra sem cartão e paga ao final' : 'Sem carência liberada'}
            </div>
          </div>
        </div>
      )}

      {/* Formulário criador */}
      <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(15,23,42,0.04)', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} color="#4040ca" /> Gerar novo link de venda
        </h2>

        {error && (
          <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {createdLink && (
          <div style={{ marginBottom: '16px', padding: '14px 16px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#065f46', marginBottom: '8px' }}>
              ✓ Link criado e vinculado à sua conta!
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input readOnly value={fullUrl(createdLink.code)} style={{ ...inputStyle, flex: '1 1 280px', fontFamily: 'monospace', fontSize: '12.5px' }} />
              <button type="button" onClick={() => copyUrl(createdLink)} style={{ padding: '9px 14px', borderRadius: '9px', border: 'none', background: '#059669', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {copiedId === createdLink.id ? <Check size={15} /> : <Copy size={15} />}
                {copiedId === createdLink.id ? 'Copiado' : 'Copiar link'}
              </button>
              <a href={whatsappUrl(createdLink)} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 14px', borderRadius: '9px', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <MessageCircle size={15} /> WhatsApp
              </a>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Identificação / Proposta (opcional)</label>
            <input value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} placeholder="Ex: Clínica Sorriso — Proposta Anual" />
          </div>

          <div>
            <label style={labelStyle}>Plano *</label>
            <select required value={planId} onChange={e => setPlanId(e.target.value)} style={inputStyle}>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.is_free ? 'Grátis' : `${brl(p.price_monthly)}/mês`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Ciclo de cobrança *</label>
            <select value={billingCycle} onChange={e => setBillingCycle(e.target.value as 'MONTHLY' | 'ANNUAL')} style={inputStyle}>
              <option value="MONTHLY">Mensal</option>
              <option value="ANNUAL">Anual</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Cupom promocional (opcional)</label>
            <select value={couponCode} onChange={e => setCouponCode(e.target.value)} style={inputStyle}>
              <option value="">Sem cupom</option>
              {coupons.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.discount_type === 'FIXED' ? `- ${brl(c.discount_value)}` : `- ${c.discount_value}%`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Desconto % (máx. {seller?.maxDiscountPercent ?? 0}%)</label>
            <input
              type="number"
              min={0}
              max={seller?.maxDiscountPercent ?? 0}
              step="0.5"
              disabled={(seller?.maxDiscountPercent ?? 0) <= 0}
              value={discountPercent}
              onChange={e => setDiscountPercent(e.target.value)}
              style={{ ...inputStyle, background: (seller?.maxDiscountPercent ?? 0) <= 0 ? '#f1f5f9' : '#fff' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Carência / Teste grátis em dias (máx. {seller?.maxTrialDays ?? 0}d)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="number"
                min={0}
                max={seller?.maxTrialDays ?? 0}
                disabled={(seller?.maxTrialDays ?? 0) <= 0}
                value={trialDays}
                onChange={e => setTrialDays(e.target.value)}
                style={{ ...inputStyle, background: (seller?.maxTrialDays ?? 0) <= 0 ? '#f1f5f9' : '#fff' }}
              />
              {(seller?.maxTrialDays ?? 0) >= 14 && (
                <button
                  type="button"
                  onClick={() => setTrialDays('14')}
                  style={{ padding: '0 10px', borderRadius: '9px', border: '1px solid #cbd5e1', background: trialDays === '14' ? '#eef2ff' : '#f8fafc', color: '#3730a3', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  14d
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Limite de usos (vazio = ilimitado)</label>
            <input type="number" min={1} max={10000} value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Ex: 1 (uso único)" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Validade do link (dias; vazio = sem prazo)</label>
            <input type="number" min={1} max={365} value={expiresInDays} onChange={e => setExpiresInDays(e.target.value)} placeholder="30" style={inputStyle} />
          </div>
        </div>

        {/* Preview ao vivo */}
        <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Clínica vai pagar</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                {preview.final <= 0 ? 'Grátis' : `${brl(preview.final)} / ${billingCycle === 'ANNUAL' ? 'ano' : 'mês'}`}
                {Number(trialDays) > 0 && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#047857', fontWeight: 700 }}>({trialDays} dias grátis antes)</span>}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sua comissão estimada / ciclo</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} /> {brl(preview.commission)}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !planId}
            style={{
              padding: '11px 22px',
              borderRadius: '10px',
              border: 'none',
              background: saving ? '#94a3b8' : '#4040ca',
              color: '#fff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Gerando link…' : 'Gerar link vinculado'}
          </button>
        </div>
      </form>

      {/* Lista de links gerados */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          Links gerados ({links.length})
        </h2>
        {links.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            Nenhum link de assinatura criado ainda. Gere seu primeiro link acima para enviar às clínicas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {links.map(l => {
              const expired = Boolean(l.expires_at && new Date(l.expires_at).getTime() < Date.now());
              const exhausted = l.max_uses !== null && l.used_count >= l.max_uses;
              const statusLabel = !l.active ? 'Desativado' : expired ? 'Expirado' : exhausted ? 'Esgotado' : 'Ativo';
              const statusColor = statusLabel === 'Ativo' ? '#047857' : '#64748b';
              const statusBg = statusLabel === 'Ativo' ? '#d1fae5' : '#e2e8f0';

              return (
                <div key={l.id} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: l.active ? '#fff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>{l.label || `${l.plan_name} (${l.billing_cycle === 'ANNUAL' ? 'Anual' : 'Mensal'})`}</strong>
                      <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: statusColor, background: statusBg }}>{statusLabel}</span>
                      {l.trial_days > 0 && <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: '#b45309', background: '#fef3c7' }}>{l.trial_days}d grátis</span>}
                      {l.discount_percent > 0 && <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: '#3730a3', background: '#e0e7ff' }}>-{l.discount_percent}%</span>}
                      {l.coupon_code && <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: '#047857', background: '#ecfdf5' }}>Cupom {l.coupon_code}</span>}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>Plano: <strong>{l.plan_name}</strong> ({l.billing_cycle === 'ANNUAL' ? 'Anual' : 'Mensal'})</span>
                      <span>Valor: <strong>{l.pricing.isFree ? 'Grátis' : brl(l.pricing.finalAmount)}</strong></span>
                      <span>Sua comissão: <strong style={{ color: '#047857' }}>{brl(l.estimated_commission)}</strong></span>
                      <span>Usos: <strong>{l.used_count}{l.max_uses ? `/${l.max_uses}` : ''}</strong></span>
                      <span>Código: <code>{l.code}</code></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => copyUrl(l)}
                      style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      {copiedId === l.id ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                      {copiedId === l.id ? 'Copiado' : 'Copiar'}
                    </button>
                    <a
                      href={whatsappUrl(l)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => handleToggle(l)}
                      style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Power size={13} /> {l.active ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
