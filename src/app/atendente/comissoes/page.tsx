'use client';
// src/app/atendente/comissoes/page.tsx
// Consulta separada de comissões do atendente: Mensalidades SaaS (automáticas) vs. Eventos Comerciais (manuais)

import { useState, useEffect } from 'react';

type ComissaoEvento = {
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

type ComissaoSaas = {
  id: string;
  clinic_id: string;
  clinica_nome: string;
  cycle: string;
  base_valor: number;
  percent: number;
  valor: number;
  status: 'PREVISTA' | 'A_RECEBER' | 'PAGA' | 'CANCELADA';
  competencia: string | null;
  paga_em: string | null;
  observacao: string | null;
  comprovante_url: string | null;
};

const STATUS_EVENTO: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pendente:  { label: 'Pendente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '⏳' },
  aprovada:  { label: 'Aprovada',  color: '#6370f1', bg: 'rgba(99,112,241,0.12)',  emoji: '✅' },
  paga:      { label: 'Paga',      color: '#10b981', bg: 'rgba(16,185,129,0.12)',  emoji: '💰' },
  recusada:  { label: 'Recusada',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   emoji: '❌' },
  estornada: { label: 'Estornada', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', emoji: '↩️' },
};

const STATUS_SAAS: Record<string, { label: string; color: string; bg: string }> = {
  PREVISTA:  { label: 'Prevista',  color: '#b45309', bg: '#fef3c7' },
  A_RECEBER: { label: 'A receber', color: '#4338ca', bg: '#e0e7ff' },
  PAGA:      { label: 'Paga',      color: '#047857', bg: '#d1fae5' },
  CANCELADA: { label: 'Cancelada', color: '#64748b', bg: '#e2e8f0' },
};

const EVENTO_LABELS: Record<string, string> = {
  cadastro_validado: 'Cadastro validado',
  primeira_operacao: 'Primeira operação',
};

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmt(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d);
}
function fmtCnpj(c: string) {
  const d = c.replace(/\D/g, '');
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return c;
}

export default function MinhasComissoesPage() {
  const [tab, setTab] = useState<'saas' | 'eventos'>('saas');
  const [comissoes, setComissoes] = useState<ComissaoEvento[]>([]);
  const [totais, setTotais] = useState<Record<string, number>>({});
  const [saasComissoes, setSaasComissoes] = useState<ComissaoSaas[]>([]);
  const [saasTotais, setSaasTotais] = useState({ prevista: 0, a_receber: 0, paga: 0, cancelada: 0 });
  const [mensalidadePercent, setMensalidadePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saasFilter, setSaasFilter] = useState('all');

  useEffect(() => {
    fetch('/api/atendente/comissoes', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setComissoes(d.comissoes || []);
        setTotais(d.totais || {});
        setSaasComissoes(d.saasComissoes || []);
        setSaasTotais(d.saasTotais || { prevista: 0, a_receber: 0, paga: 0, cancelada: 0 });
        setMensalidadePercent(Number(d.config?.mensalidadePercent || 0));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEventos = statusFilter === 'all' ? comissoes : comissoes.filter(c => c.status === statusFilter);
  const filteredSaas = saasFilter === 'all' ? saasComissoes : saasComissoes.filter(c => c.status === saasFilter);

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1020px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '26px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, color: '#1c1d4c' }}>
            Minhas Comissões
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
            Acompanhe separadamente suas comissões automáticas de <strong>Mensalidades SaaS</strong> ({mensalidadePercent.toFixed(2).replace('.', ',')}%) e suas comissões por <strong>Eventos Comerciais</strong>.
          </p>
        </div>
        <a href="/atendente/links" style={{ padding: '9px 16px', borderRadius: '9px', background: '#4040ca', color: '#fff', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
          ⚡ Gerar link de assinatura
        </a>
      </div>

      {/* Resumo separado por origem */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #f1f5f9', borderLeft: '3px solid #059669' }}>
          <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Mensalidades SaaS · A receber</p>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#059669' }}>{fmtCurrency(saasTotais.a_receber)}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Já pago: {fmtCurrency(saasTotais.paga)}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #f1f5f9', borderLeft: '3px solid #6370f1' }}>
          <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Eventos Comerciais · Aprovado</p>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#6370f1' }}>{fmtCurrency(totais.aprovada || 0)}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Pendente: {fmtCurrency(totais.pendente || 0)} · Pago: {fmtCurrency(totais.paga || 0)}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #f1f5f9', borderLeft: '3px solid #10b981' }}>
          <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total geral já pago</p>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#047857' }}>{fmtCurrency(saasTotais.paga + (totais.paga || 0))}</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>SaaS + Eventos comerciais</p>
        </div>
      </div>

      {/* Abas separadas */}
      <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content', marginBottom: '20px' }}>
        <button
          onClick={() => setTab('saas')}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
            background: tab === 'saas' ? '#fff' : 'transparent', color: tab === 'saas' ? '#047857' : '#64748b',
            boxShadow: tab === 'saas' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          💳 Mensalidades SaaS ({saasComissoes.length})
        </button>
        <button
          onClick={() => setTab('eventos')}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
            background: tab === 'eventos' ? '#fff' : 'transparent', color: tab === 'eventos' ? '#4338ca' : '#64748b',
            boxShadow: tab === 'eventos' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          🎯 Eventos Comerciais ({comissoes.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Carregando…</div>
      ) : tab === 'saas' ? (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[['all', 'Todas'], ['A_RECEBER', 'A receber'], ['PAGA', 'Pagas'], ['PREVISTA', 'Previstas'], ['CANCELADA', 'Canceladas']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setSaasFilter(v)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  background: saasFilter === v ? '#059669' : 'white',
                  color: saasFilter === v ? 'white' : '#64748b',
                  borderColor: saasFilter === v ? '#059669' : '#e2e8f0',
                  fontFamily: 'inherit',
                }}
              >{label}</button>
            ))}
          </div>

          {filteredSaas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '36px', margin: '0 0 10px' }}>💳</p>
              <p style={{ color: '#475569', fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Nenhuma comissão de mensalidade SaaS ainda.</p>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                Compartilhe seu link em <strong>Links de Assinatura</strong> — toda mensalidade paga pelas clínicas indicadas gera comissão automática aqui.
              </p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '12px 14px' }}>Competência</th>
                    <th style={{ padding: '12px 14px' }}>Clínica</th>
                    <th style={{ padding: '12px 14px' }}>Ciclo</th>
                    <th style={{ padding: '12px 14px' }}>Mensalidade</th>
                    <th style={{ padding: '12px 14px' }}>%</th>
                    <th style={{ padding: '12px 14px' }}>Comissão</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSaas.map(c => {
                    const st = STATUS_SAAS[c.status] || STATUS_SAAS.A_RECEBER;
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>{fmt(c.competencia)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{c.clinica_nome}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>{c.cycle === 'ANNUAL' ? 'Anual' : 'Mensal'}</td>
                        <td style={{ padding: '12px 14px' }}>{fmtCurrency(c.base_valor)}</td>
                        <td style={{ padding: '12px 14px' }}>{c.percent.toFixed(2).replace('.', ',')}%</td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#047857' }}>{fmtCurrency(c.valor)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[['all', 'Todos'], ...Object.entries(STATUS_EVENTO).map(([v, d]) => [v, d.label])].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  background: statusFilter === v ? '#6370f1' : 'white',
                  color: statusFilter === v ? 'white' : '#64748b',
                  borderColor: statusFilter === v ? '#6370f1' : '#e2e8f0',
                  fontFamily: 'inherit',
                }}
              >{label}</button>
            ))}
          </div>

          {filteredEventos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '36px', margin: '0 0 10px' }}>💰</p>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Nenhuma comissão comercial encontrada.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredEventos.map(c => {
                const st = STATUS_EVENTO[c.status] || STATUS_EVENTO.pendente;
                return (
                  <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '24px', flexShrink: 0 }}>{st.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{c.clinica_nome || 'Clínica'}</p>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, fontSize: '11px', fontWeight: 700 }}>{st.label}</span>
                      </div>
                      {c.clinica_cnpj && <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8' }}>CNPJ: {fmtCnpj(c.clinica_cnpj)}</p>}
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Evento: <strong>{EVENTO_LABELS[c.evento] || c.evento}</strong> · Gerada em {fmt(c.gerada_at)}
                        {c.aprovada_at ? ` · Aprovada em ${fmt(c.aprovada_at)}` : ''}
                        {c.paga_at ? ` · Paga em ${fmt(c.paga_at)}` : ''}
                      </p>
                      {c.justificativa && (
                        <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', borderLeft: `3px solid ${st.color}` }}>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}><strong>Observação:</strong> {c.justificativa}</p>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: st.color }}>{fmtCurrency(c.valor)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
