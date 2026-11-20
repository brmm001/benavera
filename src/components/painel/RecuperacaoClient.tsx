'use client';
import { useEffect, useState } from 'react';
import { Plus, Upload, MessageCircle, CheckCircle2, XCircle, Search } from 'lucide-react';

interface RecoveryItem {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  procedimento: string;
  valor: number;
  motivo: string | null;
  status: string;
  tentativas: number;
  ultimo_contato_em: string | null;
  historico: { data: string; por: string; nota: string }[];
  notas: string | null;
  created_at: string;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  ABERTA: { label: 'Para recuperar', color: '#b45309', bg: '#fef3c7' },
  EM_CONTATO: { label: 'Em contato', color: '#4338ca', bg: '#e0e7ff' },
  RECUPERADA: { label: 'Recuperada', color: '#047857', bg: '#d1fae5' },
  PERDIDA: { label: 'Perdida', color: '#64748b', bg: '#f1f5f9' },
};

export function RecuperacaoClient() {
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showNew, setShowNew] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [form, setForm] = useState({ patient_name: '', patient_phone: '', procedimento: '', valor: '', motivo: 'Achou caro / parcelamento', notas: '' });
  const [saving, setSaving] = useState(false);
  const [contactModal, setContactModal] = useState<RecoveryItem | null>(null);
  const [contactNota, setContactNota] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/painel/recuperacao');
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/painel/recuperacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, valor: Number(form.valor.replace(',', '.')) || 0 }),
    });
    setSaving(false);
    if (res.ok) {
      setShowNew(false);
      setForm({ patient_name: '', patient_phone: '', procedimento: '', valor: '', motivo: 'Achou caro / parcelamento', notas: '' });
      load();
    }
  }

  async function handleCsvImport() {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const bulk = lines.map((line) => {
      const [patient_name, patient_phone, procedimento, valor, motivo] = line.split(/[;,]/).map((s) => s.trim());
      return { patient_name, patient_phone, procedimento: procedimento || 'Tratamento', valor: Number(valor) || 0, motivo };
    }).filter((x) => x.patient_name);
    if (bulk.length === 0) return;
    setSaving(true);
    await fetch('/api/painel/recuperacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk }),
    });
    setSaving(false);
    setShowCsv(false);
    setCsvText('');
    load();
  }

  async function updateItem(id: string, payload: Record<string, unknown>) {
    await fetch('/api/painel/recuperacao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    });
    setContactModal(null);
    setContactNota('');
    load();
  }

  const filtered = items.filter((i) => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (search && !`${i.patient_name} ${i.procedimento} ${i.motivo || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openVal = items.filter((i) => i.status === 'ABERTA' || i.status === 'EM_CONTATO').reduce((s, i) => s + Number(i.valor || 0), 0);
  const recItems = items.filter((i) => i.status === 'RECUPERADA');
  const recVal = recItems.reduce((s, i) => s + Number(i.valor || 0), 0);

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Oportunidades para recuperar</h1>
          <p className="bv-subtitle">Pacientes que receberam orçamento e ainda não fecharam. Reative com parcelamento pelo WhatsApp.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="bv-btn ghost" onClick={() => setShowCsv((v) => !v)}>
            <Upload size={15} /> Importar CSV
          </button>
          <button type="button" className="bv-btn" onClick={() => setShowNew((v) => !v)}>
            <Plus size={15} /> Nova oportunidade
          </button>
        </div>
      </div>

      <div className="bv-grid bv-kpis">
        <div className="bv-card"><div className="bv-label">Em aberto</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#b45309' }}>{brl(openVal)}</div></div>
        <div className="bv-card"><div className="bv-label">Valor recuperado</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#047857' }}>{brl(recVal)}</div></div>
        <div className="bv-card"><div className="bv-label">Oportunidades recuperadas</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#1c1d4c' }}>{recItems.length} / {items.length}</div></div>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bv-card" style={{ marginBottom: '18px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '800' }}>Cadastrar orçamento não fechado</h3>
          <div className="bv-grid bv-cols-3" style={{ marginBottom: '12px' }}>
            <div><label className="bv-label">Paciente *</label><input className="bv-input" required value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
            <div><label className="bv-label">WhatsApp</label><input className="bv-input" placeholder="(11) 99999-9999" value={form.patient_phone} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} /></div>
            <div><label className="bv-label">Procedimento *</label><input className="bv-input" required placeholder="Ex: Implante dentário" value={form.procedimento} onChange={(e) => setForm({ ...form, procedimento: e.target.value })} /></div>
            <div><label className="bv-label">Valor do orçamento (R$)</label><input className="bv-input" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
            <div>
              <label className="bv-label">Motivo de não fechamento</label>
              <select className="bv-select" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })}>
                <option>Achou caro / parcelamento</option>
                <option>Ficou de pensar</option>
                <option>Sem limite no cartão</option>
                <option>Concorrência</option>
                <option>Outro motivo</option>
              </select>
            </div>
            <div><label className="bv-label">Observações</label><input className="bv-input" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="bv-btn" disabled={saving}>{saving ? 'Salvando…' : 'Salvar oportunidade'}</button>
            <button type="button" className="bv-btn ghost" onClick={() => setShowNew(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {showCsv && (
        <div className="bv-card" style={{ marginBottom: '18px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '800' }}>Importar por CSV / planilha</h3>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b' }}>Cole linhas no formato: <code>Nome;Telefone;Procedimento;Valor;Motivo</code></p>
          <textarea className="bv-textarea" rows={4} placeholder="Maria Silva;11999998888;Implante;12000;Sem limite no cartão" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="bv-btn" disabled={saving} onClick={handleCsvImport}>Importar linhas</button>
            <button type="button" className="bv-btn ghost" onClick={() => setShowCsv(false)}>Fechar</button>
          </div>
        </div>
      )}

      <div className="bv-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input className="bv-input" style={{ paddingLeft: '34px' }} placeholder="Buscar paciente, procedimento ou motivo…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['ALL', 'ABERTA', 'EM_CONTATO', 'RECUPERADA', 'PERDIDA'] as const).map((st) => (
              <button key={st} type="button" onClick={() => setStatusFilter(st)} className={`bv-btn sm ${statusFilter === st ? '' : 'ghost'}`}>
                {st === 'ALL' ? 'Todas' : STATUS_STYLE[st].label}
              </button>
            ))}
          </div>
        </div>

        {loading ? <p style={{ color: '#64748b' }}>Carregando…</p> : filtered.length === 0 ? (
          <div className="bv-empty">Nenhuma oportunidade encontrada. Cadastre manualmente ou importe sua lista de orçamentos.</div>
        ) : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead><tr><th>Paciente</th><th>Procedimento</th><th>Valor</th><th>Motivo</th><th>Tentativas</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.map((item) => {
                  const st = STATUS_STYLE[item.status] || STATUS_STYLE.ABERTA;
                  const waText = encodeURIComponent(`Olá ${item.patient_name.split(' ')[0]}! Aqui é da clínica. Lembramos do seu orçamento de ${item.procedimento} (${brl(Number(item.valor))}). Agora temos opções de parcelamento facilitado sem comprometer o limite do cartão, sujeito à análise. Gostaria de simular?`);
                  const phoneDigits = (item.patient_phone || '').replace(/\D/g, '');
                  return (
                    <tr key={item.id}>
                      <td><div style={{ fontWeight: '700' }}>{item.patient_name}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.patient_phone || 'Sem telefone'}</div></td>
                      <td>{item.procedimento}</td>
                      <td style={{ fontWeight: '700' }}>{brl(Number(item.valor))}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{item.motivo || '—'}</td>
                      <td>{item.tentativas}</td>
                      <td><span className="bv-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {phoneDigits && (
                            <a className="bv-btn soft sm" href={`https://wa.me/55${phoneDigits}?text=${waText}`} target="_blank" rel="noopener noreferrer" title="Enviar WhatsApp">
                              <MessageCircle size={13} /> WhatsApp
                            </a>
                          )}
                          <button type="button" className="bv-btn ghost sm" onClick={() => setContactModal(item)}>Registrar</button>
                          {item.status !== 'RECUPERADA' && (
                            <button type="button" className="bv-btn soft sm" title="Marcar como recuperada" onClick={() => updateItem(item.id, { status: 'RECUPERADA' })}>
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          {item.status !== 'PERDIDA' && (
                            <button type="button" className="bv-btn danger sm" title="Marcar como perdida" onClick={() => updateItem(item.id, { status: 'PERDIDA' })}>
                              <XCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {contactModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div className="bv-card" style={{ maxWidth: '460px', width: '100%' }}>
            <h3 style={{ margin: '0 0 8px' }}>Registrar contato — {contactModal.patient_name}</h3>
            <textarea className="bv-textarea" rows={3} placeholder="Resumo do contato com o paciente…" value={contactNota} onChange={(e) => setContactNota(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="button" className="bv-btn" onClick={() => updateItem(contactModal.id, { status: 'EM_CONTATO', contato_nota: contactNota || 'Contato realizado' })}>Salvar contato</button>
              <button type="button" className="bv-btn ghost" onClick={() => setContactModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
