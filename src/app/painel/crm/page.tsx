import { withModuleGate } from '@/components/ModuleGate';
import { CrmPainelClient } from '@/components/painel/CrmPainelClient';

export const dynamic = 'force-dynamic';

export default async function CrmPainelPage() {
  const gate = await withModuleGate('crm');
  if (!gate.allowed) return gate.element;
  return <CrmPainelClient />;
}
