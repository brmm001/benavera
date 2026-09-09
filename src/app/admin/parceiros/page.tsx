'use client';

import React, { useState, useEffect } from 'react';

interface Partner {
  id: string;
  nome: string;
  nome_legal: string | null;
  cnpj: string | null;
  prioridade: number;
  ticket_minimo: number;
  ticket_maximo: number;
  prazo_maximo: number;
  taxa_minima_mensal: number | null;
  comissao_benavera_percent: number;
  modo: string;
  ativo: boolean;
}

export default function AdminParceirosPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
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
      fetchPartners();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Parceiros Financeiros (Lenders)</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Gerencie as instituições financeiras, FIDCs, fintechs e bancos integrados para funding.
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

      {/* Grid of Partners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {loading ? (
          <div style={{ padding: '40px', color: '#64748b' }}>Carregando parceiros...</div>
        ) : (
          partners.map((p) => (
            <div
              key={p.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>{p.nome}</h3>
                    <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>CNPJ: {p.cnpj || 'Sob contrato'}</span>
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
                    {p.modo === 'API' ? '⚡ API Automática' : '👤 Mesa Manual'}
                  </span>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', fontSize: '12px' }}>
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
                    <strong style={{ color: '#059669' }}>{(Number(p.comissao_benavera_percent) * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px', fontSize: '12px' }}>
                <span style={{ color: '#059669', fontWeight: '700' }}>● Integrado & Ativo</span>
                <button
                  onClick={() => alert(`Configurações de roteamento para ${p.nome} salvas.`)}
                  style={{ background: 'none', border: 'none', color: '#4040ca', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                >
                  Editar Parâmetros →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
