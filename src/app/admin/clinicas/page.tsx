'use client';

import React, { useState, useEffect } from 'react';

interface Clinic {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  telefone: string | null;
  email: string | null;
  endereco_cidade: string | null;
  endereco_uf: string | null;
  status: string;
  total_applications: string | number;
  total_financiado: string | number;
  created_at: string;
}

export default function AdminClinicasPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco_cidade: '',
    endereco_uf: 'SP',
  });

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/clinics');
      if (res.ok) {
        const data = await res.json();
        setClinics(data.clinics || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_fantasia || !form.cnpj) {
      alert('Nome Fantasia e CNPJ são obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao cadastrar clínica');
      }

      setShowModal(false);
      setForm({
        nome_fantasia: '',
        razao_social: '',
        cnpj: '',
        telefone: '',
        email: '',
        endereco_cidade: '',
        endereco_uf: 'SP',
      });
      fetchClinics();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val?: number | string | null) => {
    if (!val) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Clínicas Credenciadas</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Rede de parceiros médicos, odontológicos e estéticos habilitados para financiamento.
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
          + Credenciar Clínica
        </button>
      </div>

      {/* Table Card */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando clínicas...</div>
        ) : clinics.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏥</div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px' }}>Nenhuma clínica cadastrada</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px' }}>Cadastre a primeira clínica parceira da Benavera.</p>
            <button
              onClick={() => setShowModal(true)}
              style={{ padding: '8px 16px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              Credenciar Clínica
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 20px' }}>Clínica</th>
                <th style={{ padding: '14px 20px' }}>CNPJ</th>
                <th style={{ padding: '14px 20px' }}>Localização</th>
                <th style={{ padding: '14px 20px' }}>Contato</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Solicitações</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Total Financiado</th>
                <th style={{ padding: '14px 20px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{c.nome_fantasia}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{c.razao_social}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: '#475569', fontSize: '13px' }}>
                    {c.cnpj}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#475569' }}>
                    {c.cidade ? `${c.cidade}/${c.estado || 'SP'}` : (c.endereco_cidade ? `${c.endereco_cidade}/${c.endereco_uf || 'SP'}` : '—')}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#475569', fontSize: '13px' }}>
                    <div>{c.telefone || c.whatsapp || '—'}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{c.email || ''}</div>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>
                    {c.total_applications}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                    {formatCurrency(c.total_financiado)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: c.ativo !== false ? '#ecfdf5' : '#fef2f2',
                        color: c.ativo !== false ? '#059669' : '#dc2626',
                      }}
                    >
                      {c.ativo !== false ? 'ATIVA' : 'INATIVA'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nova Clínica */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Credenciar Nova Clínica</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>Insira as informações cadastrais da clínica parceira.</p>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  value={form.nome_fantasia}
                  onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  placeholder="Ex: OdontoPrime Clínica Integrada"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Razão Social</label>
                  <input
                    type="text"
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                    placeholder="Razão Social LTDA"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>CNPJ *</label>
                  <input
                    type="text"
                    required
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="(11) 3333-4444"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contato@clinica.com.br"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Cidade</label>
                  <input
                    type="text"
                    value={form.endereco_cidade}
                    onChange={(e) => setForm({ ...form, endereco_cidade: e.target.value })}
                    placeholder="São Paulo"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>UF</label>
                  <input
                    type="text"
                    value={form.endereco_uf}
                    onChange={(e) => setForm({ ...form, endereco_uf: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
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
                  {saving ? 'Cadastrando...' : 'Cadastrar Clínica'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
