'use client';
import { useEffect, useState } from 'react';
import { FileCheck, Plus, Printer, Copy, Check } from 'lucide-react';

interface DigitalProp {
  id: string;
  token: string;
  patient_name: string;
  patient_phone: string | null;
  procedimentos: { nome: string; qtd: number; valor: number }[];
  subtotal: number;
  desconto: number;
  total: number;
  condicoes: string | null;
  validade: string | null;
  status: string;
  created_at: string;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function PropostasDigitaisClient() {
  const [list, setList] = useState<DigitalProp[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [condicoes, setCondicoes] = useState('Parcelamento sujeito à análise via Benavera ou condições diretas da clínica.');
  const [validade, setValidade] = useState('');
  const [procs, setProcs] = useState([{ nome: '', qtd: 1, valor: 0 }]);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/painel/propostas-digitais');
    const data = await res.json();
    if (res.ok) setList(data.proposals || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/painel/propostas-digitais', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_name: patientName, patient_phone: patientPhone, procedimentos: procs.filter((p) => p.nome), desconto, condicoes, validade: validade || null }),
    });
    if (res.ok) {
      setShowNew(false);
      setPatientName('');
      setProcs([{ nome: '', qtd: 1, valor: 0 }]);
      load();
    }
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Propostas Digitais</h1>
          <p className="bv-subtitle">Crie orçamentos profissionais com link seguro, impressão em PDF e aceite digital do paciente.</p>
        </div>
        <button type="button" className="bv-btn" onClick={() => setShowNew((v) => !v)}><Plus size={15} /> Nova proposta</button>
      </div>

      {showNew && (
        <form onSubmit={create} className="bv-card" style={{ marginBottom: '20px' }}>
          <div className="bv-grid bv-cols-3" style={{ marginBottom: '12px' }}>
            <div><label className="bv-label">Paciente *</label><input className="bv-input" required value={patientName} onChange={(e) => setPatientName(e.target.value)} /></div>
            <div><label className="bv-label">WhatsApp</label><input className="bv-input" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} /></div>
            <div><label className="bv-label">Validade</label><input className="bv-input" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></div>
          </div>

          <div className="bv-label">Procedimentos</div>
          {procs.map((p, i) => (
            <div key={i} className="bv-grid bv-cols-3" style={{ marginBottom: '8px' }}>
              <input className="bv-input" placeholder="Procedimento" value={p.nome} onChange={(e) => { const next = [...procs]; next[i].nome = e.target.value; setProcs(next); }} />
              <input className="bv-input" type="number" min={1} placeholder="Qtd" value={p.qtd} onChange={(e) => { const next = [...procs]; next[i].qtd = Number(e.target.value); setProcs(next); }} />
              <input className="bv-input" type="number" placeholder="Valor unitário (R$)" value={p.valor} onChange={(e) => { const next = [...procs]; next[i].valor = Number(e.target.value); setProcs(next); }} />
            </div>
          ))}
          <button type="button" className="bv-btn ghost sm" style={{ marginBottom: '12px' }} onClick={() => setProcs([...procs, { nome: '', qtd: 1, valor: 0 }])}>+ Adicionar item</button>

          <div className="bv-grid bv-cols-2" style={{ marginBottom: '12px' }}>
            <div><label className="bv-label">Desconto (R$)</label><input className="bv-input" type="number" value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} /></div>
            <div><label className="bv-label">Condições</label><input className="bv-input" value={condicoes} onChange={(e) => setCondicoes(e.target.value)} /></div>
          </div>
          <button className="bv-btn"><FileCheck size={15} /> Gerar proposta digital</button>
        </form>
      )}

      <div className="bv-card">
        {list.length === 0 ? <div className="bv-empty">Nenhuma proposta digital gerada ainda.</div> : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead><tr><th>Paciente</th><th>Total</th><th>Validade</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '700' }}>{p.patient_name}</td>
                    <td style={{ fontWeight: '800', color: '#4040ca' }}>{brl(Number(p.total))}</td>
                    <td>{p.validade ? new Date(p.validade).toLocaleDateString('pt-BR') : '—'}</td>
                    <td><span className="bv-badge" style={p.status === 'ACEITA' ? { background: '#d1fae5', color: '#047857' } : { background: '#eef2ff', color: '#4040ca' }}>{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="bv-btn soft sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/orcamento/${p.token}`); setCopied(p.token); setTimeout(() => setCopied(null), 2000); }}>
                          {copied === p.token ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Link</>}
                        </button>
                        <a className="bv-btn ghost sm" href={`/orcamento/${p.token}`} target="_blank" rel="noopener noreferrer">
                          <Printer size={13} /> Abrir / PDF
                        </a>
                      </div>
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
