import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getBlogArticles,
  createBlogArticle,
  bulkCreateBlogArticles,
} from '@/lib/blog-db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = (searchParams.get('status') ?? 'all') as 'all' | 'draft' | 'published';
  const category = searchParams.get('category') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const articles = await getBlogArticles({ status, category, search });
  return NextResponse.json({ success: true, articles });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Importação em massa
    if (body.bulk === true && Array.isArray(body.articles)) {
      const result = await bulkCreateBlogArticles(body.articles);
      revalidatePath('/admin/blog');
      revalidatePath('/blog');
      return NextResponse.json({ success: true, ...result });
    }

    // Criar artigo único
    const article = await createBlogArticle(body);
    if (!article) {
      return NextResponse.json({ success: false, error: 'Falha ao criar artigo.' }, { status: 500 });
    }
    revalidatePath('/admin/blog');
    revalidatePath('/blog');
    return NextResponse.json({ success: true, article }, { status: 201 });
  } catch (e) {
    console.error('[api/admin/blog] POST error:', e);
    return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 });
  }
}
