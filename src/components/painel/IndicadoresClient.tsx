'use client';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Metrics {
  orcamentos_emitidos: number;
  orcamentos_fechados: number;
  taxa_conversao: number;
  vendas_perdidas: number;
  valor_recuperado: number;
  valor_financiado: number;
  ticket_medio: number;
  propostas_financiamento: number;
  propostas_aprovadas: number;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function IndicadoresClient() {
  const [days, setDays] = useState(90);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [monthly, setMonthly] = useState<{ mes: string; qtd: number; volume: number }[]>([]);

  useEffect(() => {
    fetch(`/api/painel/indicadores?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMetrics(d.metrics);
          setMonthly(d.monthly || []);
        }
      });
  }, [days]);

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Indicadores Comerciais</h1>
          <p className="bv-subtitle">Acompanhe orçamentos, conversão, recuperação e volume financiado em tempo real.</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[30, 90, 180, 365].map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={`bv-btn sm ${days === d ? '' : 'ghost'}`}>
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {metrics && (
        <div className="bv-grid bv-kpis">
          <div className="bv-card"><div className="bv-label">Orçamentos emitidos</div><div style={{ fontSize: '24px', fontWeight: '800' }}>{metrics.orcamentos_emitidos}</div></div>
          <div className="bv-card"><div className="bv-label">Orçamentos fechados</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#047857' }}>{metrics.orcamentos_fechados}</div></div>
          <div className="bv-card"><div className="bv-label">Taxa de conversão</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#4040ca' }}>{metrics.taxa_conversao.toFixed(1)}%</div></div>
          <div className="bv-card"><div className="bv-label">Valor recuperado</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#047857' }}>{brl(metrics.valor_recuperado)}</div></div>
          <div className="bv-card"><div className="bv-label">Valor financiado</div><div style={{ fontSize: '24px', fontWeight: '800' }}>{brl(metrics.valor_financiado)}</div></div>
          <div className="bv-card"><div className="bv-label">Ticket médio</div><div style={{ fontSize: '24px', fontWeight: '800' }}>{brl(metrics.ticket_medio)}</div></div>
          <div className="bv-card"><div className="bv-label">Vendas perdidas</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626' }}>{metrics.vendas_perdidas}</div></div>
          <div className="bv-card"><div className="bv-label">Financiamentos aprovados</div><div style={{ fontSize: '24px', fontWeight: '800' }}>{metrics.propostas_aprovadas} / {metrics.propostas_financiamento}</div></div>
        </div>
      )}

      <div className="bv-card">
        <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '800' }}>Evolução mensal de volume solicitado</h3>
        {monthly.length === 0 ? (
          <div className="bv-empty">Ainda não há movimentação financeira suficiente para o gráfico mensal.</div>
        ) : (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Bar dataKey="volume" name="Volume (R$)" fill="#4040ca" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
