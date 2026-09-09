// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ClinicSidebar } from '@/components/ClinicSidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Staff Benavera vai para o admin
  if (session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST') {
    redirect('/admin');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <ClinicSidebar
        userName={session.name}
        clinicName={session.clinicName || 'Clínica'}
      />
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
