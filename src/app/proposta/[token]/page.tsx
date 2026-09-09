'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Proposal {
  id: string;
  partner_nome: string;
  valor_financiado: number;
  entrada: number;
  parcelas: number;
  valor_parcela: number;
  taxa_mensal: number | null;
  cet_anual: number | null;
  valor_total: number | null;
  validade: string | null;
  url_externa: string | null;
  selecionada: boolean;
}

interface ProposalData {
  patient_nome: string;
  clinic_nome: string;
  protocol: string;
  procedimento: string;
  categoria: string;
  valor_tratamento: number;
  entrada: number;
  valor_financiado: number;
  status: string;
  expires_at: string;
  proposals: Proposal[];
}

export default function PropostaPublicaPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProposalData | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<Proposal | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchProposal();
  }, [token]);

  const fetchProposal = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/proposta/${token}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Não foi possível carregar a proposta.');
      }
      const json = await res.json();
      setData(json);

      // Check if one was already selected
      const alreadySelected = json.proposals?.find((p: Proposal) => p.selecionada);
      if (alreadySelected) {
        setSelectedProposalId(alreadySelected.id);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar proposta.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProposal = async () => {
    if (!confirmModal || !termsAccepted) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/proposta/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: confirmModal.id }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao selecionar proposta.');
      }

      setSuccessMessage('Proposta aceita com sucesso!');
      setConfirmModal(null);
      await fetchProposal();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar proposta.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Carregando suas opções de financiamento...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Link Indisponível</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 24 }}>
            {error || 'O link desta proposta expirou ou não é mais válido. Por favor, entre em contato com a clínica para solicitar uma nova análise.'}
          </p>
          <div style={{ padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8, fontSize: '0.85rem', color: '#475569' }}>
            Dúvidas? Entre em contato diretamente com sua clínica.
          </div>
        </div>
      </div>
    );
  }

  const isAlreadyChosen = data.proposals.some(p => p.selecionada) || ['PROPOSTA_ACEITA', 'CONTRATO_EMITIDO', 'CONTRATO_ASSINADO', 'REPASSE_SOLICITADO', 'CONCLUIDA'].includes(data.status);
  const selectedProposal = data.proposals.find(p => p.selecionada || p.id === selectedProposalId);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
              B
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#0f172a' }}>Benavera</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: -2 }}>Saúde & Estética Facilitada</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Clínica credenciada</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{data.clinic_nome}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Success Banner if just chosen */}
        {successMessage && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, color: '#065f46' }}>{successMessage}</div>
              <div style={{ fontSize: '0.85rem', color: '#047857' }}>Sua escolha foi registrada! O contrato digital será preparado em breve.</div>
            </div>
          </div>
        )}

        {/* Hero Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: 28 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
            <div>
              <span style={{ display: 'inline-block', backgroundColor: '#f0fdfa', color: '#0d9488', fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, marginBottom: 8, border: '1px solid #ccfbf1' }}>
                PROPOSTA DE FINANCIAMENTO
              </span>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
                Olá, {data.patient_nome}! 👋
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                Temos opções aprovadas para viabilizar seu tratamento de <strong>{data.procedimento || 'Procedimento Clínico'}</strong>.
              </p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Protocolo</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{data.protocol}</span>
            </div>
          </div>

          {/* Treatment Summary Pill Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #f1f5f9' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Valor do Tratamento</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{formatCurrency(data.valor_tratamento)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Entrada</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{formatCurrency(data.entrada)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Valor a Financiar</span>
              <strong style={{ fontSize: '1.05rem', color: '#0d9488' }}>{formatCurrency(data.valor_financiado)}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Categoria</span>
              <strong style={{ fontSize: '1.05rem', color: '#334155' }}>{data.categoria || 'Geral'}</strong>
            </div>
          </div>
        </div>

        {/* If Already Chosen State */}
        {isAlreadyChosen && selectedProposal && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '2px solid #0d9488', padding: 28, boxShadow: '0 8px 30px rgba(13,148,136,0.08)', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                ✓
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Plano Selecionado</h3>
                <span style={{ fontSize: '0.85rem', color: '#0d9488', fontWeight: 600 }}>Parceiro Financeiro: {selectedProposal.partner_nome}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, padding: '16px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', margin: '16px 0' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Condição</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedProposal.parcelas}x de {formatCurrency(selectedProposal.valor_parcela)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total a Pagar</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>
                  {formatCurrency(selectedProposal.valor_total || selectedProposal.parcelas * selectedProposal.valor_parcela)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Taxa Estimada</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>
                  {selectedProposal.taxa_mensal ? `${selectedProposal.taxa_mensal}% a.m.` : 'Inclusa'}
                </div>
              </div>
            </div>
            <div style={{ backgroundColor: '#f0fdfa', borderRadius: 8, padding: 14, fontSize: '0.9rem', color: '#047857' }}>
              ℹ️ <strong>Próximos passos:</strong> O contrato digital está sendo processado. Você receberá o link para assinatura eletrônica no seu WhatsApp ou e-mail cadastrado.
            </div>
          </div>
        )}

        {/* List of Proposals to Select */}
        {!isAlreadyChosen && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Opções Disponíveis ({data.proposals.length})
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>
                  Escolha o plano com as parcelas que melhor se adaptam ao seu orçamento:
                </p>
              </div>
            </div>

            {data.proposals.length === 0 ? (
              <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 32, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#64748b', margin: 0 }}>Nenhuma proposta disponível no momento. Fale com a clínica.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {data.proposals.map((proposal, idx) => {
                  const isLowestMonthly = idx === 0; // assuming sorted by valor_parcela
                  return (
                    <div
                      key={proposal.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        border: isLowestMonthly ? '2px solid #0d9488' : '1px solid #e2e8f0',
                        padding: 24,
                        boxShadow: isLowestMonthly ? '0 8px 24px rgba(13,148,136,0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      {isLowestMonthly && (
                        <div style={{ position: 'absolute', top: -12, right: 20, backgroundColor: '#0d9488', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '3px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ★ Menor Parcela
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>
                            {proposal.partner_nome}
                          </span>
                          {proposal.validade && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Válida até {new Date(proposal.validade).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        <div style={{ margin: '16px 0' }}>
                          <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block' }}>Plano de Pagamento</span>
                          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginTop: 2 }}>
                            {proposal.parcelas}x de <span style={{ color: '#0d9488' }}>{formatCurrency(proposal.valor_parcela)}</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: 4 }}>
                            Total: {formatCurrency(proposal.valor_total || proposal.parcelas * proposal.valor_parcela)}
                          </span>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, fontSize: '0.8rem', color: '#475569', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Taxa mensal estimada:</span>
                          <strong>{proposal.taxa_mensal ? `${proposal.taxa_mensal}%` : 'Sem juros'}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setConfirmModal(proposal);
                          setTermsAccepted(false);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: isLowestMonthly ? '#0d9488' : '#0f172a',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      >
                        Escolher esta Opção →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Security & Support Guarantee */}
        <div style={{ marginTop: 40, padding: 20, backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🔒</span>
            <div>
              <strong style={{ fontSize: '0.9rem', color: '#1e293b', display: 'block' }}>Ambiente 100% Seguro</strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Seus dados e propostas são protegidos com criptografia bancária de ponta a ponta.</span>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Benavera Soluções Financeiras &copy; 2026
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: 20, maxWidth: 500, width: '100%', padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Confirmar Escolha de Proposta
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 20px' }}>
              Você está selecionando o financiamento com <strong>{confirmModal.partner_nome}</strong>:
            </p>

            <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0d9488' }}>
                {confirmModal.parcelas}x de {formatCurrency(confirmModal.valor_parcela)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#065f46', marginTop: 4 }}>
                Total financiado: {formatCurrency(confirmModal.valor_financiado)} • Total com juros: {formatCurrency(confirmModal.valor_total || confirmModal.parcelas * confirmModal.valor_parcela)}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: '#0d9488' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
                Declaro que concordo com as condições desta proposta e autorizo a emissão do contrato digital em meu nome.
              </span>
            </label>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={submitting}
                style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSelectProposal}
                disabled={!termsAccepted || submitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: termsAccepted && !submitting ? '#0d9488' : '#94a3b8',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: termsAccepted && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Processando...' : 'Confirmar Proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
