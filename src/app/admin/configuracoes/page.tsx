'use client';

import React, { useState } from 'react';

export default function AdminConfiguracoesPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    slaMaxMinutes: 15,
    autoPreAnalysis: true,
    minScoreApproval: 600,
    takeRateDefault: 3.5,
    notificationWebhook: 'https://api.benavera.com.br/webhooks/partners',
    activeLendersAutoRouting: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Parâmetros Globais do Sistema</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Configurações de SLA, esteira de risco, taxas padrão e regras do motor de crédito Benavera.
        </p>
      </div>

      {saved && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '14px 20px', borderRadius: '10px', marginBottom: '24px', fontWeight: '600', fontSize: '14px' }}>
          ✓ Parâmetros globais atualizados com sucesso!
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>Regras de SLA & Automação</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Meta de SLA Operacional (Minutos)</label>
              <input
                type="number"
                value={settings.slaMaxMinutes}
                onChange={(e) => setSettings({ ...settings, slaMaxMinutes: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Take Rate Padrão Benavera (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.takeRateDefault}
                onChange={(e) => setSettings({ ...settings, takeRateDefault: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.autoPreAnalysis}
                onChange={(e) => setSettings({ ...settings, autoPreAnalysis: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#0f172a' }}
              />
              <span style={{ fontSize: '14px', color: '#334155' }}>Executar motor de pré-análise instantânea automaticamente após submissão da clínica</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.activeLendersAutoRouting}
                onChange={(e) => setSettings({ ...settings, activeLendersAutoRouting: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: '#0f172a' }}
              />
              <span style={{ fontSize: '14px', color: '#334155' }}>Roteamento automático em cascata para parceiros via API</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{
              padding: '12px 28px',
              backgroundColor: '#0f172a',
              color: '#fff',
              fontWeight: '700',
              fontSize: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15,23,42,0.2)',
            }}
          >
            Salvar Parâmetros
          </button>
        </div>
      </form>
    </div>
  );
}
