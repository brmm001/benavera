'use client';
// app/admin/fila/page.tsx — Fila operacional do backoffice

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED: { label: 'Enviada', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_ANALYSIS: { label: 'Pré-análise', color: '#d97706', bg: '#fffbeb' },
  PRE_ANALYSIS_APPROVED: { label: 'Pré-aprovada', color: '#059669', bg: '#f0fdf4' },
  INTERNAL_REVIEW: { label: 'Revisão interna', color: '#d97706', bg: '#fffbeb' },
  AWAITING_DOCUMENTS: { label: 'Docs pendentes', color: '#d97706', bg: '#fffbeb' },
  AWAITING_CLINIC: { label: 'Aguard. clínica', color: '#d97706', bg: '#fffbeb' },
  READY_FOR_LENDERS: { label: 'Pronta p/ fin.', color: '#7c3aed', bg: '#f5f3ff' },
  SUBMITTED_TO_LENDER: { label: 'Na financeira', color: '#7c3aed', bg: '#f5f3ff' },
  LENDER_ANALYSIS: { label: 'Análise fin.', color: '#7c3aed', bg: '#f5f3ff' },
  OFFERS_AVAILABLE: { label: 'Proposta disp.', color: '#0891b2', bg: '#ecfeff' },
  OFFER_SELECTED: { label: 'Opção escolhida', color: '#0891b2', bg: '#ecfeff' },
  CONTRACT_PENDING: { label: 'Contrato pend.', color: '#d97706', bg: '#fffbeb' },
  CONTRACT_SENT: { label: 'Contrato enviado', color: '#d97706', bg: '#fffbeb' },
  CONTRACT_SIGNED: { label: 'Assinado', color: '#059669', bg: '#f0fdf4' },
  APPROVED: { label: 'Aprovado', color: '#059669', bg: '#f0fdf4' },
  DECLINED: { label: 'Recusado', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
};

const FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'INTERNAL_REVIEW', label: 'Aguardando Benavera' },
  { value: 'AWAITING_CLINIC', label: 'Aguardando clínica' },
  { value: 'SUBMITTED_TO_LENDER', label: 'Aguardando financeira' },
  { value: 'OFFERS_AVAILABLE', label: 'Proposta disponível' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'DECLINED', label: 'Recusadas' },
];

function timeSince(d: string): { text: string; overSLA: boolean } {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const overSLA = mins > 15;
  let text = '';
  if (days > 0) text = `${days}d ${hours % 24}h`;
  else if (hours > 0) text = `${hours}h ${mins % 60}m`;
  else text = `${mins}m`;
  return { text, overSLA };
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function FilaPage() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    params.set('limit', '100');
    const res = await fetch(`/api/applications?${params}`);
    const data = await res.json();
    // Ordenar por mais antigas primeiro
    const sorted = (data.applications || []).sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    setApps(sorted);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const activeApps = apps.filter(a =>
    !['APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED'].includes(a.status)
  );

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>Fila operacional</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            {activeApps.length} ativa{activeApps.length !== 1 ? 's' : ''} · Atualizado agora
          </p>
        </div>
        <button onClick={fetchApps} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', color: '#64748b' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: '7px 14px', borderRadius: '20px', background: filter === f.value ? '#6370f1' : 'white', color: filter === f.value ? 'white' : '#64748b', border: filter === f.value ? 'none' : '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
        ) : apps.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>✓</p>
            <p style={{ color: '#64748b' }}>Fila vazia. Nenhuma solicitação pendente.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Código', 'Paciente', 'Clínica', 'Valor', 'Procedimento', 'Etapa', 'Tempo', 'Analista', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((app, i) => {
                  const st = STATUS_CONFIG[app.status] || { label: app.status, color: '#64748b', bg: '#f1f5f9' };
                  const time = timeSince(app.created_at);
                  return (
                    <tr key={app.id}
                      style={{ borderBottom: i < apps.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                      onClick={() => router.push(`/admin/solicitacoes/${app.id}`)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#4040ca', fontFamily: 'monospace' }}>
                          {app.protocol}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1c1d4c', whiteSpace: 'nowrap' }}>
                        {app.patient_nome?.split(' ').slice(0, 2).join(' ') || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {app.clinic_nome}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#1c1d4c', whiteSpace: 'nowrap' }}>
                        {formatCurrency(app.valor_financiado)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.procedimento}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: time.overSLA ? '#dc2626' : '#64748b' }}>
                          {time.overSLA ? '⚠ ' : ''}{time.text}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>
                        {app.analyst_name || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '13px', color: '#6370f1', fontWeight: '700' }}>Abrir →</span>
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
