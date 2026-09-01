'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import {
  formatCurrency,
  validateEmail,
  validatePhone,
  formatPhone,
  submitLead,
  captureUTMParams,
} from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';
import type { PatientLead } from '@/types';

const STEPS = [
  { id: 1, title: 'Tipo de tratamento' },
  { id: 2, title: 'Valor do tratamento' },
  { id: 3, title: 'Entrada' },
  { id: 4, title: 'Parcela desejada' },
  { id: 5, title: 'Sua cidade' },
  { id: 6, title: 'Seus dados' },
];

const TREATMENTS = [
  'Odontologia',
  'Implantes e próteses',
  'Oftalmologia',
  'Cirurgia / procedimento',
  'Estética',
  'Outro',
];

const INSTALLMENT_OPTIONS = [
  { label: 'R$ 200', value: 200 },
  { label: 'R$ 300', value: 300 },
  { label: 'R$ 500', value: 500 },
  { label: 'R$ 750', value: 750 },
  { label: 'R$ 1.000', value: 1000 },
];

interface FormData {
  tratamento: string;
  temOrcamento: boolean | null;
  valorTratamento: string;
  entrada: string;
  entradaDesconhecida: boolean;
  parcelaDesejada: number | null;
  parcelaCustom: string;
  cidade: string;
  estado: string;
  nome: string;
  whatsapp: string;
  email: string;
  aceitaTermos: boolean;
  _hp_company: string;
}

const initialForm: FormData = {
  tratamento: '',
  temOrcamento: null,
  valorTratamento: '',
  entrada: '',
  entradaDesconhecida: false,
  parcelaDesejada: null,
  parcelaCustom: '',
  cidade: '',
  estado: '',
  nome: '',
  whatsapp: '',
  email: '',
  aceitaTermos: false,
  _hp_company: '',
};

function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

