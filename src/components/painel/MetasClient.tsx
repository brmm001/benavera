'use client';
import { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';

interface Consultant {
  id: string;
  nome: string;
  cargo: string | null;
  meta_mensal: number;
  comissao_percent: number;
  fechamentos_valor: number;
  fechamentos_qtd: number;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function MetasClient() {
  const [list, setList] = useState<Consultant[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ nome: '', cargo: 'Consultor(a) Comercial', meta_mensal: '', comissao_percent: '3', fechamentos_valor: '0', fechamentos_qtd: '0' });

  async function load() {
    const res = await fetch('/api/painel/metas');
    const data = await res.json();
    if (res.ok) setList(data.consultants || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/painel/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ nome: '', cargo: 'Consultor(a) Comercial', meta_mensal: '', comissao_percent: '3', fechamentos_valor: '0', fechamentos_qtd: '0' });
      load();
    }
  }

  function exportCsv() {
    const rows = [['Consultor', 'Cargo', 'Meta', 'Fechado', '% Comissão', 'Comissão Interna']];
    for (const c of list) {
      const com = (Number(c.fechamentos_valor) * Number(c.comissao_percent)) / 100;
      rows.push([c.nome, c.cargo || '', String(c.meta_mensal), String(c.fechamentos_valor), String(c.comissao_percent), com.toFixed(2)]);
    }
    const blob = new Blob(['\uFEFF' + rows.map((r) => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'metas-equipe.csv';
    a.click();
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Metas e Comissões da Equipe</h1>
          <p className="bv-subtitle">Controle metas e comissões internas dos consultores da clínica (independente das taxas de correspondência bancária).</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="bv-btn ghost" onClick={exportCsv}><Download size={14} /> Exportar CSV</button>
          <button type="button" className="bv-btn" onClick={() => setShowNew((v) => !v)}><Plus size={15} /> Novo consultor</button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={create} className="bv-card" style={{ marginBottom: '18px' }}>
          <div className="bv-grid bv-cols-3" style={{ marginBottom: '12px' }}>
            <div><label className="bv-label">Nome *</label><input className="bv-input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><label className="bv-label">Cargo</label><input className="bv-input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
            <div><label className="bv-label">Meta mensal (R$)</label><input className="bv-input" type="number" value={form.meta_mensal} onChange={(e) => setForm({ ...form, meta_mensal: e.target.value })} /></div>
            <div><label className="bv-label">Comissão interna (%)</label><input className="bv-input" type="number" step="0.5" value={form.comissao_percent} onChange={(e) => setForm({ ...form, comissao_percent: e.target.value })} /></div>
            <div><label className="bv-label">Fechamentos no mês (R$)</label><input className="bv-input" type="number" value={form.fechamentos_valor} onChange={(e) => setForm({ ...form, fechamentos_valor: e.target.value })} /></div>
          </div>
          <button className="bv-btn">Salvar consultor</button>
        </form>
      )}

      <div className="bv-card">
        {list.length === 0 ? <div className="bv-empty">Nenhum consultor cadastrado ainda.</div> : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead><tr><th>Consultor</th><th>Meta</th><th>Fechado</th><th>Atingimento</th><th>Comissão est.</th></tr></thead>
              <tbody>
                {list.map((c) => {
                  const meta = Number(c.meta_mensal || 0);
                  const fech = Number(c.fechamentos_valor || 0);
                  const pctMeta = meta > 0 ? Math.min(100, (fech / meta) * 100) : 0;
                  const com = fech * (Number(c.comissao_percent || 0) / 100);
                  return (
                    <tr key={c.id}>
                      <td><div style={{ fontWeight: '700' }}>{c.nome}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.cargo}</div></td>
                      <td>{brl(meta)}</td>
                      <td style={{ fontWeight: '700' }}>{brl(fech)}</td>
                      <td><span className="bv-badge" style={{ background: pctMeta >= 100 ? '#d1fae5' : '#eef2ff', color: pctMeta >= 100 ? '#047857' : '#4040ca' }}>{pctMeta.toFixed(0)}%</span></td>
                      <td style={{ fontWeight: '800', color: '#047857' }}>{brl(com)} ({c.comissao_percent}%)</td>
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
