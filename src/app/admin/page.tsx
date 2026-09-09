'use client';
// app/admin/page.tsx — Dashboard do backoffice Benavera

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);
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
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  const metrics = data ? [
    { label: 'Solicitações hoje', value: String(data.today_apps), color: '#6370f1', urgent: false },
    { label: 'Em análise agora', value: String(data.in_analysis), color: '#7c3aed', urgent: data.in_analysis > 5 },
    { label: 'Aguardando ação', value: String(data.awaiting_action), color: '#d97706', urgent: data.awaiting_action > 0 },
    { label: 'Aprovadas hoje', value: String(data.approved_today), color: '#059669', urgent: false },
    { label: 'Volume solicitado', value: formatCurrency(data.volume_solicitado), color: '#334155', urgent: false },
    { label: 'Volume aprovado', value: formatCurrency(data.volume_aprovado), color: '#059669', urgent: false },
    { label: 'Taxa de aprovação', value: `${(data.taxa_aprovacao * 100).toFixed(0)}%`, color: '#059669', urgent: false },
    { label: 'Tempo médio → proposta', value: `${data.avg_to_proposal_min.toFixed(0)}min`, color: '#6370f1', urgent: false },
  ] : [];

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '36px' }}>
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
      )}

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {[
          { href: '/admin/fila', title: 'Fila operacional', desc: 'Revisar solicitações pendentes', emoji: '◉', color: '#6370f1' },
          { href: '/admin/clinicas', title: 'Clínicas', desc: 'Gerenciar clínicas parceiras', emoji: '🏥', color: '#059669' },
          { href: '/admin/parceiros', title: 'Parceiros', desc: 'Financeiras e configurações', emoji: '🏦', color: '#7c3aed' },
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
