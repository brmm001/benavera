'use client';
// src/app/admin/atendentes/page.tsx
// Gerenciamento de atendentes + distribuição de leads + comissões

import { useState, useEffect, useCallback } from 'react';

type Atendente = {
  id: string;
  name: string;
  email: string;
  ativo: boolean;
  receiving_leads: boolean;
  lead_limit: number;
  last_login_at?: string;
  active_clinic_leads: number;
  total_clinicas: number;
  created_at: string;
};

type DistStats = {
  atendentes: Array<{
    id: string; name: string; lead_limit: number; receiving_leads: boolean;
    ativo: boolean; active_leads: number; total_clinicas: number; disponivel: boolean;
  }>;
  leads_na_fila: number;
};

type Comissao = {
  id: string;
  atendente_name: string;
  clinica_nome?: string;
  evento: string;
  valor: number;
  status: string;
  gerada_at: string;
};

type CommissionRule = { id: string; nome: string; evento: string; valor: number; ativa: boolean };

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmt(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

const TAB_LABELS = ['Atendentes', 'Distribuição', 'Comissões'];

export default function AdminAtendentesPage() {
  const [tab, setTab] = useState(0);
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  const [distStats, setDistStats] = useState<DistStats | null>(null);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovoAtendente, setShowNovoAtendente] = useState(false);
  const [showNovaRegra, setShowNovaRegra] = useState(false);
  const [novoForm, setNovoForm] = useState({ name: '', email: '', password: '', lead_limit: 30 });
  const [regraForm, setRegraForm] = useState({ nome: '', evento: 'cadastro_validado', valor: '' });
  const [saving, setSaving] = useState(false);
  const [comissaoFiltroStatus, setComissaoFiltroStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [a, d, c] = await Promise.all([
      fetch('/api/admin/atendentes').then(r => r.json()),
      fetch('/api/admin/atendentes/distribuicao').then(r => r.json()),
      fetch('/api/admin/comissoes').then(r => r.json()),
    ]);
    setAtendentes(a.atendentes || []);
    setDistStats(d.stats || null);
    setComissoes(c.comissoes || []);
    setRules(c.regras || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleToggleReceiving(id: string, current: boolean) {
    await fetch(`/api/admin/atendentes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiving_leads: !current }),
    });
    setAtendentes(prev => prev.map(a => a.id === id ? { ...a, receiving_leads: !current } : a));
  }

  async function handleToggleAtivo(id: string, current: boolean) {
    await fetch(`/api/admin/atendentes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !current }),
    });
    setAtendentes(prev => prev.map(a => a.id === id ? { ...a, ativo: !current } : a));
  }

  async function handleUpdateLimit(id: string, limit: number) {
    await fetch(`/api/admin/atendentes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_limit: limit }),
    });
  }

  async function handleCriarAtendente(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/atendentes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoForm),
    });
    const data = await res.json();
    if (data.success) {
      setShowNovoAtendente(false);
      setNovoForm({ name: '', email: '', password: '', lead_limit: 30 });
      fetchAll();
    }
    setSaving(false);
  }

  async function handleCriarRegra(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/admin/comissoes/regras', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...regraForm, valor: Number(regraForm.valor) }),
    });
    setShowNovaRegra(false);
    setRegraForm({ nome: '', evento: 'cadastro_validado', valor: '' });
    fetchAll();
    setSaving(false);
  }

  async function handleComissaoStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch('/api/admin/comissoes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, justificativa: justificativa || undefined }),
    });
    setJustificativa('');
    setUpdatingId(null);
    fetchAll();
  }

  const filteredComissoes = comissaoFiltroStatus === 'all'
    ? comissoes
    : comissoes.filter(c => c.status === comissaoFiltroStatus);

  const STATUS_COM = {
    pendente:  { color: '#f59e0b', label: 'Pendente' },
    aprovada:  { color: '#6370f1', label: 'Aprovada' },
    paga:      { color: '#10b981', label: 'Paga' },
    recusada:  { color: '#ef4444', label: 'Recusada' },
    estornada: { color: '#94a3b8', label: 'Estornada' },
  } as Record<string, { color: string; label: string }>;

  const cardStyle = { background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: '12px' };
  const inputStyle = { width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' as const, fontFamily: 'inherit' };

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>Atendentes</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Gestão de atendentes, distribuição de leads e comissões</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '24px', width: 'fit-content' }}>
        {TAB_LABELS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: tab === i ? 'white' : 'transparent',
            color: tab === i ? '#1c1d4c' : '#64748b',
            boxShadow: tab === i ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{t}</button>
        ))}
      </div>

      {/* ── TAB 0: Atendentes ──────────────────────────────── */}
      {tab === 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowNovoAtendente(true)} style={{
              padding: '9px 18px', background: '#6370f1', color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
            }}>+ Novo atendente</button>
          </div>

          {/* Modal Novo Atendente */}
          {showNovoAtendente && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <form onSubmit={handleCriarAtendente} style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '400px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1c1d4c' }}>Novo atendente</h2>
                {[['name','Nome completo','text'],['email','E-mail','email'],['password','Senha inicial','password']].map(([f,l,t]) => (
                  <div key={f}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>{l}</label>
                    <input type={t} required value={(novoForm as Record<string,string|number>)[f] as string}
                      onChange={e => setNovoForm(p => ({...p, [f]: e.target.value}))} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Limite de leads ativos</label>
                  <input type="number" min={1} max={200} value={novoForm.lead_limit}
                    onChange={e => setNovoForm(p => ({...p, lead_limit: Number(e.target.value)}))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setShowNovoAtendente(false)} style={{ flex: 1, padding: '10px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>Cancelar</button>
                  <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', background: '#6370f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700' }}>{saving ? 'Criando…' : 'Criar'}</button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Carregando…</div>
          ) : atendentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}>👥</p>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Nenhum atendente cadastrado.</p>
            </div>
          ) : (
            atendentes.map(a => (
              <div key={a.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{a.name}</p>
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: a.ativo ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.12)', color: a.ativo ? '#4ade80' : '#f87171' }}>
                        {a.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{a.email}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                      {a.active_clinic_leads} leads · {a.total_clinicas} clínicas · Último acesso: {fmt(a.last_login_at)}
                    </p>
                  </div>

                  {/* Limite */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Limite:</span>
                    <input
                      type="number" min={1} max={200} defaultValue={a.lead_limit}
                      onBlur={e => handleUpdateLimit(a.id, Number(e.target.value))}
                      style={{ width: '60px', padding: '5px 8px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}
                    />
                  </div>

                  {/* Toggle receber leads */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Recebe leads</span>
                    <button
                      onClick={() => handleToggleReceiving(a.id, a.receiving_leads)}
                      style={{
                        width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: a.receiving_leads ? '#10b981' : '#e2e8f0', transition: 'all 0.2s',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '2px', width: '20px', height: '20px',
                        borderRadius: '50%', background: 'white',
                        left: a.receiving_leads ? '22px' : '2px', transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>

                  {/* Toggle ativo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Conta ativa</span>
                    <button
                      onClick={() => handleToggleAtivo(a.id, a.ativo)}
                      style={{
                        width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: a.ativo ? '#6370f1' : '#e2e8f0', transition: 'all 0.2s',
                        position: 'relative',
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '2px', width: '20px', height: '20px',
                        borderRadius: '50%', background: 'white',
                        left: a.ativo ? '22px' : '2px', transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 1: Distribuição ───────────────────────────── */}
      {tab === 1 && (
        <div>
          {distStats && (
            <>
              {/* Fila */}
              {distStats.leads_na_fila > 0 && (
                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⏳</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: '700', color: '#92400e', fontSize: '15px' }}>
                      {distStats.leads_na_fila} lead{distStats.leads_na_fila > 1 ? 's' : ''} na fila
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#b45309' }}>
                      Aguardando atendente disponível. Habilite ou aumente o limite de algum atendente.
                    </p>
                  </div>
                </div>
              )}

              {/* Cards de capacidade */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {distStats.atendentes.map(a => {
                  const pct = a.lead_limit > 0 ? Math.min(100, (a.active_leads / a.lead_limit) * 100) : 0;
                  return (
                    <div key={a.id} style={{ ...cardStyle, marginBottom: 0, borderLeft: `3px solid ${a.disponivel ? '#10b981' : '#e2e8f0'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{a.name}</p>
                        <span style={{
                          padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                          background: a.disponivel ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.12)',
                          color: a.disponivel ? '#10b981' : '#94a3b8',
                        }}>{a.disponivel ? 'Disponível' : 'Indisponível'}</span>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b' }}>
                        {a.active_leads}/{a.lead_limit} leads · {a.total_clinicas} clínicas
                      </p>
                      {/* Barra de capacidade */}
                      <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '6px' }}>
                        <div style={{
                          height: '6px', borderRadius: '4px', transition: 'width 0.3s',
                          width: `${pct}%`,
                          background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981',
                        }} />
                      </div>
                      {!a.receiving_leads && <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>⏸ Pausado</p>}
                      {!a.ativo && <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>🔴 Inativo</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB 2: Comissões ──────────────────────────────── */}
      {tab === 2 && (
        <div>
          {/* Regras */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1d4c' }}>Regras configuradas</h2>
              <button onClick={() => setShowNovaRegra(true)} style={{ padding: '7px 14px', background: '#6370f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>+ Nova regra</button>
            </div>

            {showNovaRegra && (
              <form onSubmit={handleCriarRegra} style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 2, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Nome da regra</label>
                  <input type="text" required value={regraForm.nome} onChange={e => setRegraForm(p => ({...p, nome: e.target.value}))} style={inputStyle} />
                </div>
                <div style={{ flex: 2, minWidth: '140px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Evento</label>
                  <select value={regraForm.evento} onChange={e => setRegraForm(p => ({...p, evento: e.target.value}))} style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}>
                    <option value="cadastro_validado">Cadastro validado</option>
                    <option value="primeira_operacao">Primeira operação</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Valor (R$)</label>
                  <input type="number" required min={0} step="0.01" value={regraForm.valor} onChange={e => setRegraForm(p => ({...p, valor: e.target.value}))} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={() => setShowNovaRegra(false)} style={{ padding: '8px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>✕</button>
                  <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' }}>{saving ? '…' : 'Salvar'}</button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {rules.map(r => (
                <div key={r.id} style={{ padding: '10px 14px', background: 'white', borderRadius: '10px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{r.nome}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{r.evento} · {fmtCurrency(r.valor)}</p>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: r.ativa ? 'rgba(74,222,128,0.15)' : 'rgba(148,163,184,0.12)', color: r.ativa ? '#4ade80' : '#94a3b8' }}>
                    {r.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              ))}
              {rules.length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8' }}>Nenhuma regra configurada.</p>}
            </div>
          </div>

          {/* Lista de comissões */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1c1d4c' }}>Comissões</h2>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'pendente', 'aprovada', 'paga', 'recusada'].map(v => (
                <button key={v} onClick={() => setComissaoFiltroStatus(v)} style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                  cursor: 'pointer', border: '1.5px solid',
                  background: comissaoFiltroStatus === v ? '#6370f1' : 'white',
                  color: comissaoFiltroStatus === v ? 'white' : '#64748b',
                  borderColor: comissaoFiltroStatus === v ? '#6370f1' : '#e2e8f0', fontFamily: 'inherit',
                }}>{v === 'all' ? 'Todas' : STATUS_COM[v]?.label}</button>
              ))}
            </div>
          </div>

          {filteredComissoes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhuma comissão encontrada.</p>
            </div>
          ) : (
            filteredComissoes.map(c => {
              const st = STATUS_COM[c.status] || STATUS_COM.pendente;
              return (
                <div key={c.id} style={{ ...cardStyle }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{c.clinica_nome}</p>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: `${st.color}20`, color: st.color }}>{st.label}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        {c.atendente_name} · {c.evento} · {fmt(c.gerada_at)}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: st.color }}>{fmtCurrency(c.valor)}</p>

                    {/* Ações de aprovação (apenas para pendentes/aprovadas) */}
                    {(c.status === 'pendente' || c.status === 'aprovada') && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {c.status === 'pendente' && (
                          <button onClick={() => handleComissaoStatus(c.id, 'aprovada')} disabled={updatingId === c.id}
                            style={{ padding: '6px 12px', background: '#6370f1', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Aprovar
                          </button>
                        )}
                        {c.status === 'aprovada' && (
                          <button onClick={() => handleComissaoStatus(c.id, 'paga')} disabled={updatingId === c.id}
                            style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Marcar paga
                          </button>
                        )}
                        <button onClick={() => handleComissaoStatus(c.id, 'recusada')} disabled={updatingId === c.id}
                          style={{ padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                          Recusar
                        </button>
                      </div>
                    )}
                    {c.status === 'paga' && (
                      <button onClick={() => handleComissaoStatus(c.id, 'estornada')} disabled={updatingId === c.id}
                        style={{ padding: '6px 12px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Estornar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
