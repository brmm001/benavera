import type { MetadataRoute } from 'next';
import { getBlogArticles } from '@/lib/blog-db';
import { articles as staticArticles } from '@/content/articles';

// Revalidar a cada 24 horas
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.benavera.com.br';
  const siteReleaseDate = new Date('2026-09-01T00:00:00.000Z');

  // Páginas institucionais e principais públicas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/simular`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/como-funciona`,
      lastModified: siteReleaseDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/clinicas`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/calculadoras`,
      lastModified: siteReleaseDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/conteudos`,
      lastModified: siteReleaseDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sobre`,
      lastModified: siteReleaseDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/politica-editorial`,
      lastModified: siteReleaseDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: siteReleaseDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/termos`,
      lastModified: siteReleaseDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Páginas de intenção de busca (Landing Pages)
  const intentPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/parcelamento-tratamento-odontologico`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/financiamento-implante-dentario`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/parcelamento-cirurgia-particular`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/parcelamento-cirurgia-oftalmologica`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/parcelamento-procedimento-estetico`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/solucoes-financeiras-para-clinicas`,
      lastModified: siteReleaseDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Artigos de conteúdo dinâmicos do DB
  const dbArticles = await getBlogArticles({ status: 'published' });
  const dbSlugs = new Set(dbArticles.map(a => a.slug));
  
  // Merge com estáticos para não quebrar SEO de nada
  const allArticles = [...dbArticles];
  for (const st of staticArticles) {
    if (!dbSlugs.has(st.slug)) {
      allArticles.push({
        ...st,
        id: `static_${st.slug}`,
        content: '',
        status: 'published',
        createdAt: st.publishedAt,
        updatedAt: st.updatedAt || st.publishedAt,
        relatedArticles: st.relatedArticles || [],
        keywords: st.keywords || [],
        sources: st.sources || [],
      });
    }
  }

  const articlePages: MetadataRoute.Sitemap = allArticles.map((article) => ({
    url: `${baseUrl}/conteudos/${article.slug}`,
    lastModified: new Date(article.updatedAt || article.publishedAt || article.createdAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...intentPages, ...articlePages];
}
