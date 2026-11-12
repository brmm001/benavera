import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import type { Metadata } from 'next';
import { COMMERCIAL, ORGANIZATION_ID } from '@/lib/seo';

export const metadata: Metadata = { robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } } };

const SITE_URL = 'https://www.benavera.com.br';
const SITE_DESCRIPTION =
  'Crédito para tratamentos particulares de saúde. Taxa de 5% por operação para clínicas, sem mensalidade ou adesão; até 36x conforme análise.';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Benavera',
  legalName: 'Benavera Correspondentes Bancários LTDA',
  taxID: '69.952.939/0001-52',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logo.png`,
    width: 800,
    height: 200,
  },
  image: `${SITE_URL}/og-image.png`,
  description: COMMERCIAL.description,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'contato@benavera.com.br',
    availableLanguage: 'Portuguese',
  },
  knowsAbout: ['Financiamento para tratamentos de saúde', 'Pagamento para clínicas'],
};

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  publisher: { '@id': ORGANIZATION_ID },
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
      <Header />
      <main id="main-content" data-clarity-mask="true">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
