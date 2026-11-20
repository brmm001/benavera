import { withModuleGate } from '@/components/ModuleGate';
import { RecuperacaoClient } from '@/components/painel/RecuperacaoClient';

export const dynamic = 'force-dynamic';

export default async function RecuperacaoPage() {
  const gate = await withModuleGate('recuperacao');
  if (!gate.allowed) return gate.element;
  return <RecuperacaoClient />;
}
