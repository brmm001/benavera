import type { Metadata } from 'next';

export const SITE_URL = 'https://www.benavera.com.br';
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export { COMMERCIAL } from './commercial';

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
  '/financiamento-odontologico-para-clinicas', '/financiamento-implantes-para-clinicas',
  '/solucoes-financeiras-para-clinicas', '/financiamento-implante-dentario',
  '/parcelamento-cirurgia-oftalmologica', '/parcelamento-cirurgia-particular',
  '/parcelamento-procedimento-estetico', '/parcelamento-tratamento-odontologico',
  '/politica-editorial', '/privacidade', '/termos', '/simuladorclinicas', '/seja-representante',
];

// Datas de revisão efetiva do conteúdo; não avançam automaticamente a cada build.
export const PUBLIC_REVIEW_DATES: Record<string, string> = Object.fromEntries([
  '/', '/clinicas', '/credenciamento', '/como-funciona', '/sobre', '/condicoes',
  '/benavera-ou-capim', '/financiamento-odontologico-para-clinicas',
  '/financiamento-implantes-para-clinicas', '/solucoes-financeiras-para-clinicas',
  '/financiamento-implante-dentario', '/parcelamento-tratamento-odontologico',
].map(path => [path, '2026-11-14']));

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path) || /^\/conteudos\/[a-z0-9-]+$/.test(path);
}
