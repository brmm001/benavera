'use client';
import { useState } from 'react';
import { Percent } from 'lucide-react';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function MargemClient() {
  const [tratamento, setTratamento] = useState(10000);
  const [materiais, setMateriais] = useState(1800);
  const [operacional, setOperacional] = useState(900);
  const [comissaoPct, setComissaoPct] = useState(10);
  const [taxaFinPct, setTaxaFinPct] = useState(5);
  const [outras, setOutras] = useState(200);

  const taxaFin = tratamento * (taxaFinPct / 100);
  const comissao = tratamento * (comissaoPct / 100);
  const receitaLiquida = tratamento - taxaFin;
  const custosTotais = materiais + operacional + comissao + outras;
  const lucro = receitaLiquida - custosTotais;
  const margem = tratamento > 0 ? (lucro / tratamento) * 100 : 0;

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Calculadora de Margem</h1>
          <p className="bv-subtitle">Avalie receita líquida, margem de contribuição e impacto das taxas financeiras por tratamento.</p>
        </div>
      </div>

      <div className="bv-grid bv-cols-2">
        <div className="bv-card" style={{ display: 'grid', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Percent size={16} color="#4040ca" /> Custos e parâmetros (editáveis)
          </h3>
          <div><label className="bv-label">Valor do tratamento (R$)</label><input className="bv-input" type="number" value={tratamento} onChange={(e) => setTratamento(Number(e.target.value))} /></div>
          <div className="bv-grid bv-cols-2" style={{ marginBottom: 0 }}>
            <div><label className="bv-label">Custo dos materiais (R$)</label><input className="bv-input" type="number" value={materiais} onChange={(e) => setMateriais(Number(e.target.value))} /></div>
            <div><label className="bv-label">Custo operacional (R$)</label><input className="bv-input" type="number" value={operacional} onChange={(e) => setOperacional(Number(e.target.value))} /></div>
            <div><label className="bv-label">Comissão interna (%)</label><input className="bv-input" type="number" step="0.5" value={comissaoPct} onChange={(e) => setComissaoPct(Number(e.target.value))} /></div>
            <div><label className="bv-label">Taxa financeira (%)</label><input className="bv-input" type="number" step="0.5" value={taxaFinPct} onChange={(e) => setTaxaFinPct(Number(e.target.value))} /></div>
          </div>
          <div><label className="bv-label">Outras despesas (R$)</label><input className="bv-input" type="number" value={outras} onChange={(e) => setOutras(Number(e.target.value))} /></div>
        </div>

        <div className="bv-card" style={{ background: '#1c1d4c', color: '#fff' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase' }}>Rentabilidade estimada</div>
          <div style={{ fontSize: '38px', fontWeight: '800', margin: '10px 0 4px', color: margem >= 25 ? '#6ee7b7' : '#fcd34d' }}>
            {brl(lucro)}
          </div>
          <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '18px' }}>Margem líquida estimada: <strong>{margem.toFixed(1)}%</strong></div>
          <div style={{ display: 'grid', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '14px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Receita bruta</span><strong>{brl(tratamento)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>(-) Taxa financeira ({taxaFinPct}%)</span><strong>-{brl(taxaFin)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>(=) Receita líquida da clínica</span><strong>{brl(receitaLiquida)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>(-) Materiais + Operacional + Outros</span><strong>-{brl(materiais + operacional + outras)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>(-) Comissão equipe ({comissaoPct}%)</span><strong>-{brl(comissao)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
