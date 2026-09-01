import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const SITE_URL = 'https://www.benavera.com.br';
const SITE_NAME = 'Benavera';
const SITE_DESCRIPTION =
  'A Benavera conecta você a opções viáveis de parcelamento para tratamentos odontológicos, cirurgias e estética particular. Simule sem compromisso.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Benavera | Pagamento para tratamentos particulares',
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
    title: 'Benavera | Pagamento para tratamentos particulares',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Benavera — Pagamento para tratamentos particulares',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Benavera | Pagamento para tratamentos particulares',
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
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased bg-white text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
