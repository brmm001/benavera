// app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getSession, isBenaveraStaff } from '@/lib/auth';
import { AdminSidebar } from '@/components/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  // Only Benavera staff can access admin panel
  if (!isBenaveraStaff(session.role)) {
    redirect('/dashboard');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AdminSidebar userName={session.name} role={session.role} />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  );
}
