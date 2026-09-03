'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Building2, BarChart3, Download, Search, RefreshCw,
  LogOut, X, Clock, TrendingUp, ChevronRight, Loader2,
  Trash2, Activity, AlertCircle, CheckCircle, Circle,
  Eye, EyeOff, Send, ArrowUpRight,
} from 'lucide-react';
import { logout } from '@/app/actions/auth';
import type { PatientLead, ClinicLead, LeadHistoryEvent, PatientLeadStatus, ClinicLeadStatus } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

function fmtShort(iso?: string) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short',
    }).format(new Date(iso));
  } catch { return iso; }
}

function fmtCurrency(val?: number) {
  if (typeof val === 'number' && val > 0) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  }
  return '—';
}

// Status configs
const PATIENT_STATUSES: { value: PatientLeadStatus; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'nova', label: 'Nova', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', dot: '#818cf8' },
  { value: 'em_analise', label: 'Em análise', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', dot: '#fb923c' },
  { value: 'contatada', label: 'Contatada', color: '#34d399', bg: 'rgba(52,211,153,0.12)', dot: '#34d399' },
  { value: 'convertida', label: 'Convertida', color: '#4ade80', bg: 'rgba(74,222,128,0.15)', dot: '#4ade80' },
  { value: 'perdida', label: 'Perdida', color: '#f87171', bg: 'rgba(248,113,113,0.12)', dot: '#f87171' },
];

const CLINIC_STATUSES: { value: ClinicLeadStatus; label: string; color: string; bg: string; dot: string }[] = [
  { value: 'novo', label: 'Novo', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', dot: '#818cf8' },
  { value: 'em_contato', label: 'Em contato', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', dot: '#fb923c' },
  { value: 'em_negociacao', label: 'Em negociação', color: '#facc15', bg: 'rgba(250,204,21,0.12)', dot: '#facc15' },
  { value: 'parceiro_ativo', label: 'Parceiro ativo', color: '#4ade80', bg: 'rgba(74,222,128,0.15)', dot: '#4ade80' },
  { value: 'perdido', label: 'Perdido', color: '#f87171', bg: 'rgba(248,113,113,0.12)', dot: '#f87171' },
];

function getPatientStatus(status?: string) {
  return PATIENT_STATUSES.find(s => s.value === status) ?? PATIENT_STATUSES[0];
}

function getClinicStatus(status?: string) {
  return CLINIC_STATUSES.find(s => s.value === status) ?? CLINIC_STATUSES[0];
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Metrics {
  totalPatientLeads: number;
  totalClinicLeads: number;
  averageTicket: number;
  patientStatusCount: Record<string, number>;
  clinicStatusCount: Record<string, number>;
  categoryCount: Record<string, number>;
  sourceCount: Record<string, number>;
}

interface Props {
  patientLeads: PatientLead[];
  clinicLeads: ClinicLead[];
  metrics: Metrics;
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ color, bg, dot, label }: { color: string; bg: string; dot: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px',
      background: bg, color, fontSize: '11px', fontWeight: '700',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot, display: 'inline-block' }} />
      {label}
    </span>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '24px',
    }}>
      <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
        {label}
      </p>
      <p style={{ fontSize: '36px', fontWeight: '800', color: color ?? 'white', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
        {value}
      </p>
      {subtitle && <p style={{ fontSize: '12px', color: '#334155', margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

// ─── LeadDetailModal ───────────────────────────────────────────────────────────

function LeadDetailModal({
  lead,
  onClose,
  onRefresh,
}: {
  lead: { id: string; type: 'patient' | 'clinic'; data: PatientLead | ClinicLead };
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [events, setEvents] = useState<LeadHistoryEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>(
    lead.type === 'patient'
      ? (lead.data as PatientLead).status ?? 'nova'
      : (lead.data as ClinicLead).statusComercial ?? 'novo'
  );

  // Load events on mount
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`);
      const json = await res.json();
      if (json.success) setEvents(json.events ?? []);
    } catch { /* silent */ }
    setEventsLoaded(true);
  }, [lead.id]);

  // Load on first render
  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleUpdateStatus = async (newStatus: string, withNote?: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: lead.type, status: newStatus, note: withNote }),
      });
      if (res.ok) {
        setLocalStatus(newStatus);
        setNote('');
        await loadEvents();
        onRefresh();
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  const handleAnonymize = async () => {
    if (!confirm('Anonimizar dados pessoais deste lead (LGPD)? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}?type=${lead.type}`, { method: 'DELETE' });
      if (res.ok) { onClose(); onRefresh(); }
    } catch { /* silent */ }
  };

  const isPatient = lead.type === 'patient';
  const d = lead.data;
  const statuses = isPatient ? PATIENT_STATUSES : CLINIC_STATUSES;
  const currentStatusConfig = isPatient ? getPatientStatus(localStatus) : getClinicStatus(localStatus);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
          background: '#0f1629',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPatient ? <Users size={16} color="#818cf8" /> : <Building2 size={16} color="#818cf8" />}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>
                {isPatient ? (d as PatientLead).nome : (d as ClinicLead).nomeClinica}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                {isPatient ? 'Lead de paciente' : 'Lead de clínica'} · #{lead.id.slice(-8)}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Info Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '12px', marginBottom: '24px',
          }}>
            {[
              { label: 'Nome', value: d.nome },
              { label: 'Contato', value: isPatient ? (d as PatientLead).telefone : (d as ClinicLead).whatsapp },
              { label: 'Cidade', value: d.cidade + (d.estado ? ` / ${d.estado}` : '') },
              { label: 'Origem', value: d.origem || '—' },
              ...(isPatient ? [
                { label: 'Tratamento', value: (d as PatientLead).tratamento },
                { label: 'Valor', value: fmtCurrency((d as PatientLead).valorTratamento) },
              ] : [
                { label: 'Clínica', value: (d as ClinicLead).nomeClinica },
                { label: 'Especialidade', value: (d as ClinicLead).especialidade },
              ]),
              { label: 'UTM Source', value: d.utmSource || '—' },
              { label: 'UTM Campaign', value: d.utmCampaign || '—' },
              { label: 'Cadastrado em', value: fmt(d.createdAt || d.timestamp) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                padding: '12px 14px',
              }}>
                <p style={{ margin: '0 0 3px', fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', fontWeight: '500' }}>{value ?? '—'}</p>
              </div>
            ))}
          </div>

          {/* Status Change */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Status do Lead
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {statuses.map(st => (
                <button
                  key={st.value}
                  onClick={() => handleUpdateStatus(st.value)}
                  disabled={saving}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                    border: localStatus === st.value ? `1px solid ${st.dot}` : '1px solid rgba(255,255,255,0.1)',
                    background: localStatus === st.value ? st.bg : 'transparent',
                    color: localStatus === st.value ? st.color : '#475569',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  {localStatus === st.value && <CheckCircle size={11} />}
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Adicionar Observação
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex: Aguardando aprovação bancária..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && note.trim()) handleUpdateStatus(localStatus, note.trim());
                }}
                style={{
                  flex: 1, padding: '10px 14px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: 'white', fontSize: '13px',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={() => { if (note.trim()) handleUpdateStatus(localStatus, note.trim()); }}
                disabled={!note.trim() || saving}
                style={{
                  padding: '10px 16px', borderRadius: '10px',
                  background: note.trim() ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${note.trim() ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: note.trim() ? '#818cf8' : '#334155',
                  cursor: note.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600',
                }}
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                Salvar
              </button>
            </div>
          </div>

          {/* Events Timeline */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Histórico de Eventos
            </p>
            {!eventsLoaded ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 size={20} color="#475569" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : events.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#334155', textAlign: 'center', padding: '16px' }}>
                Nenhum evento registrado.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {events.map(ev => (
                  <div key={ev.id} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px', padding: '10px 14px',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}>
                    <Activity size={13} color="#4f46e5" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#818cf8' }}>
                          {ev.eventType.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '11px', color: '#334155', whiteSpace: 'nowrap' }}>
                          {fmt(ev.createdAt)}
                        </span>
                      </div>
                      {ev.description && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{ev.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LGPD Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={handleAnonymize}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#f87171', fontSize: '12px', fontWeight: '500',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Trash2 size={13} />
              Anonimizar dados (LGPD)
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#cbd5e1', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function AdminDashboard({ patientLeads: initialPatients, clinicLeads: initialClinics, metrics: initialMetrics }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'patients' | 'clinics' | 'metrics'>('patients');
  const [patientLeads, setPatientLeads] = useState(initialPatients);
  const [clinicLeads, setClinicLeads] = useState(initialClinics);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<{ id: string; type: 'patient' | 'clinic'; data: PatientLead | ClinicLead } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/admin/leads?type=all&status=${statusFilter}&search=${encodeURIComponent(search)}`
      );
      if (res.status === 401) { await logout(); return; }
      const data = await res.json();
      if (data.success) {
        setPatientLeads(data.patientLeads ?? []);
        setClinicLeads(data.clinicLeads ?? []);
        setMetrics(data.metrics ?? initialMetrics);
      }
    } catch { /* silent */ }
    setRefreshing(false);
  }, [search, statusFilter, initialMetrics]);

  const handleLogout = async () => { await logout(); };

  const refresh = () => {
    startTransition(() => {
      router.refresh(); // refetch server data
    });
    fetchLeads();
  };

  // Client-side filter
  const filteredPatients = patientLeads.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search
      || p.nome.toLowerCase().includes(q)
      || p.cidade.toLowerCase().includes(q)
      || p.tratamento.toLowerCase().includes(q)
      || p.telefone.includes(q);
    return matchStatus && matchSearch;
  });

  const filteredClinics = clinicLeads.filter(c => {
    const matchStatus = statusFilter === 'all' || c.statusComercial === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !search
      || c.nome.toLowerCase().includes(q)
      || c.nomeClinica.toLowerCase().includes(q)
      || c.cidade.toLowerCase().includes(q)
      || c.especialidade.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const tabs = [
    { id: 'patients' as const, label: 'Pacientes', icon: Users, count: patientLeads.length },
    { id: 'clinics' as const, label: 'Clínicas', icon: Building2, count: clinicLeads.length },
    { id: 'metrics' as const, label: 'Métricas', icon: BarChart3, count: null },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080d1a',
      color: 'white',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        ::placeholder { color: #2d3a55 !important; }
        tr:hover td { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      {/* ─── Top Bar ─── */}
      <header style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          height: '60px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em' }}>
              bena<span style={{ color: '#818cf8' }}>vera</span>
            </span>
            <span style={{
              fontSize: '10px', fontWeight: '700', color: '#6366f1',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '5px', padding: '2px 7px', letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              ADMIN
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={refresh}
              disabled={refreshing || isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8', fontSize: '13px', cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} style={{ animation: (refreshing || isPending) ? 'spin 1s linear infinite' : 'none' }} />
              Atualizar
            </button>

            <a
              href={`/api/admin/export?type=${activeTab === 'clinics' ? 'clinic' : 'patient'}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8', fontSize: '13px', fontWeight: '600', textDecoration: 'none',
              }}
            >
              <Download size={13} />
              Exportar CSV
            </a>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', fontSize: '13px', cursor: 'pointer',
              }}
            >
              <LogOut size={13} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ─── Overview cards ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <MetricCard label="Simulações recebidas" value={metrics.totalPatientLeads} subtitle="total de pacientes" />
          <MetricCard label="Clínicas cadastradas" value={metrics.totalClinicLeads} subtitle="interesse B2B" />
          <MetricCard label="Ticket médio informado" value={fmtCurrency(metrics.averageTicket)} color="#818cf8" subtitle="por tratamento" />
          <MetricCard
            label="Convertidos"
            value={`${metrics.patientStatusCount?.convertida ?? 0}`}
            color="#4ade80"
            subtitle={`de ${metrics.totalPatientLeads} simulações`}
          />
        </div>

        {/* ─── Tabs ─── */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', padding: '4px',
          marginBottom: '24px', width: 'fit-content',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setStatusFilter('all'); setSearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 16px', borderRadius: '9px', border: 'none',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: activeTab === tab.id ? '#818cf8' : '#475569',
                fontSize: '13px', fontWeight: activeTab === tab.id ? '700' : '500',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  background: activeTab === tab.id ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Filters ─── */}
        {activeTab !== 'metrics' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#334155' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={activeTab === 'patients' ? 'Buscar por nome, cidade, tratamento...' : 'Buscar por clínica, cidade, especialidade...'}
                style={{
                  width: '100%', padding: '10px 12px 10px 34px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', color: 'white', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">Todos os status</option>
              {(activeTab === 'patients' ? PATIENT_STATUSES : CLINIC_STATUSES).map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* ─── Patients Table ─── */}
        {activeTab === 'patients' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Data', 'Paciente', 'WhatsApp', 'Cidade', 'Tratamento', 'Valor', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '13px 16px', textAlign: 'left',
                      fontSize: '10px', fontWeight: '700', color: '#334155',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#334155', fontSize: '14px' }}>
                      Nenhum resultado encontrado.
                    </td>
                  </tr>
                ) : filteredPatients.map(p => {
                  const st = getPatientStatus(p.status);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {fmtShort(p.createdAt || p.timestamp)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: 'white' }}>{p.nome}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>{p.telefone}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{p.cidade}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.tratamento}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#818cf8', fontWeight: '700' }}>{fmtCurrency(p.valorTratamento)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge {...st} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => setSelectedLead({ id: p.id!, type: 'patient', data: p })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '5px 12px', borderRadius: '7px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                          }}
                        >
                          Ver <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredPatients.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: '#334155' }}>
                {filteredPatients.length} resultado{filteredPatients.length !== 1 ? 's' : ''} exibido{filteredPatients.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* ─── Clinics Table ─── */}
        {activeTab === 'clinics' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Data', 'Clínica', 'Responsável', 'WhatsApp', 'Cidade', 'Especialidade', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '13px 16px', textAlign: 'left',
                      fontSize: '10px', fontWeight: '700', color: '#334155',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClinics.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#334155', fontSize: '14px' }}>
                      Nenhuma clínica encontrada.
                    </td>
                  </tr>
                ) : filteredClinics.map(c => {
                  const st = getClinicStatus(c.statusComercial);
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {fmtShort(c.createdAt || c.timestamp)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: 'white' }}>{c.nomeClinica}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{c.nome}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontFamily: 'monospace' }}>{c.whatsapp}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{c.cidade}</td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{c.especialidade}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge {...st} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => setSelectedLead({ id: c.id!, type: 'clinic', data: c })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '5px 12px', borderRadius: '7px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
                          }}
                        >
                          Ver <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredClinics.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', color: '#334155' }}>
                {filteredClinics.length} resultado{filteredClinics.length !== 1 ? 's' : ''} exibido{filteredClinics.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* ─── Metrics View ─── */}
        {activeTab === 'metrics' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

              {/* Patient Status Distribution */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '24px',
              }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="#818cf8" /> Status dos Pacientes
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {PATIENT_STATUSES.map(s => {
                    const count = metrics.patientStatusCount?.[s.value] ?? 0;
                    const total = metrics.totalPatientLeads || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={s.value}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{s.label}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: s.color }}>{count}</span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: s.dot, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clinic Status Distribution */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '24px',
              }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} color="#818cf8" /> Status das Clínicas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {CLINIC_STATUSES.map(s => {
                    const count = metrics.clinicStatusCount?.[s.value] ?? 0;
                    const total = metrics.totalClinicLeads || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={s.value}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{s.label}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: s.color }}>{count}</span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: s.dot, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Treatments */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '24px',
              }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="#818cf8" /> Top Tratamentos
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(metrics.categoryCount ?? {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([cat, count], i) => (
                      <div key={cat} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#334155', width: '16px' }}>{i + 1}.</span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{cat}</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#818cf8' }}>{count}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Traffic Sources */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '24px',
              }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: '700', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowUpRight size={16} color="#818cf8" /> Origem do Tráfego
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(metrics.sourceCount ?? {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([src, count]) => (
                      <div key={src} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{src}</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#34d399' }}>{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Lead Detail Modal ─── */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
