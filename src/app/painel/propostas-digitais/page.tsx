import { withModuleGate } from '@/components/ModuleGate';
import { PropostasDigitaisClient } from '@/components/painel/PropostasDigitaisClient';

export const dynamic = 'force-dynamic';

export default async function PropostasDigitaisPage() {
  const gate = await withModuleGate('propostas_digitais');
  if (!gate.allowed) return gate.element;
  return <PropostasDigitaisClient />;
}
