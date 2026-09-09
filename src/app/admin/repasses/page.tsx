'use client';

import React, { useState, useEffect } from 'react';

interface Payout {
  id: string;
  protocol: string;
  patient_nome: string;
  clinic_nome: string;
  partner_nome: string;
  valor_bruto: number;
  taxa_benavera: number;
  valor_liquido: number;
  status: string;
  data_prevista: string | null;
  data_pagamento: string | null;
  created_at: string;
}

export default function AdminRepassesPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payouts');
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalVolume = payouts.reduce((acc, p) => acc + Number(p.valor_bruto || 0), 0);
  const totalReceitaBenavera = payouts.reduce((acc, p) => acc + Number(p.taxa_benavera || 0), 0);
  const totalRepassesLiquidos = payouts.reduce((acc, p) => acc + Number(p.valor_liquido || 0), 0);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Gestão de Repasses às Clínicas</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Controle de liquidação financeira e liberação de pagamentos para clínicas credenciadas.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Volume Total Financiado</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{formatCurrency(totalVolume)}</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Receita Benavera (Take Rate)</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{formatCurrency(totalReceitaBenavera)}</div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Total Repassado às Clínicas</span>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#3b82f6', marginTop: '6px' }}>{formatCurrency(totalRepassesLiquidos)}</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando repasses...</div>
        ) : payouts.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Nenhum repasse no momento.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Protocolo</th>
                <th style={{ padding: '14px 20px' }}>Clínica</th>
                <th style={{ padding: '14px 20px' }}>Paciente</th>
                <th style={{ padding: '14px 20px' }}>Parceiro</th>
                <th style={{ padding: '14px 20px' }}>Bruto</th>
                <th style={{ padding: '14px 20px' }}>Benavera Fee</th>
                <th style={{ padding: '14px 20px' }}>Líquido Clínica</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{p.protocol}</td>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#0f172a' }}>{p.clinic_nome}</td>
                  <td style={{ padding: '16px 20px', color: '#475569' }}>{p.patient_nome}</td>
                  <td style={{ padding: '16px 20px', color: '#64748b' }}>{p.partner_nome || 'Benavera'}</td>
                  <td style={{ padding: '16px 20px', color: '#0f172a' }}>{formatCurrency(p.valor_bruto)}</td>
                  <td style={{ padding: '16px 20px', color: '#059669', fontWeight: '600' }}>+{formatCurrency(p.taxa_benavera)}</td>
                  <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(p.valor_liquido)}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', backgroundColor: p.status === 'PAGO' ? '#ecfdf5' : '#eff6ff', color: p.status === 'PAGO' ? '#059669' : '#2563eb' }}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
