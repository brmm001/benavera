'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, ShieldCheck, CheckCircle2, ArrowRight, Zap, DollarSign, Users, Award, Lock, Phone, Mail
} from 'lucide-react';

const especialidades = [
  'Odontologia & Implantes',
  'Cirurgia Plástica & Estética',
  'Oftalmologia & Cirurgias Oculares',
  'Ortopedia & Reabilitação',
  'Dermatologia & Procedimentos',
  'Outra Especialidade'
];

export default function CredenciamentoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [nomeClinica, setNomeClinica] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [especialidade, setEspecialidade] = useState(especialidades[0]);
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('SP');

  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [cargo, setCargo] = useState('Diretor / Sócio');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [volumeMensal, setVolumeMensal] = useState('R$ 50 mil a R$ 150 mil');
  const [ticketMedio, setTicketMedio] = useState('R$ 3.000 a R$ 8.000');

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
          cidade,
          estado,
          nomeResponsavel,
          cargo,
          whatsapp,
          email,
          password,
          volumeMensal,
          ticketMedio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar credenciamento.');
      }

      // Redireciona para login do portal ou dashboard com sucesso
      router.push('/portal/login?registered=1');
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '3rem 1rem 5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', color: '#3b82f6', padding: '0.375rem 1rem', borderRadius: '20px', fontSize: '0.8125rem', fontWeight: '700', marginBottom: '1rem' }}>
            <Award size={14} /> Credenciamento de Clínicas Parceiras
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Credencie sua clínica na Benavera
          </h1>
          <p style={{ fontSize: '1.0625rem', color: '#64748b', maxWidth: '580px', margin: '0 auto' }}>
            Aumente o fechamento de tratamentos de alto valor com parcelamento em até 36x e repasse garantido em D+1.
          </p>
        </div>

        {/* Benefits bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <Zap size={20} color="#4f46e5" style={{ margin: '0 auto 0.25rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f172a' }}>Repasse D+1</div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Sem risco de inadimplência</div>
          </div>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <DollarSign size={20} color="#10b981" style={{ margin: '0 auto 0.25rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f172a' }}>Até 36x</div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Parcelas que cabem no bolso</div>
          </div>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <Users size={20} color="#3b82f6" style={{ margin: '0 auto 0.25rem' }} />
            <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#0f172a' }}>Portal & CRM</div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Gestão completa de propostas</div>
          </div>
        </div>

        {/* Form Container */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '2.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {error && (
            <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '1.5rem' }}>
                  1. Dados da Clínica
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
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
                      onChange={(e) => setCnpj(e.target.value)}
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
                    <label className="portal-form-label">Estado *</label>
                    <input
                      type="text"
                      required
                      placeholder="SP"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!nomeClinica.trim()) {
                        setError('Informe o nome da clínica.');
                        return;
                      }
                      setError('');
                      setStep(2);
                    }}
                    className="btn-action btn-action-primary"
                    style={{ padding: '0.875rem 2rem' }}
                  >
                    Avançar para Dados de Acesso →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '1.5rem' }}>
                  2. Responsável e Conta do Portal
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
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
                      onChange={(e) => setWhatsapp(e.target.value)}
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
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="portal-form-input"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-action btn-action-outline"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-action btn-action-primary"
                    style={{ padding: '0.875rem 2rem' }}
                  >
                    {loading ? 'Credenciando Clínica...' : '🚀 Concluir Credenciamento'}
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
