// app/novo-financiamento/layout.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function NovoFinanciamentoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST') redirect('/admin');
  return <>{children}</>;
}
