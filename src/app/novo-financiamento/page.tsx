'use client';
// app/novo-financiamento/page.tsx
// Fluxo de novo financiamento — coração do produto

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'patient' | 'treatment' | 'processing' | 'result';
type PatientMode = 'search' | 'new';

interface Patient {
  id: string;
  nome: string;
  cpf: string;
  cpf_masked?: string;
  celular?: string;
  email?: string;
}

const CATEGORIAS = [
  { value: 'odontologia', label: 'Odontologia' },
  { value: 'cirurgia_plastica', label: 'Cirurgia plástica' },
  { value: 'dermatologia', label: 'Dermatologia' },
  { value: 'estetica', label: 'Estética' },
  { value: 'oftalmologia', label: 'Oftalmologia' },
  { value: 'ortopedia', label: 'Ortopedia' },
  { value: 'fertilidade', label: 'Fertilidade' },
  { value: 'bariatrica', label: 'Bariátrica' },
  { value: 'transplante_capilar', label: 'Transplante capilar' },
  { value: 'outra', label: 'Outra' },
];

const PROCESSING_STEPS = [
  { label: 'Dados recebidos', delay: 500 },
  { label: 'Verificando elegibilidade', delay: 1500 },
  { label: 'Consultando parceiros', delay: 3000 },
  { label: 'Preparando opções', delay: 4500 },
];

