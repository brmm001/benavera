'use client';
// app/admin/credenciamentos/[id]/page.tsx — Página individual de credenciamento

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ClinicOnboarding, OnboardingDocument, OnboardingAuditLog, OnboardingStatus } from '@/lib/benavera-db';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', PRE_REGISTERED: 'Pré-cadastro', INVITE_SENT: 'Convite enviado',
  INVITE_OPENED: 'Link aberto', IN_PROGRESS: 'Em preenchimento', PENDING_DOCUMENTS: 'Doc. pendentes',
  SUBMITTED: 'Enviado', UNDER_REVIEW: 'Em análise', CORRECTION_REQUIRED: 'Correção solicitada',
  APPROVED: 'Aprovado', CONTRACT_PENDING: 'Contrato pendente', CONTRACT_SIGNED: 'Contrato assinado',
  ACTIVE: 'Ativo', REJECTED: 'Reprovado', EXPIRED: 'Expirado', REVOKED: 'Revogado', SUSPENDED: 'Suspenso',
};

const REVIEW_STATUS_CONFIG = {
  PENDING: { label: 'Pendente', color: '#94a3b8', bg: '#f1f5f9' },
  VALIDATED: { label: '✓ Validado', color: '#059669', bg: '#f0fdf4' },
  CORRECTION_REQUESTED: { label: '⚠ Correção necessária', color: '#d97706', bg: '#fffbeb' },
  REJECTED: { label: '✕ Rejeitado', color: '#dc2626', bg: '#fef2f2' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '14px', padding: '24px', marginBottom: '20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === null || value === undefined || value === '') return null;
  const displayValue = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : value;
  return (
    <div style={{ marginBottom: '12px' }}>
      <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{displayValue}</p>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0 24px' }}>{children}</div>;
}

export default function OnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [onboarding, setOnboarding] = useState<ClinicOnboarding | null>(null);
  const [documents, setDocuments] = useState<Array<OnboardingDocument & { signedUrl?: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<OnboardingAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos' | 'auditoria' | 'observacoes'>('dados');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [reviewingDoc, setReviewingDoc] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    params.then(p => setId(p.id));
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUserRole(d.user.role); });
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/onboardings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOnboarding(data.onboarding);
        setDocuments(data.documents || []);
        setAuditLogs(data.auditLogs || []);
      } else if (res.status === 404) {
        router.push('/admin/credenciamentos');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateLink = async (sendEmail: boolean) => {
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/admin/onboardings/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteUrl(data.inviteUrl);
        await navigator.clipboard.writeText(data.inviteUrl);
        fetchData();
      } else {
        alert(data.error || 'Erro ao gerar link');
      }
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusActionLoading(true);
    try {
      const res = await fetch(`/api/admin/onboardings/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, message: statusMessage, reason: statusReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowStatusModal(null);
        setStatusMessage(''); setStatusReason('');
        fetchData();
      } else {
        alert(data.error || 'Erro ao alterar status');
      }
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleDocumentReview = async (docId: string, reviewStatus: string) => {
    try {
      const res = await fetch(`/api/admin/onboardings/${id}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus, reviewNote, correctionMessage: reviewMessage }),
      });
      if (res.ok) {
        setReviewingDoc(null); setReviewNote(''); setReviewMessage('');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao revisar documento');
      }
    } catch { alert('Erro ao revisar documento'); }
  };

  const handleViewDocument = async (docId: string, action = 'view') => {
    const res = await fetch(`/api/admin/onboardings/${id}/documents/${docId}?action=${action === 'download' ? 'download' : 'view'}`);
    const data = await res.json();
    if (data.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      alert('Erro ao acessar documento');
    }
  };

  const canManageInvites = ['BENAVERA_ADMIN', 'BENAVERA_COMERCIAL', 'BENAVERA_COMPLIANCE'].includes(userRole);
  const canViewDocs = ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'].includes(userRole);
  const canApprove = ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'].includes(userRole);
  const canActivate = userRole === 'BENAVERA_ADMIN';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <p style={{ fontSize: '32px', margin: '0 0 12px' }}>⏳</p>
        <p style={{ fontSize: '14px' }}>Carregando credenciamento…</p>
      </div>
    </div>
  );

  if (!onboarding) return null;

  const statusCfg = STATUS_LABELS[onboarding.status] || onboarding.status;

  return (
    <div style={{ padding: '36px 48px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <button onClick={() => router.push('/admin/credenciamentos')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6370f1', fontSize: '13px', padding: 0, marginBottom: '12px', fontFamily: 'inherit' }}>
          ← Credenciamentos
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: '800', color: '#1c1d4c' }}>
              {onboarding.trade_name}
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{onboarding.contact_name}</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{onboarding.city}/{onboarding.state}</span>
              {onboarding.cnpj && (
                <>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>•</span>
                  <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{onboarding.cnpj}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', background: '#f0f4ff', color: '#4040ca' }}>
              {statusCfg}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px' }}>
              Progresso: {onboarding.progress_percent}%
            </span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={{ marginTop: '16px', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${onboarding.progress_percent}%`, background: 'linear-gradient(90deg, #6370f1, #4040ca)', borderRadius: '4px', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Alertas */}
      {onboarding.bank_titularity_divergence && (
        <div style={{ background: '#fef9ec', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#92400e' }}>
            Titularidade bancária divergente — CNPJ da clínica não coincide com CPF/CNPJ do titular da conta. Validação manual necessária.
          </p>
        </div>
      )}

      {/* Ações principais */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid #f1f5f9', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {canManageInvites && ['PRE_REGISTERED', 'INVITE_SENT', 'INVITE_OPENED', 'IN_PROGRESS', 'PENDING_DOCUMENTS', 'CORRECTION_REQUIRED'].includes(onboarding.status) && (
          <>
            <button onClick={() => handleGenerateLink(false)} disabled={generatingLink}
              style={{ padding: '10px 18px', background: '#f0f4ff', color: '#4040ca', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
              {generatingLink ? '…' : '🔗 Gerar link'}
            </button>
            <button onClick={() => handleGenerateLink(true)} disabled={generatingLink}
              style={{ padding: '10px 18px', background: '#f0f4ff', color: '#4040ca', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
              📧 Gerar + enviar e-mail
            </button>
          </>
        )}

        {inviteUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '8px 14px', borderRadius: '8px', flexGrow: 1 }}>
            <span style={{ fontSize: '13px', color: '#059669', fontFamily: 'monospace', wordBreak: 'break-all' }}>{inviteUrl}</span>
            <button onClick={() => navigator.clipboard.writeText(inviteUrl)}
              style={{ padding: '4px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', flexShrink: 0 }}>
              Copiar
            </button>
          </div>
        )}

        {onboarding.status === 'SUBMITTED' && canApprove && (
          <button onClick={() => setShowStatusModal('UNDER_REVIEW')}
            style={{ padding: '10px 18px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
            📋 Iniciar análise
          </button>
        )}

        {onboarding.status === 'UNDER_REVIEW' && canApprove && (
          <>
            <button onClick={() => setShowStatusModal('APPROVED')}
              style={{ padding: '10px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
              ✓ Aprovar
            </button>
            <button onClick={() => setShowStatusModal('CORRECTION_REQUIRED')}
              style={{ padding: '10px 18px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
              ⚠ Solicitar correção
            </button>
            <button onClick={() => setShowStatusModal('REJECTED')}
              style={{ padding: '10px 18px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
              ✕ Reprovar
            </button>
          </>
        )}

        {onboarding.status === 'APPROVED' && canActivate && (
          <button onClick={() => setShowStatusModal('ACTIVE')}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '800', fontFamily: 'inherit' }}>
            🚀 Ativar clínica
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f8fafc', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'dados', label: 'Dados' },
          { key: 'documentos', label: `Documentos (${documents.length})` },
          { key: 'auditoria', label: `Auditoria (${auditLogs.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{
              padding: '8px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? '#1c1d4c' : '#64748b',
              fontWeight: activeTab === tab.key ? '700' : '500',
              fontSize: '13px', fontFamily: 'inherit',
              boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Dados */}
      {activeTab === 'dados' && (
        <>
          <Section title="Dados do pré-cadastro (Benavera)">
            <Grid>
              <Field label="Nome da clínica" value={onboarding.trade_name} />
              <Field label="Razão social" value={onboarding.legal_name} />
              <Field label="CNPJ" value={onboarding.cnpj} />
              <Field label="Responsável" value={onboarding.contact_name} />
              <Field label="CPF do responsável" value={onboarding.contact_cpf} />
              <Field label="WhatsApp" value={onboarding.phone} />
              <Field label="E-mail" value={onboarding.email} />
              <Field label="Cidade/UF" value={`${onboarding.city}/${onboarding.state}`} />
              <Field label="Especialidade" value={onboarding.specialty} />
              <Field label="Ticket médio" value={onboarding.average_ticket} />
            </Grid>
            {onboarding.internal_notes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginTop: '16px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>Observações internas</p>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{onboarding.internal_notes}</p>
              </div>
            )}
          </Section>

          {onboarding.address_street && (
            <Section title="Dados complementares">
              <Grid>
                <Field label="Endereço" value={onboarding.address_street as string} />
                <Field label="Número" value={onboarding.address_number as string} />
                <Field label="Complemento" value={onboarding.address_complement as string} />
                <Field label="Bairro" value={onboarding.address_neighborhood as string} />
                <Field label="CEP" value={onboarding.address_cep as string} />
                <Field label="E-mail administrativo" value={onboarding.email_admin as string} />
                <Field label="E-mail financeiro" value={onboarding.email_financial as string} />
                <Field label="Site" value={onboarding.website as string} />
              </Grid>
            </Section>
          )}

          {onboarding.legal_rep_name && (
            <Section title="Responsável legal">
              <Grid>
                <Field label="Nome" value={onboarding.legal_rep_name as string} />
                <Field label="CPF" value={onboarding.legal_rep_cpf as string} />
                <Field label="Cargo" value={onboarding.legal_rep_role as string} />
                <Field label="E-mail" value={onboarding.legal_rep_email as string} />
                <Field label="Telefone" value={onboarding.legal_rep_phone as string} />
                <Field label="Poderes de representação" value={onboarding.legal_rep_has_powers} />
              </Grid>
            </Section>
          )}

          {onboarding.tech_rep_name && (
            <Section title="Responsável técnico">
              <Grid>
                <Field label="Nome" value={onboarding.tech_rep_name as string} />
                <Field label="CPF" value={onboarding.tech_rep_cpf as string} />
                <Field label="Conselho" value={onboarding.tech_rep_council as string} />
                <Field label="Número registro" value={onboarding.tech_rep_council_number as string} />
                <Field label="UF registro" value={onboarding.tech_rep_council_state as string} />
                <Field label="CNES" value={onboarding.cnes as string} />
                <Field label="Licença sanitária" value={onboarding.sanitary_license_number as string} />
              </Grid>
            </Section>
          )}

          {canViewDocs && onboarding.bank_name && (
            <Section title="Dados bancários">
              {onboarding.bank_titularity_divergence && (
                <div style={{ background: '#fef9ec', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
                  ⚠️ Titularidade bancária divergente — requer análise manual
                </div>
              )}
              <Grid>
                <Field label="Banco" value={onboarding.bank_name as string} />
                <Field label="Agência" value={onboarding.bank_agency as string} />
                <Field label="Conta" value={onboarding.bank_account as string} />
                <Field label="Tipo" value={onboarding.bank_account_type as string} />
                <Field label="Titular" value={onboarding.bank_holder_name as string} />
                <Field label="CPF/CNPJ titular" value={onboarding.bank_holder_document as string} />
                <Field label="Chave Pix" value={onboarding.bank_pix_key as string} />
              </Grid>
            </Section>
          )}
        </>
      )}

      {/* Tab: Documentos */}
      {activeTab === 'documentos' && (
        <Section title="Documentos">
          {!canViewDocs ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Sem permissão para visualizar documentos.
            </div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nenhum documento ainda.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map(doc => {
                const reviewCfg = REVIEW_STATUS_CONFIG[doc.review_status] || REVIEW_STATUS_CONFIG.PENDING;
                return (
                  <div key={doc.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>
                            {doc.document_label}
                            {doc.is_required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
                          </p>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: reviewCfg.bg, color: reviewCfg.color }}>
                            {reviewCfg.label}
                          </span>
                        </div>
                        {doc.original_filename && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                            {doc.original_filename}
                            {doc.size_bytes && ` · ${(doc.size_bytes / 1024 / 1024).toFixed(2)} MB`}
                            {doc.current_version > 1 && ` · v${doc.current_version}`}
                          </p>
                        )}
                        {!doc.storage_key && (
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>Documento não enviado</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {doc.storage_key && doc.scan_status === 'CLEAN' && (
                          <>
                            <button onClick={() => handleViewDocument(doc.id)}
                              style={{ padding: '7px 14px', background: '#f0f4ff', color: '#4040ca', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}>
                              Visualizar
                            </button>
                            <button onClick={() => handleViewDocument(doc.id, 'download')}
                              style={{ padding: '7px 14px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                              Download
                            </button>
                          </>
                        )}
                        {doc.storage_key && (
                          <button onClick={() => { setReviewingDoc(doc.id); setReviewNote(''); setReviewMessage(''); }}
                            style={{ padding: '7px 14px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                            Revisar
                          </button>
                        )}
                      </div>
                    </div>

                    {reviewingDoc === doc.id && (
                      <div style={{ marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Observação interna</label>
                            <input value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                              placeholder="Visível apenas para a equipe"
                              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Mensagem para a clínica</label>
                            <input value={reviewMessage} onChange={e => setReviewMessage(e.target.value)}
                              placeholder="O que a clínica precisa corrigir"
                              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleDocumentReview(doc.id, 'VALIDATED')}
                            style={{ padding: '7px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}>
                            ✓ Validar
                          </button>
                          <button onClick={() => handleDocumentReview(doc.id, 'CORRECTION_REQUESTED')}
                            style={{ padding: '7px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}>
                            ⚠ Solicitar correção
                          </button>
                          <button onClick={() => handleDocumentReview(doc.id, 'REJECTED')}
                            style={{ padding: '7px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit' }}>
                            ✕ Rejeitar
                          </button>
                          <button onClick={() => setReviewingDoc(null)}
                            style={{ padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', fontFamily: 'inherit' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {doc.review_note && (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                        📝 {doc.review_note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Tab: Auditoria */}
      {activeTab === 'auditoria' && (
        <Section title="Log de auditoria">
          {auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Sem eventos registrados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {auditLogs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 12px', borderRadius: '8px', alignItems: 'flex-start' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', marginTop: '2px', fontFamily: 'monospace' }}>
                    {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div>
                    <span style={{ fontSize: '13px', color: '#334155' }}>
                      <strong>{log.actor_name || log.actor_type}</strong>
                      {log.actor_role && <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>({log.actor_role})</span>}
                      {' '}—{' '}
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    {log.ip && <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>· IP: {log.ip}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Modal de confirmação de status */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '800', color: '#1c1d4c' }}>
              {showStatusModal === 'APPROVED' ? '✓ Aprovar credenciamento' :
               showStatusModal === 'REJECTED' ? '✕ Reprovar credenciamento' :
               showStatusModal === 'CORRECTION_REQUIRED' ? '⚠ Solicitar correção' :
               showStatusModal === 'ACTIVE' ? '🚀 Ativar clínica' :
               `Alterar status para: ${STATUS_LABELS[showStatusModal]}`}
            </h3>

            {['REJECTED', 'CORRECTION_REQUIRED'].includes(showStatusModal) && (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Motivo interno
                  </label>
                  <input value={statusReason} onChange={e => setStatusReason(e.target.value)}
                    placeholder="Registrado apenas para a equipe"
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Mensagem para a clínica
                  </label>
                  <textarea value={statusMessage} onChange={e => setStatusMessage(e.target.value)}
                    rows={3} placeholder="O que a clínica deve saber ou corrigir"
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </>
            )}

            {showStatusModal === 'ACTIVE' && (
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
                Confirmar a ativação da clínica? Isso criará o registro definitivo da clínica na plataforma Benavera.
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowStatusModal(null)}
                style={{ padding: '10px 18px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => handleStatusChange(showStatusModal)} disabled={statusActionLoading}
                style={{
                  padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: statusActionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', color: 'white',
                  background: showStatusModal === 'APPROVED' || showStatusModal === 'ACTIVE' ? '#059669' :
                              showStatusModal === 'REJECTED' ? '#dc2626' : '#f59e0b',
                  opacity: statusActionLoading ? 0.7 : 1,
                }}>
                {statusActionLoading ? 'Aguarde…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
