import type { MetadataRoute } from 'next';
import { getBlogArticles } from '@/lib/blog-db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://benavera.com.br';
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/clinicas`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/credenciamento`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/simular`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/calculadoras`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/como-funciona`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/sobre`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/conteudos`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/solucoes-financeiras-para-clinicas`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/financiamento-implante-dentario`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/parcelamento-cirurgia-oftalmologica`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/parcelamento-cirurgia-particular`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/parcelamento-procedimento-estetico`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/parcelamento-tratamento-odontologico`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/politica-editorial`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/termos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const articles = await getBlogArticles({ status: 'published' });
    articlePages = articles.map(art => ({
      url: `${baseUrl}/conteudos/${art.slug}`,
      lastModified: new Date(art.publishedAt || now),
      changeFrequency: 'weekly',
      priority: 0.75,
    }));
  } catch {}

  return [...staticPages, ...articlePages];
}
