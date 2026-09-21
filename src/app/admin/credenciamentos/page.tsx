'use client';
// app/admin/credenciamentos/page.tsx — Listagem de credenciamentos de clínicas

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ClinicOnboarding, OnboardingStatus } from '@/lib/benavera-db';

// ── Configuração de status ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OnboardingStatus, { label: string; color: string; bg: string }> = {
  DRAFT:               { label: 'Rascunho',            color: '#64748b', bg: '#f1f5f9' },
  PRE_REGISTERED:      { label: 'Pré-cadastro',         color: '#7c3aed', bg: '#f5f3ff' },
  INVITE_SENT:         { label: 'Convite enviado',      color: '#2563eb', bg: '#eff6ff' },
  INVITE_OPENED:       { label: 'Link aberto',          color: '#0891b2', bg: '#ecfeff' },
  IN_PROGRESS:         { label: 'Em preenchimento',     color: '#d97706', bg: '#fffbeb' },
  PENDING_DOCUMENTS:   { label: 'Doc. pendentes',       color: '#ea580c', bg: '#fff7ed' },
  SUBMITTED:           { label: 'Enviado',              color: '#6370f1', bg: '#f0f4ff' },
  UNDER_REVIEW:        { label: 'Em análise',           color: '#7c3aed', bg: '#f5f3ff' },
  CORRECTION_REQUIRED: { label: 'Correção solicitada',  color: '#dc2626', bg: '#fef2f2' },
  APPROVED:            { label: 'Aprovado',             color: '#059669', bg: '#f0fdf4' },
  CONTRACT_PENDING:    { label: 'Contrato pendente',    color: '#d97706', bg: '#fffbeb' },
  CONTRACT_SIGNED:     { label: 'Contrato assinado',    color: '#059669', bg: '#f0fdf4' },
  ACTIVE:              { label: 'Ativo',                color: '#059669', bg: '#ecfdf5' },
  REJECTED:            { label: 'Reprovado',            color: '#dc2626', bg: '#fef2f2' },
  EXPIRED:             { label: 'Expirado',             color: '#64748b', bg: '#f1f5f9' },
  REVOKED:             { label: 'Revogado',             color: '#64748b', bg: '#f1f5f9' },
  SUSPENDED:           { label: 'Suspenso',             color: '#dc2626', bg: '#fef2f2' },
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'PRE_REGISTERED', label: 'Pré-cadastro' },
  { value: 'INVITE_SENT', label: 'Convite enviado' },
  { value: 'IN_PROGRESS', label: 'Em preenchimento' },
  { value: 'PENDING_DOCUMENTS', label: 'Doc. pendentes' },
  { value: 'SUBMITTED', label: 'Enviado' },
  { value: 'UNDER_REVIEW', label: 'Em análise' },
  { value: 'CORRECTION_REQUIRED', label: 'Correção solicitada' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'REJECTED', label: 'Reprovado' },
  { value: 'REVOKED', label: 'Revogado' },
];

