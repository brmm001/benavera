'use client';
// src/app/atendente/comissoes/page.tsx
// Consulta de comissões do atendente autenticado

import { useState, useEffect } from 'react';

type Comissao = {
  id: string;
  prospect_clinic_id: string;
  evento: string;
  valor: number;
  status: string;
  justificativa?: string;
  gerada_at: string;
  aprovada_at?: string;
  paga_at?: string;
  clinica_nome?: string;
  clinica_cnpj?: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pendente:  { label: 'Pendente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '⏳' },
  aprovada:  { label: 'Aprovada',  color: '#6370f1', bg: 'rgba(99,112,241,0.12)',  emoji: '✅' },
  paga:      { label: 'Paga',      color: '#10b981', bg: 'rgba(16,185,129,0.12)',  emoji: '💰' },
  recusada:  { label: 'Recusada',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   emoji: '❌' },
  estornada: { label: 'Estornada', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', emoji: '↩️' },
};

const EVENTO_LABELS: Record<string, string> = {
  cadastro_validado: 'Cadastro validado',
  primeira_operacao: 'Primeira operação',
};

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmt(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}
function fmtCnpj(c: string) {
  const d = c.replace(/\D/g, '');
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return c;
}

export default function MinhasComissoesPage() {
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [totais, setTotais] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetch('/api/atendente/comissoes')
      .then(r => r.json())
      .then(d => {
        setComissoes(d.comissoes || []);
        setTotais(d.totais || {});
        setLoading(false);
      });
  }, []);

  const filtered = statusFilter === 'all'
    ? comissoes
    : comissoes.filter(c => c.status === statusFilter);

  const totalPendente = totais.pendente || 0;
  const totalAprovada = totais.aprovada || 0;
  const totalPago     = totais.paga     || 0;

  return (
    <div style={{ padding: '40px 48px', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: '#1c1d4c' }}>
          Minhas Comissões
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
          Acompanhe o status de cada comissão gerada pelo administrador.
        </p>
      </div>

      {/* Resumo financeiro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {[
          { label: 'Pendente de aprovação', valor: totalPendente, color: '#f59e0b', border: '#f59e0b' },
          { label: 'Aprovado (a receber)', valor: totalAprovada, color: '#6370f1', border: '#6370f1' },
          { label: 'Total já pago', valor: totalPago, color: '#10b981', border: '#10b981' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'white', borderRadius: '12px', padding: '18px',
            border: `1px solid #f1f5f9`, borderLeft: `3px solid ${item.border}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {item.label}
            </p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: item.color }}>
              {fmtCurrency(item.valor)}
            </p>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[['all', 'Todos'], ...Object.entries(STATUS_CONFIG).map(([v, d]) => [v, d.label])].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setStatusFilter(v)}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', border: '1.5px solid',
              background: statusFilter === v ? '#6370f1' : 'white',
              color: statusFilter === v ? 'white' : '#64748b',
              borderColor: statusFilter === v ? '#6370f1' : '#e2e8f0',
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>💰</p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Nenhuma comissão encontrada.</p>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>As comissões são geradas pelo administrador após validação dos eventos configurados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(c => {
            const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.pendente;
            return (
              <div key={c.id} style={{
                background: 'white', borderRadius: '12px', padding: '18px 20px',
                border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                {/* Emoji status */}
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{st.emoji}</div>

                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                      {c.clinica_nome || 'Clínica'}
                    </p>
                    <span style={{
                      padding: '2px 8px', borderRadius: '20px',
                      background: st.bg, color: st.color, fontSize: '11px', fontWeight: '700',
                    }}>{st.label}</span>
                  </div>
                  {c.clinica_cnpj && (
                    <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8' }}>
                      CNPJ: {fmtCnpj(c.clinica_cnpj)}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Evento: <strong>{EVENTO_LABELS[c.evento] || c.evento}</strong>
                    {' · '}Gerada em {fmt(c.gerada_at)}
                    {c.aprovada_at ? ` · Aprovada em ${fmt(c.aprovada_at)}` : ''}
                    {c.paga_at ? ` · Paga em ${fmt(c.paga_at)}` : ''}
                  </p>
                  {c.justificativa && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', borderLeft: `3px solid ${st.color}` }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        <strong>Observação:</strong> {c.justificativa}
                      </p>
                    </div>
                  )}
                </div>

                {/* Valor */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: st.color }}>
                    {fmtCurrency(c.valor)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nota informativa */}
      <div style={{ marginTop: '24px', padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
          ℹ️ As comissões são definidas e aprovadas exclusivamente pelo administrador, com base nas regras configuradas. 
          O simples cadastro ou vínculo de uma clínica não gera pagamento automático.
        </p>
      </div>
    </div>
  );
}
