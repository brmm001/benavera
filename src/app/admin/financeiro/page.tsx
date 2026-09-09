'use client';

import React from 'react';

export default function AdminFinanceiroPage() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Gestão Financeira & Faturamento</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Controle de receitas, comissões de parceiros, taxas de originação (Benavera Take Rate) e conciliação bancária.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Receita Bruta Acumulada</span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>R$ 14.850,00</div>
          <span style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', display: 'block' }}>Take rate médio de 3.5%</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Volume Transacionado (GMV)</span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>R$ 424.000,00</div>
          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>Últimos 30 dias</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Inadimplência de Repasse</span>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>0.0%</div>
          <span style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', display: 'block' }}>Risco 100% assumido pelos Lenders</span>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Regras de Taxa & Faturamento</h2>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
          A Benavera opera como correspondente bancário e infraestrutura de crédito. As taxas são retidas automaticamente na liquidação do repasse do parceiro financeiro para a clínica.
        </p>
      </div>
    </div>
  );
}
