import { NextResponse } from 'next/server';
import { getPublicArticles } from '@/lib/published-content';
import { SITE_URL, COMMERCIAL } from '@/lib/seo';
export const revalidate = 3600;
export async function GET() {
  const articles = await getPublicArticles();
  const content = [
    '# Benavera',
    '> Plataforma de intermediação de crédito para tratamentos particulares de saúde.',
    COMMERCIAL.description,
    'A Benavera não é um banco. Crédito, juros, CET, elegibilidade, repasse e responsabilidade por inadimplência dependem da proposta e do contrato da instituição parceira. Não há garantia de aprovação.',
    'Razão social: Benavera Correspondentes Bancários LTDA. CNPJ: 69.952.939/0001-52.',
    'Contato: contato@benavera.com.br. Idioma: português do Brasil.',
    '## Informações oficiais',
    ...['clinicas', 'condicoes', 'como-funciona', 'sobre', 'contato', 'benavera-ou-capim', 'equipe-editorial', 'politica-editorial', 'privacidade'].map(path => `- ${SITE_URL}/${path}`),
    '## Conteúdos publicados',
    ...articles.map(a => `- [${a.title}](${SITE_URL}/conteudos/${a.slug}): ${a.description}`),
  ].join('\n\n');
  return new NextResponse(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}
