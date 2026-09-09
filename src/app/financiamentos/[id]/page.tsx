'use client';
// app/financiamentos/[id]/page.tsx — Detalhe da solicitação (clínica)

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  INTERNAL_REVIEW: { label: 'Em análise', color: '#d97706', bg: '#fffbeb' },
  OFFERS_AVAILABLE: { label: 'Proposta disponível', color: '#0891b2', bg: '#ecfeff' },
  OFFER_SELECTED: { label: 'Opção escolhida', color: '#0891b2', bg: '#ecfeff' },
  CONTRACT_SIGNED: { label: 'Contrato assinado', color: '#059669', bg: '#f0fdf4' },
  APPROVED: { label: 'Aprovado', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_SCHEDULED: { label: 'Repasse programado', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_COMPLETED: { label: 'Pago', color: '#059669', bg: '#f0fdf4' },
  DECLINED: { label: 'Recusado', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeSince(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}min`;
  return `${mins}min`;
}

export default function FinanciamentoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [proposalLink, setProposalLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function generateLink() {
    setGeneratingLink(true);
    const res = await fetch(`/api/applications/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_patient_link' }),
    });
    const d = await res.json();
    setGeneratingLink(false);
    if (d.url) setProposalLink(d.url);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(proposalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div style={{ padding: '48px', color: '#94a3b8' }}>Carregando…</div>;
  if (!data?.application) return <div style={{ padding: '48px', color: '#dc2626' }}>Solicitação não encontrada.</div>;

  const app = data.application;
  const proposals = data.proposals || [];
  const events = data.events || [];
  const st = STATUS_CONFIG[app.status] || { label: app.status, color: '#64748b', bg: '#f1f5f9' };
  const hasOffers = app.status === 'OFFERS_AVAILABLE' || proposals.length > 0;
  const elapsed = timeSince(app.created_at);
  const elapsedMins = Math.floor((Date.now() - new Date(app.created_at).getTime()) / 60000);
  const isOverSLA = elapsedMins > 15 && !['APPROVED', 'CONTRACT_SIGNED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED', 'DECLINED', 'CANCELLED'].includes(app.status);

  return (
    <div style={{ padding: '40px 48px', maxWidth: '960px' }}>
      {/* Back */}
      <button onClick={() => router.push('/financiamentos')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
        ← Voltar
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1c1d4c', fontFamily: 'monospace' }}>
              {app.protocol}
            </h1>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: st.color, background: st.bg }}>
              {st.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: isOverSLA ? '#dc2626' : '#94a3b8', fontWeight: isOverSLA ? '600' : '400' }}>
            {isOverSLA ? '⚠ ' : ''}
            {elapsed} desde a solicitação
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Main */}
        <div>
          {/* Dados */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Paciente</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Nome', app.patient_nome],
                ['CPF', app.patient_cpf],
                ['Celular', app.patient_celular],
                ['E-mail', app.patient_email],
              ].map(([l, v]) => (
                <div key={l}>
                  <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{l}</p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: '500' }}>{v || '—'}</p>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '20px 0' }} />
            <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Tratamento</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Procedimento', app.procedimento],
                ['Categoria', app.categoria],
                ['Valor total', formatCurrency(app.valor_tratamento)],
                ['Entrada', formatCurrency(app.entrada)],
                ['A financiar', formatCurrency(app.valor_financiado)],
                ['Clínica', app.clinic_nome],
              ].map(([l, v]) => (
                <div key={l}>
                  <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{l}</p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: '500' }}>{v || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Propostas disponíveis */}
          {hasOffers && proposals.length > 0 && (
            <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>
                  🎉 Propostas disponíveis
                </h2>
                <span style={{ fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                  {proposals.length} opção{proposals.length > 1 ? 'ões' : ''}
                </span>
              </div>

              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#064e3b', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                Boas notícias. Encontramos opções para o paciente.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {proposals.map((p: any) => (
                  <div key={p.id} style={{
                    border: '1.5px solid #e0eaff', borderRadius: '12px', padding: '20px',
                    background: p.selecionada ? '#f0fdf4' : 'white',
                    borderColor: p.selecionada ? '#bbf7d0' : '#e0eaff',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#4040ca' }}>{p.partner_nome}</p>
                      {p.selecionada && <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', background: '#dcfce7', padding: '2px 8px', borderRadius: '20px' }}>✓ Escolhida</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        ['Financiado', formatCurrency(p.valor_financiado)],
                        ['Parcelas', `${p.parcelas}x`],
                        ['Parcela', formatCurrency(p.valor_parcela)],
                        ['Total', p.valor_total ? formatCurrency(p.valor_total) : '—'],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#94a3b8' }}>{l}</p>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    {(p.taxa_mensal || p.cet_anual) && (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>
                        Taxa: {p.taxa_mensal ? `${(p.taxa_mensal * 100).toFixed(2)}% a.m.` : '—'}
                        {p.cet_anual ? ` · CET: ${(p.cet_anual * 100).toFixed(2)}% a.a.` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Enviar para paciente */}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                  Enviar proposta ao paciente:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={generateLink}
                    disabled={generatingLink}
                    style={{ padding: '10px 16px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
                  >
                    📱 WhatsApp
                  </button>
                  <button
                    onClick={generateLink}
                    disabled={generatingLink}
                    style={{ padding: '10px 16px', background: '#6370f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}
                  >
                    🔗 {generatingLink ? 'Gerando…' : 'Copiar link'}
                  </button>
                </div>
                {proposalLink && (
                  <div style={{ marginTop: '12px', background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ flex: 1, fontSize: '13px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {proposalLink}
                    </span>
                    <button onClick={copyLink}
                      style={{ padding: '6px 12px', background: copied ? '#059669' : '#6370f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', flexShrink: 0, fontFamily: 'inherit' }}>
                      {copied ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Timeline</h2>
            {events.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum evento registrado.</p>
            ) : (
              <div>
                {events.map((evt: any, i: number) => (
                  <div key={evt.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < events.length - 1 ? '16px' : 0, marginBottom: i < events.length - 1 ? '16px' : 0, borderBottom: i < events.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6370f1', marginTop: '6px', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        {evt.event.replace(/_/g, ' ')}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                        {formatDateTime(evt.created_at)} · {evt.actor_name || evt.actor_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>Informações</h3>
            {[
              ['Protocolo', app.protocol],
              ['Criado por', app.creator_name],
              ['Analista', app.analyst_name || 'A designar'],
              ['Criado em', formatDateTime(app.created_at)],
            ].map(([l, v]) => (
              <div key={l} style={{ marginBottom: '12px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#94a3b8' }}>{l}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#334155', fontWeight: '500' }}>{v}</p>
              </div>
            ))}
          </div>

          {app.status === 'INTERNAL_REVIEW' && (
            <div style={{ background: '#fffbeb', borderRadius: '14px', padding: '20px', border: '1px solid #fde68a' }}>
              <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600', color: '#92400e' }}>🔍 Em análise</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#78350f' }}>
                A equipe Benavera está analisando sua solicitação. Você receberá uma notificação assim que houver novidades.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
