'use client';
// app/c/[token]/formulario/page.tsx — Wizard multi-etapas de credenciamento

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { OnboardingDocument } from '@/lib/benavera-db';

// ── Wizard steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Dados da clínica', icon: '🏥' },
  { id: 2, title: 'Responsável legal', icon: '👤' },
  { id: 3, title: 'Resp. técnico', icon: '🩺' },
  { id: 4, title: 'Dados bancários', icon: '🏦' },
  { id: 5, title: 'Documentos', icon: '📄' },
  { id: 6, title: 'Declarações', icon: '✍️' },
  { id: 7, title: 'Revisão', icon: '✅' },
];

// ── Declarações obrigatórias ─────────────────────────────────────────────────
const DECLARATIONS = [
  { id: 'declaration_1_veracidade', text: 'Declaro que todas as informações fornecidas são verdadeiras e corretas, e me responsabilizo por qualquer inexatidão.' },
  { id: 'declaration_2_autenticidade', text: 'Declaro que todos os documentos enviados são autênticos, válidos e não foram adulterados.' },
  { id: 'declaration_3_representacao', text: 'Declaro que tenho poderes legais para representar a clínica e assinar documentos em seu nome.' },
  { id: 'declaration_4_regularidade', text: 'Declaro que a clínica está regularmente constituída e em plena atividade, sem impedimentos legais.' },
  { id: 'declaration_5_alteracoes', text: 'Comprometo-me a informar qualquer alteração nos dados cadastrais, societários ou bancários em até 30 dias.' },
  { id: 'declaration_6_no_ficticio', text: 'Declaro que as operações realizadas com os recursos da Benavera não serão fictícias ou simuladas.' },
  { id: 'declaration_7_no_inexistentes', text: 'Declaro que não utilizarei os recursos para financiar serviços inexistentes, superfaturados ou já realizados.' },
  { id: 'declaration_8_no_inflacao', text: 'Declaro que não haverá inflação de valores, duplicidade de cobranças ou qualquer forma de fraude.' },
  { id: 'declaration_9_no_cpf_terceiros', text: 'Declaro que não utilizarei CPF de terceiros, laranjas ou pessoas sem vínculo real com a clínica.' },
  { id: 'declaration_10_no_simulacao', text: 'Declaro que as operações refletem transações reais com pacientes legítimos.' },
  { id: 'declaration_11_no_contornar', text: 'Declaro que não tentarei burlar regras, limites operacionais ou políticas da Benavera por meios diretos ou indiretos.' },
  { id: 'declaration_12_credito_parceiro', text: 'Estou ciente de que o crédito é concedido pelo parceiro financeiro, e não pela Benavera.' },
  { id: 'declaration_13_aprovacao_nao_garantida', text: 'Estou ciente de que a aprovação do credenciamento não garante a concessão de crédito, que depende de análise independente.' },
  { id: 'privacy_policy', text: 'Li e concordo com a Política de Privacidade da Benavera e autorizo o tratamento dos dados da clínica para as finalidades do credenciamento.' },
];

type FormData = Record<string, string | boolean | null>;
type Documents = Array<OnboardingDocument & { uploadProgress?: number; uploading?: boolean }>;

interface FormContextType {
  formData: FormData;
  updateField: (field: string, value: string | boolean | null) => void;
}

const FormContext = createContext<FormContextType>({
  formData: {},
  updateField: () => {},
});

const Grid2 = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 20px' }}>{children}</div>
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

