'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Users,
  Building2,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Inbox,
  Lock,
  Eye,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Trash2,
  PlusCircle,
  Clock,
  ShieldCheck,
  CheckCircle,
  LogOut,
  Loader2,
} from 'lucide-react';
import type { PatientLead, ClinicLead, LeadHistoryEvent, PatientLeadStatus, ClinicLeadStatus } from '@/types';

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCurrency(val?: number) {
  if (typeof val === 'number' && val > 0) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  }
  return '—';
}

export default function AdminLeadsPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const [activeTab, setActiveTab] = useState<'patients' | 'clinics' | 'metrics'>('patients');
  const [patientLeads, setPatientLeads] = useState<PatientLead[]>([]);
  const [clinicLeads, setClinicLeads] = useState<ClinicLead[]>([]);
  const [metrics, setMetrics] = useState<{
    totalPatientLeads: number;
    totalClinicLeads: number;
    averageTicket: number;
    patientStatusCount: Record<string, number>;
    clinicStatusCount: Record<string, number>;
    categoryCount: Record<string, number>;
    sourceCount: Record<string, number>;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal de Detalhes
  const [selectedLead, setSelectedLead] = useState<{
    id: string;
    type: 'patient' | 'clinic';
    data: PatientLead | ClinicLead;
  } | null>(null);
  const [leadEvents, setLeadEvents] = useState<LeadHistoryEvent[]>([]);
  const [newNote, setNewNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads?type=all&status=${statusFilter}&search=${encodeURIComponent(search)}`);
      if (res.status === 401) {
        setAuthenticated(false);
        setLoading(false);
        router.replace('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
        setPatientLeads(data.patientLeads || []);
        setClinicLeads(data.clinicLeads || []);
        setMetrics(data.metrics || null);
      } else {
        setAuthenticated(false);
        router.replace('/admin/login');
      }
    } catch (e) {
      console.error('[Admin] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, router]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Ignora erro
    }
    router.replace('/admin/login');
  };

  const openLeadDetails = async (id: string, type: 'patient' | 'clinic', data: PatientLead | ClinicLead) => {
    setSelectedLead({ id, type, data });
    try {
      const res = await fetch(`/api/admin/leads/${id}`);
      const json = await res.json();
      if (json.success) {
        setLeadEvents(json.events || []);
      }
    } catch (e) {
      console.error('Erro ao buscar histórico:', e);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedLead) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedLead.type,
          status: newStatus,
          note: newNote ? newNote.trim() : undefined,
        }),
      });
      if (res.ok) {
        setNewNote('');
        fetchLeads();
        // Recarrega eventos
        const evRes = await fetch(`/api/admin/leads/${selectedLead.id}`);
        const evJson = await evRes.json();
        if (evJson.success) setLeadEvents(evJson.events || []);
      }
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAnonymize = async () => {
    if (!selectedLead || !confirm('Tem certeza que deseja anonimizar os dados pessoais deste lead (LGPD)? Esta ação não pode ser desfeita.')) return;

    try {
      const res = await fetch(`/api/admin/leads/${selectedLead.id}?type=${selectedLead.type}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('Dados anonimizados com sucesso.');
        setSelectedLead(null);
        fetchLeads();
      }
    } catch (e) {
      console.error('Erro ao anonimizar lead:', e);
    }
  };

  // Se ainda estiver checando autenticação ou não autenticado
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', gap: '1rem' }}>
        <Loader2 className="animate-spin text-indigo-400" size={32} />
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Verificando autenticação...</p>
      </div>
    );
  }

  // PAINEL AUTENTICADO
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* Top Header */}
      <header style={{ background: '#0f172a', color: 'white', borderBottom: '1px solid #1e293b', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.03em' }}>
              bena<span style={{ color: '#8195f8' }}>vera</span> <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#94a3b8' }}>admin</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={fetchLeads}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: '#1e293b',
                color: '#cbd5e1',
                border: '1px solid #334155',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>

            <a
              href={`/api/admin/export?type=${activeTab === 'clinics' ? 'clinic' : 'patient'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: '#4338ca',
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}
            >
              <Download size={14} />
              Exportar CSV
            </a>

            <button
              onClick={handleLogout}
              title="Encerrar sessão"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.875rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('patients')}
            style={{
              padding: '0.75rem 1.25rem',
              borderBottom: activeTab === 'patients' ? '2px solid #4040ca' : '2px solid transparent',
              color: activeTab === 'patients' ? '#4040ca' : '#64748b',
              fontWeight: activeTab === 'patients' ? '700' : '500',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Users size={18} />
            Simulações de Pacientes ({patientLeads.length})
          </button>

          <button
            onClick={() => setActiveTab('clinics')}
            style={{
              padding: '0.75rem 1.25rem',
              borderBottom: activeTab === 'clinics' ? '2px solid #4040ca' : '2px solid transparent',
              color: activeTab === 'clinics' ? '#4040ca' : '#64748b',
              fontWeight: activeTab === 'clinics' ? '700' : '500',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Building2 size={18} />
            Clínicas Cadastradas ({clinicLeads.length})
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            style={{
              padding: '0.75rem 1.25rem',
              borderBottom: activeTab === 'metrics' ? '2px solid #4040ca' : '2px solid transparent',
              color: activeTab === 'metrics' ? '#4040ca' : '#64748b',
              fontWeight: activeTab === 'metrics' ? '700' : '500',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <BarChart3 size={18} />
            Métricas & Indicadores
          </button>
        </div>

        {/* METRICS VIEW */}
        {activeTab === 'metrics' && metrics && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Simulações Recebidas</span>
                <p style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0' }}>{metrics.totalPatientLeads}</p>
              </div>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Clínicas Interessadas</span>
                <p style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0' }}>{metrics.totalClinicLeads}</p>
              </div>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Ticket Médio Informado</span>
                <p style={{ fontSize: '2.25rem', fontWeight: '800', color: '#4040ca', margin: '0.5rem 0 0' }}>{formatCurrency(metrics.averageTicket)}</p>
              </div>
            </div>

            {/* Grids de Distribuição */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Distribuição por Tratamento</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {Object.entries(metrics.categoryCount).map(([cat, count]) => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#475569' }}>{cat}</span>
                      <strong style={{ color: '#0f172a' }}>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem' }}>Origem dos Leads</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {Object.entries(metrics.sourceCount).map(([src, count]) => (
                    <div key={src} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#475569' }}>{src}</span>
                      <strong style={{ color: '#0f172a' }}>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABELA DE PACIENTES */}
        {activeTab === 'patients' && (
          <div>
            {/* Filtros */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar por nome, cidade ou procedimento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
              >
                <option value="all">Todos os status</option>
                <option value="nova">Nova</option>
                <option value="em_analise">Em análise</option>
                <option value="contatada">Contatada</option>
                <option value="convertida">Convertida</option>
                <option value="perdida">Perdida</option>
              </select>
            </div>

            {/* Listagem */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Data</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Paciente</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>WhatsApp</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Cidade</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Tratamento</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Valor Orçamento</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {patientLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        Nenhuma simulação encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    patientLeads.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.875rem 1rem', color: '#64748b' }}>{formatDate(p.createdAt || p.timestamp)}</td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: '600', color: '#0f172a' }}>{p.nome}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{p.telefone}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>{p.cidade}</td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: '500' }}>{p.tratamento}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#4040ca', fontWeight: '600' }}>{formatCurrency(p.valorTratamento)}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: p.status === 'convertida' ? '#dcfce7' : p.status === 'nova' ? '#e0e7ff' : '#f1f5f9',
                              color: p.status === 'convertida' ? '#166534' : p.status === 'nova' ? '#3730a3' : '#475569',
                            }}
                          >
                            {p.status || 'nova'}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => openLeadDetails(p.id!, 'patient', p)}
                            style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABELA DE CLÍNICAS */}
        {activeTab === 'clinics' && (
          <div>
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Data</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Clínica</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Responsável</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>WhatsApp</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Cidade</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Especialidade</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clinicLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        Nenhum cadastro de clínica encontrado.
                      </td>
                    </tr>
                  ) : (
                    clinicLeads.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.875rem 1rem', color: '#64748b' }}>{formatDate(c.createdAt || c.timestamp)}</td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: '700', color: '#0f172a' }}>{c.nomeClinica}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{c.nome}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{c.whatsapp}</td>
                        <td style={{ padding: '0.875rem 1rem', color: '#475569' }}>{c.cidade}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>{c.especialidade}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', background: '#f0fdf4', color: '#15803d' }}>
                            {c.statusComercial || 'novo'}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => openLeadDetails(c.id!, 'clinic', c)}
                            style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE DETALHES DO LEAD */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>
                Detalhes do Lead ({selectedLead.type === 'patient' ? 'Paciente' : 'Clínica'})
              </h2>
              <button onClick={() => setSelectedLead(null)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>
                ×
              </button>
            </div>

            {/* Informações Principais */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div><strong>Nome:</strong> {selectedLead.data.nome}</div>
              <div><strong>Contato:</strong> {(selectedLead.data as PatientLead).telefone || (selectedLead.data as ClinicLead).whatsapp}</div>
              <div><strong>Cidade:</strong> {selectedLead.data.cidade}</div>
              <div><strong>Origem:</strong> {selectedLead.data.origem}</div>
              <div><strong>UTM Source:</strong> {selectedLead.data.utmSource || '—'}</div>
              <div><strong>UTM Campaign:</strong> {selectedLead.data.utmCampaign || '—'}</div>
            </div>

            {/* Alterar Status */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Atualizar Status do Lead:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedLead.type === 'patient'
                  ? ['nova', 'em_analise', 'contatada', 'convertida', 'perdida'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        disabled={updatingStatus}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: (selectedLead.data as PatientLead).status === st ? '#4040ca' : 'white',
                          color: (selectedLead.data as PatientLead).status === st ? 'white' : '#0f172a',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {st}
                      </button>
                    ))
                  : ['novo', 'em_contato', 'em_negociacao', 'parceiro_ativo', 'perdido'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        disabled={updatingStatus}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: (selectedLead.data as ClinicLead).statusComercial === st ? '#4040ca' : 'white',
                          color: (selectedLead.data as ClinicLead).statusComercial === st ? 'white' : '#0f172a',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                        }}
                      >
                        {st}
                      </button>
                    ))}
              </div>
            </div>

            {/* Adicionar Anotação */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Adicionar Nota / Observação:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Ex: Paciente aguardando aprovação bancária..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ flex: 1, padding: '0.625rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <button
                  onClick={() => handleUpdateStatus(selectedLead.type === 'patient' ? (selectedLead.data as PatientLead).status || 'nova' : (selectedLead.data as ClinicLead).statusComercial || 'novo')}
                  disabled={!newNote.trim() || updatingStatus}
                  style={{ padding: '0.625rem 1rem', background: '#0f172a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Salvar Nota
                </button>
              </div>
            </div>

            {/* Linha do Tempo / Eventos */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>Histórico de Eventos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {leadEvents.map((ev) => (
                  <div key={ev.id} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{ev.eventType}</span>
                      <span>{formatDate(ev.createdAt)}</span>
                    </div>
                    <div>{ev.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações LGPD */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleAnonymize}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#dc2626', background: 'none', border: 'none', fontSize: '0.8125rem', cursor: 'pointer' }}
              >
                <Trash2 size={14} />
                Anonimizar dados (LGPD)
              </button>

              <button
                onClick={() => setSelectedLead(null)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
