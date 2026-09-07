import { getPortalSession } from '@/lib/portal-auth';
import { getNeonClient } from '@/lib/neon';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Send, Eye, CheckCircle2, Clock, XCircle } from 'lucide-react';

function statusBadge(status: string) {
  const map: Record<string, [string, string]> = {
    pendente: ['status-badge status-pendente', 'Pendente'],
    visualizada: ['status-badge status-em-analise', 'Visualizada'],
    aceita: ['status-badge status-aprovado', 'Aceita'],
    recusada: ['status-badge status-negado', 'Recusada'],
    expirada: ['status-badge status-expirado', 'Expirada'],
  };
  const [cls, label] = map[status] || ['status-badge status-novo', status];
  return { cls, label };
}

function fmt(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

export default async function PropostasPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const db = getNeonClient();
  const proposals = db ? await db`
    SELECT p.id, p.token, p.paciente_nome, p.paciente_telefone, p.tratamento,
           p.valor_total_centavos, p.status, p.created_at, p.visualizada_em, p.aceita_em,
           cu.nome AS criado_por
    FROM proposals p
    LEFT JOIN clinic_users cu ON cu.id = p.created_by
    WHERE p.clinic_id = ${session.clinicId}
    ORDER BY p.created_at DESC
    LIMIT 100
  ` : [];

  return (
    <div className="portal-content">
      <div className="portal-topbar">
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Propostas</h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>Propostas enviadas para pacientes</p>
        </div>
        <Link href="/portal/propostas/nova" id="propostas-nova-btn" className="btn-action btn-action-primary" style={{ gap: '0.375rem' }}>
          <Plus size={15} />
          Nova proposta
        </Link>
      </div>

      <div style={{ padding: '1.5rem 0' }}>
        {proposals && proposals.length > 0 ? (
          <div className="portal-table-wrapper">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Tratamento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => {
                  const { cls, label } = statusBadge(p.status as string);
                  return (
                    <tr key={p.id as string}>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9375rem' }}>{p.paciente_nome as string}</div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{p.paciente_telefone as string}</div>
                      </td>
                      <td style={{ color: '#334155' }}>{p.tratamento as string}</td>
                      <td style={{ fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>{fmt(p.valor_total_centavos as number)}</td>
                      <td><span className={cls}>{label}</span></td>
                      <td style={{ color: '#64748b', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {new Date(p.created_at as string).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <div className="portal-table-actions">
                          <Link
                            href={`/p/${p.token as string}`}
                            target="_blank"
                            className="btn-action btn-action-ghost"
                            title="Ver proposta"
                            style={{ padding: '0.375rem' }}
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            className="btn-action btn-action-ghost"
                            title="Copiar link"
                            style={{ padding: '0.375rem' }}
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/p/${p.token as string}`)}
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div className="empty-state-icon">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="empty-state-title">Nenhuma proposta ainda</h2>
            <p className="empty-state-desc">Crie sua primeira proposta para um paciente e acompanhe o processo de aprovacao.</p>
            <Link href="/portal/propostas/nova" className="btn-primary" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
              <Plus size={15} />
              Criar primeira proposta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