export default function WizardPage() {
  const router = useRouter();
  const { token } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({});
  const [documents, setDocuments] = useState<Documents>([]);
  const [acceptances, setAcceptances] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Carregar dados ───────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/c/${token}/data`);
        if (res.status === 401) { router.push(`/c/${token}`); return; }
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setFormData(data.data as FormData);
            setProgress(Number(data.data.progress_percent) || 0);
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

  // ── Autosave ─────────────────────────────────────────────────────────────
  const scheduleAutosave = useCallback((data: FormData) => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
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
        }
      } catch { /* Silencioso */ }
      finally { setSaving(false); }
    }, 1500);
  }, [token]);

  const updateField = useCallback((field: string, value: string | boolean | null) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      scheduleAutosave(next);
      return next;
    });
  }, [scheduleAutosave]);

  // ── Upload de documento ──────────────────────────────────────────────────
  const handleUpload = async (documentId: string, file: File) => {
    setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, uploading: true, uploadProgress: 0 } : d));
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('documentId', documentId);
    try {
      const res = await fetch(`/api/c/${token}/upload`, { method: 'POST', body: formDataUpload });
      const data = await res.json();
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === documentId ? {
          ...d, uploading: false, uploadProgress: 100,
          original_filename: file.name,
          size_bytes: file.size,
          storage_key: 'uploaded',
        } : d));
      } else {
        setError(data.error || 'Erro ao enviar arquivo.');
        setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, uploading: false } : d));
      }
    } catch {
      setError('Erro de rede ao enviar arquivo.');
      setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, uploading: false } : d));
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
        body: JSON.stringify({ acceptances: acceptanceList }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Erro ao enviar credenciamento.');
        if (data.pendingDocuments) {
          setCurrentStep(5);
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
      <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '52px', maxWidth: '520px', width: '100%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '800', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          Credenciamento enviado!
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: '1.7', margin: '0 0 28px' }}>
          Recebemos suas informações e documentos com sucesso. Nossa equipe iniciará a análise e você será notificado por e-mail sobre os próximos passos.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '18px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.7', textAlign: 'left' }}>
          ℹ️ Em situações excepcionais, alterações cadastrais, exigências regulatórias, prevenção à fraude ou solicitações do parceiro financeiro poderão exigir documentação complementar.
        </div>
      </div>
    </div>
  );

  // ── Layout principal do wizard ───────────────────────────────────────────
  const allDeclarationsAccepted = DECLARATIONS.every(d => acceptances[d.id]);
  const requiredDocsUploaded = documents.filter(d => d.is_required).every(d => d.storage_key);

  return (
    <FormContext.Provider value={{ formData, updateField }}>
      <div style={{ minHeight: '100vh', background: '#0b0c1e', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; } ::placeholder { color: rgba(255,255,255,0.2); } select option { background: #1a1b3e; }` }} />

      {/* Topbar */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🪪</span>
          <span style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>Benavera</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px', marginLeft: '8px' }}>Credenciamento</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saving && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>💾 Salvando…</span>}
          {!saving && progress > 0 && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>✓ Salvo</span>}
          <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#6370f1', borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{progress}%</span>
        </div>
      </div>

      {/* Steps nav */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '0', minWidth: 'max-content' }}>
          {STEPS.map((step, i) => {
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <button key={step.id} onClick={() => setCurrentStep(step.id)}
                style={{ padding: '14px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${isActive ? '#6370f1' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: isActive ? '#a5b4fc' : isDone ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)', fontWeight: isActive ? '700' : '500', fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0 }}>
                <span style={{ fontSize: '15px' }}>{isDone ? '✓' : step.icon}</span>
                {step.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 24px' }}>
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#fca5a5', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Step 1: Dados da clínica */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>🏥 Dados da clínica</h2>
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
          </div>
        )}

        {/* Step 2: Responsável legal */}
        {currentStep === 2 && (
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
          </div>
        )}

        {/* Step 3: Responsável técnico */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>🩺 Responsável técnico</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Profissional de saúde responsável técnico pela clínica</p>
            <Grid2>
              <InputField label="Nome completo" field="tech_rep_name" required placeholder="Nome como no conselho" />
              <InputField label="CPF" field="tech_rep_cpf" required placeholder="000.000.000-00" />
            </Grid2>
            <Grid2>
              <SelectField label="Conselho profissional" field="tech_rep_council" required options={[
                { value: 'CRO', label: 'CRO — Odontologia' }, { value: 'CRM', label: 'CRM — Medicina' },
                { value: 'CRP', label: 'CRP — Psicologia' }, { value: 'CREFITO', label: 'CREFITO — Fisioterapia' },
                { value: 'CRN', label: 'CRN — Nutrição' }, { value: 'COREN', label: 'COREN — Enfermagem' },
                { value: 'OUTRO', label: 'Outro' },
              ]} />
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

        {/* Step 4: Dados bancários */}
        {currentStep === 4 && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>🏦 Dados bancários</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Conta para recebimento dos valores das operações</p>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7' }}>
              🔒 Nunca informe senha bancária, token ou CVV — esses dados não são solicitados aqui.<br/>
              Prefira conta corrente em nome do CNPJ da clínica para evitar divergência de titularidade.
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
              <InputField label="Chave Pix (opcional)" field="bank_pix_key" placeholder="CPF, CNPJ, e-mail ou chave aleatória" />
            </Grid2>
            <Grid2>
              <InputField label="Nome do titular da conta" field="bank_holder_name" required placeholder="Nome exato como no banco" />
              <InputField label="CPF ou CNPJ do titular" field="bank_holder_document" required placeholder="CPF ou CNPJ" />
            </Grid2>
          </div>
        )}

        {/* Step 5: Documentos */}
        {currentStep === 5 && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>📄 Documentos</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 8px' }}>Envie os documentos necessários. Formatos aceitos: PDF, JPG, PNG. Tamanho máximo: 20MB por arquivo.</p>
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
                      </div>
                      <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                          onChange={e => { if (e.target.files?.[0]) handleUpload(doc.id, e.target.files[0]); }} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: hasFile ? 'rgba(99,112,241,0.2)' : 'rgba(99,112,241,0.1)', color: hasFile ? '#a5b4fc' : 'rgba(255,255,255,0.5)', border: `1px solid ${hasFile ? 'rgba(99,112,241,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {doc.uploading ? '⏳ Enviando…' : hasFile ? '🔄 Substituir' : '📎 Enviar arquivo'}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 6: Declarações */}
        {currentStep === 6 && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>✍️ Declarações</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Leia cada item com atenção e marque sua concordância individualmente</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {DECLARATIONS.map((decl, i) => (
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
                {DECLARATIONS.length - Object.values(acceptances).filter(Boolean).length} declaração(ões) pendente(s)
              </p>
            )}
          </div>
        )}

        {/* Step 7: Revisão e envio */}
        {currentStep === 7 && (
          <div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>✅ Revisão e envio</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>Verifique as informações antes de enviar</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {[
                { label: 'Dados da clínica', ok: Boolean(formData.trade_name && formData.cnpj) },
                { label: 'Responsável legal', ok: Boolean(formData.legal_rep_name && formData.legal_rep_cpf) },
                { label: 'Responsável técnico', ok: Boolean(formData.tech_rep_name && formData.tech_rep_council_number) },
                { label: 'Dados bancários', ok: Boolean(formData.bank_name && formData.bank_account) },
                { label: 'Documentos obrigatórios', ok: requiredDocsUploaded },
                { label: 'Declarações', ok: allDeclarationsAccepted },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: item.ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', borderRadius: '10px', border: `1px solid ${item.ok ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}` }}>
                  <span style={{ fontSize: '18px' }}>{item.ok ? '✅' : '⭕'}</span>
                  <span style={{ fontSize: '14px', color: item.ok ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)', fontWeight: item.ok ? '500' : '400' }}>{item.label}</span>
                  {!item.ok && (
                    <span style={{ fontSize: '12px', color: '#f87171', marginLeft: 'auto' }}>Pendente</span>
                  )}
                </div>
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
          <button onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: currentStep === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontFamily: 'inherit', opacity: currentStep === 1 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          <button onClick={() => currentStep < 7 ? setCurrentStep(s => s + 1) : undefined}
            disabled={currentStep === 7}
            style={{ padding: '12px 28px', background: currentStep < 7 ? 'linear-gradient(135deg,#6370f1,#4040ca)' : 'rgba(255,255,255,0.04)', color: 'white', border: 'none', borderRadius: '10px', cursor: currentStep === 7 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: currentStep === 7 ? 0.3 : 1 }}>
            Próximo →
          </button>
        </div>
      </div>
    </div>
  </FormContext.Provider>
  );
}
