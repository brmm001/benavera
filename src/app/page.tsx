// app/page.tsx — Redireciona para login
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST') redirect('/admin');
  redirect('/dashboard');
}
