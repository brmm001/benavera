'use client';

import React, { useState, useEffect } from 'react';

interface Payout {
  id: string;
  protocol: string;
  patient_nome: string;
  partner_nome: string;
  valor_bruto: number;
  taxa_benavera: number;
  valor_liquido: number;
  status: string;
  data_prevista: string | null;
  data_pagamento: string | null;
  comprovante_url: string | null;
  created_at: string;
}

export default function RepassesPage() {
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
    if (val === undefined || val === null) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalPago = payouts
    .filter((p) => p.status === 'PAGO')
    .reduce((acc, p) => acc + Number(p.valor_liquido || 0), 0);

  const totalPrevisto = payouts
    .filter((p) => p.status === 'SOLICITADO' || p.status === 'PROCESSANDO')
    .reduce((acc, p) => acc + Number(p.valor_liquido || 0), 0);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Repasses Financeiros</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Acompanhe os valores liquidados e os repasses programados para a sua clínica via PIX.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Liquidado (Pago)</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{formatCurrency(totalPago)}</div>
          <span style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', display: 'block' }}>Recebido via PIX</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>A Receber (Em Processamento)</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6', marginTop: '6px' }}>{formatCurrency(totalPrevisto)}</div>
          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>Previsão em até 2 dias úteis</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Operações Financiadas</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{payouts.length}</div>
          <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>Contratos finalizados</span>
        </div>
      </div>

      {/* Payouts Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Histórico de Repasses</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Atualizado em tempo real</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando repasses...</div>
        ) : payouts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 6px' }}>Nenhum repasse registrado</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              Quando um contrato de financiamento for assinado pelo paciente, o repasse aparecerá automaticamente aqui.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 20px' }}>Protocolo</th>
                <th style={{ padding: '14px 20px' }}>Paciente</th>
                <th style={{ padding: '14px 20px' }}>Parceiro</th>
                <th style={{ padding: '14px 20px' }}>Valor Bruto</th>
                <th style={{ padding: '14px 20px' }}>Taxa</th>
                <th style={{ padding: '14px 20px' }}>Valor Líquido</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Data Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => {
                const isPaid = p.status === 'PAGO';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px', fontWeight: '700', fontFamily: 'monospace', color: '#4040ca' }}>
                      {p.protocol || '—'}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: '600', color: '#0f172a' }}>
                      {p.patient_nome || '—'}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#475569' }}>
                      {p.partner_nome || 'Benavera'}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#64748b' }}>
                      {formatCurrency(p.valor_bruto)}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#dc2626' }}>
                      -{formatCurrency(p.taxa_benavera)}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: '700', color: '#059669' }}>
                      {formatCurrency(p.valor_liquido)}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: isPaid ? '#ecfdf5' : '#eff6ff',
                          color: isPaid ? '#059669' : '#2563eb',
                        }}
                      >
                        {isPaid ? '✓ PAGO' : p.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>
                      {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : (p.data_prevista ? `Prev: ${new Date(p.data_prevista).toLocaleDateString('pt-BR')}` : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
