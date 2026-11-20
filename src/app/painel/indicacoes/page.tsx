import { withModuleGate } from '@/components/ModuleGate';
import { IndicacoesClient } from '@/components/painel/IndicacoesClient';

export const dynamic = 'force-dynamic';

export default async function IndicacoesPage() {
  const gate = await withModuleGate('indicacoes');
  if (!gate.allowed) return gate.element;
  return <IndicacoesClient />;
}
