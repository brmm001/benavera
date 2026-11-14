import { pageMetadata } from '@/lib/seo';
import { COMMERCIAL } from '@/lib/commercial';
export const metadata = pageMetadata('Credenciamento de clínicas', `Cadastre sua clínica na Benavera. ${COMMERCIAL.clinicCost}. Crédito sujeito à análise.`, '/credenciamento');
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
