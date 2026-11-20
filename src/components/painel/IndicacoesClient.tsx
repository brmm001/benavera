'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

interface Referral {
  id: string;
  indicador_nome: string;
  indicado_nome: string;
  indicado_contato: string | null;
  origem: string | null;
  status: string;
  valor_estimado: number;
  responsavel: string | null;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function IndicacoesClient() {
  const [list, setList] = useState<Referral[]>([]);
  const [form, setForm] = useState({ indicador_nome: '', indicado_nome: '', indicado_contato: '', origem: 'Paciente', valor_estimado: '' });

  async function load() {
    const res = await fetch('/api/painel/indicacoes');
    const data = await res.json();
    if (res.ok) setList(data.referrals || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/painel/indicacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, valor_estimado: Number(form.valor_estimado) || 0 }),
    });
    if (res.ok) { setForm({ indicador_nome: '', indicado_nome: '', indicado_contato: '', origem: 'Paciente', valor_estimado: '' }); load(); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/painel/indicacoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Indicações</h1>
          <p className="bv-subtitle">Registre indicações recebidas, origem, responsável e taxa de conversão.</p>
        </div>
      </div>

      <form onSubmit={create} className="bv-card" style={{ marginBottom: '20px' }}>
        <div className="bv-grid bv-cols-3" style={{ marginBottom: '12px' }}>
          <div><label className="bv-label">Quem indicou *</label><input className="bv-input" required value={form.indicador_nome} onChange={(e) => setForm({ ...form, indicador_nome: e.target.value })} /></div>
          <div><label className="bv-label">Paciente indicado *</label><input className="bv-input" required value={form.indicado_nome} onChange={(e) => setForm({ ...form, indicado_nome: e.target.value })} /></div>
          <div><label className="bv-label">Contato do indicado</label><input className="bv-input" value={form.indicado_contato} onChange={(e) => setForm({ ...form, indicado_contato: e.target.value })} /></div>
          <div><label className="bv-label">Origem</label><input className="bv-input" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} /></div>
          <div><label className="bv-label">Valor estimado (R$)</label><input className="bv-input" type="number" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })} /></div>
        </div>
        <button className="bv-btn"><Plus size={15} /> Registrar indicação</button>
      </form>

      <div className="bv-card">
        {list.length === 0 ? <div className="bv-empty">Nenhuma indicação registrada ainda.</div> : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead><tr><th>Quem indicou</th><th>Indicado</th><th>Origem</th><th>Valor est.</th><th>Status</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: '700' }}>{r.indicador_nome}</td>
                    <td>{r.indicado_nome}</td>
                    <td>{r.origem}</td>
                    <td>{brl(Number(r.valor_estimado))}</td>
                    <td>
                      <select className="bv-select" style={{ width: '150px', padding: '6px 8px' }} value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)}>
                        <option value="NOVA">Nova</option>
                        <option value="EM_CONTATO">Em contato</option>
                        <option value="CONVERTIDA">Convertida</option>
                        <option value="PERDIDA">Perdida</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
