import { withModuleGate } from '@/components/ModuleGate';
import { MetasClient } from '@/components/painel/MetasClient';

export const dynamic = 'force-dynamic';

export default async function MetasPage() {
  const gate = await withModuleGate('metas_comissoes');
  if (!gate.allowed) return gate.element;
  return <MetasClient />;
}
