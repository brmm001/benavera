import { getPortalSession } from '@/lib/portal-auth';
import { redirect } from 'next/navigation';
import { PortalSidebar } from '@/components/portal/PortalSidebar';

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect('/portal/login');

  const initials = session.nome
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="portal-layout">
      <PortalSidebar
        clinicNome={session.clinicNome}
        userName={session.nome}
        userInitials={initials}
      />
      <main className="portal-main">
        {children}
      </main>
    </div>
  );
}
