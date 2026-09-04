import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getBlogArticles,
  createBlogArticle,
  bulkCreateBlogArticles,
} from '@/lib/blog-db';
import { articles as staticArticles, articleContent } from '@/content/articles';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = (searchParams.get('status') ?? 'all') as 'all' | 'draft' | 'published';
  const category = searchParams.get('category') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const dbArticles = await getBlogArticles({ status, category, search });
  const dbSlugs = new Set(dbArticles.map((a) => a.slug));

  const allArticles = [...dbArticles];
  for (const st of staticArticles) {
    if (!dbSlugs.has(st.slug)) {
      if (status !== 'all' && status !== 'published') continue;
      if (category && st.category !== category) continue;
      if (
        search &&
        !st.title.toLowerCase().includes(search.toLowerCase()) &&
        !st.description.toLowerCase().includes(search.toLowerCase())
      ) {
        continue;
      }

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

  return NextResponse.json({ success: true, articles: allArticles });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Importação em massa
    if (body.bulk === true && Array.isArray(body.articles)) {
      const result = await bulkCreateBlogArticles(body.articles);
      revalidatePath('/admin/blog');
      revalidatePath('/conteudos');
      return NextResponse.json({ success: true, ...result });
    }

    // Criar artigo único
    const article = await createBlogArticle(body);
    if (!article) {
      return NextResponse.json({ success: false, error: 'Falha ao criar artigo.' }, { status: 500 });
    }
    revalidatePath('/admin/blog');
    revalidatePath('/conteudos');
    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (e) {
    console.error('[api/admin/blog] POST error:', e);
    return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 });
  }
}
