'use client';
// app/admin/solicitacoes/page.tsx — Lista de solicitações no admin

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED: { label: 'Enviada', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_ANALYSIS: { label: 'Pré-análise', color: '#d97706', bg: '#fffbeb' },
  INTERNAL_REVIEW: { label: 'Revisão interna', color: '#d97706', bg: '#fffbeb' },
  OFFERS_AVAILABLE: { label: 'Proposta disp.', color: '#0891b2', bg: '#ecfeff' },
  OFFER_SELECTED: { label: 'Opção escolhida', color: '#0891b2', bg: '#ecfeff' },
  CONTRACT_SIGNED: { label: 'Assinado', color: '#059669', bg: '#f0fdf4' },
  APPROVED: { label: 'Aprovado', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_SCHEDULED: { label: 'Repasse prog.', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_COMPLETED: { label: 'Pago', color: '#059669', bg: '#f0fdf4' },
  DECLINED: { label: 'Recusado', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'INTERNAL_REVIEW', label: 'Em análise' },
  { value: 'OFFERS_AVAILABLE', label: 'Proposta disp.' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'CONTRACT_SIGNED', label: 'Contratadas' },
  { value: 'PAYOUT_SCHEDULED', label: 'Repasse prog.' },
  { value: 'DECLINED', label: 'Recusadas' },
];

export default function AdminSolicitacoesPage() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (search) params.set('search', search);
    params.set('limit', '100');
    const res = await fetch(`/api/applications?${params}`);
    const data = await res.json();
    setApps(data.applications || []);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(fetchApps, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchApps, search]);

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>Todas as solicitações</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{apps.length} resultado{apps.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Buscar por nome, CPF, código…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', width: '280px', fontFamily: 'inherit' }} />
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: '7px 14px', borderRadius: '20px', background: filter === f.value ? '#6370f1' : 'white', color: filter === f.value ? 'white' : '#64748b', border: filter === f.value ? 'none' : '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
        ) : apps.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '15px' }}>Nenhuma solicitação encontrada.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Código', 'Clínica', 'Paciente', 'Procedimento', 'Valor', 'Data', 'Analista', 'Status', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((app, i) => {
                  const st = STATUS_CONFIG[app.status] || { label: app.status, color: '#64748b', bg: '#f1f5f9' };
                  return (
                    <tr key={app.id} style={{ borderBottom: i < apps.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => router.push(`/admin/solicitacoes/${app.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#4040ca', fontFamily: 'monospace' }}>{app.protocol}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{app.clinic_nome}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1c1d4c', whiteSpace: 'nowrap' }}>
                        {app.patient_nome?.split(' ').slice(0, 2).join(' ')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.procedimento}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1c1d4c', whiteSpace: 'nowrap' }}>{formatCurrency(app.valor_financiado)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(app.created_at)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{app.analyst_name || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#6370f1', fontWeight: '700' }}>Ver →</span>
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
