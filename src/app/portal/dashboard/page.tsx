import { getPortalSession } from '@/lib/portal-auth';
import { getNeonClient } from '@/lib/neon';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowRight, FileText, Users, ArrowLeftRight, TrendingUp, Bell } from 'lucide-react';

async function getDashboardMetrics(clinicId: string) {
  const db = getNeonClient();
  if (!db) return null;
  try {
    const [propostas, crm, repasses] = await Promise.all([
      db`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'aceita') as aceitas, COUNT(*) FILTER (WHERE status = 'pendente') as pendentes FROM proposals WHERE clinic_id = ${clinicId}`,
      db`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE stage = 'fechado_ganhou') as fechados FROM crm_opportunities WHERE clinic_id = ${clinicId}`,
      db`SELECT COALESCE(SUM(valor_liquido_centavos), 0) as total_previsto, COALESCE(SUM(CASE WHEN status = 'pago' THEN valor_liquido_centavos ELSE 0 END), 0) as total_pago FROM transfers WHERE clinic_id = ${clinicId}`,
    ]);
    return {
      propostas: { total: Number(propostas[0]?.total || 0), aceitas: Number(propostas[0]?.aceitas || 0), pendentes: Number(propostas[0]?.pendentes || 0) },
      crm: { total: Number(crm[0]?.total || 0), fechados: Number(crm[0]?.fechados || 0) },
      repasses: { previsto: Number(repasses[0]?.total_previsto || 0) / 100, pago: Number(repasses[0]?.total_pago || 0) / 100 },
    };
  } catch {
    return null;
  }
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const metrics = await getDashboardMetrics(session.clinicId);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="portal-content">
      {/* Topbar */}
      <div className="portal-topbar" style={{ marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
            {greeting}, {session.nome.split(' ')[0]}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/portal/propostas/nova"
            id="dashboard-nova-proposta"
            className="btn-action btn-action-primary"
            style={{ gap: '0.375rem' }}
          >
            <Plus size={15} />
            Nova proposta
          </Link>
        </div>
      </div>

      <div style={{ padding: '0 0 2rem' }}>
        {/* Metrics grid */}
        {metrics ? (
          <div className="metric-cards-grid" style={{ marginBottom: '2rem' }}>
            <div className="metric-card">
              <div className="metric-card-label">Propostas enviadas</div>
              <div className="metric-card-value">{metrics.propostas.total}</div>
              <div className="metric-card-trend neutral">
                <FileText size={13} />
                {metrics.propostas.pendentes} pendentes
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Propostas aceitas</div>
              <div className="metric-card-value">{metrics.propostas.aceitas}</div>
              <div className="metric-card-trend up">
                <TrendingUp size={13} />
                {metrics.propostas.total > 0 ? Math.round((metrics.propostas.aceitas / metrics.propostas.total) * 100) : 0}% de conversao
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Oportunidades CRM</div>
              <div className="metric-card-value">{metrics.crm.total}</div>
              <div className="metric-card-trend up">
                <Users size={13} />
                {metrics.crm.fechados} fechadas
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-card-label">Repasse previsto</div>
              <div className="metric-card-value" style={{ fontSize: '1.625rem' }}>{fmt(metrics.repasses.previsto)}</div>
              <div className="metric-card-trend up">
                <ArrowLeftRight size={13} />
                {fmt(metrics.repasses.pago)} pago
              </div>
            </div>
          </div>
        ) : (
          <div className="metric-cards-grid" style={{ marginBottom: '2rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="metric-card">
                <div className="skeleton" style={{ height: '12px', width: '80px', marginBottom: '0.75rem' }} />
                <div className="skeleton" style={{ height: '32px', width: '60px' }} />
              </div>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="portal-table-wrapper">
            <div className="portal-table-header">
              <span className="portal-table-title">Acoes rapidas</span>
            </div>
            <div style={{ padding: '1rem' }}>
              {[
                { href: '/portal/propostas/nova', icon: FileText, label: 'Criar nova proposta', desc: 'Enviar proposta para paciente' },
                { href: '/portal/crm', icon: Users, label: 'Ver oportunidades', desc: 'Acompanhar pipeline CRM' },
                { href: '/portal/repasses', icon: ArrowLeftRight, label: 'Verificar repasses', desc: 'Status de pagamentos' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', borderRadius: '10px', textDecoration: 'none', transition: 'background 0.15s ease', marginBottom: '0.25rem' }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4040ca', flexShrink: 0 }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.desc}</div>
                    </div>
                    <ArrowRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto', flexShrink: 0 }} />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Funil simplificado */}
          <div className="portal-table-wrapper">
            <div className="portal-table-header">
              <span className="portal-table-title">Funil de conversao</span>
            </div>
            <div style={{ padding: '1.25rem 1.375rem' }}>
              {metrics ? (
                <div className="funnel-bar">
                  {[
                    { label: 'Propostas enviadas', value: metrics.propostas.total, max: metrics.propostas.total || 1, fill: 'fill-100' },
                    { label: 'Propostas aceitas', value: metrics.propostas.aceitas, max: metrics.propostas.total || 1, fill: 'fill-75' },
                    { label: 'Tratamentos realizados', value: metrics.crm.fechados, max: metrics.propostas.total || 1, fill: 'fill-50' },
                  ].map(step => (
                    <div key={step.label} className="funnel-step" style={{ marginBottom: '0.875rem' }}>
                      <span className="funnel-step-label">{step.label}</span>
                      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '100px', height: '8px', overflow: 'hidden' }}>
                        <div
                          className={`funnel-step-bar ${step.fill}`}
                          style={{ width: `${Math.min(100, (step.value / step.max) * 100)}%`, height: '100%', borderRadius: '100px' }}
                        />
                      </div>
                      <span className="funnel-step-count">{step.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '1.5rem' }}>
                  <p className="empty-state-desc">Carregando dados...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
