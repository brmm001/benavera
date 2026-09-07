import { getPortalSession } from '@/lib/portal-auth';
import { getNeonClient } from '@/lib/neon';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftRight, CheckCircle2, Clock, Download, AlertCircle, DollarSign, Calendar } from 'lucide-react';

export const metadata = {
  title: 'Repasses Financeiros | Portal Benavera',
};

async function getTransfers(clinicId: string) {
  const db = getNeonClient();
  if (!db) return [];
  try {
    const rows = await db`
      SELECT 
        id,
        descricao,
        valor_bruto_centavos,
        taxa_benavera_centavos,
        valor_liquido_centavos,
        status,
        previsto_para,
        pago_em,
        created_at
      FROM transfers
      WHERE clinic_id = ${clinicId}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch {
    return [];
  }
}

function fmt(centavos: number) {
  return ((centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function RepassesPortalPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const transfers = await getTransfers(session.clinicId);

  const totalBruto = transfers.reduce((acc: number, t: any) => acc + (t.valor_bruto_centavos || 0), 0);
  const totalPago = transfers.filter((t: any) => t.status === 'pago').reduce((acc: number, t: any) => acc + (t.valor_liquido_centavos || 0), 0);
  const totalPrevisto = transfers.filter((t: any) => t.status === 'previsto').reduce((acc: number, t: any) => acc + (t.valor_liquido_centavos || 0), 0);

  return (
    <div className="portal-content">
      <div className="portal-topbar" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Extrato de Repasses
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Acompanhe a liquidação dos tratamentos parcelados via Benavera na conta da sua clínica.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="metric-cards-grid" style={{ marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-card-label">Total Repassado (Liquidado)</div>
          <div className="metric-card-value" style={{ color: '#10b981' }}>{fmt(totalPago)}</div>
          <div className="metric-card-trend up">
            <CheckCircle2 size={13} />
            Transferido via Pix / TED
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">Repasses Previstos (A Liberar)</div>
          <div className="metric-card-value" style={{ color: '#4f46e5' }}>{fmt(totalPrevisto)}</div>
          <div className="metric-card-trend neutral">
            <Clock size={13} />
            Previsão padrão D+1
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">Volume Bruto Transacionado</div>
          <div className="metric-card-value">{fmt(totalBruto)}</div>
          <div className="metric-card-trend up">
            <DollarSign size={13} />
            {transfers.length} tratamentos financiados
          </div>
        </div>
      </div>

      <div className="portal-card">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Histórico de Liquidações
          </h2>
        </div>

        {transfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
            <ArrowLeftRight size={40} style={{ margin: '0 auto 1rem', color: '#94a3b8' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.375rem' }}>
              Nenhum repasse registrado
            </h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto' }}>
              Assim que uma proposta for aceita pelo paciente e o crédito aprovado, o repasse aparecerá automaticamente aqui com a data de liquidação.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor Bruto</th>
                  <th>Taxa Benavera</th>
                  <th>Valor Líquido</th>
                  <th>Status</th>
                  <th>Data Previsão / Pago</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t: any) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{t.descricao}</td>
                    <td>{fmt(t.valor_bruto_centavos)}</td>
                    <td style={{ color: '#ef4444' }}>- {fmt(t.taxa_benavera_centavos)}</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>{fmt(t.valor_liquido_centavos)}</td>
                    <td>
                      {t.status === 'pago' ? (
                        <span className="badge-pill badge-success" style={{ gap: '0.25rem' }}>
                          <CheckCircle2 size={12} /> Pago na conta
                        </span>
                      ) : (
                        <span className="badge-pill badge-pending" style={{ gap: '0.25rem' }}>
                          <Clock size={12} /> Previsto
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {t.status === 'pago' && t.pago_em
                        ? new Date(t.pago_em).toLocaleDateString('pt-BR')
                        : t.previsto_para
                        ? new Date(t.previsto_para).toLocaleDateString('pt-BR')
                        : new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
