'use client';
// app/admin/page.tsx — Dashboard do backoffice Benavera com visão imediata dos valores e dados digitados pelas clínicas

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RecentApplication {
  id: string;
  protocol: string;
  categoria: string | null;
  procedimento: string | null;
  valor_tratamento: number;
  entrada: number;
  valor_financiado: number;
  status: string;
  created_at: string;
  patient_nome: string | null;
  patient_cpf: string | null;
  patient_celular: string | null;
  patient_email: string | null;
  clinic_nome: string | null;
  creator_name: string | null;
}

interface RecentDigitalProposal {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  total: number;
  status: string;
  created_at: string;
  clinic_nome: string | null;
}

interface AdminDashboard {
  today_apps: number;
  in_analysis: number;
  awaiting_action: number;
  approved_today: number;
  sla_over_15: number;
  volume_solicitado: number;
  volume_aprovado: number;
  taxa_aprovacao: number;
  avg_pre_analysis_min: number;
  avg_to_proposal_min: number;
  recent_applications?: RecentApplication[];
  recent_digital_proposals?: RecentDigitalProposal[];
}

function formatCompact(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v || 0);
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUserName(d.user.name.split(' ')[0]);
    });
    fetch('/api/dashboard', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const metrics = data ? [
    { label: 'Solicitações hoje', value: String(data.today_apps), color: '#6370f1', urgent: false },
    { label: 'Em análise agora', value: String(data.in_analysis), color: '#7c3aed', urgent: data.in_analysis > 5 },
    { label: 'Aguardando ação', value: String(data.awaiting_action), color: '#d97706', urgent: data.awaiting_action > 0 },
    { label: 'Aprovadas hoje', value: String(data.approved_today), color: '#059669', urgent: false },
    { label: 'Volume solicitado', value: formatCompact(data.volume_solicitado), color: '#334155', urgent: false },
    { label: 'Volume aprovado', value: formatCompact(data.volume_aprovado), color: '#059669', urgent: false },
    { label: 'Taxa de aprovação', value: `${(data.taxa_aprovacao * 100).toFixed(0)}%`, color: '#059669', urgent: false },
    { label: 'Tempo médio → proposta', value: `${data.avg_to_proposal_min.toFixed(0)}min`, color: '#6370f1', urgent: false },
  ] : [];

  const recentApps = data?.recent_applications || [];
  const recentDigital = data?.recent_digital_proposals || [];

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
          Visão geral {userName && `· ${userName}`}
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Alerta SLA */}
      {data && data.sla_over_15 > 0 && (
        <div style={{
          background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px',
          padding: '16px 20px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#dc2626' }}>
              {data.sla_over_15} solicitação{data.sla_over_15 > 1 ? 'ões' : ''} acima de 15 minutos
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>Ação necessária imediatamente.</p>
          </div>
          <button onClick={() => router.push('/admin/fila')}
            style={{ marginLeft: 'auto', padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>
            Ver fila →
          </button>
        </div>
      )}

      {/* Metrics grid */}
      {loading ? (
        <div style={{ color: '#94a3b8', padding: '48px', textAlign: 'center' }}>Carregando…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {metrics.map(m => (
              <div key={m.label} style={{
                background: 'white', borderRadius: '14px', padding: '20px',
                border: m.urgent ? '1.5px solid #fde68a' : '1px solid #f1f5f9',
                boxShadow: m.urgent ? '0 0 0 3px rgba(251,191,36,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Últimas solicitações com valor + dados digitados pelas clínicas */}
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>
                  Solicitações e dados digitados pelas clínicas
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Valores do tratamento, entrada, financiado e dados completos do paciente enviados pelas clínicas
                </p>
              </div>
              <button onClick={() => router.push('/admin/solicitacoes')}
                style={{ padding: '7px 14px', background: '#eef2ff', color: '#4040ca', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '700', fontFamily: 'inherit' }}>
                Ver todas ({recentApps.length}+) →
              </button>
            </div>
            {recentApps.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>Nenhuma solicitação registrada ainda.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '11px 14px' }}>Protocolo / Data</th>
                      <th style={{ padding: '11px 14px' }}>Clínica</th>
                      <th style={{ padding: '11px 14px' }}>Paciente (dados digitados)</th>
                      <th style={{ padding: '11px 14px' }}>Procedimento</th>
                      <th style={{ padding: '11px 14px' }}>Valores digitados</th>
                      <th style={{ padding: '11px 14px' }}>Status</th>
                      <th style={{ padding: '11px 14px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApps.map(a => (
                      <tr key={a.id} onClick={() => router.push(`/admin/solicitacoes/${a.id}`)} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '700', color: '#4040ca', fontFamily: 'monospace' }}>{a.protocol}</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{a.clinic_nome || '—'}</div>
                          {a.creator_name && <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>por {a.creator_name}</div>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#1c1d4c' }}>{a.patient_nome || '—'}</div>
                          <div style={{ fontSize: '11.5px', color: '#475569', fontFamily: 'monospace' }}>{a.patient_cpf || 'CPF n/d'}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {[a.patient_celular, a.patient_email].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '600', color: '#334155' }}>{a.procedimento || '—'}</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{a.categoria || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '800', color: '#059669', fontSize: '14px' }}>{formatBRL(a.valor_financiado)}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            Total: {formatBRL(a.valor_tratamento)}{Number(a.entrada) > 0 ? ` · Entr.: ${formatBRL(a.entrada)}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '700', background: '#f1f5f9', color: '#334155' }}>{a.status}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#4040ca', fontWeight: '700', whiteSpace: 'nowrap' }}>Abrir →</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {recentDigital.length > 0 && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px 22px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1c1d4c' }}>
                  Últimos orçamentos / propostas digitais criados pelas clínicas ({recentDigital.length})
                </h2>
                <button onClick={() => router.push('/admin/solicitacoes?tab=propostas')}
                  style={{ background: 'none', border: 'none', color: '#4040ca', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}>
                  Ver todos →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {recentDigital.slice(0, 4).map(dp => (
                  <div key={dp.id} style={{ padding: '12px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{dp.patient_name}</strong>
                      <strong style={{ fontSize: '14px', color: '#059669' }}>{formatBRL(dp.total)}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {dp.clinic_nome || 'Clínica'} · {[dp.patient_phone, dp.patient_email].filter(Boolean).join(' · ') || 'Sem contato'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {[
          { href: '/admin/fila', title: 'Fila operacional', desc: 'Revisar solicitações pendentes', emoji: '◉', color: '#6370f1' },
          { href: '/admin/clinicas', title: 'Clínicas', desc: 'Gerenciar clínicas parceiras', emoji: '🏥', color: '#059669' },
          { href: '/admin/parceiros', title: 'Parceiros', desc: 'Financeiras reais e APIs', emoji: '🏦', color: '#7c3aed' },
          { href: '/admin/repasses', title: 'Repasses', desc: 'Controlar pagamentos', emoji: '◈', color: '#d97706' },
        ].map(item => (
          <a key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white', borderRadius: '14px', padding: '20px',
              border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>{item.title}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{item.desc}</p>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
