'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { validateEmail, validatePhone, formatPhone, submitLead, captureUTMParams, trackEvent } from '@/lib/utils';
import type { ClinicLead } from '@/types';

interface FormData {
  nome: string;
  nomeClinica: string;
  cargo: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  especialidade: string;
  numeroUnidades: string;
  ticketMedio: string;
  orcamentosMes: string;
  maiorDesafio: string;
  aceitaTermos: boolean;
}

const initialForm: FormData = {
  nome: '',
  nomeClinica: '',
  cargo: '',
  whatsapp: '',
  email: '',
  cidade: '',
  estado: '',
  especialidade: '',
  numeroUnidades: '',
  ticketMedio: '',
  orcamentosMes: '',
  maiorDesafio: '',
  aceitaTermos: false,
};

const TICKET_OPTIONS = [
  'Até R$ 1.000',
  'R$ 1.000 – R$ 3.000',
  'R$ 3.000 – R$ 10.000',
  'R$ 10.000 – R$ 30.000',
  'Acima de R$ 30.000',
];

const ORCAMENTO_OPTIONS = [
  'Até 30',
  '31 – 100',
  '101 – 300',
  '301 – 1.000',
  'Mais de 1.000',
];

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function ClinicLeadForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Campo obrigatório';
    if (!form.nomeClinica.trim()) newErrors.nomeClinica = 'Campo obrigatório';
    if (!form.cargo.trim()) newErrors.cargo = 'Campo obrigatório';
    if (!validatePhone(form.whatsapp)) newErrors.whatsapp = 'Informe um número válido';
    if (!validateEmail(form.email)) newErrors.email = 'Informe um e-mail válido';
    if (!form.cidade.trim()) newErrors.cidade = 'Campo obrigatório';
    if (!form.especialidade.trim()) newErrors.especialidade = 'Campo obrigatório';
    if (!form.ticketMedio) newErrors.ticketMedio = 'Selecione uma opção';
    if (!form.orcamentosMes) newErrors.orcamentosMes = 'Selecione uma opção';
    if (!form.aceitaTermos) newErrors.aceitaTermos = 'Necessário para continuar';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector('.input-error');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    trackEvent({ event: 'clinic_form_completed' });

    const utms = captureUTMParams();

    const lead: Omit<ClinicLead, 'timestamp'> = {
      origem: 'website',
      tipoLead: 'clinic',
      nome: form.nome.trim(),
      nomeClinica: form.nomeClinica.trim(),
      cargo: form.cargo.trim(),
      whatsapp: form.whatsapp,
      email: form.email.trim().toLowerCase(),
      cidade: form.cidade.trim(),
      estado: form.estado,
      especialidade: form.especialidade.trim(),
      numeroUnidades: form.numeroUnidades || undefined,
      ticketMedio: form.ticketMedio,
      orcamentosMes: form.orcamentosMes,
      maiorDesafio: form.maiorDesafio.trim() || undefined,
      utmSource: utms.utmSource,
      utmMedium: utms.utmMedium,
      utmCampaign: utms.utmCampaign,
      landingPage: typeof window !== 'undefined' ? window.location.href : '/clinicas',
    };

    const result = await submitLead(lead);

    if (result.success) {
      router.push('/obrigado-clinica');
    } else {
      setSubmitError(result.error || 'Ocorreu um erro. Tente novamente.');
      setSubmitting(false);
    }
  };

  const inputGroup = (
    id: keyof FormData,
    label: string,
    inputProps: React.InputHTMLAttributes<HTMLInputElement>,
    required = true
  ) => (
    <div>
      <label className="input-label" htmlFor={id}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
      </label>
      <input
        id={id}
        {...inputProps}
        value={form[id] as string}
        onChange={(e) => updateField(id, e.target.value as FormData[keyof FormData])}
        className={`input-field${errors[id] ? ' error' : ''}`}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `${id}-error` : undefined}
      />
      {errors[id] && (
        <p className="input-error" id={`${id}-error`} role="alert">
          {errors[id]}
        </p>
      )}
    </div>
  );

  return (
    <form id="clinic-lead-form" onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Dados pessoais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {inputGroup('nome', 'Nome', { type: 'text', placeholder: 'Seu nome', autoComplete: 'name' })}
          {inputGroup('cargo', 'Cargo', { type: 'text', placeholder: 'Ex: Gestor, Dentista, Sócio' })}
        </div>

        {inputGroup('nomeClinica', 'Nome da clínica', { type: 'text', placeholder: 'Nome da clínica ou grupo' })}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="input-label" htmlFor="whatsapp">
              WhatsApp<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            </label>
            <input
              id="whatsapp"
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.whatsapp}
              onChange={(e) => updateField('whatsapp', formatPhone(e.target.value))}
              className={`input-field${errors.whatsapp ? ' error' : ''}`}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={!!errors.whatsapp}
              aria-describedby={errors.whatsapp ? 'whatsapp-error' : undefined}
            />
            {errors.whatsapp && (
              <p className="input-error" id="whatsapp-error" role="alert">{errors.whatsapp}</p>
            )}
          </div>
          <div>
            <label className="input-label" htmlFor="email">
              E-mail<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={`input-field${errors.email ? ' error' : ''}`}
              inputMode="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p className="input-error" id="email-error" role="alert">{errors.email}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {inputGroup('cidade', 'Cidade', { type: 'text', placeholder: 'Cidade da clínica', autoComplete: 'address-level2' })}
          <div>
            <label className="input-label" htmlFor="estado">Estado</label>
            <select
              id="estado"
              value={form.estado}
              onChange={(e) => updateField('estado', e.target.value)}
              className="select-field"
            >
              <option value="">Selecione</option>
              {ESTADOS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>

        {inputGroup('especialidade', 'Especialidade principal', {
          type: 'text',
          placeholder: 'Ex: Odontologia, Implantodontia, Estética',
        })}

        <div>
          <label className="input-label" htmlFor="numeroUnidades">
            Número aproximado de unidades <span style={{ fontWeight: '400', color: '#94a3b8' }}>(opcional)</span>
          </label>
          <input
            id="numeroUnidades"
            type="text"
            placeholder="Ex: 1, 3, mais de 10"
            value={form.numeroUnidades}
            onChange={(e) => updateField('numeroUnidades', e.target.value)}
            className="input-field"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="input-label" htmlFor="ticketMedio">
              Ticket médio dos tratamentos<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            </label>
            <select
              id="ticketMedio"
              value={form.ticketMedio}
              onChange={(e) => updateField('ticketMedio', e.target.value)}
              className={`select-field${errors.ticketMedio ? ' error' : ''}`}
              aria-invalid={!!errors.ticketMedio}
              aria-describedby={errors.ticketMedio ? 'ticketMedio-error' : undefined}
            >
              <option value="">Selecione</option>
              {TICKET_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.ticketMedio && (
              <p className="input-error" id="ticketMedio-error" role="alert">{errors.ticketMedio}</p>
            )}
          </div>
          <div>
            <label className="input-label" htmlFor="orcamentosMes">
              Orçamentos por mês<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            </label>
            <select
              id="orcamentosMes"
              value={form.orcamentosMes}
              onChange={(e) => updateField('orcamentosMes', e.target.value)}
              className={`select-field${errors.orcamentosMes ? ' error' : ''}`}
              aria-invalid={!!errors.orcamentosMes}
              aria-describedby={errors.orcamentosMes ? 'orcamentosMes-error' : undefined}
            >
              <option value="">Selecione</option>
              {ORCAMENTO_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {errors.orcamentosMes && (
              <p className="input-error" id="orcamentosMes-error" role="alert">{errors.orcamentosMes}</p>
            )}
          </div>
        </div>

        <div>
          <label className="input-label" htmlFor="maiorDesafio">
            Qual é o maior desafio relacionado às formas de pagamento?{' '}
            <span style={{ fontWeight: '400', color: '#94a3b8' }}>(opcional)</span>
          </label>
          <textarea
            id="maiorDesafio"
            value={form.maiorDesafio}
            onChange={(e) => updateField('maiorDesafio', e.target.value)}
            placeholder="Descreva o principal obstáculo que vocês enfrentam..."
            rows={3}
            className="textarea-field"
          />
        </div>

        {/* Consent */}
        <div>
          <label className="checkbox-container" htmlFor="clinica-termos">
            <input
              id="clinica-termos"
              type="checkbox"
              checked={form.aceitaTermos}
              onChange={(e) => updateField('aceitaTermos', e.target.checked)}
              className="checkbox-input"
              aria-invalid={!!errors.aceitaTermos}
              aria-describedby={errors.aceitaTermos ? 'termos-error' : undefined}
            />
            <span style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6' }}>
              Li e concordo com a{' '}
              <Link href="/privacidade" target="_blank" style={{ color: '#4040ca', fontWeight: '600' }}>
                Política de Privacidade
              </Link>{' '}
              e autorizo o uso dos dados para contato sobre o piloto Benavera.
              <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            </span>
          </label>
          {errors.aceitaTermos && (
            <p className="input-error" id="termos-error" role="alert" style={{ marginTop: '0.5rem' }}>
              {errors.aceitaTermos}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          id="submit-clinic-form"
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '1rem',
            fontSize: '1.0625rem',
            marginTop: '0.25rem',
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? (
            <>
              <span style={{ display: 'inline-block', animation: 'pulse 1.5s ease infinite' }}>
                Enviando...
              </span>
            </>
          ) : (
            <>
              Quero participar do piloto
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Success indicator after submit */}
        {!submitting && !submitError && (
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>
            <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: '#309e92' }} />
            Seus dados são tratados com sigilo. Sem spam.
          </p>
        )}

        {submitError && (
          <div style={{
            padding: '1rem 1.25rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            fontSize: '0.875rem',
            color: '#dc2626',
            lineHeight: '1.6',
          }}>
            {submitError}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </form>
  );
}
