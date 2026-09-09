'use client';
// app/financiamentos/page.tsx

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Rascunho', color: '#64748b', bg: '#f1f5f9' },
  SUBMITTED: { label: 'Enviada', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_ANALYSIS: { label: 'Pré-análise', color: '#d97706', bg: '#fffbeb' },
  PRE_ANALYSIS_APPROVED: { label: 'Elegível', color: '#059669', bg: '#f0fdf4' },
  PRE_ANALYSIS_DECLINED: { label: 'Não elegível', color: '#dc2626', bg: '#fef2f2' },
  INTERNAL_REVIEW: { label: 'Em análise', color: '#d97706', bg: '#fffbeb' },
  AWAITING_DOCUMENTS: { label: 'Docs pendentes', color: '#d97706', bg: '#fffbeb' },
  AWAITING_CLINIC: { label: 'Aguard. clínica', color: '#d97706', bg: '#fffbeb' },
  READY_FOR_LENDERS: { label: 'Pronta p/ fin.', color: '#7c3aed', bg: '#f5f3ff' },
  SUBMITTED_TO_LENDER: { label: 'Na financeira', color: '#7c3aed', bg: '#f5f3ff' },
  LENDER_ANALYSIS: { label: 'Análise fin.', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_APPROVED: { label: 'Pré-aprovada', color: '#059669', bg: '#f0fdf4' },
  OFFERS_AVAILABLE: { label: 'Proposta disp.', color: '#0891b2', bg: '#ecfeff' },
  OFFER_SELECTED: { label: 'Opção escolhida', color: '#0891b2', bg: '#ecfeff' },
  CONTRACT_PENDING: { label: 'Contrato pend.', color: '#d97706', bg: '#fffbeb' },
  CONTRACT_SENT: { label: 'Contrato enviado', color: '#d97706', bg: '#fffbeb' },
  CONTRACT_SIGNED: { label: 'Contrato assinado', color: '#059669', bg: '#f0fdf4' },
  APPROVED: { label: 'Aprovado', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_SCHEDULED: { label: 'Repasse prog.', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_COMPLETED: { label: 'Repasse pago', color: '#059669', bg: '#f0fdf4' },
  TREATMENT_RELEASED: { label: 'Liberado', color: '#059669', bg: '#f0fdf4' },
  DECLINED: { label: 'Recusado', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
  EXPIRED: { label: 'Expirado', color: '#64748b', bg: '#f1f5f9' },
};

const FILTER_TABS = [
  { value: '', label: 'Todas' },
  { value: 'PRE_ANALYSIS', label: 'Pré-análise' },
  { value: 'INTERNAL_REVIEW', label: 'Em análise' },
  { value: 'OFFERS_AVAILABLE', label: 'Proposta disp.' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'CONTRACT_SIGNED', label: 'Contratado' },
  { value: 'PAYOUT_COMPLETED', label: 'Pago' },
  { value: 'DECLINED', label: 'Recusado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

interface Application {
  id: string;
  protocol: string;
  patient_nome: string;
  patient_cpf: string;
  procedimento: string;
  categoria: string;
  valor_financiado: number;
  status: string;
  created_at: string;
  creator_name: string;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function FinanciamentosPage() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeFilter) params.set('status', activeFilter);
    if (search) params.set('search', search);
    const res = await fetch(`/api/applications?${params}`);
    const data = await res.json();
    setApps(data.applications || []);
    setLoading(false);
  }, [activeFilter, search]);

  useEffect(() => {
    const timeout = setTimeout(fetchApps, search ? 400 : 0);
    return () => clearTimeout(timeout);
  }, [fetchApps, search]);

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
            Financiamentos
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Acompanhe todas as suas solicitações
          </p>
        </div>
        <button
          onClick={() => router.push('/novo-financiamento')}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #6370f1, #4040ca)',
            color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 12px rgba(99,112,241,0.35)', fontFamily: 'inherit',
          }}
        >
          <span>+</span> Novo financiamento
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por nome, CPF, código…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
            fontSize: '14px', outline: 'none', width: '320px', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            style={{
              padding: '7px 14px', borderRadius: '20px',
              background: activeFilter === tab.value ? '#6370f1' : 'white',
              color: activeFilter === tab.value ? 'white' : '#64748b',
              border: activeFilter === tab.value ? 'none' : '1px solid #e2e8f0',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
        ) : apps.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>◉</p>
            <p style={{ color: '#64748b', fontSize: '15px' }}>Nenhum financiamento encontrado.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Paciente', 'Procedimento', 'Valor', 'Data', 'Responsável', 'Status', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((app, i) => {
                  const st = STATUS_CONFIG[app.status] || { label: app.status, color: '#64748b', bg: '#f1f5f9' };
                  return (
                    <tr key={app.id}
                      style={{ borderBottom: i < apps.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => router.push(`/financiamentos/${app.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1c1d4c' }}>{app.patient_nome}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{app.protocol}</p>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{app.procedimento}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1c1d4c' }}>{formatCurrency(app.valor_financiado)}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{formatDate(app.created_at)}</td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{app.creator_name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#6370f1', fontWeight: '600' }}>Ver →</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
