import { withModuleGate } from '@/components/ModuleGate';
import { AgendaClient } from '@/components/painel/AgendaClient';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const gate = await withModuleGate('agenda_comercial');
  if (!gate.allowed) return gate.element;
  return <AgendaClient />;
}
