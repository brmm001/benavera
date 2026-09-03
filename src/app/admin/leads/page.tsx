import { getPatientLeads, getClinicLeads, getDashboardMetrics } from '@/lib/db';
import { AdminDashboard } from './AdminDashboard';

// Server Component — busca dados diretamente no servidor.
// A autenticação já é garantida pelo middleware.ts antes de chegar aqui.
export default async function AdminLeadsPage() {
  const [patientLeads, clinicLeads, metrics] = await Promise.all([
    getPatientLeads(),
    getClinicLeads(),
    getDashboardMetrics(),
  ]);

  return (
    <AdminDashboard
      patientLeads={patientLeads}
      clinicLeads={clinicLeads}
      metrics={metrics}
    />
  );
}
