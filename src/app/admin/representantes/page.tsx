// Admin: lista e criação de representantes de vendas
import { listRepresentantes } from '@/lib/representantes-db';
import { AdminRepresentantesClient } from '@/components/AdminRepresentantesClient';
import '../../representante/rep.css';

export const dynamic = 'force-dynamic';

export default async function AdminRepresentantesPage() {
  const reps = await listRepresentantes();
  return (
    <div className="rep-page" style={{ fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <h1 className="rep-h1">Representantes de vendas</h1>
      <p className="rep-sub">Cadastre representantes, defina % e período de comissão e acompanhe o que cada um tem a receber.</p>
      <AdminRepresentantesClient initial={JSON.parse(JSON.stringify(reps))} />
    </div>
  );
}

