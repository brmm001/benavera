import { getPortalSession } from '@/lib/portal-auth';
import { getNeonClient } from '@/lib/neon';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Users, Search, Phone, Mail, FileText, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export const metadata = {
  title: 'Pacientes | Portal Benavera',
};

async function getPatients(clinicId: string) {
  const db = getNeonClient();
  if (!db) return [];
  try {
    const rows = await db`
      SELECT 
        paciente_nome,
        paciente_telefone,
        paciente_email,
        COUNT(*) as total_propostas,
        MAX(created_at) as ultimo_contato,
        SUM(valor_total_centavos) as valor_acumulado,
        BOOL_OR(status = 'aceita') as tem_aprovado
      FROM proposals
      WHERE clinic_id = ${clinicId}
      GROUP BY paciente_nome, paciente_telefone, paciente_email
      ORDER BY MAX(created_at) DESC
    `;
    return rows;
  } catch {
    return [];
  }
}

export default async function PacientesPortalPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const patients = await getPatients(session.clinicId);

  return (
    <div className="portal-content">
      <div className="portal-topbar" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Base de Pacientes
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Gerencie os pacientes atendidos, histórico de propostas e acompanhamento de tratamentos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/portal/propostas/nova" className="btn-action btn-action-primary" style={{ gap: '0.375rem' }}>
            <Plus size={15} />
            Nova proposta
          </Link>
        </div>
      </div>

      <div className="portal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            <Users size={16} />
            <span>Total de <strong>{patients.length}</strong> pacientes registrados</span>
          </div>
        </div>

        {patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
            <Users size={40} style={{ margin: '0 auto 1rem', color: '#94a3b8' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.375rem' }}>
              Nenhum paciente cadastrado ainda
            </h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Assim que você criar a primeira proposta de financiamento, o paciente aparecerá automaticamente aqui.
            </p>
            <Link href="/portal/propostas/nova" className="btn-action btn-action-primary">
              <Plus size={15} />
              Criar primeira proposta
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Contato</th>
                  <th>Propostas</th>
                  <th>Volume Acumulado</th>
                  <th>Status</th>
                  <th>Última Interação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p: any, idx: number) => {
                  const valor = Number(p.valor_acumulado || 0) / 100;
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: '600', color: '#0f172a' }}>
                        {p.paciente_nome}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', fontSize: '0.8125rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#334155' }}>
                            <Phone size={12} color="#64748b" /> {p.paciente_telefone}
                          </span>
                          {p.paciente_email && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#64748b' }}>
                              <Mail size={12} color="#94a3b8" /> {p.paciente_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge-pill badge-neutral">
                          {p.total_propostas} {p.total_propostas === '1' ? 'proposta' : 'propostas'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: '#0f172a' }}>
                        {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td>
                        {p.tem_aprovado ? (
                          <span className="badge-pill badge-success" style={{ gap: '0.25rem' }}>
                            <CheckCircle2 size={12} /> Aprovado
                          </span>
                        ) : (
                          <span className="badge-pill badge-pending" style={{ gap: '0.25rem' }}>
                            <Clock size={12} /> Em andamento
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {p.ultimo_contato ? new Date(p.ultimo_contato).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td>
                        <a
                          href={`https://wa.me/55${p.paciente_telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-action btn-action-outline"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        >
                          <Phone size={12} /> WhatsApp
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
