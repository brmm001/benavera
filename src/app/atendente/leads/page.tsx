'use client';
// src/app/atendente/leads/page.tsx
// Meus leads — clínicas e pacientes atribuídos ao atendente

import { useState, useEffect, useCallback } from 'react';

type ClinicLead = {
  id: string;
  nome_responsavel: string;
  nome_clinica: string;
  whatsapp: string;
  email?: string;
  cidade: string;
  estado?: string;
  especialidade_principal: string;
  status_comercial: string;
  cnpj?: string;
  prospect_clinic_id?: string;
  created_at: string;
  assigned_at?: string;
  next_followup_at?: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  novo:           { label: 'Novo',           color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  em_contato:     { label: 'Em contato',     color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  em_negociacao:  { label: 'Em negociação',  color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  parceiro_ativo: { label: 'Parceiro ativo', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  perdido:        { label: 'Perdido',        color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

function fmt(iso: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

export default function MeusLeadsPage() {
  const [leads, setLeads] = useState<ClinicLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<ClinicLead | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('contato');
  const [proximaData, setProximaData] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tipo: 'clinic', limit: '200' });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('search', search);
    const res = await fetch(`/api/atendente/leads?${params}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function handleSaveNote() {
    if (!selectedLead || !noteText.trim()) return;
    setSavingNote(true);
    await fetch('/api/atendente/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: selectedLead.id,
        tipo: noteType,
        conteudo: noteText,
        proxima_data: proximaData || undefined,
      }),
    });
    setNoteText('');
    setProximaData('');
    setSavingNote(false);
  }

  async function handleUpdateStatus() {
    if (!selectedLead || !newStatus) return;
    setUpdatingStatus(true);
    await fetch(`/api/admin/leads/${selectedLead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_comercial: newStatus }),
    });
    setLeads(prev => prev.map(l => l.id === selectedLead.id
      ? { ...l, status_comercial: newStatus } : l));
    setSelectedLead(prev => prev ? { ...prev, status_comercial: newStatus } : prev);
    setNewStatus('');
    setUpdatingStatus(false);
  }

  const s = (v: string) => STATUS_LABELS[v] || STATUS_LABELS.novo;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #f1f5f9' }}>
        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#1c1d4c' }}>Meus Leads</h1>
          <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>Clínicas atribuídas a você</p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar clínica, responsável…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: '180px', padding: '8px 12px', fontSize: '13px',
                border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none',
              }}
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px', fontSize: '13px', border: '1px solid #e2e8f0',
                borderRadius: '8px', background: 'white', cursor: 'pointer',
              }}
            >
              <option value="all">Todos</option>
              {Object.entries(STATUS_LABELS).map(([v, d]) => (
                <option key={v} value={v}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Carregando…</div>
          ) : leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🎯</p>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Nenhum lead encontrado.</p>
            </div>
          ) : (
            leads.map(lead => {
              const st = s(lead.status_comercial);
              const isSelected = selectedLead?.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  style={{
                    padding: '14px 16px', borderRadius: '10px', marginBottom: '6px',
                    cursor: 'pointer', border: '1px solid',
                    borderColor: isSelected ? '#6370f1' : '#f1f5f9',
                    background: isSelected ? 'rgba(99,112,241,0.04)' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lead.nome_clinica}
                      </p>
                      <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b' }}>
                        {lead.nome_responsavel} · {lead.cidade}{lead.estado ? `/${lead.estado}` : ''}
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                        {lead.especialidade_principal} · Recebido {fmt(lead.assigned_at || lead.created_at)}
                      </p>
                    </div>
                    <span style={{
                      padding: '3px 8px', borderRadius: '20px',
                      background: st.bg, color: st.color, fontSize: '11px', fontWeight: '700',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{st.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detalhe */}
      {selectedLead ? (
        <div style={{ width: '380px', flexShrink: 0, overflowY: 'auto', background: 'white', padding: '28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#1c1d4c' }}>
                {selectedLead.nome_clinica}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{selectedLead.nome_responsavel}</p>
            </div>
            <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', padding: '4px' }}>✕</button>
          </div>

          {/* Info */}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            {[
              ['WhatsApp', selectedLead.whatsapp],
              ['E-mail', selectedLead.email || '—'],
              ['Cidade', `${selectedLead.cidade}${selectedLead.estado ? `/${selectedLead.estado}` : ''}`],
              ['Especialidade', selectedLead.especialidade_principal],
              ['CNPJ', selectedLead.cnpj || 'Não informado'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', minWidth: '80px' }}>{k}</span>
                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Status */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Etapa</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(STATUS_LABELS).map(([v, d]) => (
                <button
                  key={v}
                  onClick={() => { setNewStatus(v); }}
                  style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    cursor: 'pointer', border: '1.5px solid',
                    background: selectedLead.status_comercial === v || newStatus === v ? d.bg : 'white',
                    color: d.color,
                    borderColor: selectedLead.status_comercial === v || newStatus === v ? d.color : '#e2e8f0',
                    transition: 'all 0.15s',
                  }}
                >{d.label}</button>
              ))}
            </div>
            {newStatus && newStatus !== selectedLead.status_comercial && (
              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                style={{
                  marginTop: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: '700',
                  background: '#6370f1', color: 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {updatingStatus ? 'Salvando…' : 'Confirmar alteração'}
              </button>
            )}
          </div>

          {/* Clínica vinculada */}
          {selectedLead.prospect_clinic_id ? (
            <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '10px', padding: '12px', marginBottom: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '700', color: '#10b981' }}>✅ Clínica Vinculada</p>
              <a href={`/atendente/clinicas/${selectedLead.prospect_clinic_id}`}
                style={{ fontSize: '13px', color: '#059669', textDecoration: 'underline' }}>
                Ver ficha da clínica →
              </a>
            </div>
          ) : (
            <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '12px', marginBottom: '16px', border: '1px solid #fde68a' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#92400e' }}>⚠️ Sem clínica vinculada</p>
              <a href={`/atendente/clinicas/nova?lead_id=${selectedLead.id}&nome=${encodeURIComponent(selectedLead.nome_clinica)}`}
                style={{ fontSize: '12px', color: '#92400e', textDecoration: 'underline' }}>
                Cadastrar esta clínica →
              </a>
            </div>
          )}

          {/* Adicionar nota */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Registrar interação</p>
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
              style={{ width: '100%', marginBottom: '8px', padding: '8px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}
            >
              <option value="nota">📝 Nota</option>
              <option value="contato">📞 Contato realizado</option>
              <option value="agendamento">📅 Agendamento</option>
              <option value="proposta">📄 Proposta enviada</option>
              <option value="encerramento">✅ Encerramento</option>
            </select>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Descreva o que aconteceu…"
              rows={3}
              style={{
                width: '100%', padding: '10px', fontSize: '13px', border: '1px solid #e2e8f0',
                borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            {noteType === 'agendamento' && (
              <input
                type="date"
                value={proximaData}
                onChange={e => setProximaData(e.target.value)}
                style={{ width: '100%', marginTop: '6px', padding: '8px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            )}
            <button
              onClick={handleSaveNote}
              disabled={savingNote || !noteText.trim()}
              style={{
                marginTop: '10px', width: '100%', padding: '10px', fontSize: '13px', fontWeight: '700',
                background: '#10b981', color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontFamily: 'inherit', opacity: !noteText.trim() ? 0.5 : 1,
              }}
            >
              {savingNote ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>👈</p>
            <p style={{ fontSize: '14px' }}>Selecione um lead para ver os detalhes</p>
          </div>
        </div>
      )}
    </div>
  );
}
