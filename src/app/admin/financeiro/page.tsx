'use client';
// src/app/admin/financeiro/page.tsx — Gestão Financeira & Mensalidades SaaS (Mercado Pago)

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface BillingSummary {
  mercadoPagoConfigured: boolean;
  mrr: number;
  arr: number;
  statusCounts: Record<string, number>;
  invoicesSummary: {
    paidMonth: number;
    paidTotal: number;
    pendingTotal: number;
    paidCount: number;
    pendingCount: number;
    failedCount: number;
  };
  recentInvoices: Array<{
    id: string;
    clinic_id: string;
    clinic_name: string;
    amount: number;
    status: string;
    cycle: string;
    payment_method: string | null;
    due_date: string | null;
    paid_at: string | null;
    coupon_code: string | null;
    created_at: string;
  }>;
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

export default function AdminFinanceiroPage() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/financeiro/mensalidades', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
            Gestão Financeira &amp; Mensalidades
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            MRR, assinaturas via Mercado Pago (Cartão Recorrente, Pix e Boleto), inadimplência e conciliação de faturas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {data && (
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                background: data.mercadoPagoConfigured ? '#ecfdf5' : '#fffbeb',
                color: data.mercadoPagoConfigured ? '#047857' : '#92400e',
                border: `1px solid ${data.mercadoPagoConfigured ? '#a7f3d0' : '#fde68a'}`,
              }}
            >
              {data.mercadoPagoConfigured ? '✓ Mercado Pago conectado' : '⚠ Configurar MERCADOPAGO_ACCESS_TOKEN'}
            </span>
          )}
          <Link
            href="/admin/planos"
            style={{
              padding: '9px 16px',
              background: '#4040ca',
              color: 'white',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
            }}
          >
            Gerenciar Planos →
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando indicadores financeiros…</div>
      ) : !data ? (
        <div style={{ padding: '24px', background: '#fef2f2', borderRadius: '12px', color: '#991b1b' }}>
          Não foi possível carregar os dados financeiros.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
            <div style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>MRR (Receita Mensal Recorrente)</span>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>{brl(data.mrr)}</div>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>ARR projetado: {brl(data.arr)}</span>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Recebido no Mês</span>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>{brl(data.invoicesSummary.paidMonth)}</div>
              <span style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', display: 'block' }}>
                Total histórico: {brl(data.invoicesSummary.paidTotal)} ({data.invoicesSummary.paidCount} faturas)
              </span>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Faturas Pendentes</span>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginTop: '6px' }}>{brl(data.invoicesSummary.pendingTotal)}</div>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                {data.invoicesSummary.pendingCount} pendente(s) · {data.invoicesSummary.failedCount} recusada(s)
              </span>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '22px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Assinaturas por Status</span>
              <div style={{ fontSize: '13px', color: '#334155', marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <span>Ativas: <strong>{data.statusCounts.ACTIVE || 0}</strong></span>
                <span>Isentas: <strong>{data.statusCounts.EXEMPT || 0}</strong></span>
                <span style={{ color: '#b45309' }}>Carência (7d): <strong>{data.statusCounts.GRACE || 0}</strong></span>
                <span style={{ color: '#dc2626' }}>Suspensas: <strong>{data.statusCounts.SUSPENDED || 0}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px' }}>
              Últimas Faturas de Mensalidade
            </h2>
            {data.recentInvoices.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Nenhuma fatura de mensalidade emitida ainda.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 12px' }}>Clínica</th>
                      <th style={{ padding: '10px 12px' }}>Ciclo / Meio</th>
                      <th style={{ padding: '10px 12px' }}>Valor</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px' }}>Data</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Controle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentInvoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{inv.clinic_name}</td>
                        <td style={{ padding: '12px', color: '#475569' }}>
                          {inv.cycle === 'ANNUAL' ? 'Anual' : 'Mensal'} · {inv.payment_method || '—'}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{brl(inv.amount)}</td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: '700',
                              background: inv.status === 'PAID' ? '#d1fae5' : inv.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                              color: inv.status === 'PAID' ? '#047857' : inv.status === 'PENDING' ? '#92400e' : '#b91c1c',
                            }}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#64748b' }}>
                          {new Date(inv.paid_at || inv.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <Link href={`/admin/clinicas/${inv.clinic_id}`} style={{ color: '#4040ca', fontWeight: '700', textDecoration: 'none' }}>
                            Abrir clínica →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
