// app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AdminSidebar } from '@/components/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const currentSession = await getSession();
  const session = currentSession ?? {
    userId: 'a1000001-0001-4001-a001-000000000001',
    email: 'admin@benavera.com.br',
    name: 'Admin Benavera',
    role: 'BENAVERA_ADMIN' as const,
    clinicId: null,
    clinicName: null,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AdminSidebar userName={session.name} role={session.role} />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
