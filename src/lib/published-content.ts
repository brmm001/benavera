import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getBlogArticles, staticToBlogArticle } from '@/lib/blog-db';
import { articles, articleContent } from '@/content/articles';

// One publication rule for articles, related cards, sitemap and machine-readable index.
// A draft in the CMS must never reappear through the bundled fallback.
// This app has not opted into Cache Components; retain the supported legacy cache API.
export const getPublicArticles = cache(unstable_cache(async () => {
  const database = await getBlogArticles({ status: 'all', limit: 10000, strict: true });
  const known = new Map(database.map(article => [article.slug, article]));
  for (const article of articles) {
    if (!known.has(article.slug)) known.set(article.slug, staticToBlogArticle(article, articleContent[article.slug] || ''));
  }
  return [...known.values()]
    .filter(article => article.status === 'published' && article.slug !== 'artigo-teste')
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
}, ['published-content-v2'], { revalidate: 3600, tags: ['blog-articles'] }));

export const getPublicArticle = cache(async (slug: string) =>
  (await getPublicArticles()).find(article => article.slug === slug) || null);
