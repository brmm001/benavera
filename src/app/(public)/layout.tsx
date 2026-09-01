import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ClarityScript } from '@/components/ClarityScript';

const SITE_URL = 'https://www.benavera.com.br';
const SITE_DESCRIPTION =
  'A Benavera conecta você a opções viáveis de parcelamento para tratamentos odontológicos, cirurgias e estética particular. Simule sem compromisso.';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Benavera',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'A Benavera conecta pacientes a alternativas de pagamento para tratamentos de saúde particulares e apoia clínicas na viabilização de orçamentos.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'contato@benavera.com.br',
    availableLanguage: 'Portuguese',
  },
  sameAs: [],
};

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Benavera',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'pt-BR',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteSchema),
        }}
      />
      <ClarityScript />
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
