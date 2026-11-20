'use client';
import { useEffect, useState } from 'react';
import { Calculator, Save, Copy, Check } from 'lucide-react';

interface Partner {
  id: string;
  nome: string;
  ticket_minimo: number;
  ticket_maximo: number;
  prazo_maximo: number;
  comissao_benavera_percent: number;
}

interface SavedSim {
  id: string;
  patient_name: string | null;
  valor: number;
  parcelas: number;
  valor_parcela: number;
  repasse_liquido: number;
  created_at: string;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function SimuladorPainelClient() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [saved, setSaved] = useState<SavedSim[]>([]);
  const [valor, setValor] = useState(8000);
  const [parcelas, setParcelas] = useState(18);
  const [taxaMensal, setTaxaMensal] = useState(2.49);
  const [taxaClinica, setTaxaClinica] = useState(5);
  const [patientName, setPatientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/painel/simulador');
    const data = await res.json();
    if (res.ok) {
      setPartners(data.partners || []);
      setSaved(data.saved || []);
    }
  }

  useEffect(() => { load(); }, []);

  const i = taxaMensal / 100;
  const parcelaEstimada = i > 0 ? (valor * i) / (1 - Math.pow(1 + i, -parcelas)) : valor / parcelas;
  const custoTotalPaciente = parcelaEstimada * parcelas;
  const repasseLiquido = valor * (1 - taxaClinica / 100);

  async function handleSave() {
    setSaving(true);
    await fetch('/api/painel/simulador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_name: patientName || 'Simulação rápida',
        valor,
        parcelas,
        valor_parcela: Number(parcelaEstimada.toFixed(2)),
        taxa_mensal: taxaMensal,
        repasse_liquido: Number(repasseLiquido.toFixed(2)),
      }),
    });
    setSaving(false);
    setPatientName('');
    load();
  }

  function copySummary(id: string, v: number, p: number, vp: number) {
    const text = `Simulação ilustrativa Benavera:\nValor do tratamento: ${brl(v)}\nParcelamento estimado: ${p}x de ${brl(vp)} (sujeito à análise de crédito e condições finais do parceiro financeiro).`;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Simulador Inteligente</h1>
          <p className="bv-subtitle">Simule cenários ilustrativos de parcelamento e veja o repasse líquido estimado para a clínica.</p>
        </div>
      </div>

      <div className="bv-grid bv-cols-2">
        <div className="bv-card">
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={16} color="#4040ca" /> Parâmetros da simulação
          </h3>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <label className="bv-label">Nome do paciente (opcional, para salvar)</label>
              <input className="bv-input" placeholder="Ex: João Silva" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            </div>
            <div>
              <label className="bv-label">Valor do tratamento: <strong>{brl(valor)}</strong></label>
              <input type="range" min={500} max={60000} step={250} value={valor} onChange={(e) => setValor(Number(e.target.value))} style={{ width: '100%', accentColor: '#4040ca' }} />
            </div>
            <div>
              <label className="bv-label">Parcelas: <strong>{parcelas}x</strong></label>
              <input type="range" min={3} max={36} step={1} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} style={{ width: '100%', accentColor: '#4040ca' }} />
            </div>
            <div className="bv-grid bv-cols-2" style={{ marginBottom: 0 }}>
              <div><label className="bv-label">Taxa estimada (% a.m.)</label><input className="bv-input" type="number" step="0.1" value={taxaMensal} onChange={(e) => setTaxaMensal(Number(e.target.value))} /></div>
              <div><label className="bv-label">Taxa da clínica (%)</label><input className="bv-input" type="number" step="0.5" value={taxaClinica} onChange={(e) => setTaxaClinica(Number(e.target.value))} /></div>
            </div>
            <button type="button" className="bv-btn" disabled={saving} onClick={handleSave}>
              <Save size={15} /> {saving ? 'Salvando…' : 'Salvar simulação'}
            </button>
          </div>
        </div>

        <div className="bv-card" style={{ background: 'linear-gradient(145deg, #1c1d4c, #2d2b70)', color: '#ffffff' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c7d2fe' }}>
            Estimativa ilustrativa ao paciente
          </div>
          <div style={{ fontSize: '38px', fontWeight: '800', margin: '12px 0 4px', letterSpacing: '-0.03em' }}>
            {parcelas}x de {brl(parcelaEstimada)}
          </div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '20px' }}>
            Custo total estimado: {brl(custoTotalPaciente)} · Repasse líquido estimado à clínica: <strong style={{ color: '#6ee7b7' }}>{brl(repasseLiquido)}</strong>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '14px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
            ⚠️ <strong>Aviso importante:</strong> esta simulação é apenas estimativa ilustrativa e <strong>não representa oferta real nem garantia de aprovação</strong>. Taxas, CET e aprovação dependem da análise do parceiro financeiro.
          </div>

          {partners.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#a5b4fc', marginBottom: '6px' }}>Parceiros habilitados na plataforma</div>
              {partners.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', color: '#e2e8f0' }}>
                  <span>{p.nome}</span>
                  <span>{brl(Number(p.ticket_minimo))} – {brl(Number(p.ticket_maximo))} (até {p.prazo_maximo}x)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bv-card">
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Simulações salvas</h3>
        {saved.length === 0 ? <div className="bv-empty">Nenhuma simulação salva ainda.</div> : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead><tr><th>Paciente</th><th>Valor</th><th>Parcelas</th><th>Repasse líquido est.</th><th>Data</th><th></th></tr></thead>
              <tbody>
                {saved.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '700' }}>{s.patient_name || 'Simulação'}</td>
                    <td>{brl(Number(s.valor))}</td>
                    <td>{s.parcelas}x de {brl(Number(s.valor_parcela))}</td>
                    <td style={{ fontWeight: '700', color: '#047857' }}>{brl(Number(s.repasse_liquido))}</td>
                    <td>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="bv-btn soft sm" onClick={() => copySummary(s.id, Number(s.valor), s.parcelas, Number(s.valor_parcela))}>
                        {copiedId === s.id ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                      </button>
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
