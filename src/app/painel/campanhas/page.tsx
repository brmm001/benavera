import { withModuleGate } from '@/components/ModuleGate';
import { CampanhasClient } from '@/components/painel/CampanhasClient';

export const dynamic = 'force-dynamic';

export default async function CampanhasPage() {
  const gate = await withModuleGate('campanhas_reativacao');
  if (!gate.allowed) return gate.element;
  return <CampanhasClient />;
}