export function SimulationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const progress = (step / STEPS.length) * 100;

  useEffect(() => {
    trackEvent({ event: 'simulation_started' });
  }, []);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleValueBlur = useCallback(
    (key: 'valorTratamento' | 'entrada') => {
      const raw = key === 'valorTratamento' ? form.valorTratamento : form.entrada;
      const digits = raw.replace(/[^0-9]/g, '');
      if (!digits) return;
      const number = parseInt(digits, 10);
      if (number > 0) {
        updateField(key, formatCurrency(number));
      }
    },
    [form.valorTratamento, form.entrada, updateField]
  );

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!form.tratamento;
      case 2:
        return (
          form.temOrcamento === false ||
          (form.temOrcamento === true && !!form.valorTratamento)
        );
      case 3:
        return form.entradaDesconhecida || !!form.entrada;
      case 4:
        return form.parcelaDesejada !== null || !!form.parcelaCustom;
      case 5:
        return !!form.cidade;
      case 6:
        return !!(form.nome && form.whatsapp && form.aceitaTermos);
      default:
        return false;
    }
  };

  const validateStep6 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Informe seu nome';
    if (!validatePhone(form.whatsapp)) newErrors.whatsapp = 'Informe um número de telefone válido';
    if (form.email && !validateEmail(form.email)) newErrors.email = 'Informe um e-mail válido';
    if (!form.aceitaTermos) newErrors.aceitaTermos = 'É necessário concordar com os termos para prosseguir';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 6) {
      if (!validateStep6()) return;
      handleSubmit();
      return;
    }
    if (!canProceed()) return;

    trackEvent({
      event: 'simulation_step_completed',
      properties: {
        etapa: step,
        categoria: form.tratamento || undefined,
      },
    });

    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');

    const utms = captureUTMParams();
    const valorNum = parseCurrency(form.valorTratamento);
    const entradaNum = parseCurrency(form.entrada);

    const lead: Omit<PatientLead, 'timestamp'> & { _hp_company?: string } = {
      origem: 'site_simulador',
      tipoLead: 'patient',
      nome: form.nome.trim(),
      telefone: form.whatsapp,
      email: form.email.trim() || undefined,
      cidade: form.cidade.trim(),
      estado: form.estado || undefined,
      tratamento: form.tratamento,
      valorTratamento: valorNum || undefined,
      entrada: form.entradaDesconhecida ? 0 : entradaNum || 0,
      parcelaDesejada: form.parcelaDesejada || parseCurrency(form.parcelaCustom) || undefined,
      consentimento: form.aceitaTermos,
      versaoTermos: 'v1.0',
      utmSource: utms.utmSource,
      utmMedium: utms.utmMedium,
      utmCampaign: utms.utmCampaign,
      utmContent: utms.utmContent,
      utmTerm: utms.utmTerm,
      landingPage: typeof window !== 'undefined' ? window.location.pathname : '/simular',
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      _hp_company: form._hp_company,
    };

    const result = await submitLead(lead);

    if (result.success) {
      trackEvent({
        event: 'simulation_submitted',
        properties: {
          categoria: form.tratamento,
          cidade: form.cidade,
        },
      });
      router.push('/obrigado');
    } else {
      setSubmitError(result.error || 'Ocorreu um erro ao enviar sua simulação. Seus dados estão salvos, tente novamente.');
      setSubmitting(false);
    }
  };

  return (
    <div
      data-clarity-mask="true"
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
      }}
    >
      {/* Honeypot invisível para bots */}
      <input
        type="text"
        name="_hp_company"
        value={form._hp_company}
        onChange={(e) => updateField('_hp_company', e.target.value)}
        style={{ display: 'none', position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
      />

      {/* Barra de Progresso */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Etapa {step} de {STEPS.length}
          </span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4040ca' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#64748b',
            marginTop: '0.5rem',
            fontWeight: '500',
          }}
        >
          {STEPS[step - 1].title}
        </p>
      </div>

      {/* Conteúdo da Etapa */}
      <div className="animate-fade-in-up">
        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Qual tratamento você está planejando?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Escolha a categoria mais próxima do seu procedimento.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {TREATMENTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  id={`treatment-${t.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => updateField('tratamento', t)}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    border: `1.5px solid ${form.tratamento === t ? '#4040ca' : '#e2e8f0'}`,
                    background: form.tratamento === t ? '#f0f4ff' : 'white',
                    color: form.tratamento === t ? '#4040ca' : '#0f172a',
                    fontWeight: form.tratamento === t ? '600' : '500',
                    fontSize: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t}
                  {form.tratamento === t && <CheckCircle2 size={18} style={{ color: '#4040ca' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Você já tem um orçamento em mãos?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Se tiver o valor exato, informe abaixo. Se não tiver, podemos estimar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => updateField('temOrcamento', true)}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '10px',
                    border: `1.5px solid ${form.temOrcamento === true ? '#4040ca' : '#e2e8f0'}`,
                    background: form.temOrcamento === true ? '#f0f4ff' : 'white',
                    color: form.temOrcamento === true ? '#4040ca' : '#0f172a',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                >
                  Sim, tenho o valor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateField('temOrcamento', false);
                    updateField('valorTratamento', '');
                  }}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '10px',
                    border: `1.5px solid ${form.temOrcamento === false ? '#4040ca' : '#e2e8f0'}`,
                    background: form.temOrcamento === false ? '#f0f4ff' : 'white',
                    color: form.temOrcamento === false ? '#4040ca' : '#0f172a',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                >
                  Ainda não tenho
                </button>
              </div>

              {form.temOrcamento === true && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label className="input-label" htmlFor="wizard-valor">
                    Valor total aproximado
                  </label>
                  <input
                    id="wizard-valor"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: R$ 8.000"
                    value={form.valorTratamento}
                    onChange={(e) => updateField('valorTratamento', e.target.value)}
                    onBlur={() => handleValueBlur('valorTratamento')}
                    className="input-field"
                    autoFocus
                  />
                </div>
              )}

              {form.temOrcamento === false && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1rem',
                    fontSize: '0.875rem',
                    color: '#64748b',
                  }}
                >
                  Sem problemas. Faremos uma simulação com base na média habitual para {form.tratamento || 'este procedimento'}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Quanto você consegue dar de entrada?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Uma entrada maior reduz as parcelas, mas não é obrigatória em todos os casos.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!form.entradaDesconhecida && (
                <div>
                  <label className="input-label" htmlFor="wizard-entrada">
                    Valor de entrada
                  </label>
                  <input
                    id="wizard-entrada"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: R$ 2.000"
                    value={form.entrada}
                    onChange={(e) => updateField('entrada', e.target.value)}
                    onBlur={() => handleValueBlur('entrada')}
                    className="input-field"
                  />
                </div>
              )}

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9375rem',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.entradaDesconhecida}
                  onChange={(e) => {
                    updateField('entradaDesconhecida', e.target.checked);
                    if (e.target.checked) updateField('entrada', '');
                  }}
                />
                Prefiro simular sem entrada no momento
              </label>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Quanto você quer pagar por mês?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Selecione o valor máximo que cabe confortavelmente na sua renda mensal.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {INSTALLMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    updateField('parcelaDesejada', opt.value);
                    updateField('parcelaCustom', '');
                  }}
                  style={{
                    padding: '0.875rem 0.5rem',
                    borderRadius: '10px',
                    border: `1.5px solid ${form.parcelaDesejada === opt.value ? '#4040ca' : '#e2e8f0'}`,
                    background: form.parcelaDesejada === opt.value ? '#f0f4ff' : 'white',
                    color: form.parcelaDesejada === opt.value ? '#4040ca' : '#0f172a',
                    fontWeight: '600',
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                >
                  Até {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="input-label" htmlFor="wizard-parcela-custom">
                Ou digite outro valor mensal
              </label>
              <input
                id="wizard-parcela-custom"
                type="text"
                inputMode="numeric"
                placeholder="Ex: R$ 450"
                value={form.parcelaCustom}
                onChange={(e) => {
                  updateField('parcelaCustom', e.target.value);
                  updateField('parcelaDesejada', null);
                }}
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Em qual cidade você fará o tratamento?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Usamos sua localização para identificar parceiros disponíveis na sua região.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label" htmlFor="wizard-cidade">
                  Cidade
                </label>
                <input
                  id="wizard-cidade"
                  type="text"
                  placeholder="Ex: São Paulo, Belo Horizonte, Curitiba"
                  value={form.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  className="input-field"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 */}
        {step === 6 && (
          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Precisamos de algumas informações para continuar
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Informe seus dados para receber o resultado da simulação.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label" htmlFor="wizard-nome">
                  Seu nome completo<span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="wizard-nome"
                  type="text"
                  placeholder="Como devemos te chamar"
                  value={form.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  className={`input-field${errors.nome ? ' error' : ''}`}
                />
                {errors.nome && <p className="input-error">{errors.nome}</p>}
              </div>

              <div>
                <label className="input-label" htmlFor="wizard-whatsapp">
                  WhatsApp com DDD<span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="wizard-whatsapp"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => updateField('whatsapp', formatPhone(e.target.value))}
                  className={`input-field${errors.whatsapp ? ' error' : ''}`}
                />
                {errors.whatsapp && <p className="input-error">{errors.whatsapp}</p>}
              </div>

              <div>
                <label className="input-label" htmlFor="wizard-email">
                  E-mail (opcional)
                </label>
                <input
                  id="wizard-email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`input-field${errors.email ? ' error' : ''}`}
                />
                {errors.email && <p className="input-error">{errors.email}</p>}
              </div>

              {/* Consentimento LGPD */}
              <div style={{ paddingTop: '0.5rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem',
                    fontSize: '0.875rem',
                    color: '#475569',
                    lineHeight: '1.6',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.aceitaTermos}
                    onChange={(e) => updateField('aceitaTermos', e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    Concordo com os{' '}
                    <Link
                      href="/termos"
                      target="_blank"
                      style={{ color: '#4040ca', fontWeight: '600' }}
                    >
                      Termos de Uso
                    </Link>{' '}
                    e com a{' '}
                    <Link
                      href="/privacidade"
                      target="_blank"
                      style={{ color: '#4040ca', fontWeight: '600' }}
                    >
                      Política de Privacidade
                    </Link>{' '}
                    para fins de simulação e contato.
                    <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                </label>
                {errors.aceitaTermos && <p className="input-error">{errors.aceitaTermos}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Erro Geral */}
      {submitError && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#dc2626',
            fontSize: '0.875rem',
          }}
        >
          {submitError}
        </div>
      )}

      {/* Controles de Navegação */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #f1f5f9',
        }}
      >
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="btn-ghost"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          id="wizard-next-btn"
          onClick={handleNext}
          disabled={!canProceed() || submitting}
          className="btn-primary"
          style={{
            opacity: !canProceed() || submitting ? 0.6 : 1,
            cursor: !canProceed() || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? (
            'Enviando simulação...'
          ) : step === 6 ? (
            <>
              Ver alternativas
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              Avançar
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <FinancialDisclaimer compact />
      </div>
    </div>
  );
}
