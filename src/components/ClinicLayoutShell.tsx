// src/components/ClinicLayoutShell.tsx
// Shell compartilhado para todas as páginas autenticadas da clínica.
import { redirect } from 'next/navigation';
import { getSession, isBenaveraStaff } from '@/lib/auth';
import { resolveClinicEntitlements } from '@/lib/clinic-modules';
import { ClinicSidebar } from './ClinicSidebar';
import '@/app/painel/clinic-panel.css';

export async function ClinicLayoutShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (isBenaveraStaff(session.role)) redirect('/admin');
  if (session.role === 'REPRESENTANTE') redirect('/representante');
  if (!session.clinicId) redirect('/login');

  const resolved = await resolveClinicEntitlements(session.clinicId, session.role);

  return (
    <div className="bv-shell">
      <ClinicSidebar
        userName={session.name}
        clinicName={session.clinicName || 'Clínica'}
        modules={resolved.modules}
        uiMode={resolved.preferences.uiMode}
        planName={resolved.planName}
        allowNewApplications={resolved.allowNewApplications}
      />
      <main className="bv-main">{children}</main>
    </div>
  );
}
