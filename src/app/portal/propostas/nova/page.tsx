'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, User, FileText, Calculator, Send, Copy, ExternalLink, Check, AlertCircle
} from 'lucide-react';

const especialidades = [
  'Odontologia & Implantes',
  'Cirurgia Plástica & Estética',
  'Oftalmologia & Cirurgias Oculares',
  'Ortopedia & Reabilitação',
  'Dermatologia & Procedimentos',
  'Outra Especialidade'
];

export default function NovaPropostaPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProposal, setCreatedProposal] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Step 1: Paciente
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');

  // Step 2: Tratamento & Valor
  const [especialidade, setEspecialidade] = useState(especialidades[0]);
  const [tratamento, setTratamento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotalStr, setValorTotalStr] = useState('');
  const [entradaStr, setEntradaStr] = useState('0');

  // Step 3: Prazos selecionados
  const [prazos, setPrazos] = useState<number[]>([6, 12, 18, 24, 36]);
  const [observacoes, setObservacoes] = useState('');

  const valorTotal = parseFloat(valorTotalStr.replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
  const entrada = parseFloat(entradaStr.replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
  const valorFinanciado = Math.max(0, valorTotal - entrada);

  function calcParcela(meses: number) {
    if (valorFinanciado <= 0) return 0;
    // Simulação aproximada de taxa de 1.49% a.m.
    const taxa = 0.0149;
    const pmt = (valorFinanciado * taxa) / (1 - Math.pow(1 + taxa, -meses));
    return Math.round(pmt);
  }

  function togglePrazo(p: number) {
    if (prazos.includes(p)) {
      if (prazos.length > 1) setPrazos(prazos.filter(x => x !== p));
    } else {
      setPrazos([...prazos, p].sort((a, b) => a - b));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !telefone || !tratamento || valorTotal <= 0) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const opcoesParcelamento = prazos.map(m => ({
        meses: m,
        valorParcela: calcParcela(m),
        totalComJuros: calcParcela(m) * m + entrada,
      }));

      const res = await fetch('/api/portal/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteNome: nome,
          pacienteTelefone: telefone,
          pacienteEmail: email,
          cidade,
          especialidade,
          tratamento,
          descricaoTratamento: descricao,
          valorTotalCentavos: Math.round(valorTotal * 100),
          entradaCentavos: Math.round(entrada * 100),
          opcoesParcelamento,
          observacoes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar proposta.');
      }

      setCreatedProposal(data.proposta);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  const patientUrl = createdProposal ? `${window.location.origin}/p/${createdProposal.token}` : '';

  function copyToClipboard() {
    navigator.clipboard.writeText(patientUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Olá, ${nome.split(' ')[0]}! Aqui está a proposta personalizada de financiamento para o seu tratamento de ${tratamento} na nossa clínica:\n\n${patientUrl}\n\nVocê pode escolher as parcelas e confirmar online em menos de 2 minutos.`
    );
    window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }

  return (
    <div className="portal-content">
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/portal/propostas" className="btn-action btn-action-outline" style={{ padding: '0.5rem 0.75rem', gap: '0.375rem' }}>
          <ArrowLeft size={16} />
          Voltar para propostas
        </Link>
      </div>

      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
            Nova Proposta de Financiamento
          </h1>
          <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
            Monte a proposta para o seu paciente, escolha as condições e envie o link direto por WhatsApp.
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', background: 'white', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {[
            { n: 1, label: 'Paciente', icon: User },
            { n: 2, label: 'Tratamento & Valores', icon: FileText },
            { n: 3, label: 'Parcelas & Envio', icon: Calculator },
          ].map((s) => {
            const Icon = s.icon;
            const isDone = step > s.n || step === 4;
            const isCurrent = step === s.n;
            return (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', opacity: isCurrent || isDone ? 1 : 0.4 }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: isDone ? '#10b981' : isCurrent ? '#4f46e5' : '#e2e8f0',
                  color: isDone || isCurrent ? 'white' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.875rem'
                }}>
                  {isDone && step !== s.n ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: isCurrent ? '#4f46e5' : '#1e293b' }}>
                    Passo {s.n}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Paciente */}
        {step === 1 && (
          <div className="portal-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem' }}>
              Dados do Paciente
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-form-label">Nome Completo do Paciente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariana Silva Souza"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="portal-form-input"
                />
              </div>

              <div>
                <label className="portal-form-label">WhatsApp com DDD *</label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="portal-form-input"
                />
              </div>

              <div>
                <label className="portal-form-label">E-mail (opcional)</label>
                <input
                  type="email"
                  placeholder="paciente@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="portal-form-input"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-form-label">Cidade / Estado</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - SP"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="portal-form-input"
                />
              </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  if (!nome.trim() || !telefone.trim()) {
                    setError('Informe o nome e o WhatsApp do paciente.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="btn-action btn-action-primary"
                style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem' }}
              >
                Avançar: Tratamento e Valores →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Tratamento & Valores */}
        {step === 2 && (
          <div className="portal-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem' }}>
              Tratamento & Condições Financeiras
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label className="portal-form-label">Especialidade *</label>
                <select
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  className="portal-form-input"
                >
                  {especialidades.map(esp => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="portal-form-label">Procedimento / Tratamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Implante Protocolo Superior + Enxerto"
                  value={tratamento}
                  onChange={(e) => setTratamento(e.target.value)}
                  className="portal-form-input"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="portal-form-label">Descrição Clínica / Observações do Plano (opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes do planejamento clínico para o paciente consultar na proposta..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="portal-form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="portal-form-label">Valor Total do Tratamento (R$) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 8500"
                  value={valorTotalStr}
                  onChange={(e) => setValorTotalStr(e.target.value)}
                  className="portal-form-input"
                  style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a' }}
                />
              </div>

              <div>
                <label className="portal-form-label">Entrada no Pix / Cartão (R$) (opcional)</label>
                <input
                  type="text"
                  placeholder="0"
                  value={entradaStr}
                  onChange={(e) => setEntradaStr(e.target.value)}
                  className="portal-form-input"
                />
              </div>
            </div>

            {valorTotal > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Saldo a financiar via Benavera:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#4f46e5' }}>
                    {valorFinanciado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#64748b' }}>
                  Repasse integral à sua clínica em D+1 após a aprovação
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-action btn-action-outline"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!tratamento.trim() || valorTotal <= 0) {
                    setError('Informe o tratamento e um valor total válido.');
                    return;
                  }
                  setError('');
                  setStep(3);
                }}
                className="btn-action btn-action-primary"
                style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem' }}
              >
                Avançar: Configurar Prazos →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Prazos & Simulação */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="portal-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
              Opções de Parcelamento Disponíveis para o Paciente
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Selecione as opções de prazo que deseja disponibilizar para o paciente escolher na tela dele:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[6, 12, 18, 24, 36].map((meses) => {
                const isSelected = prazos.includes(meses);
                const parcela = calcParcela(meses);
                return (
                  <div
                    key={meses}
                    onClick={() => togglePrazo(meses)}
                    style={{
                      padding: '1.25rem 1rem',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      background: isSelected ? '#f5f7ff' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: isSelected ? '#4f46e5' : '#1e293b' }}>
                      {meses}x
                    </div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '800', color: '#0f172a', margin: '0.25rem 0' }}>
                      {parcela > 0 ? parcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }) : '—'}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                      {isSelected ? '✓ Habilitado' : 'Clique p/ habilitar'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="portal-form-label">Mensagem personalizada para o paciente (opcional)</label>
              <textarea
                rows={2}
                placeholder="Ex: Proposta válida por 5 dias. Ficamos à disposição no WhatsApp para tirar qualquer dúvida!"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="portal-form-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-action btn-action-outline"
                disabled={loading}
              >
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-action btn-action-primary"
                style={{ padding: '0.875rem 2rem', fontSize: '1rem', gap: '0.5rem' }}
              >
                {loading ? 'Gerando Proposta...' : '🚀 Gerar e Enviar Proposta'}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Sucesso & Compartilhamento */}
        {step === 4 && createdProposal && (
          <div className="portal-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.625rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
              Proposta Gerada com Sucesso!
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 2rem' }}>
              A proposta para <strong>{nome}</strong> no valor de <strong>{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> está pronta para envio.
            </p>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '580px', margin: '0 auto 2rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Link Direto do Paciente:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={patientUrl}
                  style={{ flex: 1, padding: '0.625rem 0.875rem', fontSize: '0.875rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155' }}
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="btn-action btn-action-outline"
                  style={{ gap: '0.375rem', whiteSpace: 'nowrap' }}
                >
                  {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={shareWhatsApp}
                className="btn-action"
                style={{ background: '#25D366', color: 'white', border: 'none', padding: '0.875rem 1.75rem', fontSize: '0.9375rem', gap: '0.5rem' }}
              >
                <Send size={16} />
                Enviar Proposta no WhatsApp
              </button>

              <a
                href={patientUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-action btn-action-outline"
                style={{ padding: '0.875rem 1.5rem', fontSize: '0.9375rem', gap: '0.5rem' }}
              >
                <ExternalLink size={16} />
                Visualizar como Paciente
              </a>

              <Link
                href="/portal/dashboard"
                className="btn-action btn-action-outline"
                style={{ padding: '0.875rem 1.5rem', fontSize: '0.9375rem' }}
              >
                Ir ao Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
