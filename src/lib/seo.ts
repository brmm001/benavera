import type { Metadata } from 'next';

export const SITE_URL = 'https://www.benavera.com.br';
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const COMMERCIAL = {
  clinicFeePercent: 5,
  maxInstallments: 36,
  reviewedAt: '2026-11-12',
  description: 'Financiamento para tratamentos de saúde: taxa de 5% por operação para a clínica, sem mensalidade ou adesão. Até 36 parcelas, conforme análise e modalidade.',
} as const;

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Benavera', title, description, url,
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: 'Benavera — financiamento para saúde' }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${SITE_URL}/og-image.png`] },
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export const PUBLIC_PATHS = [
  '/', '/clinicas', '/credenciamento', '/simular', '/calculadoras', '/como-funciona',
  '/sobre', '/contato', '/conteudos', '/condicoes', '/benavera-ou-capim', '/equipe-editorial',
  '/solucoes-financeiras-para-clinicas', '/financiamento-implante-dentario',
  '/parcelamento-cirurgia-oftalmologica', '/parcelamento-cirurgia-particular',
  '/parcelamento-procedimento-estetico', '/parcelamento-tratamento-odontologico',
  '/politica-editorial', '/privacidade', '/termos', '/simuladorclinicas', '/seja-representante',
];

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path) || /^\/conteudos\/[a-z0-9-]+$/.test(path);
}
