'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Kanban, Plus, Phone, Clock, CheckCircle2, XCircle, MoreVertical,
  Filter, Search, MessageSquare, ArrowRight, DollarSign, Calendar
} from 'lucide-react';

const STAGES = [
  { id: 'prospecto', label: '1. Novo Contato', color: '#64748b' },
  { id: 'proposta_enviada', label: '2. Proposta Enviada', color: '#3b82f6' },
  { id: 'em_analise', label: '3. Em Análise de Crédito', color: '#f59e0b' },
  { id: 'aprovado', label: '4. Aprovado / Agendando', color: '#8b5cf6' },
  { id: 'fechado_ganhou', label: '5. Fechado / Tratamento Iniciado', color: '#10b981' },
];

export default function PortalCrmPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  // Form new opp
  const [pacienteNome, setPacienteNome] = useState('');
  const [pacienteTelefone, setPacienteTelefone] = useState('');
  const [tratamento, setTratamento] = useState('');
  const [valorStr, setValorStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  async function fetchOpportunities() {
    try {
      const res = await fetch('/api/portal/crm');
      const data = await res.json();
      if (res.ok) {
        setOpportunities(data.opportunities || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveStage(id: string, newStage: string) {
    try {
      setOpportunities(prev =>
        prev.map(opp => opp.id === id ? { ...opp, stage: newStage } : opp)
      );

      await fetch(`/api/portal/crm/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
    } catch (e) {
      console.error(e);
      fetchOpportunities();
    }
  }

  async function handleCreateOpp(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteNome || !pacienteTelefone || !tratamento) return;
    setSubmitting(true);
    try {
      const valorCentavos = Math.round((parseFloat(valorStr.replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0) * 100);
      const res = await fetch('/api/portal/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteNome,
          pacienteTelefone,
          tratamento,
          valorCentavos,
          stage: 'prospecto'
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setPacienteNome('');
        setPacienteTelefone('');
        setTratamento('');
        setValorStr('');
        fetchOpportunities();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredOpps = opportunities.filter(o =>
    o.paciente_nome.toLowerCase().includes(search.toLowerCase()) ||
    o.tratamento.toLowerCase().includes(search.toLowerCase()) ||
    o.paciente_telefone.includes(search)
  );

  const totalValue = opportunities.reduce((acc, o) => acc + (Number(o.valor_centavos || 0) / 100), 0);
  const closedCount = opportunities.filter(o => o.stage === 'fechado_ganhou').length;

  return (
    <div className="portal-content">
      {/* Topbar */}
      <div className="portal-topbar" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Pipeline de Conversão de Pacientes (CRM)
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Acompanhe o funil de vendas, orçamentos e aprovações de cada paciente em tempo real.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowModal(true)}
            className="btn-action btn-action-primary"
            style={{ gap: '0.375rem' }}
          >
            <Plus size={15} />
            Nova oportunidade
          </button>
        </div>
      </div>

      {/* Metric summary banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div className="metric-card-label">Oportunidades em Aberto</div>
          <div className="metric-card-value" style={{ fontSize: '1.5rem' }}>{opportunities.length}</div>
        </div>
        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div className="metric-card-label">Volume no Pipeline</div>
          <div className="metric-card-value" style={{ fontSize: '1.5rem' }}>
            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
          </div>
        </div>
        <div className="metric-card" style={{ padding: '1rem 1.25rem' }}>
          <div className="metric-card-label">Tratamentos Convertidos</div>
          <div className="metric-card-value" style={{ fontSize: '1.5rem', color: '#10b981' }}>{closedCount}</div>
        </div>
      </div>

      {/* Search and filters */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar por paciente ou tratamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="portal-form-input"
            style={{ paddingLeft: '38px', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(260px, 1fr))', gap: '1rem', overflowX: 'auto', paddingBottom: '1.5rem', alignItems: 'start' }}>
        {STAGES.map((stg) => {
          const cards = filteredOpps.filter(o => o.stage === stg.id);
          const stageTotal = cards.reduce((acc, o) => acc + (Number(o.valor_centavos || 0) / 100), 0);

          return (
            <div
              key={stg.id}
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                minHeight: '480px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Column Header */}
              <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#1e293b' }}>
                    {stg.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', background: 'white', padding: '0.125rem 0.5rem', borderRadius: '10px', border: '1px solid #cbd5e1', color: '#475569' }}>
                    {cards.length}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                  {stageTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                </div>
              </div>

              {/* Card List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {cards.map((card) => {
                  const cardVal = Number(card.valor_centavos || 0) / 100;
                  return (
                    <div
                      key={card.id}
                      style={{
                        background: 'white',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        padding: '1rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.25rem' }}>
                        {card.paciente_nome}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#4f46e5', fontWeight: '600', marginBottom: '0.5rem' }}>
                        {card.tratamento}
                      </div>

                      {cardVal > 0 && (
                        <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem' }}>
                          {cardVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', paddingTop: '0.5rem', borderTop: '1px dashed #f1f5f9' }}>
                        <a
                          href={`https://wa.me/55${card.paciente_telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', textDecoration: 'none', fontWeight: '600' }}
                        >
                          <Phone size={11} /> WhatsApp
                        </a>

                        {/* Stage Selector */}
                        <select
                          value={card.stage}
                          onChange={(e) => handleMoveStage(card.id, e.target.value)}
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.375rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                        >
                          {STAGES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}

                {cards.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0.5rem', color: '#94a3b8', fontSize: '0.75rem', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                    Nenhum paciente nesta etapa
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova Oportunidade */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem' }}>
              Adicionar Oportunidade no CRM
            </h2>
            <form onSubmit={handleCreateOpp}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="portal-form-label">Nome do Paciente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={pacienteNome}
                    onChange={(e) => setPacienteNome(e.target.value)}
                    className="portal-form-input"
                  />
                </div>
                <div>
                  <label className="portal-form-label">WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={pacienteTelefone}
                    onChange={(e) => setPacienteTelefone(e.target.value)}
                    className="portal-form-input"
                  />
                </div>
                <div>
                  <label className="portal-form-label">Tratamento / Procedimento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Implante unitário ou Prótese"
                    value={tratamento}
                    onChange={(e) => setTratamento(e.target.value)}
                    className="portal-form-input"
                  />
                </div>
                <div>
                  <label className="portal-form-label">Valor Estimado (R$)</label>
                  <input
                    type="text"
                    placeholder="Ex: 4500"
                    value={valorStr}
                    onChange={(e) => setValorStr(e.target.value)}
                    className="portal-form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-action btn-action-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-action btn-action-primary"
                >
                  {submitting ? 'Salvando...' : 'Salvar no CRM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