function formatCurrency(value: string) {
  const num = parseFloat(value.replace(/\D/g, '')) / 100;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function parseCurrency(formatted: string): number {
  return parseFloat(formatted.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

export default function NovoFinanciamentoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('patient');
  const [patientMode, setPatientMode] = useState<PatientMode>('search');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form paciente novo
  const [newPatient, setNewPatient] = useState({ cpf: '', dataNascimento: '', nome: '', celular: '', email: '' });

  // Form tratamento
  const [categoria, setCategoria] = useState('odontologia');
  const [procedimento, setProcedimento] = useState('');
  const [valorTratamento, setValorTratamento] = useState('');
  const [entrada, setEntrada] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Processamento
  const [processingSteps, setProcessingSteps] = useState<boolean[]>([false, false, false, false]);
  const [processingError, setProcessingError] = useState('');
  const [resultApplicationId, setResultApplicationId] = useState('');
  const [resultProtocol, setResultProtocol] = useState('');

  const valorTratamentoNum = parseCurrency(valorTratamento);
  const entradaNum = parseCurrency(entrada);
  const valorFinanciado = Math.max(0, valorTratamentoNum - entradaNum);

  // Busca de pacientes
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.patients || []);
      setShowDropdown(true);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  async function handleCreateOrFindPatient(): Promise<string | null> {
    if (selectedPatient) return selectedPatient.id;

    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: newPatient.nome,
        cpf: newPatient.cpf,
        dataNascimento: newPatient.dataNascimento || null,
        celular: newPatient.celular || null,
        email: newPatient.email || null,
      }),
    });
    const data = await res.json();
    return res.ok ? data.id : null;
  }

  async function handleSubmit() {
    if (!consentAccepted) return;
    setStep('processing');

    // Animar steps
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      setTimeout(() => {
        setProcessingSteps(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, PROCESSING_STEPS[i].delay);
    }

    try {
      // Criar/buscar paciente
      const patientId = await handleCreateOrFindPatient();
      if (!patientId) throw new Error('Erro ao identificar paciente.');

      // Criar solicitação
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          categoria,
          procedimento,
          valorTratamento: valorTratamentoNum,
          entrada: entradaNum,
          consentAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar solicitação.');

      setResultApplicationId(data.id);
      setResultProtocol(data.protocol);

      // Aguardar animação concluir
      setTimeout(() => setStep('result'), 5500);
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Erro inesperado.');
      setStep('result');
    }
  }

  function formatCPF(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
    return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  }

  const canProceedToTreatment = selectedPatient ||
    (newPatient.cpf.length === 14 && newPatient.nome.trim().length > 2);

  const canSubmit = canProceedToTreatment &&
    valorTratamentoNum > 0 && valorFinanciado > 0 && consentAccepted;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top bar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'inherit', padding: '0',
          }}
        >
          ← Voltar
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1d4c' }}>
            Novo financiamento
          </h1>
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {['1. Pré-análise', '2. Análise', '3. Proposta'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '13px', fontWeight: '600',
                color: i === 0 ? '#6370f1' : '#94a3b8',
              }}>{s}</span>
              {i < 2 && <span style={{ color: '#e2e8f0' }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px' }}>

        {/* ── STEP: PATIENT ─────────────────────────────── */}
        {step === 'patient' && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
              Vamos verificar as opções para este paciente
            </h2>
            <p style={{ margin: '0 0 40px', color: '#64748b' }}>Leva poucos minutos.</p>

            {/* Responsável financeiro */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Responsável financeiro
              </label>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {(['search', 'new'] as PatientMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setPatientMode(m); setSelectedPatient(null); setSearchQuery(''); }}
                    style={{
                      flex: 1, padding: '10px',
                      background: patientMode === m ? '#f0f4ff' : 'white',
                      border: patientMode === m ? '1.5px solid #6370f1' : '1.5px solid #e2e8f0',
                      borderRadius: '10px', cursor: 'pointer',
                      fontSize: '13px', fontWeight: '600',
                      color: patientMode === m ? '#4040ca' : '#64748b',
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                  >
                    {m === 'search' ? '🔍 Buscar cadastrado' : '+ Novo paciente'}
                  </button>
                ))}
              </div>

              {patientMode === 'search' && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Nome, CPF ou telefone…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    style={{
                      width: '100%', padding: '12px 16px',
                      border: '1.5px solid #e2e8f0', borderRadius: '10px',
                      fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                  {showDropdown && searchResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: '4px', overflow: 'hidden',
                    }}>
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setSearchQuery(p.nome); setShowDropdown(false); }}
                          style={{
                            width: '100%', padding: '12px 16px', background: 'none',
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            borderBottom: '1px solid #f8fafc', fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1c1d4c' }}>{p.nome}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{p.cpf_masked || p.cpf}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedPatient && (
                    <div style={{
                      marginTop: '12px', padding: '12px 16px',
                      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <span style={{ fontSize: '18px' }}>✓</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>{selectedPatient.nome}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Paciente encontrado</p>
                      </div>
                      <button onClick={() => { setSelectedPatient(null); setSearchQuery(''); }}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                    </div>
                  )}
                </div>
              )}

              {patientMode === 'new' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>CPF *</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={newPatient.cpf}
                        onChange={e => setNewPatient(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                        style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Data de nascimento</label>
                      <input
                        type="date"
                        value={newPatient.dataNascimento}
                        onChange={e => setNewPatient(p => ({ ...p, dataNascimento: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Nome completo *</label>
                    <input
                      type="text"
                      placeholder="Nome do paciente"
                      value={newPatient.nome}
                      onChange={e => setNewPatient(p => ({ ...p, nome: e.target.value }))}
                      style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Celular</label>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={newPatient.celular}
                        onChange={e => setNewPatient(p => ({ ...p, celular: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>E-mail</label>
                      <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={newPatient.email}
                        onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))}
                        style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('treatment')}
              disabled={!canProceedToTreatment}
              style={{
                width: '100%', padding: '14px',
                background: canProceedToTreatment ? 'linear-gradient(135deg, #6370f1, #4040ca)' : '#e2e8f0',
                color: canProceedToTreatment ? 'white' : '#94a3b8',
                border: 'none', borderRadius: '10px', fontSize: '15px',
                fontWeight: '700', cursor: canProceedToTreatment ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
              }}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ── STEP: TREATMENT ───────────────────────────── */}
        {step === 'treatment' && (
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
              Detalhes do tratamento
            </h2>
            <p style={{ margin: '0 0 40px', color: '#64748b' }}>
              Paciente: <strong>{selectedPatient?.nome || newPatient.nome}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Categoria</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', background: 'white', fontFamily: 'inherit' }}
                >
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Procedimento</label>
                <input
                  type="text"
                  placeholder="Ex: Implante dentário, Rinoplastia…"
                  value={procedimento}
                  onChange={e => setProcedimento(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Valor do tratamento *</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={valorTratamento}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (!digits) { setValorTratamento(''); return; }
                      const num = parseInt(digits) / 100;
                      setValorTratamento(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num));
                    }}
                    style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Entrada</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={entrada}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (!digits) { setEntrada(''); return; }
                      const num = parseInt(digits) / 100;
                      setEntrada(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num));
                    }}
                    style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Resumo de valores */}
              {valorTratamentoNum > 0 && (
                <div style={{
                  background: '#f8fafc', borderRadius: '12px', padding: '20px',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>Tratamento:</span>
                    <span style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTratamentoNum)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>Entrada:</span>
                    <span style={{ fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entradaNum)}
                    </span>
                  </div>
                  <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '12px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '15px', color: '#1c1d4c', fontWeight: '700' }}>A financiar:</span>
                    <span style={{ fontSize: '18px', color: '#4040ca', fontWeight: '800' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFinanciado)}
                    </span>
                  </div>
                </div>
              )}

              {/* Consentimento */}
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '10px', padding: '16px',
                display: 'flex', gap: '12px', alignItems: 'flex-start',
              }}>
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentAccepted}
                  onChange={e => setConsentAccepted(e.target.checked)}
                  style={{ marginTop: '2px', cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                />
                <label htmlFor="consent" style={{ fontSize: '13px', color: '#78350f', cursor: 'pointer', lineHeight: '1.5' }}>
                  Confirmo que o paciente autorizou o envio de seus dados para análise das opções de financiamento
                  e teve acesso às informações de privacidade.
                  <br />
                  <em style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Análise sujeita às políticas de crédito da instituição financeira.
                  </em>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={() => setStep('patient')}
                style={{
                  padding: '14px 24px',
                  background: 'white', border: '1.5px solid #e2e8f0',
                  borderRadius: '10px', fontSize: '15px', fontWeight: '600',
                  cursor: 'pointer', color: '#64748b', fontFamily: 'inherit',
                }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                style={{
                  flex: 1, padding: '14px',
                  background: canSubmit ? 'linear-gradient(135deg, #6370f1, #4040ca)' : '#e2e8f0',
                  color: canSubmit ? 'white' : '#94a3b8',
                  border: 'none', borderRadius: '10px', fontSize: '15px',
                  fontWeight: '700', cursor: canSubmit ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  boxShadow: canSubmit ? '0 4px 16px rgba(99,112,241,0.4)' : 'none',
                }}
              >
                Consultar opções →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PROCESSING ──────────────────────────── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 24px',
              background: 'linear-gradient(135deg, #6370f1, #4040ca)',
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '28px', color: 'white' }}>◎</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800', color: '#1c1d4c' }}>
              Buscando as melhores opções para este paciente…
            </h2>
            <p style={{ margin: '0 0 40px', color: '#64748b' }}>Isso leva apenas alguns instantes.</p>

            <div style={{ textAlign: 'left', maxWidth: '320px', margin: '0 auto' }}>
              {PROCESSING_STEPS.map((s, i) => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 0',
                  opacity: processingSteps[i] ? 1 : 0.3,
                  transition: 'opacity 0.5s ease',
                }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: processingSteps[i] ? '#059669' : '#e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.4s', flexShrink: 0,
                  }}>
                    {processingSteps[i] && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize: '14px', fontWeight: '500',
                    color: processingSteps[i] ? '#1c1d4c' : '#94a3b8',
                  }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: RESULT ──────────────────────────────── */}
        {step === 'result' && (
          <div style={{ textAlign: 'center' }}>
            {processingError ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800', color: '#dc2626' }}>
                  Não conseguimos concluir esta consulta agora.
                </h2>
                <p style={{ color: '#64748b', marginBottom: '32px' }}>
                  Tente novamente ou envie para análise manual.
                </p>
                <button
                  onClick={() => { setProcessingError(''); setStep('treatment'); }}
                  style={{
                    padding: '12px 24px', background: '#6370f1', color: 'white',
                    border: 'none', borderRadius: '10px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
                  }}
                >
                  Tentar novamente
                </button>
              </>
            ) : (
              <>
                <div style={{
                  width: '72px', height: '72px', margin: '0 auto 24px',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '32px', color: 'white' }}>✓</span>
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800', color: '#1c1d4c' }}>
                  Solicitação criada com sucesso!
                </h2>
                <p style={{ color: '#64748b', marginBottom: '8px' }}>
                  Encontramos opções para continuar.
                </p>
                <div style={{
                  display: 'inline-block', background: '#f0f4ff', borderRadius: '8px',
                  padding: '8px 16px', marginBottom: '32px',
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#4040ca', fontFamily: 'monospace' }}>
                    {resultProtocol}
                  </span>
                </div>
                <br />
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '32px' }}>
                  A equipe Benavera está analisando sua solicitação. Você acompanha tudo pelo painel.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => router.push(`/financiamentos/${resultApplicationId}`)}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #6370f1, #4040ca)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700',
                      boxShadow: '0 4px 16px rgba(99,112,241,0.4)',
                    }}
                  >
                    Acompanhar solicitação →
                  </button>
                  <button
                    onClick={() => {
                      setStep('patient');
                      setSelectedPatient(null);
                      setSearchQuery('');
                      setNewPatient({ cpf: '', dataNascimento: '', nome: '', celular: '', email: '' });
                      setCategoria('odontologia');
                      setProcedimento('');
                      setValorTratamento('');
                      setEntrada('');
                      setConsentAccepted(false);
                      setProcessingSteps([false, false, false, false]);
                      setResultApplicationId('');
                      setResultProtocol('');
                    }}
                    style={{
                      padding: '12px 24px',
                      background: 'white', border: '1.5px solid #e2e8f0',
                      borderRadius: '10px', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '14px', fontWeight: '600', color: '#64748b',
                    }}
                  >
                    Novo financiamento
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
