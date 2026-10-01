'use client';
// src/app/atendente/clinicas/page.tsx
// Minhas Clínicas — gestão das clínicas vinculadas ao atendente

import { useState, useEffect, useCallback } from 'react';

type ProspectClinica = {
  id: string;
  cnpj: string;
  nome_fantasia: string;
  razao_social?: string;
  responsavel?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  especialidade?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  prospeccao:    { label: 'Prospecção',    color: '#818cf8', bg: 'rgba(129,140,248,0.12)', emoji: '🔍' },
  em_negociacao: { label: 'Em negociação', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  emoji: '🤝' },
  vinculada:     { label: 'Vinculada',     color: '#10b981', bg: 'rgba(16,185,129,0.12)',  emoji: '✅' },
  arquivada:     { label: 'Arquivada',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', emoji: '📦' },
};

function fmtCnpj(cnpj: string) {
  const d = cnpj.replace(/\D/g, '');
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return cnpj;
}

function fmt(iso: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

export default function MinhasClinicasPage() {
  const [clinicas, setClinicas] = useState<ProspectClinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClinica, setSelectedClinica] = useState<ProspectClinica | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<ProspectClinica>>({});
  const [saving, setSaving] = useState(false);

  const fetchClinicas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await fetch(`/api/atendente/clinicas?${params}`);
    const data = await res.json();
    setClinicas(data.clinicas || []);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchClinicas(); }, [fetchClinicas]);

  async function handleSave() {
    if (!selectedClinica) return;
    setSaving(true);
    await fetch(`/api/atendente/clinicas/${selectedClinica.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    await fetchClinicas();
    setSaving(false);
    setEditMode(false);
    setSelectedClinica(prev => prev ? { ...prev, ...editData } : prev);
  }

  const cfg = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.prospeccao;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Lista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #f1f5f9' }}>
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: '#1c1d4c' }}>Minhas Clínicas</h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{clinicas.length} clínica{clinicas.length !== 1 ? 's' : ''}</p>
            </div>
            <a href="/atendente/clinicas/nova" style={{
              padding: '9px 16px', background: '#10b981', color: 'white',
              borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700',
            }}>+ Nova clínica</a>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ, cidade…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '180px', padding: '8px 12px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer' }}
            >
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([v, d]) => (
                <option key={v} value={v}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Carregando…</div>
          ) : clinicas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🏥</p>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>Nenhuma clínica encontrada.</p>
              <a href="/atendente/clinicas/nova" style={{
                padding: '10px 20px', background: '#10b981', color: 'white',
                borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '700',
              }}>Cadastrar primeira clínica</a>
            </div>
          ) : (
            clinicas.map(c => {
              const st = cfg(c.status);
              const isSelected = selectedClinica?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelectedClinica(c); setEditMode(false); setEditData({}); }}
                  style={{
                    padding: '14px 16px', borderRadius: '10px', marginBottom: '6px',
                    cursor: 'pointer', border: '1px solid',
                    borderColor: isSelected ? '#10b981' : '#f1f5f9',
                    background: isSelected ? 'rgba(16,185,129,0.04)' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {st.emoji} {c.nome_fantasia}
                      </p>
                      <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#64748b' }}>
                        CNPJ: {fmtCnpj(c.cnpj)}
                      </p>
                      {c.cidade && <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                        {c.cidade}{c.estado ? `/${c.estado}` : ''} · Cadastrado {fmt(c.created_at)}
                      </p>}
                    </div>
                    <span style={{
                      padding: '3px 8px', borderRadius: '20px',
                      background: st.bg, color: st.color,
                      fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>{st.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detalhe */}
      {selectedClinica ? (
        <div style={{ width: '400px', flexShrink: 0, overflowY: 'auto', background: 'white', padding: '28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#1c1d4c' }}>
                {selectedClinica.nome_fantasia}
              </h2>
              <span style={{
                padding: '3px 10px', borderRadius: '20px',
                background: cfg(selectedClinica.status).bg, color: cfg(selectedClinica.status).color,
                fontSize: '11px', fontWeight: '700',
              }}>{cfg(selectedClinica.status).label}</span>
            </div>
            <button onClick={() => setSelectedClinica(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}>✕</button>
          </div>

          {!editMode ? (
            <>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                {[
                  ['CNPJ', fmtCnpj(selectedClinica.cnpj)],
                  ['Razão social', selectedClinica.razao_social || '—'],
                  ['Responsável', selectedClinica.responsavel || '—'],
                  ['Telefone', selectedClinica.telefone || '—'],
                  ['E-mail', selectedClinica.email || '—'],
                  ['Cidade', selectedClinica.cidade ? `${selectedClinica.cidade}${selectedClinica.estado ? `/${selectedClinica.estado}` : ''}` : '—'],
                  ['Especialidade', selectedClinica.especialidade || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', minWidth: '90px' }}>{k}</span>
                    <span style={{ fontSize: '13px', color: '#1e293b' }}>{v}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setEditMode(true); setEditData({ ...selectedClinica }); }}
                style={{
                  width: '100%', padding: '10px', fontSize: '13px', fontWeight: '700',
                  background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0',
                  borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >✏️ Editar informações</button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['nome_fantasia', 'Nome Fantasia', 'text'],
                ['razao_social', 'Razão Social', 'text'],
                ['responsavel', 'Responsável', 'text'],
                ['telefone', 'Telefone', 'tel'],
                ['email', 'E-mail', 'email'],
                ['cidade', 'Cidade', 'text'],
                ['estado', 'Estado (UF)', 'text'],
                ['especialidade', 'Especialidade', 'text'],
              ].map(([field, label, type]) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>{label}</label>
                  <input
                    type={type}
                    value={(editData as Record<string, string>)[field] || ''}
                    onChange={e => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Status</label>
                <select
                  value={editData.status || selectedClinica.status}
                  onChange={e => setEditData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}
                >
                  {Object.entries(STATUS_CONFIG).map(([v, d]) => (
                    <option key={v} value={v}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px', fontSize: '13px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '700', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ fontSize: '40px', margin: '0 0 12px' }}>👈</p>
            <p style={{ fontSize: '14px' }}>Selecione uma clínica para ver os detalhes</p>
          </div>
        </div>
      )}
    </div>
  );
}
