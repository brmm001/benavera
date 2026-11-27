// Página de Links de Cadastro + Assinatura do Representante
import { SellerLinkGenerator } from '@/components/SellerLinkGenerator';

export const dynamic = 'force-dynamic';

export default function RepresentanteLinksPage() {
  return (
    <div className="rep-page">
      <SellerLinkGenerator apiBase="/api/representante/links" />
    </div>
  );
}
