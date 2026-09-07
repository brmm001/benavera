import { getPortalSession } from '@/lib/portal-auth';
import { getNeonClient } from '@/lib/neon';
import { redirect } from 'next/navigation';
import { Building2, Landmark, Bell, Shield, Save } from 'lucide-react';

export const metadata = {
  title: 'Configurações | Portal Benavera',
};

async function getClinicData(clinicId: string) {
  const db = getNeonClient();
  if (!db) return null;
  try {
    const rows = await db`
      SELECT id, nome, cnpj, especialidade, cidade, estado, telefone, email, plano
      FROM clinics
      WHERE id = ${clinicId}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch {
    return null;
  }
}

export default async function ConfiguracoesPortalPage() {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const clinic = await getClinicData(session.clinicId);

  return (
    <div className="portal-content">
      <div className="portal-topbar" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Configurações da Clínica
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' }}>
            Dados cadastrais, preferências de notificação e dados bancários para repasses.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Dados Cadastrais */}
        <div className="portal-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Dados da Clínica
              </h2>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Informações exibidas nas propostas dos pacientes</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="portal-form-label">Nome da Clínica / Razão Social</label>
              <input
                type="text"
                readOnly
                defaultValue={clinic?.nome || session.clinicNome}
                className="portal-form-input"
                style={{ background: '#f8fafc' }}
              />
            </div>

            <div>
              <label className="portal-form-label">Especialidade Principal</label>
              <input
                type="text"
                readOnly
                defaultValue={clinic?.especialidade || 'Odontologia'}
                className="portal-form-input"
                style={{ background: '#f8fafc' }}
              />
            </div>

            <div>
              <label className="portal-form-label">CNPJ</label>
              <input
                type="text"
                readOnly
                defaultValue={clinic?.cnpj || 'Não informado'}
                className="portal-form-input"
                style={{ background: '#f8fafc' }}
              />
            </div>

            <div>
              <label className="portal-form-label">Cidade / Estado</label>
              <input
                type="text"
                readOnly
                defaultValue={`${clinic?.cidade || 'São Paulo'} / ${clinic?.estado || 'SP'}`}
                className="portal-form-input"
                style={{ background: '#f8fafc' }}
              />
            </div>

            <div>
              <label className="portal-form-label">Plano Benavera</label>
              <input
                type="text"
                readOnly
                defaultValue="Parceiro Oficial Clinic-First (D+1)"
                className="portal-form-input"
                style={{ background: '#f8fafc', color: '#16a34a', fontWeight: '600' }}
              />
            </div>
          </div>
        </div>

        {/* Dados Bancários para Repasses */}
        <div className="portal-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Conta Bancária para Recebimento de Repasses
              </h2>
              <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Conta PJ onde serão depositados os repasses dos tratamentos</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="portal-form-label">Chave PIX da Clínica (CNPJ ou E-mail)</label>
              <input
                type="text"
                placeholder="Ex: financeiro@clinicaexemplo.com.br"
                defaultValue={clinic?.email || ''}
                className="portal-form-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
