import { withModuleGate } from '@/components/ModuleGate';
import { LinksPainelClient } from '@/components/painel/LinksPainelClient';

export const dynamic = 'force-dynamic';

export default async function LinksPainelPage() {
  const gate = await withModuleGate('links_financiamento');
  if (!gate.allowed) return gate.element;
  return <LinksPainelClient />;
}
