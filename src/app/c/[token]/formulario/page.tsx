'use client';
// app/c/[token]/formulario/page.tsx — Wizard multi-etapas de credenciamento (PJ e PF)

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { OnboardingDocument, PersonType } from '@/lib/benavera-db';

type StepKey = 'dados' | 'responsavel' | 'tecnico' | 'bancario' | 'documentos' | 'declaracoes' | 'revisao';

interface StepDef {
  key: StepKey;
  title: string;
  icon: string;
}

const STEPS_PJ: StepDef[] = [
  { key: 'dados', title: 'Dados da clínica', icon: '🏥' },
  { key: 'responsavel', title: 'Responsável legal', icon: '👤' },
  { key: 'tecnico', title: 'Resp. técnico', icon: '🩺' },
  { key: 'bancario', title: 'Dados bancários', icon: '🏦' },
  { key: 'documentos', title: 'Documentos', icon: '📄' },
  { key: 'declaracoes', title: 'Declarações', icon: '✍️' },
  { key: 'revisao', title: 'Revisão', icon: '✅' },
];

const STEPS_PF: StepDef[] = [
  { key: 'dados', title: 'Dados do profissional', icon: '👤' },
  { key: 'tecnico', title: 'Registro profissional', icon: '🩺' },
  { key: 'bancario', title: 'Dados bancários', icon: '🏦' },
  { key: 'documentos', title: 'Documentos', icon: '📄' },
  { key: 'declaracoes', title: 'Declarações', icon: '✍️' },
  { key: 'revisao', title: 'Revisão', icon: '✅' },
];

function getDeclarations(isPF: boolean) {
  return [
    { id: 'declaration_1_veracidade', text: 'Declaro que todas as informações fornecidas são verdadeiras e corretas, e me responsabilizo por qualquer inexatidão.' },
    { id: 'declaration_2_autenticidade', text: 'Declaro que todos os documentos enviados são autênticos, válidos e não foram adulterados.' },
    {
      id: 'declaration_3_representacao',
      text: isPF
        ? 'Declaro que atuo em nome próprio como profissional autônomo e possuo plena capacidade legal para firmar este credenciamento.'
        : 'Declaro que tenho poderes legais para representar a clínica e assinar documentos em seu nome.',
    },
    {
      id: 'declaration_4_regularidade',
      text: isPF
        ? 'Declaro estar em plena atividade profissional e regular perante meu conselho de classe, sem impedimentos legais.'
        : 'Declaro que a clínica está regularmente constituída e em plena atividade, sem impedimentos legais.',
    },
    {
      id: 'declaration_5_alteracoes',
      text: isPF
        ? 'Comprometo-me a informar qualquer alteração nos dados cadastrais, profissionais ou bancários em até 30 dias.'
        : 'Comprometo-me a informar qualquer alteração nos dados cadastrais, societários ou bancários em até 30 dias.',
    },
    { id: 'declaration_6_no_ficticio', text: 'Declaro que as operações realizadas com os recursos da Benavera não serão fictícias ou simuladas.' },
    { id: 'declaration_7_no_inexistentes', text: 'Declaro que não utilizarei os recursos para financiar serviços inexistentes, superfaturados ou já realizados.' },
    { id: 'declaration_8_no_inflacao', text: 'Declaro que não haverá inflação de valores, duplicidade de cobranças ou qualquer forma de fraude.' },
    {
      id: 'declaration_9_no_cpf_terceiros',
      text: isPF
        ? 'Declaro que não utilizarei CPF de terceiros, laranjas ou pessoas sem vínculo real com o atendimento.'
        : 'Declaro que não utilizarei CPF de terceiros, laranjas ou pessoas sem vínculo real com a clínica.',
    },
    { id: 'declaration_10_no_simulacao', text: 'Declaro que as operações refletem transações reais com pacientes legítimos.' },
    { id: 'declaration_11_no_contornar', text: 'Declaro que não tentarei burlar regras, limites operacionais ou políticas da Benavera por meios diretos ou indiretos.' },
    { id: 'declaration_12_credito_parceiro', text: 'Estou ciente de que o crédito é concedido pelo parceiro financeiro, e não pela Benavera.' },
    { id: 'declaration_13_aprovacao_nao_garantida', text: 'Estou ciente de que a aprovação do credenciamento não garante a concessão de crédito, que depende de análise independente.' },
    {
      id: 'privacy_policy',
      text: isPF
        ? 'Li e concordo com a Política de Privacidade da Benavera e autorizo o tratamento dos meus dados para as finalidades do credenciamento.'
        : 'Li e concordo com a Política de Privacidade da Benavera e autorizo o tratamento dos dados da clínica para as finalidades do credenciamento.',
    },
  ];
}

function formatCpfMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatCpfOrCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length <= 11 ? formatCpfMask(digits) : formatCnpjMask(digits);
}

type FormData = Record<string, string | boolean | null>;
type Documents = Array<OnboardingDocument & { uploadProgress?: number; uploading?: boolean; uploadError?: string }>;

interface FormContextType {
  formData: FormData;
  updateField: (field: string, value: string | boolean | null) => void;
}

const FormContext = createContext<FormContextType>({
  formData: {},
  updateField: () => {},
});

const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '0 20px' }}>{children}</div>
);

