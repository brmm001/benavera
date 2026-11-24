'use client';

import React, { useState, useEffect } from 'react';

interface Partner {
  id: string;
  nome: string;
  nome_legal: string | null;
  cnpj: string | null;
  api_slug: string | null;
  prioridade: number;
  ticket_minimo: number;
  ticket_maximo: number;
  prazo_maximo: number;
  taxa_minima_mensal: number | null;
  comissao_benavera_percent: number;
  modo: string;
  ativo: boolean;
  integration_active: boolean;
  env_configured?: boolean;
  webhook_path?: string | null;
  webhook_configured?: boolean;
}

export default function AdminParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [form, setForm] = useState({
    nome: '',
    nome_legal: '',
    cnpj: '',
    prioridade: 1,
    ticket_minimo: 1000,
    ticket_maximo: 50000,
    prazo_maximo: 36,
    comissao_benavera_percent: 0.02,
    modo: 'MANUAL',
  });

  const [editForm, setEditForm] = useState({
    nome: '',
    cnpj: '',
    prioridade: 10,
    ticket_minimo: 500,
    ticket_maximo: 50000,
    prazo_maximo: 24,
    comissao_benavera_percent: 0.02,
    modo: 'API',
    ativo: true,
    integration_active: false,
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/partners');
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) {
      alert('Nome do parceiro é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao cadastrar parceiro');
      }

      setShowModal(false);
      setForm({
        nome: '',
        nome_legal: '',
        cnpj: '',
        prioridade: 1,
        ticket_minimo: 1000,
        ticket_maximo: 50000,
        prazo_maximo: 36,
        comissao_benavera_percent: 0.02,
        modo: 'MANUAL',
      });
      setBanner({ type: 'ok', text: 'Parceiro cadastrado com sucesso.' });
      fetchPartners();
    } catch (err: unknown) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao cadastrar parceiro.' });
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (p: Partner) => {
    setEditing(p);
    setEditForm({
      nome: p.nome,
      cnpj: p.cnpj || '',
      prioridade: Number(p.prioridade || 10),
      ticket_minimo: Number(p.ticket_minimo || 0),
      ticket_maximo: Number(p.ticket_maximo || 0),
      prazo_maximo: Number(p.prazo_maximo || 12),
      comissao_benavera_percent: Number(p.comissao_benavera_percent || 0),
      modo: p.modo || 'MANUAL',
      ativo: Boolean(p.ativo),
      integration_active: Boolean(p.integration_active),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/partners/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          cnpj: editForm.cnpj.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar parâmetros.');
      setEditing(null);
      setBanner({ type: 'ok', text: `Parâmetros de ${editForm.nome} atualizados.` });
      await fetchPartners();
    } catch (err: unknown) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao atualizar parceiro.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIntegration = async (p: Partner) => {
    setTogglingId(p.id);
    setBanner(null);
    try {
      const nextState = !p.integration_active;
      const res = await fetch(`/api/partners/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration_active: nextState }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Não foi possível alterar a integração.');
      setBanner({
        type: 'ok',
        text: `${p.nome}: integração API ${nextState ? 'ativada no Hub' : 'desativada no Hub'}.`,
      });
      await fetchPartners();
    } catch (err: unknown) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao atualizar.' });
    } finally {
      setTogglingId(null);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Parceiros Financeiros (Lenders)</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Gerencie as instituições financeiras, parâmetros do Hub paralelo e ativação de APIs.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: '#0f172a',
            color: '#fff',
            fontWeight: '700',
            fontSize: '14px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
          }}
        >
          + Novo Parceiro Financeiro
        </button>
      </div>

      {banner && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            background: banner.type === 'ok' ? '#ecfdf5' : '#fef2f2',
            color: banner.type === 'ok' ? '#065f46' : '#991b1b',
            border: `1px solid ${banner.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {banner.text}
        </div>
      )}

      {/* Grid of Partners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {loading ? (
          <div style={{ padding: '40px', color: '#64748b' }}>Carregando parceiros...</div>
        ) : (
          partners.map((p) => {
            const hasApiAdapter = Boolean(p.api_slug);
            const readyInHub = Boolean(p.ativo && p.integration_active && p.env_configured);
            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  border: readyInHub ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>{p.nome}</h3>
                      <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>
                        {p.api_slug ? `slug: ${p.api_slug}` : `CNPJ: ${p.cnpj || 'Sob contrato'}`}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: p.modo === 'API' ? '#eff6ff' : '#fef3c7',
                        color: p.modo === 'API' ? '#2563eb' : '#d97706',
                      }}
                    >
                      {p.modo === 'API' ? '⚡ API Automática' : p.modo === 'SANDBOX' ? '🧪 Sandbox' : '👤 Mesa Manual'}
                    </span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Ticket Mín / Máx</span>
                      <strong style={{ color: '#0f172a' }}>{formatCurrency(p.ticket_minimo)} - {formatCurrency(p.ticket_maximo)}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Prazo Máximo</span>
                      <strong style={{ color: '#0f172a' }}>Até {p.prazo_maximo} meses</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Prioridade na Fila</span>
                      <strong style={{ color: '#0f172a' }}>Posição #{p.prioridade}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Comissão Benavera</span>
                      <strong style={{ color: '#059669' }}>{(Number(p.comissao_benavera_percent || 0) * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  {hasApiAdapter && (
                    <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Credenciais no ambiente:</span>
                        <strong style={{ color: p.env_configured ? '#059669' : '#d97706' }}>
                          {p.env_configured ? '✓ Configuradas' : '⚠ Pendentes na Vercel'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Webhook:</span>
                        <strong style={{ color: p.webhook_configured ? '#059669' : '#d97706' }}>
                          {p.webhook_configured ? '✓ Protegido' : '⚠ Token/Auth pendente'}
                        </strong>
                      </div>
                      {p.webhook_path && (
                        <div style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          POST {p.webhook_path}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px', fontSize: '12px', gap: '8px', flexWrap: 'wrap' }}>
                  <div>
                    {!p.ativo ? (
                      <span style={{ color: '#dc2626', fontWeight: '700' }}>● Inativo</span>
                    ) : hasApiAdapter ? (
                      <span style={{ color: readyInHub ? '#059669' : p.integration_active ? '#d97706' : '#64748b', fontWeight: '700' }}>
                        {readyInHub
                          ? '● Ativo no Hub (API online)'
                          : p.integration_active
                            ? '● Ligado (aguard. env vars)'
                            : '○ Integração pausada'}
                      </span>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: '700' }}>● Ativo (Manual)</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {hasApiAdapter && (
                      <button
                        type="button"
                        disabled={togglingId === p.id}
                        onClick={() => handleToggleIntegration(p)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: p.integration_active ? '#fef2f2' : '#ecfdf5',
                          color: p.integration_active ? '#b91c1c' : '#047857',
                          fontWeight: '700',
                          cursor: togglingId === p.id ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        {togglingId === p.id
                          ? '...'
                          : p.integration_active
                            ? 'Desligar API'
                            : 'Ligar API'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      style={{ background: 'none', border: 'none', color: '#4040ca', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Editar Parâmetros →
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Editar Parceiro */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Editar Parceiro — {editing.nome}</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Ajuste faixa de ticket, prazo, prioridade e estado da integração no Hub.</p>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Nome Comercial</label>
                  <input type="text" required value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>CNPJ</label>
                  <input type="text" value={editForm.cnpj} onChange={e => setEditForm({ ...editForm, cnpj: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ticket Mínimo (R$)</label>
                  <input type="number" step="0.01" value={editForm.ticket_minimo} onChange={e => setEditForm({ ...editForm, ticket_minimo: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ticket Máximo (R$)</label>
                  <input type="number" step="0.01" value={editForm.ticket_maximo} onChange={e => setEditForm({ ...editForm, ticket_maximo: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Prazo Máximo (meses)</label>
                  <input type="number" value={editForm.prazo_maximo} onChange={e => setEditForm({ ...editForm, prazo_maximo: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Prioridade (1 = mais alto)</label>
                  <input type="number" value={editForm.prioridade} onChange={e => setEditForm({ ...editForm, prioridade: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Comissão Benavera (ex: 0.02 = 2%)</label>
                  <input type="number" step="0.001" value={editForm.comissao_benavera_percent} onChange={e => setEditForm({ ...editForm, comissao_benavera_percent: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Modo</label>
                  <select value={editForm.modo} onChange={e => setEditForm({ ...editForm, modo: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="API">API Automática</option>
                    <option value="MANUAL">Mesa Manual</option>
                    <option value="SANDBOX">Sandbox</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editForm.ativo} onChange={e => setEditForm({ ...editForm, ativo: e.target.checked })} />
                  Parceiro ativo
                </label>
                {editing.api_slug && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editForm.integration_active} onChange={e => setEditForm({ ...editForm, integration_active: e.target.checked })} />
                    Integração API ligada no Hub
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setEditing(null)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Parceiro */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Cadastrar Parceiro Financeiro</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Cadastre uma nova instituição para envio e cotação de crédito.</p>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Nome Comercial *</label>
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Santander Saúde / FIDC Alpha"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Modo de Operação</label>
                  <select
                    value={form.modo}
                    onChange={(e) => setForm({ ...form, modo: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="MANUAL">Mesa Manual (Analista)</option>
                    <option value="API">API Automática</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Prioridade (1 = Mais alto)</label>
                  <input
                    type="number"
                    value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Ticket Máximo (R$)</label>
                  <input
                    type="number"
                    value={form.ticket_maximo}
                    onChange={(e) => setForm({ ...form, ticket_maximo: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Prazo Máx (meses)</label>
                  <input
                    type="number"
                    value={form.prazo_maximo}
                    onChange={(e) => setForm({ ...form, prazo_maximo: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >
                  {saving ? 'Cadastrando...' : 'Cadastrar Parceiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