// ── Formulário de pré-cadastro ────────────────────────────────────────────────
function PreCadastroModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    tradeName: '', legalName: '', cnpj: '', contactName: '', contactCpf: '',
    phone: '', email: '', city: '', state: 'SP', specialty: '',
    averageTicket: '', internalNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/onboardings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar pré-cadastro');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, opts?: { required?: boolean; type?: string; placeholder?: string }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {opts?.required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <input
        type={opts?.type || 'text'}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder || ''}
        required={opts?.required}
        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = '#6370f1'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  );

  const UFs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#1c1d4c' }}>Criar pré-credenciamento</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Preencha os dados que a clínica já enviou via WhatsApp</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', padding: '4px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={{ gridColumn: '1/-1' }}>{field('Nome da Clínica', 'tradeName', { required: true, placeholder: 'Ex: Odonto Prime' })}</div>
            {field('Razão Social', 'legalName', { placeholder: 'Se já informado' })}
            {field('CNPJ', 'cnpj', { placeholder: 'Se já informado' })}
            {field('Nome do Responsável', 'contactName', { required: true, placeholder: 'Nome completo' })}
            {field('CPF do Responsável', 'contactCpf', { placeholder: 'Se já informado' })}
            {field('WhatsApp', 'phone', { required: true, type: 'tel', placeholder: '(11) 99999-9999' })}
            {field('E-mail', 'email', { required: true, type: 'email', placeholder: 'contato@clinica.com.br' })}
            {field('Cidade', 'city', { required: true, placeholder: 'Ex: São Paulo' })}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estado <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', background: 'white' }}>
              {UFs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {field('Especialidade principal', 'specialty', { placeholder: 'Ex: Odontologia, Fisioterapia…' })}
            {field('Ticket médio aprox.', 'averageTicket', { placeholder: 'Ex: R$ 2.000 a 5.000' })}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Observações internas
            </label>
            <textarea value={form.internalNotes} onChange={e => setForm(f => ({ ...f, internalNotes: e.target.value }))}
              rows={3} placeholder="Contexto da conversa, indicação, observações da equipe..."
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '14px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: '#64748b' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6370f1,#4040ca)', color: 'white', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Criando…' : 'Criar pré-credenciamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CredenciamentosPage() {
  const router = useRouter();
  const [items, setItems] = useState<ClinicOnboarding[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [generatingLink, setGeneratingLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter, limit: '50' });
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/onboardings?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleGenerateLink = async (id: string, email: boolean) => {
    setGeneratingLink(id);
    try {
      const res = await fetch(`/api/admin/onboardings/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: email }),
      });
      const data = await res.json();
      if (res.ok) {
        try {
          await navigator.clipboard.writeText(data.inviteUrl);
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 4000);
        } catch {
          window.prompt('Link de credenciamento gerado com sucesso! Copie abaixo:', data.inviteUrl);
        }
        fetchItems();
      } else {
        alert(data.error || 'Erro ao gerar link');
      }
    } catch (e) {
      alert('Erro de conexão ao gerar link.');
    } finally {
      setGeneratingLink(null);
    }
  };

  const handleRevokeLink = async (id: string) => {
    if (!confirm('Revogar o link atual? A clínica não conseguirá mais acessar pelo link anterior.')) return;
    await fetch(`/api/admin/onboardings/${id}/invite`, { method: 'DELETE' });
    fetchItems();
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const ProgressBar = ({ percent, alerts }: { percent: number; alerts: boolean }) => (
    <div style={{ minWidth: '120px' }}>
      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: alerts ? '#f59e0b' : '#6370f1', borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'block' }}>{percent}%</span>
    </div>
  );

  const StatusBadge = ({ status }: { status: OnboardingStatus }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: '#64748b', bg: '#f1f5f9' };
    return (
      <span style={{ background: cfg.bg, color: cfg.color, fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ padding: '36px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
            🪪 Credenciamentos
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            {total} credenciamento{total !== 1 ? 's' : ''} no total
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#6370f1,#4040ca)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(99,112,241,0.3)' }}>
          + Criar pré-credenciamento
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar clínica, CNPJ, responsável, email..."
            style={{ padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', width: '300px', fontFamily: 'inherit', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#6370f1'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
          <button type="submit" style={{ padding: '9px 16px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
            Buscar
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
              style={{ padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}>
              ✕ Limpar
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '6px 12px', borderRadius: '20px', border: '1.5px solid',
                borderColor: statusFilter === f.value ? '#6370f1' : '#e2e8f0',
                background: statusFilter === f.value ? '#f0f4ff' : 'white',
                color: statusFilter === f.value ? '#4040ca' : '#64748b',
                fontSize: '12px', fontWeight: statusFilter === f.value ? '700' : '500',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '14px' }}>Carregando credenciamentos…</div>
      ) : items.length === 0 ? (
        <div style={{ background: 'white', border: '1.5px dashed #e2e8f0', borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🪪</p>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#1c1d4c', margin: '0 0 8px' }}>Nenhum credenciamento encontrado</p>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {search ? 'Tente ajustar os filtros de busca.' : 'Clique em "Criar pré-credenciamento" para começar.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Clínica', 'CNPJ', 'Responsável', 'Cidade/UF', 'Criado', 'Enviado', 'Progresso', 'Status', 'Alertas', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const hasAlert = item.bank_titularity_divergence;
                return (
                  <tr key={item.id}
                    style={{ borderBottom: i < items.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/admin/credenciamentos/${item.id}`}
                        style={{ textDecoration: 'none', textAlign: 'left', display: 'block' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>{item.trade_name}</p>
                        {item.specialty && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>{item.specialty}</p>}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569', fontFamily: 'monospace' }}>
                      {item.cnpj || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155' }}>{item.contact_name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>{item.phone}</p>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                      {item.city}/{item.state}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>{formatDate(item.created_at)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' }}>{formatDate(item.submitted_at)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <ProgressBar percent={item.progress_percent} alerts={Boolean(hasAlert)} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {hasAlert && (
                        <span title="Titularidade bancária divergente" style={{ fontSize: '16px', cursor: 'help' }}>⚠️</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <Link href={`/admin/credenciamentos/${item.id}`}
                          style={{ textDecoration: 'none', padding: '6px 10px', background: '#f0f4ff', color: '#4040ca', borderRadius: '6px', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                          Ver
                        </Link>

                        {['PRE_REGISTERED', 'INVITE_SENT', 'INVITE_OPENED', 'IN_PROGRESS', 'PENDING_DOCUMENTS', 'CORRECTION_REQUIRED'].includes(item.status) && (
                          <button
                            onClick={() => handleGenerateLink(item.id, true)}
                            disabled={generatingLink === item.id}
                            style={{ padding: '6px 10px', background: copiedId === item.id ? '#f0fdf4' : '#f8fafc', color: copiedId === item.id ? '#059669' : '#64748b', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            {copiedId === item.id ? '✓ Copiado' : generatingLink === item.id ? '…' : '🔗 Link'}
                          </button>
                        )}

                        {item.status === 'SUBMITTED' && (
                          <Link href={`/admin/credenciamentos/${item.id}`}
                            style={{ textDecoration: 'none', padding: '6px 10px', background: '#fef3c7', color: '#d97706', borderRadius: '6px', fontSize: '12px', fontWeight: '700', fontFamily: 'inherit', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
                            Analisar
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PreCadastroModal
          onClose={() => setShowModal(false)}
          onSuccess={fetchItems}
        />
      )}
    </div>
  );
}
