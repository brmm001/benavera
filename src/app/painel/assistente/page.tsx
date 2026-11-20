import { sql } from '@/lib/benavera-db';
import { withModuleGate } from '@/components/ModuleGate';
import { AssistenteClient } from '@/components/painel/AssistenteClient';

export const dynamic = 'force-dynamic';

export default async function AssistentePage() {
  const gate = await withModuleGate('assistente_ia');
  if (!gate.allowed) return gate.element;

  const cid = gate.ctx.clinicId;
  const [rec, tasks, deals] = await Promise.all([
    sql`SELECT COUNT(*) AS c, COALESCE(SUM(valor), 0) AS v FROM clinic_recovery_items WHERE clinic_id = ${cid}::uuid AND status IN ('ABERTA','EM_CONTATO')`,
    sql`SELECT COUNT(*) AS c FROM clinic_crm_tasks WHERE clinic_id = ${cid}::uuid AND completed = FALSE`,
    sql`SELECT COUNT(*) AS c FROM clinic_crm_deals WHERE clinic_id = ${cid}::uuid AND stage NOT IN ('fechado','perdido')`,
  ]);

  return (
    <AssistenteClient
      openRecoveryCount={Number(rec[0]?.c || 0)}
      openRecoveryValue={Number(rec[0]?.v || 0)}
      pendingTasksCount={Number(tasks[0]?.c || 0)}
      stalledDealsCount={Number(deals[0]?.c || 0)}
    />
  );
}
