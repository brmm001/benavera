'use client';

import React, { useState, useEffect } from 'react';

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicData, setClinicData] = useState({
    nomeFantasia: '',
    razaoSocial: '',
    cnpj: '',
    telefone: '',
    emailFinanceiro: '',
    chavePix: '',
    tipoPix: 'CNPJ',
    banco: '',
    agencia: '',
    conta: '',
    notifWhatsapp: true,
    notifEmail: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/configuracoes');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao carregar configurações.');
        }
        if (data.clinic) {
          setClinicData(data.clinic);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar configurações.');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinicData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações.');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', color: '#64748b', fontSize: '14px' }}>
        Carregando configurações da clínica...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Configurações da Clínica</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Atualize os dados cadastrais, conta bancária para recebimento de repasses e notificações.
        </p>
      </div>

      {saved && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', fontSize: '14px' }}>
          ✓ Configurações salvas com sucesso!
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Dados da Empresa */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>Dados Cadastrais</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Nome Fantasia *</label>
              <input
                type="text"
                required
                value={clinicData.nomeFantasia}
                onChange={(e) => setClinicData({ ...clinicData, nomeFantasia: e.target.value })}
                placeholder="Nome fantasia da clínica"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Razão Social</label>
              <input
                type="text"
                value={clinicData.razaoSocial}
                onChange={(e) => setClinicData({ ...clinicData, razaoSocial: e.target.value })}
                placeholder="Razão social"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>CNPJ</label>
              <input
                type="text"
                disabled
                value={clinicData.cnpj}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', color: '#64748b', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Telefone / WhatsApp Comercial</label>
              <input
                type="text"
                value={clinicData.telefone}
                onChange={(e) => setClinicData({ ...clinicData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>E-mail Financeiro</label>
              <input
                type="email"
                value={clinicData.emailFinanceiro}
                onChange={(e) => setClinicData({ ...clinicData, emailFinanceiro: e.target.value })}
                placeholder="financeiro@suaclinica.com.br"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Dados Bancários */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>Conta Bancária para Repasses PIX</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>Os repasses dos contratos finalizados serão transferidos diretamente para esta chave:</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Tipo de Chave</label>
              <select
                value={clinicData.tipoPix}
                onChange={(e) => setClinicData({ ...clinicData, tipoPix: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }}
              >
                <option value="CNPJ">CNPJ</option>
                <option value="E-mail">E-mail</option>
                <option value="Telefone">Telefone</option>
                <option value="Aleatória">Chave Aleatória (EVP)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Chave PIX</label>
              <input
                type="text"
                value={clinicData.chavePix}
                onChange={(e) => setClinicData({ ...clinicData, chavePix: e.target.value })}
                placeholder="Informe a chave PIX da clínica"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Banco</label>
              <input
                type="text"
                value={clinicData.banco}
                onChange={(e) => setClinicData({ ...clinicData, banco: e.target.value })}
                placeholder="Ex: 341 - Itaú Unibanco"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Agência</label>
              <input
                type="text"
                value={clinicData.agencia}
                onChange={(e) => setClinicData({ ...clinicData, agencia: e.target.value })}
                placeholder="0001"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Conta Corrente</label>
              <input
                type="text"
                value={clinicData.conta}
                onChange={(e) => setClinicData({ ...clinicData, conta: e.target.value })}
                placeholder="00000-0"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>Canais de Notificação</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={clinicData.notifWhatsapp}
                onChange={(e) => setClinicData({ ...clinicData, notifWhatsapp: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#6370f1' }}
              />
              <span style={{ fontSize: '14px', color: '#334155' }}>Receber alertas de aprovação e links de proposta via WhatsApp</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={clinicData.notifEmail}
                onChange={(e) => setClinicData({ ...clinicData, notifEmail: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#6370f1' }}
              />
              <span style={{ fontSize: '14px', color: '#334155' }}>Receber comprovantes de repasse PIX no e-mail financeiro</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 28px',
              backgroundColor: saving ? '#94a3b8' : '#6370f1',
              color: '#fff',
              fontWeight: '700',
              fontSize: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(99,112,241,0.3)',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
