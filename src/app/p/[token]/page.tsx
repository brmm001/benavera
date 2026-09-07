'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, ShieldCheck, Clock, Building2, ChevronRight, User, Phone, Check, AlertCircle, Sparkles, Lock
} from 'lucide-react';

export default function PatientProposalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedPrazo, setSelectedPrazo] = useState<number | null>(null);

  // Stepper: 1: Escolha parcela, 2: Confirmação de dados, 3: Aprovado
  const [step, setStep] = useState(1);
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchProposal();
  }, [token]);

  async function fetchProposal() {
    try {
      const res = await fetch(`/api/p/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Proposta não encontrada ou expirada.');
      } else {
        setProposal(data.proposta);
        if (data.proposta.opcoes_parcelamento?.length > 0) {
          setSelectedPrazo(data.proposta.opcoes_parcelamento[0].meses);
        }
      }
    } catch (e: any) {
      setError('Erro ao carregar proposta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!selectedPrazo) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/p/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prazoEscolhido: selectedPrazo,
          cpf,
          nascimento,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao confirmar parcelamento.');
      } else {
        setStep(3);
      }
    } catch (e: any) {
      setError('Erro na conexão.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '0.9375rem', color: '#64748b', fontWeight: '600' }}>Carregando sua proposta...</div>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1.5rem' }}>
        <div style={{ background: 'white', padding: '2.5rem', borderRadius: '20px', maxWidth: '480px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <AlertCircle size={44} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>Proposta Indisponível</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>{error || 'Não foi possível carregar as informações desta proposta.'}</p>
          <Link href="/" className="btn-action btn-action-primary">Ir para a página inicial</Link>
        </div>
      </div>
    );
  }

  const valorTotal = (proposal.valor_total_centavos || 0) / 100;
  const entrada = (proposal.entrada_centavos || 0) / 100;
  const opcoes = proposal.opcoes_parcelamento || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1rem 1rem 3rem' }}>
      {/* Header com Branding Benavera + Clínica */}
      <header style={{ maxWidth: '640px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.03em' }}>
            bena<span style={{ color: '#4f46e5' }}>vera</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '700', background: '#ecfdf5', padding: '0.375rem 0.75rem', borderRadius: '20px' }}>
          <ShieldCheck size={14} /> Ambiente Seguro
        </div>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Banner da Clínica Parceira */}
        <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: '20px', padding: '1.75rem', color: 'white', marginBottom: '1.5rem', boxShadow: '0 10px 25px -5px rgba(30,27,75,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginBottom: '0.5rem' }}>
            <Building2 size={14} /> Proposta Emitida Por
          </div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: '800', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
            {proposal.clinic_nome}
          </h1>
          <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
            Paciente: <strong style={{ color: 'white' }}>{proposal.paciente_nome}</strong>
          </div>
        </div>

        {/* Resumo do Tratamento */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
            Procedimento Planejado
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
            {proposal.tratamento}
          </div>
          {proposal.descricao_tratamento && (
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.5', margin: '0 0 1rem' }}>
              {proposal.descricao_tratamento}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Valor Total do Orçamento</div>
              <div style={{ fontSize: '1.375rem', fontWeight: '800', color: '#0f172a' }}>
                {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
            {entrada > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Entrada combinada</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#16a34a' }}>
                  {entrada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Passo 1: Escolha das Parcelas */}
        {step === 1 && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.375rem' }}>
              Escolha a melhor condição de parcelamento:
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Crédito saúde sem comprometer o limite total do seu cartão principal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {opcoes.map((op: any) => {
                const isSelected = selectedPrazo === op.meses;
                return (
                  <div
                    key={op.meses}
                    onClick={() => setSelectedPrazo(op.meses)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.125rem 1.25rem',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      background: isSelected ? '#f5f7ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: isSelected ? '6px solid #4f46e5' : '2px solid #cbd5e1',
                        background: 'white'
                      }} />
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                          {op.meses}x de {(op.valorParcela || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Parcelamento facilitado
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5', background: 'rgba(79,70,229,0.1)', padding: '0.25rem 0.625rem', borderRadius: '12px' }}>
                        Opção Selecionada
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-action btn-action-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', justifyContent: 'center' }}
            >
              Avançar e Confirmar Dados →
            </button>
          </div>
        )}

        {/* Passo 2: Confirmação Simples */}
        {step === 2 && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.375rem' }}>
              Confirmar Dados para Liberação
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Informe os dados do titular para emissão do contrato digital seguro.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="portal-form-label">CPF do Paciente / Titular *</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="portal-form-input"
                />
              </div>

              <div>
                <label className="portal-form-label">Data de Nascimento *</label>
                <input
                  type="date"
                  required
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                  className="portal-form-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                <Lock size={14} color="#10b981" />
                Seus dados estão protegidos sob sigilo médico e pela LGPD.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-action btn-action-outline"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={submitting || !cpf}
                className="btn-action btn-action-primary"
                style={{ flex: 2, justifyContent: 'center' }}
              >
                {submitting ? 'Confirmando...' : '✓ Aceitar e Iniciar Tratamento'}
              </button>
            </div>
          </div>
        )}

        {/* Passo 3: Sucesso */}
        {step === 3 && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2.5rem 1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
              Parabéns! Sua proposta foi confirmada!
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
              A equipe da <strong>{proposal.clinic_nome}</strong> já recebeu a confirmação do seu parcelamento em <strong>{selectedPrazo}x</strong> e entrará em contato para agendar o início do seu procedimento.
            </p>

            <a
              href={`https://wa.me/55${(proposal.paciente_telefone || '').replace(/\D/g, '')}`}
              className="btn-action btn-action-primary"
              style={{ display: 'inline-flex', padding: '0.875rem 2rem', fontSize: '1rem' }}
            >
              Falar com a Clínica no WhatsApp
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
