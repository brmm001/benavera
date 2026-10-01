// src/app/atendente/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AtendenteSidebar } from '@/components/AtendenteSidebar';

export default async function AtendenteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/atendente/login');
  }

  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    redirect('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <AtendenteSidebar userName={session.name} role={session.role} />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>{children}</main>
    </div>
  );
}
