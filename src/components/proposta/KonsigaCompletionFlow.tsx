'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  KONSIGA_OCUPACOES,
  KONSIGA_PROFISSOES,
  getKonsigaStatusMeta,
} from '@/lib/partners/konsiga-catalogs';

export interface KonsigaPatientState {
  transactionId: string;
  externalStatus: string | null;
  externalStep: string | null;
  signingUrl: string | null;
  smsSent: boolean;
  completed: boolean;
}

export interface KonsigaPatientPrefill {
  email: string;
  celularMasked: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  rendaMensal: number | null;
}

interface Props {
  token: string;
  konsiga: KonsigaPatientState;
  prefill: KonsigaPatientPrefill | null;
  onUpdated: () => Promise<void>;
}

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

async function fileToNormalizedBase64(file: File): Promise<{ base64: string; label: string }> {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowed.includes(file.type.toLowerCase())) {
    throw new Error('Formato inválido. Envie JPG, PNG ou PDF.');
  }

  if (file.type === 'application/pdf') {
    if (file.size > 4.5 * 1024 * 1024) {
      throw new Error('PDF excede 4,5 MB. Reduza o tamanho do arquivo e tente novamente.');
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao ler arquivo PDF.'));
      reader.readAsDataURL(file);
    });
    return {
      base64: dataUrl,
      label: `${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
    };
  }

  // Comprimir imagens de câmera (ex.: fotos de celular) mantendo nitidez para leitura do documento
  const imgDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.readAsDataURL(file);
  });

  const compressed = await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imgDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Imagem corrompida ou não suportada.'));
    img.src = imgDataUrl;
  });

  const approxKb = Math.round((compressed.length * 0.75) / 1024);
  if (approxKb > 4500) {
    throw new Error('Imagem ainda muito grande após compressão. Envie um arquivo menor.');
  }

  return {
    base64: compressed,
    label: `${file.name} (~${approxKb} KB)`,
  };
}

function maskMonthYear(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function maskCep(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: '0.9rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#475569',
  marginBottom: 4,
};

export default function KonsigaCompletionFlow({ token, konsiga, prefill, onUpdated }: Props) {
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [smsMessage, setSmsMessage] = useState<string | null>(
    konsiga.smsSent ? 'Código SMS enviado anteriormente. Você pode reenviar se necessário.' : null
  );

  const [email, setEmail] = useState(prefill?.email || '');
  const [telefoneResidencial, setTelefoneResidencial] = useState('');
  const [tokenConfirmacao, setTokenConfirmacao] = useState('');

  const [cep, setCep] = useState(maskCep(prefill?.cep || ''));
  const [logradouro, setLogradouro] = useState(prefill?.logradouro || '');
  const [numero, setNumero] = useState(prefill?.numero || '');
  const [complemento, setComplemento] = useState(prefill?.complemento || '');
  const [bairro, setBairro] = useState(prefill?.bairro || '');
  const [cidade, setCidade] = useState(prefill?.cidade || '');
  const [estado, setEstado] = useState((prefill?.estado || '').toUpperCase().slice(0, 2));

  const [idOcupacao, setIdOcupacao] = useState('1');
  const [profissaoQuery, setProfissaoQuery] = useState('');
  const [idProfissao, setIdProfissao] = useState('');
  const [atividadeDesde, setAtividadeDesde] = useState('');
  const [rendaMensal, setRendaMensal] = useState(
    prefill?.rendaMensal ? String(prefill.rendaMensal) : ''
  );
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cidadeComercial, setCidadeComercial] = useState(prefill?.cidade || '');
  const [estadoComercial, setEstadoComercial] = useState(
    (prefill?.estado || '').toUpperCase().slice(0, 2)
  );
  const [telefoneComercial, setTelefoneComercial] = useState('');

  const [docFrenteBase64, setDocFrenteBase64] = useState('');
  const [docFrenteLabel, setDocFrenteLabel] = useState('');
  const [docVersoBase64, setDocVersoBase64] = useState('');
  const [docVersoLabel, setDocVersoLabel] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = setTimeout(() => setSmsCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [smsCooldown]);

  const filteredProfissoes = useMemo(() => {
    const q = profissaoQuery
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    if (!q) return KONSIGA_PROFISSOES;
    return KONSIGA_PROFISSOES.filter(p => p.nome.includes(q));
  }, [profissaoQuery]);

  async function handleCepBlur() {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.erro) return;
      if (data.logradouro && !logradouro) setLogradouro(data.logradouro);
      if (data.bairro && !bairro) setBairro(data.bairro);
      if (data.localidade) {
        if (!cidade) setCidade(data.localidade);
        if (!cidadeComercial) setCidadeComercial(data.localidade);
      }
      if (data.uf) {
        const uf = String(data.uf).toUpperCase();
        if (!estado) setEstado(uf);
        if (!estadoComercial) setEstadoComercial(uf);
      }
    } catch {
      // Lookup de CEP é conveniência — ignorar erros de rede
    }
  }

  async function handleSendSms() {
    setSmsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/proposta/${token}/konsiga/send-token`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Não foi possível enviar o SMS.');
      }
      setSmsMessage(json.message || 'Código SMS enviado para o seu celular!');
      setSmsCooldown(45);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao enviar SMS.',
      });
    } finally {
      setSmsLoading(false);
    }
  }

  async function handleDocFile(side: 'front' | 'back', file: File | undefined) {
    if (!file) return;
    setFeedback(null);
    try {
      const result = await fileToNormalizedBase64(file);
      if (side === 'front') {
        setDocFrenteBase64(result.base64);
        setDocFrenteLabel(result.label);
      } else {
        setDocVersoBase64(result.base64);
        setDocVersoLabel(result.label);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao processar arquivo.',
      });
    }
  }

  async function handleCompleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!docFrenteBase64 || !docVersoBase64) {
      setFeedback({
        type: 'error',
        text: 'Envie a frente e o verso do seu documento (RG ou CNH) para continuar.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/proposta/${token}/konsiga/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          telefoneResidencial,
          tokenConfirmacao,
          enderecoResidencial: {
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
          },
          dadosComerciais: {
            atividadeDesde,
            cidade: cidadeComercial || cidade,
            estado: estadoComercial || estado,
            idOcupacao: Number(idOcupacao),
            ...(idProfissao ? { idProfissao: Number(idProfissao) } : {}),
            nomeEmpresa,
            rendaMensal: Number(rendaMensal.replace(',', '.')),
            telefone: telefoneComercial,
          },
          documentoFrenteBase64: docFrenteBase64,
          documentoVersoBase64: docVersoBase64,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Não foi possível enviar os dados.');
      }

      setFeedback({
        type: 'success',
        text: json.message || 'Documentação enviada com sucesso!',
      });
      await onUpdated();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao enviar documentação.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshStatus() {
    setRefreshing(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/proposta/${token}/konsiga/refresh-link`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Não foi possível atualizar o status.');
      }
      if (json.signingUrl) {
        setFeedback({
          type: 'success',
          text: 'Link de assinatura digital liberado! Clique abaixo para assinar.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Status atualizado: ${getKonsigaStatusMeta(json.externalStatus).label}.`,
        });
      }
      await onUpdated();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao verificar atualização.',
      });
    } finally {
      setRefreshing(false);
    }
  }

  const statusMeta = getKonsigaStatusMeta(konsiga.externalStatus);
  const currentStep = konsiga.signingUrl ? 3 : konsiga.completed ? 3 : 2;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        border: '1px solid #cbd5e1',
        padding: 28,
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        marginBottom: 28,
      }}
    >
      {/* Progress Steps */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 24,
        }}
      >
        {[
          { n: 1, title: 'Plano escolhido' },
          { n: 2, title: 'Dados & Documento' },
          { n: 3, title: 'Análise & Assinatura' },
        ].map(step => {
          const done = currentStep > step.n || (step.n === 3 && Boolean(konsiga.signingUrl));
          const active = currentStep === step.n;
          return (
            <div
              key={step.n}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: done ? '#ecfdf5' : active ? '#f0fdfa' : '#f8fafc',
                border: `1px solid ${done ? '#a7f3d0' : active ? '#0d9488' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: done ? '#059669' : active ? '#0d9488' : '#cbd5e1',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {done ? '✓' : step.n}
              </span>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: active || done ? 700 : 500,
                  color: done ? '#065f46' : active ? '#0f172a' : '#64748b',
                }}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            marginBottom: 20,
            backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5',
            border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
            color: feedback.type === 'error' ? '#991b1b' : '#065f46',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* ETAPA 3: Já enviou proposta completa -> Acompanhamento e Assinatura */}
      {konsiga.completed ? (
        <div>
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor:
                statusMeta.tone === 'success'
                  ? '#ecfdf5'
                  : statusMeta.tone === 'danger'
                    ? '#fef2f2'
                    : statusMeta.tone === 'warning'
                      ? '#fffbeb'
                      : '#f0fdfa',
              border: `1px solid ${
                statusMeta.tone === 'success'
                  ? '#a7f3d0'
                  : statusMeta.tone === 'danger'
                    ? '#fecaca'
                    : statusMeta.tone === 'warning'
                      ? '#fde68a'
                      : '#99f6e4'
              }`,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569', marginBottom: 4 }}>
              Status na Konsiga
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              {statusMeta.label}
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
              {statusMeta.description}
            </p>
          </div>

          {konsiga.signingUrl ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = konsiga.signingUrl!;
              }}
              style={{
                width: '100%',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.05rem',
                padding: '15px 20px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(13,148,136,0.25)',
                marginBottom: 12,
              }}
            >
              Assinar Contrato Digital na Konsiga →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={refreshing}
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '13px 18px',
                borderRadius: 10,
                border: 'none',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.7 : 1,
              }}
            >
              {refreshing ? 'Consultando Konsiga...' : '🔄 Verificar atualização / link de assinatura'}
            </button>
          )}
        </div>
      ) : (
        /* ETAPA 2: Formulário Guiado Konsiga (SMS + Endereço + Comerciais + RG/CNH) */
        <form onSubmit={handleCompleteSubmit}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            Complete seu cadastro para liberar o contrato
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 22px', lineHeight: 1.5 }}>
            A Konsiga pré-aprovou sua proposta inicial. Preencha os dados complementares abaixo e envie seu documento para concluir a análise e liberar a assinatura digital.
          </p>

          {/* Bloco 1: Token SMS */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 18,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                  1. Confirmação por SMS
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Enviaremos um código para o celular cadastrado {prefill?.celularMasked || ''}.
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendSms}
                disabled={smsLoading || smsCooldown > 0}
                style={{
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: smsCooldown > 0 ? '#94a3b8' : '#0d9488',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: smsLoading || smsCooldown > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {smsLoading
                  ? 'Enviando...'
                  : smsCooldown > 0
                    ? `Reenviar em ${smsCooldown}s`
                    : '📩 Enviar código SMS'}
              </button>
            </div>
            {smsMessage && (
              <div style={{ fontSize: '0.82rem', color: '#047857', marginBottom: 10, fontWeight: 600 }}>
                ✓ {smsMessage}
              </div>
            )}
            <div style={{ maxWidth: 260 }}>
              <label style={labelStyle}>Código recebido por SMS</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={tokenConfirmacao}
                onChange={e => setTokenConfirmacao(e.target.value.trim())}
                placeholder="Ex: 123456"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Bloco 2: Contato e Endereço Residencial */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: 12 }}>
              2. Contato e Endereço Residencial
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>E-mail *</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Telefone residencial (opcional)</label>
                <input
                  type="tel"
                  value={telefoneResidencial}
                  onChange={e => setTelefoneResidencial(e.target.value)}
                  placeholder="(11) 3333-4444"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>CEP *</label>
                <input
                  type="text"
                  required
                  value={cep}
                  onChange={e => setCep(maskCep(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Logradouro (Rua / Av.) *</label>
                <input type="text" required value={logradouro} onChange={e => setLogradouro(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Número *</label>
                <input type="text" required value={numero} onChange={e => setNumero(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Complemento</label>
                <input type="text" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Apto / Bloco" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Bairro *</label>
                <input type="text" required value={bairro} onChange={e => setBairro(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cidade *</label>
                <input type="text" required value={cidade} onChange={e => setCidade(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Estado (UF) *</label>
                <select required value={estado} onChange={e => setEstado(e.target.value)} style={inputStyle}>
                  <option value="">Selecionar</option>
                  {UF_LIST.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bloco 3: Dados Profissionais / Comerciais */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: 12 }}>
              3. Dados Profissionais e Renda
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>Ocupação *</label>
                <select required value={idOcupacao} onChange={e => setIdOcupacao(e.target.value)} style={inputStyle}>
                  {KONSIGA_OCUPACOES.map(o => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Renda mensal (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={rendaMensal}
                  onChange={e => setRendaMensal(e.target.value)}
                  placeholder="Ex: 4500"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Atividade desde (MM/AAAA) *</label>
                <input
                  type="text"
                  required
                  maxLength={7}
                  value={atividadeDesde}
                  onChange={e => setAtividadeDesde(maskMonthYear(e.target.value))}
                  placeholder="Ex: 03/2021"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Filtrar profissão</label>
                <input
                  type="text"
                  value={profissaoQuery}
                  onChange={e => setProfissaoQuery(e.target.value)}
                  placeholder="Digite para buscar..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Profissão (opcional)</label>
                <select value={idProfissao} onChange={e => setIdProfissao(e.target.value)} style={inputStyle}>
                  <option value="">Selecionar profissão ({filteredProfissoes.length})</option>
                  {filteredProfissoes.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nome da empresa (opcional)</label>
                <input type="text" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cidade do trabalho *</label>
                <input
                  type="text"
                  required
                  value={cidadeComercial}
                  onChange={e => setCidadeComercial(e.target.value)}
                  placeholder={cidade || 'Cidade'}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>UF do trabalho *</label>
                <select
                  required
                  value={estadoComercial}
                  onChange={e => setEstadoComercial(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecionar</option>
                  {UF_LIST.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Telefone comercial (opcional)</label>
                <input
                  type="tel"
                  value={telefoneComercial}
                  onChange={e => setTelefoneComercial(e.target.value)}
                  placeholder="(11) 3333-4444"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Bloco 4: Documentos Frente e Verso */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: 6 }}>
              4. Documento de Identidade (RG ou CNH)
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 12px' }}>
              Envie fotos legíveis ou PDF da frente e do verso do documento (JPG, PNG ou PDF).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 10, border: `1.5px dashed ${docFrenteBase64 ? '#059669' : '#cbd5e1'}`, backgroundColor: docFrenteBase64 ? '#f0fdf4' : '#f8fafc' }}>
                <label style={{ ...labelStyle, color: '#0f172a' }}>Frente do documento *</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={e => handleDocFile('front', e.target.files?.[0])}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
                {docFrenteLabel && (
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                    ✓ {docFrenteLabel}
                  </div>
                )}
              </div>
              <div style={{ padding: 14, borderRadius: 10, border: `1.5px dashed ${docVersoBase64 ? '#059669' : '#cbd5e1'}`, backgroundColor: docVersoBase64 ? '#f0fdf4' : '#f8fafc' }}>
                <label style={{ ...labelStyle, color: '#0f172a' }}>Verso do documento *</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={e => handleDocFile('back', e.target.files?.[0])}
                  style={{ fontSize: '0.82rem', width: '100%' }}
                />
                {docVersoLabel && (
                  <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                    ✓ {docVersoLabel}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '15px 20px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: submitting ? '#94a3b8' : '#0d9488',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 16px rgba(13,148,136,0.22)',
            }}
          >
            {submitting ? 'Enviando para a Konsiga...' : 'Enviar documentação para análise →'}
          </button>
        </form>
      )}
    </div>
  );
}