const InputField = ({ label, field, type = 'text', required = false, placeholder = '' }: {
  label: string; field: string; type?: string; required?: boolean; placeholder?: string;
}) => {
  const { formData, updateField } = useContext(FormContext);
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#7c93b5', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <input
        type={type}
        value={String(formData[field] ?? '')}
        onChange={e => updateField(field, e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        onFocus={e => e.target.style.borderColor = '#6370f1'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
      />
    </div>
  );
};

const SelectField = ({ label, field, options, required = false }: {
  label: string; field: string; options: Array<{ value: string; label: string }>; required?: boolean;
}) => {
  const { formData, updateField } = useContext(FormContext);
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#7c93b5', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <select
        value={String(formData[field] ?? '')}
        onChange={e => updateField(field, e.target.value)}
        style={{ width: '100%', padding: '12px 14px', background: 'rgba(20,20,50,0.8)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
        <option value="">Selecione…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const UF_OPTIONS = UFS.map(uf => ({ value: uf, label: uf }));

const COUNCIL_OPTIONS = [
  { value: 'CRO', label: 'CRO — Odontologia' },
  { value: 'CRM', label: 'CRM — Medicina' },
  { value: 'CRBM', label: 'CRBM — Biomedicina' },
  { value: 'CRP', label: 'CRP — Psicologia' },
  { value: 'CREFITO', label: 'CREFITO — Fisioterapia' },
  { value: 'CRN', label: 'CRN — Nutrição' },
  { value: 'COREN', label: 'COREN — Enfermagem' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function WizardPage() {
  const router = useRouter();
  const { token } = useParams();
  const [currentStepKey, setCurrentStepKey] = useState<StepKey>('dados');
  const [formData, setFormData] = useState<FormData>({ person_type: 'PJ' });
  const [documents, setDocuments] = useState<Documents>([]);
  const [acceptances, setAcceptances] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [switchingType, setSwitchingType] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const personType: PersonType = String(formData.person_type || 'PJ').toUpperCase() === 'PF' ? 'PF' : 'PJ';
  const isPF = personType === 'PF';
  const steps = isPF ? STEPS_PF : STEPS_PJ;
  const declarations = getDeclarations(isPF);

  // Garantir que currentStepKey existe na lista atual de etapas
  const currentIndex = Math.max(0, steps.findIndex(s => s.key === currentStepKey));
  const activeStepKey: StepKey = steps[currentIndex]?.key || 'dados';

  // ── Carregar dados ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/c/${token}/data`);
        if (res.status === 401) { router.push(`/c/${token}`); return; }
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const d = data.data as Record<string, any>;
            const loadedType: PersonType = String(d.person_type || 'PJ').toUpperCase() === 'PF' ? 'PF' : 'PJ';
            const defaultDoc = loadedType === 'PF' ? (d.contact_cpf || d.legal_rep_cpf || '') : (d.cnpj || '');
            const defaultHolder = loadedType === 'PF'
              ? (d.contact_name || d.legal_rep_name || d.trade_name || '')
              : (d.legal_name || d.trade_name || '');
            const normalized: FormData = {
              ...d,
              person_type: loadedType,
              legal_name: d.legal_name || d.trade_name || '',
              address_city: d.address_city || d.city || '',
              address_state: d.address_state || d.state || '',
              email_admin: d.email_admin || d.email || '',
              email_financial: d.email_financial || d.email || '',
              legal_rep_name: d.legal_rep_name || d.contact_name || '',
              legal_rep_cpf: d.legal_rep_cpf || d.contact_cpf || '',
              legal_rep_email: d.legal_rep_email || d.email || '',
              legal_rep_phone: d.legal_rep_phone || d.phone || '',
              legal_rep_has_powers: d.legal_rep_has_powers ?? true,
              tech_rep_name: d.tech_rep_name || d.contact_name || '',
              tech_rep_cpf: d.tech_rep_cpf || d.contact_cpf || '',
              tech_rep_council_state: d.tech_rep_council_state || d.address_state || d.state || '',
              bank_account_type: d.bank_account_type || 'corrente',
              bank_holder_name: d.bank_holder_name || defaultHolder,
              bank_holder_document: d.bank_holder_document || defaultDoc,
              bank_pix_key: d.bank_pix_key || defaultDoc,
            };
            setFormData(normalized);
            setProgress(Number(d.progress_percent) || 0);
          }
          if (data.documents) {
            setDocuments(data.documents);
          }
        }
      } catch { /* Silencioso */ }
      finally { setLoading(false); }
    };
    load();
  }, [token, router]);

  // ── Persistir imediatamente no backend ───────────────────────────────────
  const persistNow = useCallback(async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/c/${token}/data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.progress !== undefined) setProgress(d.progress);
        if (Array.isArray(d.documents)) setDocuments(d.documents);
      }
    } catch { /* Silencioso */ }
    finally { setSaving(false); }
  }, [token]);

  // ── Autosave com debounce ────────────────────────────────────────────────
  const scheduleAutosave = useCallback((data: FormData) => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistNow(data);
    }, 1500);
  }, [persistNow]);

  // ── Alternar PF / PJ com sincronização instantânea de documentos ─────────
  const handleSelectPersonType = useCallback(async (nextType: PersonType) => {
    if (nextType === personType) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setSwitchingType(true);
    setError('');

    let nextSnapshot: FormData = {};
    setFormData(prev => {
      const name = String(prev.contact_name || prev.legal_rep_name || prev.trade_name || '');
      const cpf = String(prev.contact_cpf || prev.legal_rep_cpf || '');
      const cnpj = String(prev.cnpj || '');
      const next: FormData = {
        ...prev,
        person_type: nextType,
        ...(nextType === 'PF'
          ? {
              legal_name: name || prev.legal_name || '',
              legal_rep_name: name || prev.legal_rep_name || '',
              legal_rep_cpf: cpf || prev.legal_rep_cpf || '',
              legal_rep_role: 'Profissional Autônomo (PF)',
              legal_rep_has_powers: true,
              tech_rep_name: prev.tech_rep_name || name,
              tech_rep_cpf: prev.tech_rep_cpf || cpf,
              bank_holder_name: (!prev.bank_holder_name || prev.bank_holder_name === prev.trade_name) ? (name || prev.trade_name || '') : prev.bank_holder_name,
              bank_holder_document: (!prev.bank_holder_document || prev.bank_holder_document === cnpj) ? cpf : prev.bank_holder_document,
              bank_pix_key: (!prev.bank_pix_key || prev.bank_pix_key === cnpj) ? cpf : prev.bank_pix_key,
            }
          : {
              legal_rep_role: prev.legal_rep_role === 'Profissional Autônomo (PF)' ? '' : prev.legal_rep_role,
              bank_holder_document: (!prev.bank_holder_document || prev.bank_holder_document === cpf) ? cnpj : prev.bank_holder_document,
            }),
      };
      nextSnapshot = next;
      return next;
    });

    if (nextType === 'PF' && currentStepKey === 'responsavel') {
      setCurrentStepKey('dados');
    }

    try {
      await persistNow(nextSnapshot);
    } finally {
      setSwitchingType(false);
    }
  }, [personType, currentStepKey, persistNow]);

  const updateField = useCallback((field: string, value: string | boolean | null) => {
    let finalVal = value;
    if (typeof value === 'string') {
      if (field === 'cnpj') {
        finalVal = formatCnpjMask(value);
      } else if (['contact_cpf', 'legal_rep_cpf', 'tech_rep_cpf', 'authorized_rep_cpf'].includes(field)) {
        finalVal = formatCpfMask(value);
      } else if (field === 'bank_holder_document') {
        finalVal = formatCpfOrCnpjMask(value);
      } else if (field === 'address_cep') {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        finalVal = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
        if (digits.length === 8) {
          fetch(`https://viacep.com.br/ws/${digits}/json/`)
            .then(r => r.json())
            .then(cepData => {
              if (cepData && !cepData.erro) {
                setFormData(prev => {
                  const updated: FormData = {
                    ...prev,
                    address_cep: finalVal,
                    address_street: cepData.logradouro || prev.address_street || '',
                    address_neighborhood: cepData.bairro || prev.address_neighborhood || '',
                    address_city: cepData.localidade || prev.address_city || '',
                    address_state: cepData.uf || prev.address_state || '',
                  };
                  scheduleAutosave(updated);
                  return updated;
                });
              }
            })
            .catch(() => {});
        }
      }
    }

    setFormData(prev => {
      const next: FormData = { ...prev, [field]: finalVal };
      // Em PF, manter dados do titular sincronizados com responsável legal e técnico
      if (String(prev.person_type || 'PJ').toUpperCase() === 'PF') {
        if (field === 'contact_name' && typeof finalVal === 'string') {
          next.legal_rep_name = finalVal;
          next.legal_name = finalVal;
          if (!prev.tech_rep_name || prev.tech_rep_name === prev.contact_name) {
            next.tech_rep_name = finalVal;
          }
          if (!prev.bank_holder_name || prev.bank_holder_name === prev.contact_name) {
            next.bank_holder_name = finalVal;
          }
        }
        if (field === 'contact_cpf' && typeof finalVal === 'string') {
          next.legal_rep_cpf = finalVal;
          if (!prev.tech_rep_cpf || prev.tech_rep_cpf === prev.contact_cpf) {
            next.tech_rep_cpf = finalVal;
          }
          if (!prev.bank_holder_document || prev.bank_holder_document === prev.contact_cpf) {
            next.bank_holder_document = finalVal;
          }
          if (!prev.bank_pix_key || prev.bank_pix_key === prev.contact_cpf) {
            next.bank_pix_key = finalVal;
          }
        }
        if (field === 'phone' && typeof finalVal === 'string') {
          next.legal_rep_phone = finalVal;
        }
        if (field === 'email_admin' && typeof finalVal === 'string') {
          next.legal_rep_email = finalVal;
        }
      }
      scheduleAutosave(next);
      return next;
    });
  }, [scheduleAutosave]);

  const copyLegalToTechRep = useCallback(() => {
    setFormData(prev => {
      const spec = String(prev.specialty || '').toLowerCase();
      const defaultCouncil = prev.tech_rep_council
        ? String(prev.tech_rep_council)
        : spec.includes('odonto')
          ? 'CRO'
          : (spec.includes('cirurgia') || spec.includes('oftalmo') || spec.includes('ortoped') || spec.includes('dermato'))
            ? 'CRM'
            : '';
      const next: FormData = {
        ...prev,
        tech_rep_name: prev.legal_rep_name || prev.contact_name || prev.tech_rep_name || '',
        tech_rep_cpf: prev.legal_rep_cpf || prev.contact_cpf || prev.tech_rep_cpf || '',
        tech_rep_council_state: prev.tech_rep_council_state || prev.address_state || prev.state || '',
        ...(defaultCouncil ? { tech_rep_council: defaultCouncil } : {}),
      };
      scheduleAutosave(next);
      return next;
    });
  }, [scheduleAutosave]);

  // ── Upload de documento ──────────────────────────────────────────────────
  const handleUpload = async (documentId: string, file: File) => {
    setError('');
    setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, uploading: true, uploadProgress: 0, uploadError: undefined } : d));
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('documentId', documentId);
    try {
      const res = await fetch(`/api/c/${token}/upload`, { method: 'POST', body: formDataUpload });
      const data = await res.json();
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === documentId ? {
          ...d,
          uploading: false,
          uploadProgress: 100,
          original_filename: file.name,
          size_bytes: file.size,
          storage_key: 'uploaded',
          uploadError: undefined,
        } : d));
      } else {
        const errorMsg = data.error || 'Erro ao enviar arquivo.';
        setError(errorMsg);
        setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, uploading: false, uploadError: errorMsg } : d));
      }
    } catch {
      const errorMsg = 'Erro de rede ao enviar arquivo.';
      setError(errorMsg);
      setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, uploading: false, uploadError: errorMsg } : d));
    }
  };

  // ── Submissão final ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const acceptanceList = Object.entries(acceptances)
      .filter(([, v]) => v)
      .map(([type]) => ({ type, version: '2026-01-01' }));

    try {
      const res = await fetch(`/api/c/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptances: acceptanceList, formData }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Erro ao enviar credenciamento.');
        if (data.pendingDocuments) {
          setCurrentStepKey('documentos');
        }
      }
    } catch {
      setError('Erro de rede. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Tela de carregamento ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}` }} />
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6370f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p>Carregando formulário…</p>
      </div>
    </div>
  );

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');` }} />
      <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '48px', maxWidth: '540px', width: '100%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: '56px', marginBottom: '20px' }}>🎉</div>
        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '800', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          Documentos enviados com sucesso!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', lineHeight: '1.7', margin: '0 0 24px' }}>
          Recebemos seus dados e documentos ({isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}). Seu credenciamento foi encaminhado para a equipe de compliance e administração da Benavera.
        </p>

        <div style={{ background: 'rgba(99,112,241,0.1)', border: '1px solid rgba(99,112,241,0.3)', borderRadius: '14px', padding: '20px', marginBottom: '28px', textAlign: 'left' }}>
          <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '700', color: '#c7d2fe' }}>
            🔒 Liberação da conta
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
            A sua conta no portal Benavera só será liberada após a validação de todos os documentos e a aprovação formal pelo administrador. Você será notificado por e-mail assim que a análise for concluída.
          </p>
        </div>

        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #6370f1, #4040ca)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          Ir para a tela de Login
        </button>
      </div>
    </div>
  );

  // ── Layout principal do wizard ───────────────────────────────────────────
  const allDeclarationsAccepted = declarations.every(d => acceptances[d.id]);
  const requiredDocsUploaded = documents.filter(d => d.is_required).every(d => d.storage_key);

  const reviewChecklist = isPF
    ? [
        { label: 'Dados do profissional (PF)', ok: Boolean(formData.trade_name && (formData.contact_cpf || formData.legal_rep_cpf)), stepKey: 'dados' as StepKey },
        { label: 'Registro profissional', ok: Boolean((formData.tech_rep_name || formData.contact_name) && formData.tech_rep_council_number), stepKey: 'tecnico' as StepKey },
        { label: 'Dados bancários', ok: Boolean(formData.bank_name && formData.bank_account), stepKey: 'bancario' as StepKey },
        { label: 'Documentos obrigatórios (PF)', ok: requiredDocsUploaded, stepKey: 'documentos' as StepKey },
        { label: 'Declarações', ok: allDeclarationsAccepted, stepKey: 'declaracoes' as StepKey },
      ]
    : [
        { label: 'Dados da clínica (PJ)', ok: Boolean(formData.trade_name && formData.cnpj), stepKey: 'dados' as StepKey },
        { label: 'Responsável legal', ok: Boolean(formData.legal_rep_name && formData.legal_rep_cpf), stepKey: 'responsavel' as StepKey },
        { label: 'Responsável técnico', ok: Boolean(formData.tech_rep_name && formData.tech_rep_council_number), stepKey: 'tecnico' as StepKey },
        { label: 'Dados bancários', ok: Boolean(formData.bank_name && formData.bank_account), stepKey: 'bancario' as StepKey },
        { label: 'Documentos obrigatórios (PJ)', ok: requiredDocsUploaded, stepKey: 'documentos' as StepKey },
        { label: 'Declarações', ok: allDeclarationsAccepted, stepKey: 'declaracoes' as StepKey },
      ];

  return (
    <FormContext.Provider value={{ formData, updateField }}>
      <div style={{ minHeight: '100vh', background: '#0b0c1e', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; } ::placeholder { color: rgba(255,255,255,0.2); } select option { background: #1a1b3e; }` }} />

      {/* Topbar */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px clamp(16px, 4vw, 24px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🪪</span>
          <span style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>Benavera</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px', marginLeft: '4px' }}>Credenciamento</span>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            padding: '3px 9px',
            borderRadius: '20px',
            background: isPF ? 'rgba(16,185,129,0.16)' : 'rgba(99,112,241,0.2)',
            color: isPF ? '#6ee7b7' : '#a5b4fc',
            border: `1px solid ${isPF ? 'rgba(16,185,129,0.35)' : 'rgba(99,112,241,0.35)'}`,
          }}>
            {isPF ? 'Pessoa Física (PF)' : 'Pessoa Jurídica (PJ)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {(saving || switchingType) && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>💾 Salvando…</span>}
          {!saving && !switchingType && progress > 0 && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>✓ Salvo</span>}
          <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#6370f1', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{progress}%</span>
        </div>
      </div>

      {/* Steps nav */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '0', minWidth: 'max-content' }}>
          {steps.map((step, i) => {
            const isActive = activeStepKey === step.key;
            const isDone = currentIndex > i;
            return (
              <button key={step.key} onClick={() => setCurrentStepKey(step.key)}
                style={{ padding: '14px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${isActive ? '#6370f1' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: isActive ? '#a5b4fc' : isDone ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', fontWeight: isActive ? '700' : '500', fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0 }}>
                <span style={{ fontSize: '15px' }}>{isDone ? '✓' : step.icon}</span>
                {step.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'clamp(24px, 5vw, 36px) clamp(16px, 4vw, 24px)' }}>
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#fca5a5', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Step: Dados */}
        {activeStepKey === 'dados' && (
          <div>
            {/* Seletor PF / PJ */}
            <div style={{ marginBottom: '28px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '700', color: '#7c93b5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tipo de credenciamento <span style={{ color: '#ef4444' }}>*</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {[
                  {
                    type: 'PJ' as PersonType,
                    icon: '🏢',
                    title: 'Pessoa Jurídica (PJ)',
                    desc: 'Clínica ou consultório com CNPJ e Contrato Social',
                  },
                  {
                    type: 'PF' as PersonType,
                    icon: '👤',
                    title: 'Pessoa Física (PF)',
                    desc: 'Profissional autônomo com CPF e registro no conselho',
                  },
                ].map(opt => {
                  const selected = personType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      disabled={switchingType}
                      onClick={() => handleSelectPersonType(opt.type)}
                      style={{
                        textAlign: 'left',
                        padding: '16px 18px',
                        borderRadius: '14px',
                        cursor: switchingType ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                        background: selected ? 'rgba(99,112,241,0.16)' : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${selected ? '#6370f1' : 'rgba(255,255,255,0.1)'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>
                          {opt.icon} {opt.title}
                        </span>
                        {selected && (
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#a5b4fc', background: 'rgba(99,112,241,0.25)', padding: '2px 8px', borderRadius: '12px' }}>
                            Selecionado
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {isPF
                  ? 'Os campos e documentos serão adaptados automaticamente para Pessoa Física (sem Contrato Social).'
                  : 'Os campos e documentos serão solicitados para Pessoa Jurídica (CNPJ e Contrato Social).'}
              </p>
            </div>

            {isPF ? (
              <>
                <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>👤 Dados do profissional (PF)</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Confirme e complete suas informações pessoais e do local de atendimento</p>
                <Grid2>
                  <InputField label="Nome do consultório / atendimento" field="trade_name" required placeholder="Ex: Consultório Dra. Ana Silva" />
                  <InputField label="Nome completo do titular" field="contact_name" required placeholder="Nome completo como no RG/CNH" />
                </Grid2>
                <Grid2>
                  <InputField label="CPF do titular" field="contact_cpf" required placeholder="000.000.000-00" />
                  <InputField label="WhatsApp / Telefone" field="phone" type="tel" required placeholder="(11) 99999-9999" />
                </Grid2>
                <Grid2>
                  <InputField label="CEP do consultório" field="address_cep" required placeholder="00000-000" />
                  <InputField label="Rua / Avenida" field="address_street" required placeholder="Nome da rua" />
                </Grid2>
                <Grid2>
                  <InputField label="Número" field="address_number" required placeholder="123" />
                  <InputField label="Complemento" field="address_complement" placeholder="Sala, consultório…" />
                </Grid2>
                <Grid2>
                  <InputField label="Bairro" field="address_neighborhood" required placeholder="Bairro" />
                  <InputField label="Cidade" field="address_city" required placeholder="Cidade" />
                </Grid2>
                <Grid2>
                  <SelectField label="Estado" field="address_state" options={UF_OPTIONS} required />
                  <InputField label="Telefone secundário" field="phone_secondary" type="tel" placeholder="(11) 3333-3333" />
                </Grid2>
                <Grid2>
                  <InputField label="E-mail principal" field="email_admin" type="email" placeholder="seuemail@dominio.com.br" />
                  <InputField label="E-mail financeiro" field="email_financial" type="email" placeholder="financeiro@dominio.com.br" />
                </Grid2>
                <InputField label="Site ou Instagram profissional" field="website" placeholder="https://www.instagram.com/seu_perfil" />
              </>
            ) : (
              <>
                <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>🏥 Dados da clínica (PJ)</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Confirme e complete as informações da sua clínica</p>
                <Grid2>
                  <InputField label="Nome fantasia" field="trade_name" required placeholder="Como sua clínica é conhecida" />
                  <InputField label="Razão social" field="legal_name" required placeholder="Nome jurídico completo" />
                </Grid2>
                <Grid2>
                  <InputField label="CNPJ" field="cnpj" required placeholder="00.000.000/0000-00" />
                  <InputField label="Ins. Municipal" field="municipal_registration" placeholder="Se aplicável" />
                </Grid2>
                <Grid2>
                  <InputField label="CEP" field="address_cep" required placeholder="00000-000" />
                  <InputField label="Rua / Avenida" field="address_street" required placeholder="Nome da rua" />
                </Grid2>
                <Grid2>
                  <InputField label="Número" field="address_number" required placeholder="123" />
                  <InputField label="Complemento" field="address_complement" placeholder="Sala, bloco…" />
                </Grid2>
                <Grid2>
                  <InputField label="Bairro" field="address_neighborhood" required placeholder="Bairro" />
                  <InputField label="Cidade" field="address_city" required placeholder="Cidade" />
                </Grid2>
                <Grid2>
                  <SelectField label="Estado" field="address_state" options={UF_OPTIONS} required />
                  <InputField label="Telefone secundário" field="phone_secondary" type="tel" placeholder="(11) 3333-3333" />
                </Grid2>
                <Grid2>
                  <InputField label="E-mail administrativo" field="email_admin" type="email" placeholder="admin@clinica.com.br" />
                  <InputField label="E-mail financeiro" field="email_financial" type="email" placeholder="financeiro@clinica.com.br" />
                </Grid2>
                <InputField label="Site" field="website" placeholder="https://www.suaclinica.com.br" />
              </>
            )}
          </div>
        )}

        {/* Step: Responsável legal (somente PJ) */}
        {activeStepKey === 'responsavel' && !isPF && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>👤 Responsável legal</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Pessoa física com poderes para assinar contratos em nome da clínica</p>
            <Grid2>
              <InputField label="Nome completo" field="legal_rep_name" required placeholder="Nome como no documento" />
              <InputField label="CPF" field="legal_rep_cpf" required placeholder="000.000.000-00" />
            </Grid2>
            <Grid2>
              <InputField label="Cargo / Função" field="legal_rep_role" required placeholder="Ex: Sócio-administrador, Diretor" />
              <InputField label="E-mail" field="legal_rep_email" type="email" required placeholder="responsavel@clinica.com.br" />
            </Grid2>
            <InputField label="Telefone" field="legal_rep_phone" type="tel" required placeholder="(11) 99999-9999" />

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#7c93b5', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                O responsável legal tem poderes de representação no contrato social? <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {[{ value: 'true', label: 'Sim, o responsável legal tem poderes' }, { value: 'false', label: 'Não — há outro representante com poderes' }].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="radio" name="legal_rep_has_powers" value={opt.value}
                    checked={String(formData.legal_rep_has_powers) === opt.value}
                    onChange={() => updateField('legal_rep_has_powers', opt.value === 'true')}
                    style={{ accentColor: '#6370f1' }} />
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px' }}>{opt.label}</span>
                </label>
              ))}
            </div>

            {formData.legal_rep_has_powers === false && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', marginTop: '4px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 16px' }}>Dados do representante com poderes (enviará procuração na etapa de documentos)</p>
                <Grid2>
                  <InputField label="Nome completo" field="authorized_rep_name" required />
                  <InputField label="CPF" field="authorized_rep_cpf" required placeholder="000.000.000-00" />
                </Grid2>
                <InputField label="Cargo" field="authorized_rep_role" placeholder="Ex: Procurador, Diretor" />
              </div>
            )}

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={copyLegalToTechRep}
                style={{
                  padding: '10px 16px',
                  background: (formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf)
                    ? 'rgba(74,222,128,0.14)'
                    : 'rgba(99,112,241,0.16)',
                  color: (formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf)
                    ? '#86efac'
                    : '#c7d2fe',
                  border: `1px solid ${(formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf) ? 'rgba(74,222,128,0.35)' : 'rgba(99,112,241,0.35)'}`,
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {(formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf)
                  ? '✓ Responsável Técnico já preenchido com os dados do Responsável Legal'
                  : '🩺 O Responsável Legal também é o Responsável Técnico (copiar dados)'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Responsável técnico / Registro profissional */}
        {activeStepKey === 'tecnico' && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>
              {isPF ? '🩺 Registro profissional' : '🩺 Responsável técnico'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 18px' }}>
              {isPF
                ? 'Dados do seu registro no conselho profissional de saúde'
                : 'Profissional de saúde responsável técnico pela clínica'}
            </p>
            {!isPF && (
              <div style={{ marginBottom: '22px' }}>
                <button
                  type="button"
                  onClick={copyLegalToTechRep}
                  style={{
                    padding: '10px 16px',
                    background: (formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf)
                      ? 'rgba(74,222,128,0.14)'
                      : 'rgba(99,112,241,0.16)',
                    color: (formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf)
                      ? '#86efac'
                      : '#c7d2fe',
                    border: `1px solid ${(formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf) ? 'rgba(74,222,128,0.35)' : 'rgba(99,112,241,0.35)'}`,
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {(formData.legal_rep_name && formData.tech_rep_name === formData.legal_rep_name && formData.legal_rep_cpf && formData.tech_rep_cpf === formData.legal_rep_cpf)
                    ? '✓ Mesmo que o Responsável Legal (dados aplicados)'
                    : '👤 O Responsável Técnico é o mesmo que o Responsável Legal'}
                </button>
              </div>
            )}
            <Grid2>
              <InputField label={isPF ? 'Nome no conselho' : 'Nome completo'} field="tech_rep_name" required placeholder="Nome como no conselho" />
              <InputField label="CPF" field="tech_rep_cpf" required placeholder="000.000.000-00" />
            </Grid2>
            <Grid2>
              <SelectField label="Conselho profissional" field="tech_rep_council" required options={COUNCIL_OPTIONS} />
              <InputField label="Número de registro" field="tech_rep_council_number" required placeholder="Ex: 12345" />
            </Grid2>
            <Grid2>
              <SelectField label="UF do registro" field="tech_rep_council_state" required options={UF_OPTIONS} />
              <InputField label="CNES" field="cnes" placeholder="Número do CNES (se aplicável)" />
            </Grid2>
            <Grid2>
              <InputField label="Licença/Alvará sanitário nº" field="sanitary_license_number" placeholder="Se aplicável" />
              <InputField label="Validade da licença" field="sanitary_license_expiry" type="date" />
            </Grid2>
          </div>
        )}

        {/* Step: Dados bancários */}
        {activeStepKey === 'bancario' && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>🏦 Dados bancários</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Conta para recebimento dos valores das operações</p>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.7' }}>
              🔒 Nunca informe senha bancária, token ou CVV — esses dados não são solicitados aqui.<br/>
              {isPF
                ? 'Prefira conta bancária em nome do seu próprio CPF para evitar divergência de titularidade.'
                : 'Prefira conta corrente em nome do CNPJ da clínica para evitar divergência de titularidade.'}
            </div>
            <Grid2>
              <InputField label="Nome do banco" field="bank_name" required placeholder="Ex: Banco do Brasil, Itaú, Nubank" />
              <InputField label="Código do banco" field="bank_code" placeholder="Ex: 001, 341, 260" />
            </Grid2>
            <Grid2>
              <InputField label="Agência" field="bank_agency" required placeholder="0000-0" />
              <InputField label="Conta com dígito" field="bank_account" required placeholder="000000-0" />
            </Grid2>
            <Grid2>
              <SelectField label="Tipo de conta" field="bank_account_type" required options={[
                { value: 'corrente', label: 'Conta corrente' },
                { value: 'poupanca', label: 'Conta poupança' },
                { value: 'pagamento', label: 'Conta de pagamento' },
              ]} />
              <InputField label="Chave Pix (opcional)" field="bank_pix_key" placeholder={isPF ? 'CPF, e-mail, telefone ou chave aleatória' : 'CNPJ, e-mail ou chave aleatória'} />
            </Grid2>
            <Grid2>
              <InputField label="Nome do titular da conta" field="bank_holder_name" required placeholder="Nome exato como no banco" />
              <InputField label={isPF ? 'CPF do titular' : 'CPF ou CNPJ do titular'} field="bank_holder_document" required placeholder={isPF ? '000.000.000-00' : 'CPF ou CNPJ'} />
            </Grid2>
          </div>
        )}

        {/* Step: Documentos */}
        {activeStepKey === 'documentos' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: 0 }}>
                📄 Documentos ({isPF ? 'Pessoa Física' : 'Pessoa Jurídica'})
              </h2>
              <button
                type="button"
                disabled={switchingType}
                onClick={() => handleSelectPersonType(isPF ? 'PJ' : 'PF')}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#c7d2fe',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {switchingType ? 'Atualizando…' : isPF ? 'Alterar para Pessoa Jurídica (PJ)' : 'Alterar para Pessoa Física (PF)'}
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 8px' }}>
              {isPF
                ? 'Lista adaptada para profissional autônomo (CPF) — sem necessidade de Contrato Social. Formatos aceitos: PDF, JPG, PNG (máx. 20MB).'
                : 'Envie os documentos da clínica (CNPJ). Formatos aceitos: PDF, JPG, PNG. Tamanho máximo: 20MB por arquivo.'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '0 0 28px' }}>
              Buscamos concentrar toda a documentação necessária nesta etapa. Em situações excepcionais (alterações cadastrais, exigências regulatórias, prevenção à fraude ou solicitações do parceiro financeiro), documentação complementar poderá ser solicitada.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {documents.map(doc => {
                const hasFile = Boolean(doc.storage_key);
                const reviewColor = doc.review_status === 'VALIDATED' ? '#4ade80' :
                                   doc.review_status === 'CORRECTION_REQUESTED' ? '#fbbf24' :
                                   doc.review_status === 'REJECTED' ? '#f87171' : 'rgba(255,255,255,0.3)';
                return (
                  <div key={doc.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '18px', border: `1.5px solid ${hasFile ? 'rgba(99,112,241,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: 'white' }}>
                          {doc.document_label}
                          {doc.is_required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                          {!doc.is_required && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginLeft: '6px' }}>Opcional</span>}
                        </p>
                        {hasFile && (
                          <p style={{ margin: 0, fontSize: '12px', color: reviewColor }}>
                            {doc.review_status === 'VALIDATED' ? '✓ Validado' :
                             doc.review_status === 'CORRECTION_REQUESTED' ? '⚠ Correção necessária' :
                             doc.review_status === 'REJECTED' ? '✕ Rejeitado — reenvie o documento' :
                             `✓ ${doc.original_filename || 'Enviado'}`}
                            {doc.size_bytes && ` · ${(doc.size_bytes / 1024 / 1024).toFixed(2)} MB`}
                          </p>
                        )}
                        {doc.correction_message && (
                          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#fbbf24', background: 'rgba(251,191,36,0.08)', padding: '8px', borderRadius: '6px' }}>
                            📝 {doc.correction_message}
                          </p>
                        )}
                        {doc.uploadError && (
                          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', padding: '8px 12px', borderRadius: '8px' }}>
                            ⚠️ {doc.uploadError}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <input
                          id={`file-input-${doc.id}`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUpload(doc.id, file);
                            }
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById(`file-input-${doc.id}`)?.click()}
                          disabled={doc.uploading}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 18px',
                            background: hasFile ? 'rgba(99,112,241,0.2)' : 'rgba(99,112,241,0.12)',
                            color: hasFile ? '#a5b4fc' : '#ffffff',
                            border: `1px solid ${hasFile ? 'rgba(99,112,241,0.4)' : 'rgba(99,112,241,0.25)'}`,
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: doc.uploading ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {doc.uploading ? '⏳ Enviando…' : hasFile ? '🔄 Substituir' : '📎 Enviar arquivo'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: Declarações */}
        {activeStepKey === 'declaracoes' && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>✍️ Declarações</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 18px' }}>Leia cada item com atenção e marque sua concordância individualmente</p>
            <div style={{ marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !allDeclarationsAccepted;
                  const nextMap: Record<string, boolean> = {};
                  declarations.forEach(d => { nextMap[d.id] = nextVal; });
                  setAcceptances(nextMap);
                }}
                style={{ padding: '8px 14px', background: 'rgba(99,112,241,0.16)', color: '#c7d2fe', border: '1px solid rgba(99,112,241,0.35)', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {allDeclarationsAccepted ? 'Desmarcar todas' : '✓ Marcar todas as declarações'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {declarations.map((decl, i) => (
                <label key={decl.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: acceptances[decl.id] ? 'rgba(99,112,241,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px', border: `1px solid ${acceptances[decl.id] ? 'rgba(99,112,241,0.25)' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={Boolean(acceptances[decl.id])} onChange={e => setAcceptances(prev => ({ ...prev, [decl.id]: e.target.checked }))}
                    style={{ marginTop: '2px', accentColor: '#6370f1', flexShrink: 0, width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '13px', color: acceptances[decl.id] ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginRight: '6px' }}>{i + 1}.</span>
                    {decl.text}
                  </span>
                </label>
              ))}
            </div>
            {!allDeclarationsAccepted && (
              <p style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                {declarations.length - Object.values(acceptances).filter(Boolean).length} declaração(ões) pendente(s)
              </p>
            )}
          </div>
        )}

        {/* Step: Revisão e envio */}
        {activeStepKey === 'revisao' && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>✅ Revisão e envio</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>
              Verifique as informações do seu credenciamento ({isPF ? 'Pessoa Física' : 'Pessoa Jurídica'}) antes de enviar
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {reviewChecklist.map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setCurrentStepKey(item.stepKey)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: item.ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', borderRadius: '10px', border: `1px solid ${item.ok ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%' }}
                >
                  <span style={{ fontSize: '18px' }}>{item.ok ? '✅' : '⭕'}</span>
                  <span style={{ fontSize: '14px', color: item.ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', fontWeight: item.ok ? '500' : '400' }}>{item.label}</span>
                  {!item.ok && (
                    <span style={{ fontSize: '12px', color: '#f87171', marginLeft: 'auto' }}>Pendente →</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '18px', marginBottom: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7' }}>
              Ao enviar, confirmo que li e concordei com todas as declarações acima, e que os dados e documentos fornecidos são verdadeiros.
            </div>

            <button onClick={handleSubmit}
              disabled={submitting || !allDeclarationsAccepted || !requiredDocsUploaded}
              style={{ width: '100%', padding: '16px', background: allDeclarationsAccepted && requiredDocsUploaded ? 'linear-gradient(135deg,#6370f1,#4040ca)' : 'rgba(255,255,255,0.08)', color: allDeclarationsAccepted && requiredDocsUploaded ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: submitting || !allDeclarationsAccepted || !requiredDocsUploaded ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {submitting ? '⏳ Enviando credenciamento…' : '🚀 Enviar credenciamento'}
            </button>
          </div>
        )}

        {/* Navegação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => currentIndex > 0 && setCurrentStepKey(steps[currentIndex - 1].key)}
            disabled={currentIndex === 0}
            style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', fontFamily: 'inherit', opacity: currentIndex === 0 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          <button onClick={() => currentIndex < steps.length - 1 && setCurrentStepKey(steps[currentIndex + 1].key)}
            disabled={currentIndex === steps.length - 1}
            style={{ padding: '12px 28px', background: currentIndex < steps.length - 1 ? 'linear-gradient(135deg,#6370f1,#4040ca)' : 'rgba(255,255,255,0.04)', color: 'white', border: 'none', borderRadius: '10px', cursor: currentIndex === steps.length - 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: currentIndex === steps.length - 1 ? 0.3 : 1 }}>
            Próximo →
          </button>
        </div>
      </div>
    </div>
  </FormContext.Provider>
  );
}
