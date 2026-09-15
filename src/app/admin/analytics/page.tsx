'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';

interface MetricsData {
  kpis: { totalClinics: number; totalUsers: number; totalApplications: number; totalVolume: number; avgTicket: number };
  applications: {
    byStatus: { status: string; total: number; volume: number }[];
    byMonth: { month: string; total: number; volume: number; aprovado: number }[];
    byCategory: { categoria: string; total: number; avgTicket: number }[];
  };
  pipeline: {
    byStage: { stage: string; total: number }[];
    byMonth: { month: string; total: number }[];
  };
  clinics: {
    byEspecialidade: { especialidade: string; total: number }[];
    byEstado: { estado: string; total: number }[];
  };
  patients: {
    byStatus: { status: string; total: number }[];
    byTratamento: { tratamento: string; total: number; avgValor: number }[];
    byOrigin: { origem: string; total: number }[];
  };
  payouts: { summary: { status: string; total: number; valor: number }[] };
}

const COLORS = ['#6370f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', SUBMITTED: 'Enviado', PRE_ANALYSIS: 'Pré-análise',
  PRE_ANALYSIS_APPROVED: 'Pré-aprovado', INTERNAL_REVIEW: 'Rev. Interna',
  AWAITING_DOCUMENTS: 'Ag. Docs', SUBMITTED_TO_LENDER: 'Enviado Parceiro',
  LENDER_ANALYSIS: 'Análise Parceiro', OFFERS_AVAILABLE: 'Ofertas',
  OFFER_SELECTED: 'Oferta Selecionada', CONTRACT_PENDING: 'Contrato Pend.',
  CONTRACT_SIGNED: 'Contrato Assinado', APPROVED: 'Aprovado',
  PAYOUT_COMPLETED: 'Repasse Feito', TREATMENT_RELEASED: 'Tratamento Lib.',
  DECLINED: 'Recusado', CANCELLED: 'Cancelado',
};

const PIPELINE_LABELS: Record<string, string> = {
  novo: 'Novo', em_contato: 'Em Contato', proposta_enviada: 'Proposta',
  em_negociacao: 'Negociação', credenciado: 'Credenciado', ativo: 'Ativo', perdido: 'Perdido',
};

