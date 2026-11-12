'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award, Zap, DollarSign, Users
} from 'lucide-react';

const especialidades = [
  'Odontologia & Implantes',
  'Cirurgia Plástica & Estética',
  'Oftalmologia & Cirurgias Oculares',
  'Ortopedia & Reabilitação',
  'Dermatologia & Procedimentos',
  'Outra Especialidade'
];

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function CredenciamentoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [nomeClinica, setNomeClinica] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [especialidade, setEspecialidade] = useState(especialidades[0]);
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');

  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [cargo, setCargo] = useState('Diretor / Sócio');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [volumeMensal] = useState('R$ 50 mil a R$ 150 mil');
  const [ticketMedio] = useState('R$ 3.000 a R$ 8.000');

  // Código de indicação do representante de vendas (?ref=CODIGO), lembrado por 30 dias
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('ref');
      const code = (fromUrl || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
      if (code.length >= 6) {
        localStorage.setItem('bv_ref', JSON.stringify({ code, at: Date.now() }));
      }
    } catch { /* storage indisponível */ }
  }, []);

  function getRefCode(): string | null {
    try {
      const raw = localStorage.getItem('bv_ref');
      if (!raw) return null;
      const { code, at } = JSON.parse(raw);
      if (typeof code !== 'string' || Date.now() - Number(at) > 30 * 24 * 60 * 60 * 1000) return null;
      return code;
    } catch {
      return null;
    }
  }

  async function handleCepChange(raw: string) {
    const formatted = formatCEP(raw);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            if (data.logradouro) setRua(data.logradouro);
            if (data.bairro) setBairro(data.bairro);
            if (data.localidade) setCidade(data.localidade);
            if (data.uf) setEstado(data.uf);
          }
        }
      } catch {
        // Silencioso
      }
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeClinica || !whatsapp || !email || !password) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/credenciamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeClinica,
          cnpj,
          especialidade,
          cep,
          rua,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          nomeResponsavel,
          cargo,
          whatsapp,
          email,
          password,
          volumeMensal,
          ticketMedio,
          ref: getRefCode(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar credenciamento.');
      }

      // Redireciona diretamente para o fluxo de envio de documentos
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        router.push('/login?pending_approval=1');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: 'clamp(5.75rem, 9vw, 7.5rem) 1rem 4rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: '#3b82f6', padding: '0.375rem 1rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '0.875rem' }}>
            <Award size={14} /> Credenciamento de Clínicas Parceiras
          </div>
          <h1 style={{ fontSize: 'clamp(1.625rem, 4.5vw, 2.25rem)', lineHeight: '1.2', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 0.75rem' }}>
            Credencie sua clínica na Benavera
          </h1>
          <p style={{ fontSize: 'clamp(0.9375rem, 2vw, 1.0625rem)', color: '#64748b', maxWidth: '580px', margin: '0 auto', lineHeight: '1.6' }}>
            Ofereça crédito em até 36x, conforme análise. Taxa de 5% por operação para a clínica, sem mensalidade ou adesão.
          </p>
        </div>

        {/* Benefits bar */}
        <div className="credenciamento-benefits-grid">
          <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#4f46e5" style={{ marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f172a' }}>Taxa de 5%</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Por operação para a clínica</div>
          </div>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} color="#10b981" style={{ marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f172a' }}>Até 36x</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Conforme análise e modalidade</div>
          </div>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#3b82f6" style={{ marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f172a' }}>Portal & CRM</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Gestão completa de propostas</div>
          </div>
        </div>

        {/* Form Container */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: 'clamp(1.25rem, 4vw, 2.5rem)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {/* Step Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: step >= 1 ? '#4040ca' : '#e2e8f0',
                color: step >= 1 ? 'white' : '#64748b',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: '700', flexShrink: 0,
              }}>1</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: step === 1 ? '700' : '500', color: step === 1 ? '#0f172a' : '#64748b' }}>
                Dados da Clínica
              </span>
            </div>
            <div style={{ width: '32px', height: '2px', background: step >= 2 ? '#4040ca' : '#e2e8f0', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: step >= 2 ? '#4040ca' : '#e2e8f0',
                color: step >= 2 ? 'white' : '#64748b',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: '700', flexShrink: 0,
              }}>2</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: step === 2 ? '700' : '500', color: step === 2 ? '#0f172a' : '#64748b' }}>
                Responsável e Acesso
              </span>
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form data-clarity-mask="true" onSubmit={handleRegister}>
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', fontWeight: '800', color: '#0f172a', margin: '0 0 1.25rem' }}>
                  1. Dados da Clínica
                </h2>
                <div className="credenciamento-form-grid">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="portal-form-label">Nome Fantasia da Clínica *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Instituto Odontológico Excelência"
                      value={nomeClinica}
                      onChange={(e) => setNomeClinica(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">CNPJ (opcional para análise)</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Especialidade Principal *</label>
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
                    <label className="portal-form-label">CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Rua / Avenida</label>
                    <input
                      type="text"
                      placeholder="Ex: Rua XV de Novembro"
                      value={rua}
                      onChange={(e) => setRua(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 1450"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Complemento</label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 802"
                      value={complemento}
                      onChange={(e) => setComplemento(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Centro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Cidade *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: São Paulo"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Estado (UF) *</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="portal-form-input"
                    >
                      {UFS.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="credenciamento-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!nomeClinica.trim()) {
                        setError('Informe o nome da clínica.');
                        return;
                      }
                      if (!cidade.trim()) {
                        setError('Informe a cidade da clínica.');
                        return;
                      }
                      setError('');
                      setStep(2);
                    }}
                    className="btn-action btn-action-primary"
                    style={{ padding: '0.875rem 1.75rem', fontSize: '0.9375rem' }}
                  >
                    Avançar para Dados de Acesso →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.25rem)', fontWeight: '800', color: '#0f172a', margin: '0 0 1.25rem' }}>
                  2. Responsável e Conta do Portal
                </h2>
                <div className="credenciamento-form-grid">
                  <div>
                    <label className="portal-form-label">Nome do Responsável *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dr. Roberto Santos"
                      value={nomeResponsavel}
                      onChange={(e) => setNomeResponsavel(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">Cargo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Sócio / Diretor Clínico"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">WhatsApp com DDD *</label>
                    <input
                      type="tel"
                      required
                      placeholder="(11) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      className="portal-form-input"
                    />
                  </div>

                  <div>
                    <label className="portal-form-label">E-mail Corporativo (Login do Portal) *</label>
                    <input
                      type="email"
                      required
                      placeholder="contato@suaclinica.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="portal-form-label">Crie uma Senha para o Portal da Clínica *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', padding: '0.875rem 1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '0.8125rem', color: '#1e40af', lineHeight: '1.5' }}>
                  ℹ️ <strong>Importante:</strong> Na próxima etapa, você precisará anexar os documentos obrigatórios da clínica. Sua conta no portal será liberada após o envio completo dos documentos e a aprovação pela administração da Benavera.
                </div>

                <div className="credenciamento-actions">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-action btn-action-outline"
                    style={{ padding: '0.875rem 1.5rem', fontSize: '0.9375rem' }}
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-action btn-action-primary"
                    style={{ padding: '0.875rem 1.75rem', fontSize: '0.9375rem' }}
                  >
                    {loading ? 'Processando dados...' : 'Avançar para Envio de Documentos →'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
