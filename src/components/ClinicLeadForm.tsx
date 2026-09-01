'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { validatePhone, formatPhone, submitLead, captureUTMParams, trackEvent } from '@/lib/utils';
import type { ClinicLead } from '@/types';

interface FormData {
  nome: string;
  nomeClinica: string;
  whatsapp: string;
  cidade: string;
  especialidade: string;
  aceitaTermos: boolean;
}

const initialForm: FormData = {
  nome: '',
  nomeClinica: '',
  whatsapp: '',
  cidade: '',
  especialidade: '',
  aceitaTermos: false,
};

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
    if (!validatePhone(form.whatsapp)) newErrors.whatsapp = 'Número inválido';
    if (!form.cidade.trim()) newErrors.cidade = 'Campo obrigatório';
    if (!form.especialidade.trim()) newErrors.especialidade = 'Campo obrigatório';
    if (!form.aceitaTermos) newErrors.aceitaTermos = 'Necessário para continuar';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');
    trackEvent({ event: 'lead_b2b' });

    const utms = captureUTMParams();

    const lead: Omit<ClinicLead, 'timestamp'> = {
      origem: 'website',
      tipoLead: 'clinic',
      nome: form.nome.trim(),
      nomeClinica: form.nomeClinica.trim(),
      cargo: '',
      whatsapp: form.whatsapp,
      email: '',
      cidade: form.cidade.trim(),
      estado: '',
      especialidade: form.especialidade.trim(),
      ticketMedio: '',
      orcamentosMes: '',
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

  return (
    <form id="clinic-lead-form" onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

        <div>
          <label className="input-label" htmlFor="clinic-nome">
            Seu nome<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
          </label>
          <input
            id="clinic-nome"
            type="text"
            placeholder="Como você se chama"
            value={form.nome}
            onChange={(e) => updateField('nome', e.target.value)}
            className={`input-field${errors.nome ? ' error' : ''}`}
            autoComplete="name"
            aria-invalid={!!errors.nome}
            aria-describedby={errors.nome ? 'clinic-nome-error' : undefined}
          />
          {errors.nome && (
            <p className="input-error" id="clinic-nome-error" role="alert">{errors.nome}</p>
          )}
        </div>

        <div>
          <label className="input-label" htmlFor="clinic-nomeClinica">
            Nome da clínica<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
          </label>
          <input
            id="clinic-nomeClinica"
            type="text"
            placeholder="Nome da clínica ou grupo"
            value={form.nomeClinica}
            onChange={(e) => updateField('nomeClinica', e.target.value)}
            className={`input-field${errors.nomeClinica ? ' error' : ''}`}
            aria-invalid={!!errors.nomeClinica}
            aria-describedby={errors.nomeClinica ? 'clinic-nomeClinica-error' : undefined}
          />
          {errors.nomeClinica && (
            <p className="input-error" id="clinic-nomeClinica-error" role="alert">{errors.nomeClinica}</p>
          )}
        </div>

        <div>
          <label className="input-label" htmlFor="clinic-whatsapp">
            WhatsApp<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
          </label>
          <input
            id="clinic-whatsapp"
            type="tel"
            placeholder="(11) 99999-9999"
            value={form.whatsapp}
            onChange={(e) => updateField('whatsapp', formatPhone(e.target.value))}
            className={`input-field${errors.whatsapp ? ' error' : ''}`}
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={!!errors.whatsapp}
            aria-describedby={errors.whatsapp ? 'clinic-whatsapp-error' : undefined}
          />
          {errors.whatsapp && (
            <p className="input-error" id="clinic-whatsapp-error" role="alert">{errors.whatsapp}</p>
          )}
        </div>

        <div>
          <label className="input-label" htmlFor="clinic-cidade">
            Cidade<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
          </label>
          <input
            id="clinic-cidade"
            type="text"
            placeholder="Cidade onde fica a clínica"
            value={form.cidade}
            onChange={(e) => updateField('cidade', e.target.value)}
            className={`input-field${errors.cidade ? ' error' : ''}`}
            autoComplete="address-level2"
            aria-invalid={!!errors.cidade}
            aria-describedby={errors.cidade ? 'clinic-cidade-error' : undefined}
          />
          {errors.cidade && (
            <p className="input-error" id="clinic-cidade-error" role="alert">{errors.cidade}</p>
          )}
        </div>

        <div>
          <label className="input-label" htmlFor="clinic-especialidade">
            Especialidade<span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
          </label>
          <input
            id="clinic-especialidade"
            type="text"
            placeholder="Ex: Odontologia, Implantodontia, Oftalmologia"
            value={form.especialidade}
            onChange={(e) => updateField('especialidade', e.target.value)}
            className={`input-field${errors.especialidade ? ' error' : ''}`}
            aria-invalid={!!errors.especialidade}
            aria-describedby={errors.especialidade ? 'clinic-especialidade-error' : undefined}
          />
          {errors.especialidade && (
            <p className="input-error" id="clinic-especialidade-error" role="alert">{errors.especialidade}</p>
          )}
        </div>

        <div style={{ paddingTop: '0.25rem' }}>
          <label className="checkbox-container" htmlFor="clinic-termos">
            <input
              id="clinic-termos"
              type="checkbox"
              checked={form.aceitaTermos}
              onChange={(e) => updateField('aceitaTermos', e.target.checked)}
              className="checkbox-input"
              aria-invalid={!!errors.aceitaTermos}
              aria-describedby={errors.aceitaTermos ? 'clinic-termos-error' : undefined}
            />
            <span style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6' }}>
              Li e concordo com a{' '}
              <Link href="/privacidade" target="_blank" style={{ color: '#4040ca', fontWeight: '600' }}>
                Política de Privacidade
              </Link>
              {' '}e autorizo o uso dos dados para contato.
              <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
            </span>
          </label>
          {errors.aceitaTermos && (
            <p className="input-error" id="clinic-termos-error" role="alert" style={{ marginTop: '0.5rem' }}>
              {errors.aceitaTermos}
            </p>
          )}
        </div>

        <button
          id="submit-clinic-form"
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '1rem',
            fontSize: '1rem',
            marginTop: '0.25rem',
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Enviando...' : (
            <>
              Quero conhecer
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8', margin: 0 }}>
          Sem compromisso. Nossa equipe entra em contato.
        </p>

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
    </form>
  );
}