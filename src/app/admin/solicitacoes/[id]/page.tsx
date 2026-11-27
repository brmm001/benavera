'use client';
// app/admin/solicitacoes/[id]/page.tsx — Detalhe da solicitação no backoffice

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import KonsigaOperationalPanel from '@/components/partners/KonsigaOperationalPanel';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED: { label: 'Enviada', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_ANALYSIS: { label: 'Pré-análise', color: '#d97706', bg: '#fffbeb' },
  PRE_ANALYSIS_APPROVED: { label: 'Pré-aprovada', color: '#059669', bg: '#f0fdf4' },
  PRE_ANALYSIS_DECLINED: { label: 'Pré-recusada', color: '#dc2626', bg: '#fef2f2' },
  INTERNAL_REVIEW: { label: 'Revisão interna', color: '#d97706', bg: '#fffbeb' },
  AWAITING_DOCUMENTS: { label: 'Docs pendentes', color: '#d97706', bg: '#fffbeb' },
  AWAITING_CLINIC: { label: 'Aguard. clínica', color: '#d97706', bg: '#fffbeb' },
  READY_FOR_LENDERS: { label: 'Pronta p/ fin.', color: '#7c3aed', bg: '#f5f3ff' },
  SUBMITTED_TO_LENDER: { label: 'Na financeira', color: '#7c3aed', bg: '#f5f3ff' },
  LENDER_ANALYSIS: { label: 'Análise fin.', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_APPROVED: { label: 'Pré-aprovada', color: '#059669', bg: '#f0fdf4' },
  OFFERS_AVAILABLE: { label: 'Proposta disp.', color: '#0891b2', bg: '#ecfeff' },
  OFFER_SELECTED: { label: 'Opção escolhida', color: '#0891b2', bg: '#ecfeff' },
  CONTRACT_PENDING: { label: 'Contrato pend.', color: '#d97706', bg: '#fffbeb' },
  CONTRACT_SENT: { label: 'Contrato enviado', color: '#d97706', bg: '#fffbeb' },
  CONTRACT_SIGNED: { label: 'Assinado', color: '#059669', bg: '#f0fdf4' },
  APPROVED: { label: 'Aprovado', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_SCHEDULED: { label: 'Repasse prog.', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_COMPLETED: { label: 'Pago', color: '#059669', bg: '#f0fdf4' },
  TREATMENT_RELEASED: { label: 'Liberado', color: '#059669', bg: '#f0fdf4' },
  DECLINED: { label: 'Recusado', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
  EXPIRED: { label: 'Expirado', color: '#64748b', bg: '#f1f5f9' },
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSolicitacaoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [partners, setPartners] = useState<any[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalForm, setProposalForm] = useState({ parcelas: '12', valorParcela: '', taxaMensal: '', cetAnual: '' });
  const [generatedLink, setGeneratedLink] = useState('');
  const [hubQuoting, setHubQuoting] = useState(false);
  const [hubSummary, setHubSummary] = useState<Array<{ partner: string; status: string; ms: number; offers: number; motivo?: string }> | null>(null);

  useEffect(() => {
    loadData();
    fetch('/api/partners').then(r => r.json()).then(d => setPartners(d.partners || []));
  }, [id]);

  async function loadData() {
    const res = await fetch(`/api/applications/${id}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }

  async function action(actionName: string, payload: Record<string, unknown> = {}) {
    setActionLoading(true);
    if (actionName === 'quote_all_partners') {
      setHubQuoting(true);
      setHubSummary(null);
    }
    try {
      const res = await fetch(`/api/applications/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionName, ...payload }),
      });
      const d = await res.json();
      if (d.success === false || d.error) {
        alert(d.error || 'Erro ao executar ação.');
      } else {
        if (d.url) setGeneratedLink(d.url);
        if (d.summary) setHubSummary(d.summary);
        await loadData();
      }
    } catch (err) {
      alert('Erro de conexão.');
    } finally {
      setActionLoading(false);
      setHubQuoting(false);
    }
  }

  if (loading) return <div style={{ padding: '48px', color: '#94a3b8' }}>Carregando…</div>;
  if (!data?.application) return <div style={{ padding: '48px', color: '#dc2626' }}>Solicitação não encontrada.</div>;

  const app = data.application;
  const proposals = data.proposals || [];
  const events = data.events || [];
  const attempts = data.attempts || [];
  const st = STATUS_CONFIG[app.status] || { label: app.status, color: '#64748b', bg: '#f1f5f9' };
  const elapsed = Math.floor((Date.now() - new Date(app.created_at).getTime()) / 60000);

  const isActive = !['APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED'].includes(app.status);
  const canApprove = app.status === 'INTERNAL_REVIEW' && app.internal_decision === 'PENDING';
  const canReject = ['INTERNAL_REVIEW', 'AWAITING_CLINIC', 'AWAITING_DOCUMENTS', 'PRE_ANALYSIS_APPROVED'].includes(app.status);
  const canQuoteAllPartners = app.status === 'READY_FOR_LENDERS';
  const integratedActiveCount = partners.filter((p: any) => p.ativo && p.integration_active && p.api_slug).length;
  const canSubmitToPartner = app.status === 'READY_FOR_LENDERS' || (app.status === 'INTERNAL_REVIEW' && app.internal_decision === 'APPROVED_TO_PROCEED');
  const canCreateProposal = ['READY_FOR_LENDERS', 'SUBMITTED_TO_LENDER', 'LENDER_ANALYSIS', 'PRE_APPROVED'].includes(app.status);
  const canRegisterContract = app.status === 'OFFER_SELECTED';
  const canConfirmContractSigned = app.status === 'CONTRACT_SENT';
  const hasOffers = proposals.length > 0;
  const selectedKonsigaProposal = proposals.find(
    (p: any) => p.selecionada && p.partner_api_slug === 'konsiga'
  );
  const konsigaAttempt = attempts.find(
    (a: any) => a.partner_api_slug === 'konsiga' && (a.external_transaction_id || a.external_id)
  );
  const konsigaTransactionId = konsigaAttempt
    ? String(konsigaAttempt.external_transaction_id || konsigaAttempt.external_id)
    : null;
  const konsigaSigningUrl =
    selectedKonsigaProposal?.url_externa || app.contract_url || null;

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1100px' }}>
      {/* Back */}
      <button onClick={() => router.push('/admin/fila')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', padding: 0 }}>
        ← Voltar para fila
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
            {elapsed > 15 && isActive && (
              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5' }}>
                ⚠ SLA: {elapsed}min
              </span>
            )}
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {app.clinic_nome} · Criado por {app.creator_name} · {formatDateTime(app.created_at)}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        {/* Main */}
        <div>
          {/* Resumo em destaque: Valores e dados digitados pela clínica */}
          <div style={{ background: 'linear-gradient(135deg, #1c1d4c, #312e81)', color: 'white', borderRadius: '14px', padding: '22px 24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c7d2fe', marginBottom: '12px' }}>
              Valores digitados pela clínica ({app.clinic_nome || 'Clínica'})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>Valor do tratamento</div>
                <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>{formatCurrency(app.valor_tratamento)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>Entrada informada</div>
                <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>{formatCurrency(app.entrada)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#6ee7b7' }}>Valor a financiar</div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#6ee7b7', marginTop: '2px' }}>{formatCurrency(app.valor_financiado)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)' }}>Procedimento / Categoria</div>
                <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{app.procedimento || '—'}</div>
                <div style={{ fontSize: '11.5px', color: '#c7d2fe' }}>{app.categoria || '—'}</div>
              </div>
            </div>
          </div>

          {/* Dados do paciente e clínica digitados */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Dados do paciente (digitados pela clínica)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                ['Nome completo', app.patient_nome],
                ['CPF', app.patient_cpf],
                ['Data de nasc.', app.patient_nasc ? new Date(app.patient_nasc).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'],
                ['Celular / WhatsApp', app.patient_celular],
                ['E-mail', app.patient_email],
                ['Renda mensal', app.patient_renda ? formatCurrency(app.patient_renda) : '—'],
                ['Profissão / Vínculo', [app.patient_profissao, app.patient_vinculo].filter(Boolean).join(' · ') || '—'],
                ['Endereço', [app.patient_logradouro, app.patient_numero, app.patient_complemento, app.patient_bairro].filter(Boolean).join(', ') || '—'],
                ['Cidade / UF / CEP', [app.patient_cidade, app.patient_estado, app.patient_cep].filter(Boolean).join(' · ') || '—'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#334155', fontWeight: '600', wordBreak: 'break-word' }}>{v || '—'}</p>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: '#f1f5f9', margin: '20px 0' }} />

            <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Clínica e origem do envio</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                ['Clínica', app.clinic_nome],
                ['CNPJ / CPF clínica', app.clinic_cnpj],
                ['Contato clínica', [app.clinic_whatsapp || app.clinic_telefone, app.clinic_email].filter(Boolean).join(' · ') || '—'],
                ['Localidade clínica', [app.clinic_cidade, app.clinic_estado].filter(Boolean).join(' / ') || '—'],
                ['Digitado por', [app.creator_name, app.creator_email].filter(Boolean).join(' · ') || '—'],
                ['Consentimento LGPD', data.consent ? `${data.consent.consent_version} · ${formatDateTime(data.consent.created_at)}` : 'Registrado'],
              ].map(([l, v]) => (
                <div key={l}>
                  <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</p>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', fontWeight: '500', wordBreak: 'break-word' }}>{v || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tentativas de financiamento */}
          {attempts.length > 0 && (
            <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>
                Parceiros consultados
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attempts.map((att: any) => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>{att.partner_nome}</div>
                      {att.external_status && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {att.external_status}{att.external_step ? ` · ${att.external_step}` : ''}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{formatCurrency(att.valor_solicitado)}</span>
                    <span style={{
                      fontSize: '12px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px',
                      background: att.status === 'APPROVED' || att.status === 'PRE_APPROVED' ? '#f0fdf4' : att.status === 'REJECTED' ? '#fef2f2' : '#f1f5f9',
                      color: att.status === 'APPROVED' || att.status === 'PRE_APPROVED' ? '#059669' : att.status === 'REJECTED' ? '#dc2626' : '#64748b',
                    }}>{att.status}</span>
                    {att.responded_at && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDateTime(att.responded_at)}</span>}
                  </div>
                ))}
              </div>

              {/* Registrar retorno manual */}
              {attempts.some((a: any) => a.status === 'PENDING') && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
                    Registrar retorno do parceiro:
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => action('record_partner_response', { attemptId: attempts.find((a: any) => a.status === 'PENDING')?.id, result: { status: 'PRE_APPROVED' } })}
                      disabled={actionLoading}
                      style={{ padding: '8px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                      ✓ Pré-aprovado
                    </button>
                    <button onClick={() => action('record_partner_response', { attemptId: attempts.find((a: any) => a.status === 'PENDING')?.id, result: { status: 'REJECTED', motivo: 'Score insuficiente' } })}
                      disabled={actionLoading}
                      style={{ padding: '8px 14px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                      ✕ Reprovado
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Propostas */}
          {proposals.length > 0 && (
            <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Propostas</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {proposals.map((p: any) => (
                  <div key={p.id} style={{ border: '1.5px solid #e0eaff', borderRadius: '12px', padding: '16px', background: p.selecionada ? '#f0fdf4' : 'white', borderColor: p.selecionada ? '#bbf7d0' : '#e0eaff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#4040ca' }}>{p.partner_nome}</p>
                      {p.selecionada && <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', background: '#dcfce7', padding: '2px 8px', borderRadius: '20px' }}>✓ Escolhida pelo paciente</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                      {[
                        ['Financiado', formatCurrency(p.valor_financiado)],
                        ['Parcelas', `${p.parcelas}x`],
                        ['Parcela', formatCurrency(p.valor_parcela)],
                        ['Taxa', p.taxa_mensal ? `${(p.taxa_mensal * 100).toFixed(2)}% a.m.` : '—'],
                        ['Total', p.valor_total ? formatCurrency(p.valor_total) : '—'],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#94a3b8' }}>{l}</p>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1c1d4c' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gerar link */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => action('generate_patient_link')}
                  disabled={actionLoading}
                  style={{ padding: '8px 14px', background: '#6370f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                  🔗 Gerar link para paciente
                </button>
                {generatedLink && (
                  <div style={{ flex: 1, background: '#f0f4ff', padding: '8px 12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#4040ca', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{generatedLink}</span>
                    <button onClick={() => navigator.clipboard.writeText(generatedLink)}
                      style={{ padding: '4px 8px', background: '#6370f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' }}>
                      Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulário de criação de proposta */}
          {showProposalForm && (
            <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1.5px solid #6370f1', marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Nova proposta manual</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Parceiro</label>
                  <select value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', background: 'white' }}>
                    <option value="">Selecionar…</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Parcelas</label>
                  <input type="number" value={proposalForm.parcelas} onChange={e => setProposalForm(f => ({ ...f, parcelas: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Valor da parcela (R$)</label>
                  <input type="number" step="0.01" value={proposalForm.valorParcela} onChange={e => setProposalForm(f => ({ ...f, valorParcela: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Taxa mensal (ex: 0.0199 = 1,99%)</label>
                  <input type="number" step="0.0001" value={proposalForm.taxaMensal} onChange={e => setProposalForm(f => ({ ...f, taxaMensal: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => {
                  if (!selectedPartner || !proposalForm.valorParcela) { alert('Parceiro e valor da parcela são obrigatórios.'); return; }
                  const parcelas = parseInt(proposalForm.parcelas);
                  const valorParcela = parseFloat(proposalForm.valorParcela);
                  action('create_proposal', {
                    proposalData: {
                      partnerId: selectedPartner,
                      valorFinanciado: app.valor_financiado,
                      entrada: app.entrada,
                      parcelas,
                      valorParcela,
                      taxaMensal: proposalForm.taxaMensal ? parseFloat(proposalForm.taxaMensal) : undefined,
                      cetAnual: proposalForm.cetAnual ? parseFloat(proposalForm.cetAnual) : undefined,
                      valorTotal: parcelas && valorParcela ? parcelas * valorParcela : undefined,
                    }
                  });
                  setShowProposalForm(false);
                }}
                  disabled={actionLoading}
                  style={{ padding: '10px 20px', background: '#6370f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit' }}>
                  Salvar proposta
                </button>
                <button onClick={() => setShowProposalForm(false)}
                  style={{ padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: '#64748b' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>Timeline de auditoria</h2>
            {events.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum evento.</p>
            ) : (
              <div>
                {[...events].reverse().map((evt: any, i: number) => (
                  <div key={evt.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < events.length - 1 ? '16px' : 0, marginBottom: i < events.length - 1 ? '16px' : 0, borderBottom: i < events.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: evt.actor_type === 'SYSTEM' ? '#94a3b8' : '#6370f1', marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        {evt.event.replace(/_/g, ' ')}
                        {evt.old_status && evt.new_status && (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '400', marginLeft: '8px' }}>
                            {evt.old_status} → {evt.new_status}
                          </span>
                        )}
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

        {/* Action panel */}
        <div>
          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #f1f5f9', position: 'sticky', top: '24px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>Ações disponíveis</h3>

            {/* Aprovação interna */}
            {canApprove && (
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Decisão interna</p>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Nota (opcional)…"
                  rows={2}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => action('set_internal_decision', { decision: 'APPROVED_TO_PROCEED', note })}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '10px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                    ✓ Aprovar
                  </button>
                  <button onClick={() => setShowDeclineModal(true)}
                    style={{ flex: 1, padding: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                    ✕ Recusar
                  </button>
                </div>
              </div>
            )}

            {/* Hub fan-out multi-financeiras */}
            {(canQuoteAllPartners || hubSummary) && (
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f5f3ff', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '700', color: '#4c1d95' }}>
                  Hub de financeiras (API)
                </p>
                {canQuoteAllPartners && (
                  <button
                    onClick={() => action('quote_all_partners')}
                    disabled={actionLoading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      opacity: actionLoading ? 0.75 : 1,
                    }}
                  >
                    {hubQuoting
                      ? `Consultando ${integratedActiveCount || 'as'} financeiras em paralelo…`
                      : '⚡ Consultar todas as financeiras'}
                  </button>
                )}
                {hubSummary && hubSummary.length > 0 && (
                  <div style={{ marginTop: '12px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', background: 'white', borderRadius: '6px', overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: '#ede9fe', color: '#4c1d95', textAlign: 'left' }}>
                          <th style={{ padding: '6px 8px' }}>Parceiro</th>
                          <th style={{ padding: '6px 8px' }}>Status</th>
                          <th style={{ padding: '6px 8px' }}>Tempo</th>
                          <th style={{ padding: '6px 8px' }}>Ofertas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hubSummary.map((row, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px', fontWeight: '600', color: '#1e293b' }}>{row.partner}</td>
                            <td style={{ padding: '6px 8px', color: row.status === 'OFFERS' ? '#059669' : row.status === 'REJECTED' ? '#d97706' : '#dc2626', fontWeight: '600' }}>
                              {row.status}
                            </td>
                            <td style={{ padding: '6px 8px', color: '#64748b' }}>{row.ms}ms</td>
                            <td style={{ padding: '6px 8px', fontWeight: '700', color: '#1c1d4c' }}>{row.offers}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Painel Operacional Konsiga (sync, SMS, link de assinatura e Nota Fiscal) */}
            {konsigaAttempt && konsigaTransactionId && (
              <KonsigaOperationalPanel
                applicationId={String(id)}
                transactionId={konsigaTransactionId}
                externalStatus={konsigaAttempt.external_status}
                externalStep={konsigaAttempt.external_step}
                signingUrl={konsigaSigningUrl}
                onUpdated={loadData}
              />
            )}

            {/* Enviar para parceiro */}
            {canSubmitToPartner && (
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Encaminhar para financeira</p>
                <select value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', marginBottom: '8px', fontFamily: 'inherit', background: 'white' }}>
                  <option value="">Selecionar parceiro…</option>
                  {partners.filter(p => p.ativo && p.ticket_minimo <= app.valor_financiado && p.ticket_maximo >= app.valor_financiado).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nome} (até {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.ticket_maximo)})</option>
                  ))}
                </select>
                <button onClick={() => { if (!selectedPartner) { alert('Selecione um parceiro.'); return; } action('submit_to_partner', { partnerId: selectedPartner }); }}
                  disabled={actionLoading || !selectedPartner}
                  style={{ width: '100%', padding: '10px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>
                  Encaminhar →
                </button>
              </div>
            )}

            {/* Criar proposta */}
            {canCreateProposal && !showProposalForm && (
              <button onClick={() => setShowProposalForm(true)}
                style={{ width: '100%', padding: '10px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', marginBottom: '8px' }}>
                + Criar proposta manual
              </button>
            )}

            {/* Contrato */}
            {canRegisterContract && (
              <button onClick={() => action('register_contract', { contractProvider: 'DocuSign', contractUrl: '', contractId: `DOC-${app.protocol}` })}
                disabled={actionLoading}
                style={{ width: '100%', padding: '10px', background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', marginBottom: '8px' }}>
                📝 Enviar contrato
              </button>
            )}

            {canConfirmContractSigned && (
              <button onClick={() => action('confirm_contract_signed')}
                disabled={actionLoading}
                style={{ width: '100%', padding: '10px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', marginBottom: '8px' }}>
                ✓ Confirmar assinatura
              </button>
            )}

            {/* Status info */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>STATUS ATUAL</p>
              <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: st.color, background: st.bg }}>
                {st.label}
              </span>
              <p style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>Protocolo</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#4040ca', fontFamily: 'monospace' }}>{app.protocol}</p>
              <p style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>Decisão interna</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#334155' }}>{app.internal_decision || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de recusa */}
      {showDeclineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '700', color: '#1c1d4c' }}>Recusar solicitação</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b' }}>Esta ação notificará a clínica. Informe o motivo.</p>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Motivo da recusa…"
              rows={3}
              style={{ width: '100%', padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                if (!declineReason.trim()) { alert('Informe o motivo da recusa.'); return; }
                action('set_internal_decision', { decision: 'REJECTED', note: declineReason });
                setShowDeclineModal(false);
              }}
                disabled={actionLoading}
                style={{ flex: 1, padding: '12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit' }}>
                Confirmar recusa
              </button>
              <button onClick={() => setShowDeclineModal(false)}
                style={{ padding: '12px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: '#64748b' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
