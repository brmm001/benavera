import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ClarityScript } from '@/components/ClarityScript';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const SITE_URL = 'https://www.benavera.com.br';
const SITE_NAME = 'Benavera';
const SITE_DESCRIPTION =
  'A Benavera ajuda você a encontrar alternativas viáveis de pagamento para tratamentos particulares — odontologia, implantes, oftalmologia, cirurgias e estética. Faça uma simulação gratuita.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Alternativas de pagamento para tratamentos particulares`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'como pagar tratamento particular',
    'alternativas de pagamento tratamentos',
    'financiamento tratamento odontológico',
    'parcelamento implante dentário',
    'como pagar implante dentário',
    'financiamento cirurgia particular',
    'parcelamento cirurgia oftalmológica',
    'parcelamento tratamento estético',
    'como parcelar tratamento odontológico',
    'benavera',
  ],
  authors: [{ name: 'Equipe Benavera', url: SITE_URL }],
  creator: 'Benavera',
  publisher: 'Benavera',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Alternativas de pagamento para tratamentos particulares`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Benavera — Alternativas de pagamento para tratamentos particulares',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Alternativas de pagamento para tratamentos particulares`,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      process.env.GOOGLE_SITE_VERIFICATION ||
      undefined,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
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
      </head>
      <body className="antialiased bg-white text-slate-900 font-sans">
        <ClarityScript />
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
