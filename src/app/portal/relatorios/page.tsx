import { getPortalSession } from '@/lib/portal-auth';
import { getNeonClient } from '@/lib/neon';
import { redirect } from 'next/navigation';
import { BarChart3, TrendingUp, Users, FileText, CheckCircle2, Clock, Percent } from 'lucide-react';

export const metadata = {
  title: 'Relatórios & Inteligência | Portal Benavera',
};

async function getAnalytics(clinicId: string) {
  const db = getNeonClient();
  if (!db) return null;
  try {
    const [propostas, statusDist, byMonth] = await Promise.all([
      db`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'aceita') as aceitas,
          COUNT(*) FILTER (WHERE status = 'recusada') as recusadas,
          AVG(valor_total_centavos) as ticket_medio,
          SUM(valor_total_centavos) as volume_total
        FROM proposals
        WHERE clinic_id = ${clinicId}
      `,
      db`
        SELECT status, COUNT(*) as count
        FROM proposals
        WHERE clinic_id = ${clinicId}
        GROUP BY status
      `,
      db`
        SELECT 
          TO_CHAR(created_at, 'Mon/YY') as mes,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'aceita') as aceitas
        FROM proposals
        WHERE clinic_id = ${clinicId}
        GROUP BY TO_CHAR(created_at, 'Mon/YY')
        LIMIT 6
      `
    ]);

    return {
      total: Number(propostas[0]?.total || 0),
      aceitas: Number(propostas[0]?.aceitas || 0),
      recusadas: Number(propostas[0]?.recusadas || 0),
      ticketMedio: Number(propostas[0]?.ticket_medio || 0) / 100,
      volumeTotal: Number(propostas[0]?.volume_total || 0) / 100,
      statusDist: statusDist || [],
      byMonth: byMonth || [],
    };
  } catch {
    return null;
  }
}

export default async function RelatoriosPortalPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const data = await getAnalytics(session.clinicId);
  const convRate = data && data.total > 0 ? Math.round((data.aceitas / data.total) * 100) : 0;

  return (
    <div className="portal-content">
      <div className="portal-topbar" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Relatórios & Indicadores de Performance
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Métricas estratégicas de conversão de orçamentos, ticket médio e prazos mais procurados.
          </p>
        </div>
      </div>

      <div className="metric-cards-grid" style={{ marginBottom: '2rem' }}>
        <div className="metric-card">
          <div className="metric-card-label">Taxa de Conversão</div>
          <div className="metric-card-value" style={{ color: '#4f46e5' }}>{convRate}%</div>
          <div className="metric-card-trend up">
            <Percent size={13} />
            {data?.aceitas || 0} de {data?.total || 0} aprovadas
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">Ticket Médio Financiado</div>
          <div className="metric-card-value">
            {(data?.ticketMedio || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
          </div>
          <div className="metric-card-trend neutral">
            <TrendingUp size={13} />
            Média por paciente
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-label">Volume Total Ofertado</div>
          <div className="metric-card-value">
            {(data?.volumeTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
          </div>
          <div className="metric-card-trend up">
            <FileText size={13} />
            Total em propostas emitidas
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="portal-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '1.5rem' }}>
            Funil de Fechamento de Propostas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>1. Propostas Criadas</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{data?.total || 0} (100%)</span>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: '#64748b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>2. Propostas Aceitas / Convertidas</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>{data?.aceitas || 0} ({convRate}%)</span>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${convRate}%`, height: '100%', background: '#10b981' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="portal-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' }}>
            Como aumentar a conversão da sua clínica?
          </h3>
          <ul style={{ paddingLeft: '1.25rem', color: '#475569', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Envie a proposta na recepção:</strong> Não deixe o paciente sair da clínica sem ter a proposta aberta no próprio WhatsApp.
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Ofereça prazos mais longos (24x e 36x):</strong> A parcela menor viabiliza tratamentos de alto valor como implantes e próteses.
            </li>
            <li>
              <strong>Acompanhe o CRM diariamente:</strong> Pacientes com propostas pendentes respondem em média 60% melhor a um follow-up em até 24 horas.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
