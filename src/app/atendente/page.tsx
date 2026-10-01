'use client';
// src/app/atendente/page.tsx
// Dashboard do atendente — visão geral dos seus dados

import { useState, useEffect } from 'react';

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

interface DashboardData {
  leads: { total: number; novos: number; };
  clinicas: { total: number; em_negociacao: number; vinculadas: number; };
  comissoes: { pendente: number; aprovada: number; paga: number; };
  proximos_contatos: Array<{
    id: string; tipo: string; conteudo: string; proxima_data: string; clinica?: string;
  }>;
}

export default function AtendenteDashboard() {
  const [userName, setUserName] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.user) setUserName(d.user.name.split(' ')[0]); });

    // Buscar dados paralelos
    Promise.all([
      fetch('/api/atendente/leads?tipo=clinic&limit=200').then(r => r.json()),
      fetch('/api/atendente/clinicas').then(r => r.json()),
      fetch('/api/atendente/comissoes').then(r => r.json()),
      fetch('/api/atendente/notes?proximos=true').then(r => r.json()).catch(() => ({ notes: [] })),
    ]).then(([leadsR, clinicasR, comissoesR, notesR]) => {
      const leads = leadsR.leads || [];
      const clinicas = clinicasR.clinicas || [];
      const comissoes = comissoesR.comissoes || [];
      const notes = notesR.notes || [];

      const totaisCom = comissoes.reduce((acc: Record<string, number>, c: { status: string; valor: number }) => {
        acc[c.status] = (acc[c.status] || 0) + Number(c.valor);
        return acc;
      }, {});

      setData({
        leads: {
          total: leads.length,
          novos: leads.filter((l: { status_comercial: string }) => l.status_comercial === 'novo').length,
        },
        clinicas: {
          total: clinicas.length,
          em_negociacao: clinicas.filter((c: { status: string }) => c.status === 'em_negociacao').length,
          vinculadas: clinicas.filter((c: { status: string }) => c.status === 'vinculada').length,
        },
        comissoes: {
          pendente: totaisCom.pendente || 0,
          aprovada: totaisCom.aprovada || 0,
          paga: totaisCom.paga || 0,
        },
        proximos_contatos: notes
          .filter((n: { proxima_data: string | null }) => n.proxima_data)
          .sort((a: { proxima_data: string }, b: { proxima_data: string }) =>
            new Date(a.proxima_data).getTime() - new Date(b.proxima_data).getTime()
          )
          .slice(0, 5),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const cardStyle = {
    background: 'white', borderRadius: '14px', padding: '22px',
    border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
          Olá{userName ? `, ${userName}` : ''} 👋
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>Carregando…</div>
      ) : (
        <>
          {/* Métricas principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {/* Leads */}
            <div style={{ ...cardStyle, borderLeft: '3px solid #6370f1' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meus Leads</p>
              <p style={{ margin: '0 0 4px', fontSize: '32px', fontWeight: '800', color: '#1c1d4c' }}>{data?.leads.total}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#6370f1', fontWeight: '600' }}>
                {data?.leads.novos} novo{data?.leads.novos !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Clínicas */}
            <div style={{ ...cardStyle, borderLeft: '3px solid #10b981' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Minhas Clínicas</p>
              <p style={{ margin: '0 0 4px', fontSize: '32px', fontWeight: '800', color: '#1c1d4c' }}>{data?.clinicas.total}</p>
              <p style={{ margin: 0, fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                {data?.clinicas.vinculadas} vinculada{data?.clinicas.vinculadas !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Comissões pendentes */}
            <div style={{ ...cardStyle, borderLeft: '3px solid #f59e0b' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>A Receber</p>
              <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: '#1c1d4c' }}>
                {fmtCurrency(data?.comissoes.aprovada || 0)}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>
                {fmtCurrency(data?.comissoes.pendente || 0)} pendente
              </p>
            </div>

            {/* Comissões pagas */}
            <div style={{ ...cardStyle, borderLeft: '3px solid #4ade80' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Já Recebido</p>
              <p style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: '#1c1d4c' }}>
                {fmtCurrency(data?.comissoes.paga || 0)}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#4ade80', fontWeight: '600' }}>em comissões pagas</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Próximos contatos */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>
                📅 Próximos contatos
              </h2>
              {(data?.proximos_contatos || []).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Nenhum contato agendado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data?.proximos_contatos.map(n => (
                    <div key={n.id} style={{
                      padding: '10px 12px', background: '#f8fafc',
                      borderRadius: '8px', borderLeft: '3px solid #6370f1',
                    }}>
                      <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                        {fmtDate(n.proxima_data)} · {n.tipo}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{n.conteudo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Atalhos rápidos */}
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#1c1d4c' }}>
                ⚡ Ações rápidas
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { href: '/atendente/leads', label: 'Ver meus leads', emoji: '🎯', color: '#6370f1' },
                  { href: '/atendente/clinicas', label: 'Ver minhas clínicas', emoji: '🏥', color: '#10b981' },
                  { href: '/atendente/clinicas/nova', label: 'Cadastrar nova clínica', emoji: '➕', color: '#059669' },
                  { href: '/atendente/comissoes', label: 'Consultar comissões', emoji: '💰', color: '#f59e0b' },
                ].map(item => (
                  <a key={item.href} href={item.href} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', background: '#f8fafc', borderRadius: '8px',
                    textDecoration: 'none', color: '#1e293b', fontSize: '13px', fontWeight: '500',
                    transition: 'all 0.15s', border: '1px solid transparent',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <span>{item.emoji}</span>
                    {item.label}
                    <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '11px' }}>→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
