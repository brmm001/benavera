// POST (admin): envia URLs ao IndexNow. Sem body = envia todas as URLs do sitemap.
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getPublicArticles } from '@/lib/published-content';
import { PUBLIC_PATHS } from '@/lib/seo';
import { submitToIndexNow } from '@/lib/indexnow';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  let urls: string[];
  if (Array.isArray(body.urls) && body.urls.length > 0) {
    urls = body.urls.filter((u: unknown): u is string => typeof u === 'string').slice(0, 500);
  } else {
    const articles = await getPublicArticles();
    urls = [...PUBLIC_PATHS, ...articles.map(a => `/conteudos/${a.slug}`)];
  }

  const result = await submitToIndexNow(urls, { force: true });
  return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : 502 });
}
