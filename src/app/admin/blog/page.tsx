import { getBlogArticles } from '@/lib/blog-db';
import { articles as staticArticles, articleContent } from '@/content/articles';
import { BlogManager } from './BlogManager';

export const dynamic = 'force-dynamic';

// Middleware já garante autenticação
export default async function AdminBlogPage() {
  const dbArticles = await getBlogArticles({ status: 'all' });
  const dbSlugs = new Set(dbArticles.map((a) => a.slug));

  const allArticles = [...dbArticles];
  for (const st of staticArticles) {
    if (!dbSlugs.has(st.slug)) {
      allArticles.push({
        id: `static_${st.slug}`,
        slug: st.slug,
        title: st.title,
        description: st.description,
        content: articleContent[st.slug] || '',
        author: st.author || 'Equipe Benavera',
        reviewer: st.reviewer || 'Revisão Editorial Benavera',
        category: st.category,
        keywords: st.keywords || [],
        relatedArticles: st.relatedArticles || [],
        sources: st.sources || [],
        status: 'published',
        publishedAt: st.publishedAt,
        createdAt: st.publishedAt,
        updatedAt: st.updatedAt || st.publishedAt,
      });
    }
  }

  return <BlogManager initialArticles={allArticles} />;
}