const fmt = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}k`
  : `R$ ${v.toFixed(0)}`;

function KpiCard({ label, value, sub, color = '#6370f1', icon }: { label: string; value: string; sub?: string; color?: string; icon: string }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: color + '15', color, fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children, height = 260 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>{title}</h3>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#fff' }}>
      {label && <div style={{ marginBottom: '6px', fontWeight: '600', color: '#94a3b8' }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#fff' }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const TABS = [
  { id: 'overview', label: '📊 Visão Geral' },
  { id: 'financiamentos', label: '💳 Financiamentos' },
  { id: 'crm', label: '🎯 CRM Clínicas' },
  { id: 'pacientes', label: '🧑 Pacientes' },
];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px', color: '#94a3b8' }}>
      <div style={{ fontSize: '36px' }}>📊</div>
      <div style={{ fontSize: '14px' }}>Calculando métricas em tempo real...</div>
    </div>
  );

  if (error || !data) return <div style={{ padding: '40px', color: '#dc2626' }}>Erro: {error}</div>;

  const { kpis, applications, pipeline, clinics, patients } = data;
  const approvedStatuses = ['APPROVED', 'CONTRACT_SIGNED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED', 'PAYOUT_SCHEDULED'];
  const totalApproved = applications.byStatus.filter(s => approvedStatuses.includes(s.status)).reduce((a, b) => a + b.total, 0);
  const approvalRate = kpis.totalApplications > 0 ? Math.round((totalApproved / kpis.totalApplications) * 100) : 0;

  const funnelData = [
    { name: 'Enviadas', value: kpis.totalApplications },
    { name: 'Em Análise', value: applications.byStatus.filter(s => ['PRE_ANALYSIS','INTERNAL_REVIEW','AWAITING_DOCUMENTS'].includes(s.status)).reduce((a, b) => a + b.total, 0) },
    { name: 'Propostas', value: applications.byStatus.filter(s => ['OFFERS_AVAILABLE','OFFER_SELECTED','LENDER_ANALYSIS'].includes(s.status)).reduce((a, b) => a + b.total, 0) },
    { name: 'Aprovadas', value: totalApproved },
  ].filter(d => d.value > 0);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>Analytics</h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Métricas em tempo real de toda a operação Benavera</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            fontWeight: '600', fontSize: '13px', transition: 'all 0.15s', fontFamily: 'inherit',
            backgroundColor: tab === t.id ? '#fff' : 'transparent',
            color: tab === t.id ? '#0f172a' : '#64748b',
            boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KpiCard icon="🏥" label="Clínicas Ativas" value={String(kpis.totalClinics)} color="#6370f1" />
            <KpiCard icon="💳" label="Financiamentos" value={String(kpis.totalApplications)} color="#10b981" />
            <KpiCard icon="📈" label="Volume Total" value={fmt(kpis.totalVolume)} color="#f59e0b" />
            <KpiCard icon="🎯" label="Ticket Médio" value={fmt(kpis.avgTicket)} color="#8b5cf6" />
            <KpiCard icon="✅" label="Taxa de Aprovação" value={`${approvalRate}%`} sub={`${totalApproved} aprovados`} color="#10b981" />
            <KpiCard icon="👥" label="Usuários Ativos" value={String(kpis.totalUsers)} color="#3b82f6" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <ChartCard title="Volume de Financiamentos por Mês" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={applications.byMonth}>
                  <defs>
                    <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6370f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6370f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="volume" name="Volume" stroke="#6370f1" fill="url(#gradVol)" strokeWidth={2} />
                  <Area type="monotone" dataKey="aprovado" name="Aprovado" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Funil de Conversão" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#334155' }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Total" radius={[0, 6, 6, 0]}>
                    {funnelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <ChartCard title="Clínicas por Especialidade" height={240}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={clinics.byEspecialidade} dataKey="total" nameKey="especialidade" cx="50%" cy="50%" outerRadius={85}>
                    {clinics.byEspecialidade.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Pipeline CRM por Estágio" height={240}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline.byStage.map(s => ({ ...s, name: PIPELINE_LABELS[s.stage] || s.stage }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Leads" radius={[4,4,0,0]}>
                    {pipeline.byStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ── FINANCIAMENTOS ── */}
      {tab === 'financiamentos' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KpiCard icon="💳" label="Total" value={String(kpis.totalApplications)} color="#6370f1" />
            <KpiCard icon="✅" label="Aprovados" value={String(totalApproved)} color="#10b981" />
            <KpiCard icon="💰" label="Volume Total" value={fmt(kpis.totalVolume)} color="#f59e0b" />
            <KpiCard icon="📊" label="Ticket Médio" value={fmt(kpis.avgTicket)} color="#8b5cf6" />
            <KpiCard icon="🎯" label="Tx. Aprovação" value={`${approvalRate}%`} color="#10b981" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <ChartCard title="Volume Mensal (últimos 12 meses)" height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applications.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="volume" name="Volume Total" fill="#6370f1" radius={[4,4,0,0]} />
                  <Bar dataKey="aprovado" name="Aprovado" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Por Status" height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={applications.byStatus.slice(0, 6)} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={85}>
                    {applications.byStatus.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, STATUS_LABELS[String(name)] || name]} />
                  <Legend formatter={v => STATUS_LABELS[v] || v} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Ticket Médio por Categoria de Tratamento" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={applications.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11, fill: '#334155' }} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgTicket" name="Ticket Médio" fill="#8b5cf6" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ── CRM ── */}
      {tab === 'crm' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KpiCard icon="🏥" label="Clínicas Ativas" value={String(kpis.totalClinics)} color="#6370f1" />
            <KpiCard icon="📥" label="No Pipeline CRM" value={String(pipeline.byStage.reduce((a, b) => a + b.total, 0))} color="#3b82f6" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <ChartCard title="Leads por Estágio do Pipeline" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipeline.byStage.map(s => ({ ...s, name: PIPELINE_LABELS[s.stage] || s.stage }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Clínicas" radius={[4,4,0,0]}>
                    {pipeline.byStage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Clínicas por Estado" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clinics.byEstado}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Clínicas" fill="#6370f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Clínicas por Especialidade" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clinics.byEspecialidade} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="especialidade" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Clínicas" fill="#8b5cf6" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {/* ── PACIENTES ── */}
      {tab === 'pacientes' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KpiCard icon="🧑" label="Total Leads" value={String(patients.byStatus.reduce((a, b) => a + b.total, 0))} color="#3b82f6" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <ChartCard title="Leads por Origem (UTM)" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patients.byOrigin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="origem" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Leads" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Leads por Status" height={280}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={patients.byStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={90}>
                    {patients.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Valor Médio por Categoria de Tratamento" height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patients.byTratamento} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="tratamento" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgValor" name="Valor Médio" fill="#f59e0b" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}
