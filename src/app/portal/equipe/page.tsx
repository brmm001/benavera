import { getPortalSession } from '@/lib/portal-auth';
import { getNeonClient } from '@/lib/neon';
import { redirect } from 'next/navigation';
import { Users, UserPlus, Shield, Mail, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Equipe da Clínica | Portal Benavera',
};

async function getTeam(clinicId: string) {
  const db = getNeonClient();
  if (!db) return [];
  try {
    const rows = await db`
      SELECT id, nome, email, role, ativo, ultimo_acesso, created_at
      FROM clinic_users
      WHERE clinic_id = ${clinicId}
      ORDER BY created_at ASC
    `;
    return rows;
  } catch {
    return [];
  }
}

export default async function EquipePortalPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const team = await getTeam(session.clinicId);

  return (
    <div className="portal-content">
      <div className="portal-topbar" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Equipe e Acessos
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Gerencie os profissionais e atendentes que têm acesso ao portal da clínica.
          </p>
        </div>
      </div>

      <div className="portal-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel / Função</th>
                <th>Status</th>
                <th>Último Acesso</th>
              </tr>
            </thead>
            <tbody>
              {team.map((u: any) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '600', color: '#0f172a' }}>{u.nome}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#475569', fontSize: '0.8125rem' }}>
                      <Mail size={12} /> {u.email}
                    </span>
                  </td>
                  <td>
                    <span className="badge-pill badge-neutral" style={{ textTransform: 'capitalize' }}>
                      <Shield size={11} /> {u.role === 'admin' ? 'Administrador' : u.role}
                    </span>
                  </td>
                  <td>
                    {u.ativo ? (
                      <span className="badge-pill badge-success">Ativo</span>
                    ) : (
                      <span className="badge-pill badge-neutral">Inativo</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString('pt-BR') : 'Recente'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
