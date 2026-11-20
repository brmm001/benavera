import { withModuleGate } from '@/components/ModuleGate';
import { IndicadoresClient } from '@/components/painel/IndicadoresClient';

export const dynamic = 'force-dynamic';

export default async function IndicadoresPage() {
  const gate = await withModuleGate('indicadores');
  if (!gate.allowed) return gate.element;
  return <IndicadoresClient />;
}
