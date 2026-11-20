import { withModuleGate } from '@/components/ModuleGate';
import { SimuladorPainelClient } from '@/components/painel/SimuladorPainelClient';

export const dynamic = 'force-dynamic';

export default async function SimuladorPainelPage() {
  const gate = await withModuleGate('simulador');
  if (!gate.allowed) return gate.element;
  return <SimuladorPainelClient />;
}
