// Página de Links de Cadastro + Assinatura do Atendente Comercial
import { SellerLinkGenerator } from '@/components/SellerLinkGenerator';

export const dynamic = 'force-dynamic';

export default function AtendenteLinksPage() {
  return (
    <div style={{ padding: '36px 44px' }}>
      <SellerLinkGenerator apiBase="/api/atendente/links" />
    </div>
  );
}
