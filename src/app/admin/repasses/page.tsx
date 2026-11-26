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

const STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  PAID: { bg: '#ecfdf5', fg: '#059669', label: 'Pago' },
  PAGO: { bg: '#ecfdf5', fg: '#059669', label: 'Pago' },
  SCHEDULED: { bg: '#eff6ff', fg: '#2563eb', label: 'Agendado' },
  PROCESSING: { bg: '#fffbeb', fg: '#b45309', label: 'Processando' },
  AWAITING_DISBURSEMENT: { bg: '#f8fafc', fg: '#475569', label: 'Aguardando liquidação' },
  AWAITING_CONTRACT: { bg: '#f8fafc', fg: '#64748b', label: 'Aguardando contrato' },
  CANCELLED: { bg: '#fef2f2', fg: '#dc2626', label: 'Cancelado' },
};

export default function AdminRepassesPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payouts', { cache: 'no-store' });
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

  async function updatePayoutStatus(id: string, status: 'SCHEDULED' | 'PAID') {
    const label = status === 'PAID' ? 'marcar este repasse como PAGO (notifica a clínica e libera comissão do representante)' : 'marcar este repasse como AGENDADO (notifica a clínica)';
    if (!confirm(`Confirmar: ${label}?`)) return;
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fetch('/api/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setFeedback(
          status === 'PAID'
            ? 'Repasse marcado como PAGO! E-mail enviado para a clínica e comissão sincronizada para o representante.'
            : 'Repasse marcado como AGENDADO! E-mail de aviso enviado para a clínica.'
        );
        await fetchPayouts();
      } else {
        setFeedback(d.error || 'Erro ao atualizar repasse.');
      }
    } finally {
      setBusyId(null);
    }
  }

  const formatCurrency = (val?: number | null) => {
    if (!val) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalVolume = payouts.reduce((acc, p) => acc + Number(p.valor_bruto || 0), 0);
  const totalReceitaBenavera = payouts.reduce((acc, p) => acc + Number(p.taxa_benavera || 0), 0);
  const totalRepassesLiquidos = payouts.reduce((acc, p) => acc + Number(p.valor_liquido || 0), 0);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Gestão de Repasses às Clínicas</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Controle de liquidação financeira — ao agendar ou dar baixa como pago, a clínica e o representante são notificados por e-mail automaticamente.
          </p>
        </div>
      </div>

      {feedback && (
        <div style={{ marginBottom: '18px', padding: '12px 16px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '13px', fontWeight: '600' }}>
          {feedback}
        </div>
      )}

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
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando repasses...</div>
        ) : payouts.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Nenhum repasse no momento.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Protocolo</th>
                <th style={{ padding: '14px 16px' }}>Clínica</th>
                <th style={{ padding: '14px 16px' }}>Paciente</th>
                <th style={{ padding: '14px 16px' }}>Parceiro</th>
                <th style={{ padding: '14px 16px' }}>Bruto</th>
                <th style={{ padding: '14px 16px' }}>Benavera Fee</th>
                <th style={{ padding: '14px 16px' }}>Líquido Clínica</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => {
                const st = STATUS_BADGE[p.status] || { bg: '#f1f5f9', fg: '#475569', label: p.status };
                const isFinal = p.status === 'PAID' || p.status === 'PAGO' || p.status === 'CANCELLED';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{p.protocol}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a' }}>{p.clinic_nome}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{p.patient_nome}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{p.partner_nome || 'Benavera'}</td>
                    <td style={{ padding: '14px 16px', color: '#0f172a' }}>{formatCurrency(p.valor_bruto)}</td>
                    <td style={{ padding: '14px 16px', color: '#059669', fontWeight: '600' }}>+{formatCurrency(p.taxa_benavera)}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(p.valor_liquido)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', backgroundColor: st.bg, color: st.fg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!isFinal && (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {p.status !== 'SCHEDULED' && (
                            <button
                              type="button"
                              disabled={busyId === p.id}
                              onClick={() => updatePayoutStatus(p.id, 'SCHEDULED')}
                              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e40af', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Agendar
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => updatePayoutStatus(p.id, 'PAID')}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#059669', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            {busyId === p.id ? '...' : 'Marcar Pago'}
                          </button>
                        </div>
                      )}
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
