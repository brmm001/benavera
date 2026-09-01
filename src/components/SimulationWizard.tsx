'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { formatCurrency, validateEmail, validatePhone, formatPhone, submitLead, captureUTMParams, trackEvent } from '@/lib/utils';
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
  aceitaMarketing: boolean;
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
  aceitaMarketing: false,
};

function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

function formatCurrencyField(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const number = parseInt(digits, 10) / 100;
  return formatCurrency(number);
}

export function SimulationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const progress = (step / STEPS.length) * 100;

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleValueInput = useCallback((key: 'valorTratamento' | 'entrada', raw: string) => {
    // Permite digitar livremente — guarda o texto como digitado
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) {
      updateField(key, '');
    } else {
      updateField(key, digits);
    }
  }, [updateField]);

  const handleValueBlur = useCallback((key: 'valorTratamento' | 'entrada') => {
    const raw = key === 'valorTratamento' ? form.valorTratamento : form.entrada;
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return;
    const number = parseInt(digits, 10);
    if (number > 0) {
      updateField(key, formatCurrency(number));
    }
  }, [form.valorTratamento, form.entrada, updateField]);

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!form.tratamento;
      case 2: return form.temOrcamento === false || (form.temOrcamento === true && !!form.valorTratamento);
      case 3: return form.entradaDesconhecida || !!form.entrada;
      case 4: return form.parcelaDesejada !== null || !!form.parcelaCustom;
      case 5: return !!form.cidade;
      case 6: return !!(form.nome && form.whatsapp && form.email && form.aceitaTermos);
      default: return false;
    }
  };

  const validateStep6 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Informe seu nome';
    if (!validatePhone(form.whatsapp)) newErrors.whatsapp = 'Informe um número válido';
    if (!validateEmail(form.email)) newErrors.email = 'Informe um e-mail válido';
    if (!form.aceitaTermos) newErrors.aceitaTermos = 'Necessário para continuar';
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
    trackEvent({ event: 'simulation_step_completed', properties: { step } });
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    trackEvent({ event: 'simulation_completed' });

    const utms = captureUTMParams();
    const valorNum = parseCurrency(form.valorTratamento);
    const entradaNum = parseCurrency(form.entrada);

    const lead: Omit<PatientLead, 'timestamp'> = {
      origem: 'website',
      tipoLead: 'patient',
      nome: form.nome,
      telefone: form.whatsapp,
      email: form.email,
      cidade: form.cidade,
      estado: form.estado,
      tratamento: form.tratamento,
      valorTratamento: valorNum || undefined,
      entrada: form.entradaDesconhecida ? undefined : (entradaNum || undefined),
      parcelaDesejada: form.parcelaDesejada || (parseFloat(form.parcelaCustom) || undefined),
      valorFinanciado: valorNum && entradaNum ? valorNum - entradaNum : undefined,
      aceitaMarketing: form.aceitaMarketing,
      utmSource: utms.utmSource,
      utmMedium: utms.utmMedium,
      utmCampaign: utms.utmCampaign,
      utmContent: utms.utmContent,
      utmTerm: utms.utmTerm,
      landingPage: typeof window !== 'undefined' ? window.location.href : '/simular',
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    };

    const result = await submitLead(lead);

    if (result.success) {
      router.push('/obrigado');
    } else {
      setSubmitError(result.error || 'Ocorreu um erro. Tente novamente.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: '2rem 1.5rem',
    }}>
      {/* Progress */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}>
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
        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          marginTop: '0.5rem',
          fontWeight: '500',
        }}>
          {STEPS[step - 1].title}
        </p>
      </div>

      {/* Step content */}
      <div className="animate-fade-in-up">
        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}>
              Qual tratamento você está planejando?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Escolha a categoria mais próxima.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {TREATMENTS.map((t) => (
                <button
                  key={t}
                  id={`treatment-${t.toLowerCase().replace(/[^a-z]/g, '-')}`}
                  onClick={() => updateField('tratamento', t)}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '12px',
                    border: `1.5px solid ${form.tratamento === t ? '#4040ca' : '#e2e8f0'}`,
                    background: form.tratamento === t ? '#f0f4ff' : 'white',
                    color: form.tratamento === t ? '#2f3181' : '#334155',
                    fontWeight: form.tratamento === t ? '700' : '500',
                    fontSize: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}>
              Você já tem um orçamento em mãos?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Com o valor fica mais fácil estimar as parcelas.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Sim, já tenho', value: true },
                { label: 'Ainda não', value: false },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  id={`has-budget-${opt.value}`}
                  onClick={() => updateField('temOrcamento', opt.value)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '12px',
                    border: `1.5px solid ${form.temOrcamento === opt.value ? '#4040ca' : '#e2e8f0'}`,
                    background: form.temOrcamento === opt.value ? '#f0f4ff' : 'white',
                    color: form.temOrcamento === opt.value ? '#2f3181' : '#334155',
                    fontWeight: form.temOrcamento === opt.value ? '700' : '500',
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.temOrcamento === true && (
              <div>
                <label className="input-label" htmlFor="valor-tratamento">
                  Qual é aproximadamente o valor?
                </label>
                <input
                  id="valor-tratamento"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 8000"
                  value={form.valorTratamento}
                  onChange={(e) => handleValueInput('valorTratamento', e.target.value)}
                  onBlur={() => handleValueBlur('valorTratamento')}
                  className="input-field"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}>
              Quanto você consegue dar de entrada?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              A entrada reduz o valor a parcelar. Não é obrigatória.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label className="input-label" htmlFor="entrada-valor">
                Valor da entrada (opcional)
              </label>
              <input
                id="entrada-valor"
                type="text"
                inputMode="numeric"
                placeholder="Ex: 2000"
                value={form.entrada}
                onChange={(e) => handleValueInput('entrada', e.target.value)}
                onBlur={() => handleValueBlur('entrada')}
                disabled={form.entradaDesconhecida}
                className="input-field"
                style={{ opacity: form.entradaDesconhecida ? 0.5 : 1 }}
              />
            </div>

            <label className="checkbox-container" style={{ cursor: 'pointer' }}>
              <input
                id="entrada-desconhecida"
                type="checkbox"
                checked={form.entradaDesconhecida}
                onChange={(e) => {
                  updateField('entradaDesconhecida', e.target.checked);
                  if (e.target.checked) updateField('entrada', '');
                }}
                className="checkbox-input"
              />
              <span style={{ fontSize: '0.9375rem', color: '#475569' }}>
                Ainda não sei o valor da entrada
              </span>
            </label>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}>
              Quanto você quer pagar por mês?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Pense no valor que caberia no seu orçamento mensal sem apertar.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}>
              {INSTALLMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  id={`installment-${opt.value}`}
                  onClick={() => {
                    updateField('parcelaDesejada', opt.value);
                    updateField('parcelaCustom', '');
                  }}
                  style={{
                    padding: '0.875rem 0.5rem',
                    borderRadius: '12px',
                    border: `1.5px solid ${form.parcelaDesejada === opt.value ? '#4040ca' : '#e2e8f0'}`,
                    background: form.parcelaDesejada === opt.value ? '#f0f4ff' : 'white',
                    color: form.parcelaDesejada === opt.value ? '#2f3181' : '#334155',
                    fontWeight: form.parcelaDesejada === opt.value ? '700' : '600',
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="input-label" htmlFor="parcela-custom">
                Outro valor
              </label>
              <input
                id="parcela-custom"
                type="text"
                inputMode="numeric"
                placeholder="R$ 0"
                value={form.parcelaCustom}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '');
                  updateField('parcelaCustom', digits);
                  updateField('parcelaDesejada', null);
                }}
                onBlur={() => {
                  const digits = form.parcelaCustom.replace(/[^0-9]/g, '');
                  if (!digits) return;
                  const num = parseInt(digits, 10);
                  if (num > 0) {
                    updateField('parcelaCustom', formatCurrency(num));
                  }
                }}
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
            }}>
              Em qual cidade você pretende realizar o tratamento?
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Essa informação ajuda a organizar melhor sua solicitação.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label" htmlFor="cidade">Cidade</label>
                <input
                  id="cidade"
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={form.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="input-label" htmlFor="estado">Estado (opcional)</label>
                <select
                  id="estado"
                  value={form.estado}
                  onChange={(e) => updateField('estado', e.target.value)}
                  className="select-field"
                >
                  <option value="">Selecione o estado</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
                    'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 */}
        {step === 6 && (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '0.375rem',
              letterSpacing: '-0.02em',
            }}>
              Precisamos de algumas informações para continuar.
            </h2>
            <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '1.75rem' }}>
              Seus dados são usados apenas para processar sua solicitação.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="input-label" htmlFor="nome">Nome</label>
                <input
                  id="nome"
                  type="text"
                  placeholder="Seu nome"
                  value={form.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  className={`input-field${errors.nome ? ' error' : ''}`}
                  autoComplete="name"
                  autoFocus
                />
                {errors.nome && <p className="input-error">{errors.nome}</p>}
              </div>

              <div>
                <label className="input-label" htmlFor="whatsapp">WhatsApp</label>
                <input
                  id="whatsapp"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => updateField('whatsapp', formatPhone(e.target.value))}
                  className={`input-field${errors.whatsapp ? ' error' : ''}`}
                  autoComplete="tel"
                  inputMode="tel"
                />
                {errors.whatsapp && <p className="input-error">{errors.whatsapp}</p>}
              </div>

              <div>
                <label className="input-label" htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`input-field${errors.email ? ' error' : ''}`}
                  autoComplete="email"
                  inputMode="email"
                />
                {errors.email && <p className="input-error">{errors.email}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <label className="checkbox-container" htmlFor="termos">
                <input
                  id="termos"
                  type="checkbox"
                  checked={form.aceitaTermos}
                  onChange={(e) => updateField('aceitaTermos', e.target.checked)}
                  className="checkbox-input"
                />
                <span style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.5' }}>
                  Li e concordo com a{' '}
                  <Link href="/privacidade" target="_blank" style={{ color: '#4040ca' }}>
                    Política de Privacidade
                  </Link>{' '}
                  e autorizo o tratamento dos dados necessários para processar minha solicitação.
                  <span style={{ color: '#ef4444' }}> *</span>
                </span>
              </label>
              {errors.aceitaTermos && <p className="input-error">{errors.aceitaTermos}</p>}

              <label className="checkbox-container" htmlFor="marketing">
                <input
                  id="marketing"
                  type="checkbox"
                  checked={form.aceitaMarketing}
                  onChange={(e) => updateField('aceitaMarketing', e.target.checked)}
                  className="checkbox-input"
                />
                <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                  Aceito receber conteúdos e novidades da Benavera.
                </span>
              </label>
            </div>

            <FinancialDisclaimer compact />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginTop: '2.5rem',
        flexDirection: step === 6 ? 'column' : 'row',
      }}>
        {step > 1 && (
          <button
            onClick={handleBack}
            className="btn-ghost"
            style={{ flex: step === 6 ? 'none' : '0 0 auto' }}
            disabled={submitting}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        )}

        <button
          id={step === 6 ? 'submit-simulation' : `step-${step}-next`}
          onClick={handleNext}
          disabled={!canProceed() || submitting}
          className="btn-primary"
          style={{
            flex: 1,
            opacity: !canProceed() ? 0.5 : 1,
            cursor: !canProceed() ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Enviando...' : step === 6 ? 'Concluir simulação' : 'Continuar'}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </div>

      {submitError && (
        <p style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          fontSize: '0.875rem',
          color: '#dc2626',
        }}>
          {submitError}
        </p>
      )}
    </div>
  );
}
