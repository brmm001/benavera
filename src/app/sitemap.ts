import type { MetadataRoute } from 'next';
import { getPublicArticles } from '@/lib/published-content';
import { SITE_URL, PUBLIC_PATHS, isoDate } from '@/lib/seo';
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublicArticles();
  return [
    ...PUBLIC_PATHS.map(path => ({ url: `${SITE_URL}${path === '/' ? '' : path}` })),
    ...articles.map(article => ({ url: `${SITE_URL}/conteudos/${article.slug}`, lastModified: isoDate(article.updatedAt || article.publishedAt) })),
  ];
}
