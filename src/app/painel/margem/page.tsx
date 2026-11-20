import { withModuleGate } from '@/components/ModuleGate';
import { MargemClient } from '@/components/painel/MargemClient';

export const dynamic = 'force-dynamic';

export default async function MargemPage() {
  const gate = await withModuleGate('calculadora_margem');
  if (!gate.allowed) return gate.element;
  return <MargemClient />;
}
