// Layout protegido da área do representante (apenas role REPRESENTANTE com cadastro ativo)
import { redirect } from 'next/navigation';
import { getRepresentanteSession } from '@/lib/representantes-db';
import { RepresentanteShell } from '@/components/RepresentanteShell';
import '../rep.css';

export const dynamic = 'force-dynamic';

export default async function RepresentantePainelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getRepresentanteSession();
  if (!ctx) redirect('/representante/login');
  return <RepresentanteShell userName={ctx.rep.nome}>{children}</RepresentanteShell>;
}

