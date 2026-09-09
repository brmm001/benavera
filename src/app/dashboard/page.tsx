'use client';
// app/dashboard/page.tsx - Dashboard da Clínica

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  type: string;
  total_mes: number;
  volume_solicitado: number;
  volume_aprovado: number;
  taxa_aprovacao: number;
  recent_applications: Application[];
}

interface Application {
  id: string;
  protocol: string;
  patient_nome: string;
  patient_cpf: string;
  procedimento: string;
  valor_financiado: number;
  status: string;
  created_at: string;
  creator_name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Rascunho', color: '#64748b', bg: '#f1f5f9' },
  SUBMITTED: { label: 'Enviada', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_ANALYSIS: { label: 'Pré-análise', color: '#d97706', bg: '#fffbeb' },
  PRE_ANALYSIS_APPROVED: { label: 'Pré-aprovada', color: '#059669', bg: '#f0fdf4' },
  PRE_ANALYSIS_DECLINED: { label: 'Pré-recusada', color: '#dc2626', bg: '#fef2f2' },
  INTERNAL_REVIEW: { label: 'Em análise', color: '#d97706', bg: '#fffbeb' },
  AWAITING_DOCUMENTS: { label: 'Docs pendentes', color: '#d97706', bg: '#fffbeb' },
  AWAITING_CLINIC: { label: 'Aguard. clínica', color: '#d97706', bg: '#fffbeb' },
  READY_FOR_LENDERS: { label: 'Pront. financeira', color: '#7c3aed', bg: '#f5f3ff' },
  SUBMITTED_TO_LENDER: { label: 'Enviada à fin.', color: '#7c3aed', bg: '#f5f3ff' },
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Get user name
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUserName(d.user.name.split(' ')[0]);
    });

    // Load dashboard data
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1s infinite' }}>◎</div>
          <p>Carregando…</p>
        </div>
      </div>
    );
  }

  const isEmpty = !data?.total_mes;

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', color: '#1c1d4c' }}>
          Olá, {userName}. 👋
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: '#64748b' }}>
          Acompanhe seus financiamentos e transforme mais orçamentos em tratamentos.
        </p>
      </div>

      {/* CTA Principal */}
      <div style={{ marginBottom: '40px' }}>
        <button
          onClick={() => router.push('/novo-financiamento')}
          style={{
            padding: '16px 32px',
            background: 'linear-gradient(135deg, #6370f1, #4040ca)',
            color: 'white', border: 'none', borderRadius: '12px',
            fontSize: '16px', fontWeight: '700', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 6px 20px rgba(99,112,241,0.4)',
            transition: 'all 0.2s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 28px rgba(99,112,241,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,112,241,0.4)';
          }}
        >
          <span style={{ fontSize: '20px', fontWeight: '400' }}>+</span>
          Novo financiamento
        </button>
      </div>

      {isEmpty ? (
        /* Estado vazio */
        <div style={{
          background: 'white', borderRadius: '16px', padding: '80px 48px',
          textAlign: 'center', border: '1.5px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>◉</div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700', color: '#1c1d4c' }}>
            Seu primeiro financiamento começa aqui.
          </h2>
          <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '15px' }}>
            Crie uma solicitação e acompanhe todas as etapas em um só lugar.
          </p>
          <button
            onClick={() => router.push('/novo-financiamento')}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #6370f1, #4040ca)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Criar financiamento
          </button>
        </div>
      ) : (
        <>
          {/* Cards de métricas */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px', marginBottom: '40px',
          }}>
            {[
              { label: 'Financiamentos no mês', value: String(data?.total_mes || 0), suffix: '' },
              { label: 'Volume solicitado', value: formatCurrency(data?.volume_solicitado || 0), suffix: '' },
              { label: 'Volume aprovado', value: formatCurrency(data?.volume_aprovado || 0), suffix: '' },
              { label: 'Taxa de aprovação', value: `${((data?.taxa_aprovacao || 0) * 100).toFixed(0)}`, suffix: '%' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'white', borderRadius: '14px', padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                  {card.label}
                </p>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1c1d4c' }}>
                  {card.value}<span style={{ fontSize: '16px', fontWeight: '600', color: '#6370f1' }}>{card.suffix}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Solicitações recentes */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1d4c' }}>
                Solicitações recentes
              </h2>
              <a href="/financiamentos" style={{ fontSize: '13px', color: '#6370f1', textDecoration: 'none', fontWeight: '600' }}>
                Ver todas →
              </a>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Paciente', 'Procedimento', 'Valor', 'Data', 'Responsável', 'Status', 'Ação'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: '12px', fontWeight: '600', color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        borderBottom: '1px solid #f1f5f9',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent_applications || []).map((app, i) => {
                    const st = STATUS_CONFIG[app.status] || { label: app.status, color: '#64748b', bg: '#f1f5f9' };
                    return (
                      <tr key={app.id} style={{
                        borderBottom: i < (data?.recent_applications?.length || 0) - 1 ? '1px solid #f8fafc' : 'none',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1c1d4c' }}>
                            {app.patient_nome}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{app.protocol}</p>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>
                          {app.procedimento}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '600', color: '#1c1d4c' }}>
                          {formatCurrency(app.valor_financiado)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>
                          {formatDate(app.created_at)}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>
                          {app.creator_name}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-block', padding: '4px 10px',
                            borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                            color: st.color, background: st.bg,
                          }}>{st.label}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <a
                            href={`/financiamentos/${app.id}`}
                            style={{
                              fontSize: '13px', color: '#6370f1', textDecoration: 'none', fontWeight: '600',
                              padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0eaff',
                              transition: 'all 0.15s', display: 'inline-block',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            Ver
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
