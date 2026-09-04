import { getNeonClient, ensureNeonSchema } from '@/lib/neon';
import type { ArticleFrontmatter, ArticleCategory } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type BlogStatus = 'draft' | 'published';

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  seoTitle?: string;
  description: string;
  content: string;
  author: string;
  reviewer?: string;
  category: ArticleCategory;
  keywords: string[];
  relatedArticles: string[];
  sources: { title: string; url: string; organization: string }[];
  status: BlogStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type BlogArticleInput = Omit<BlogArticle, 'id' | 'createdAt' | 'updatedAt'>;

let schemaReady = false;

async function getDb() {
  const db = getNeonClient();
  if (db && !schemaReady) {
    try { await ensureNeonSchema(db); schemaReady = true; } catch { /* silent */ }
  }
  return db;
}

function rowToArticle(row: Record<string, unknown>): BlogArticle {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    seoTitle: row.seo_title ? String(row.seo_title) : undefined,
    description: String(row.description),
    content: String(row.content ?? ''),
    author: String(row.author ?? 'Equipe Benavera'),
    reviewer: row.reviewer ? String(row.reviewer) : undefined,
    category: String(row.category) as ArticleCategory,
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    relatedArticles: Array.isArray(row.related_articles) ? (row.related_articles as string[]) : [],
    sources: Array.isArray(row.sources)
      ? (row.sources as { title: string; url: string; organization: string }[])
      : (typeof row.sources === 'string' ? JSON.parse(row.sources) : []),
    status: String(row.status) as BlogStatus,
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ── READ ──────────────────────────────────────────────────────────────────────

export async function getBlogArticles(options?: {
  status?: BlogStatus | 'all';
  category?: string;
  search?: string;
  limit?: number;
}): Promise<BlogArticle[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const status = options?.status && options.status !== 'all' ? options.status : null;
    const search = options?.search ? `%${options.search}%` : null;
    const limit = options?.limit ?? 200;

    let rows;
    if (status && search) {
      rows = await db`
        SELECT * FROM blog_articles
        WHERE status = ${status}
          AND (title ILIKE ${search} OR description ILIKE ${search} OR category ILIKE ${search})
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT ${limit}
      `;
    } else if (status) {
      rows = await db`
        SELECT * FROM blog_articles
        WHERE status = ${status}
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT ${limit}
      `;
    } else if (search) {
      rows = await db`
        SELECT * FROM blog_articles
        WHERE title ILIKE ${search} OR description ILIKE ${search} OR category ILIKE ${search}
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await db`
        SELECT * FROM blog_articles
        ORDER BY published_at DESC NULLS LAST, created_at DESC
        LIMIT ${limit}
      `;
    }

    return rows.map(rowToArticle);
  } catch (e) {
    console.error('[blog-db] getBlogArticles error:', e);
    return [];
  }
}

export async function getBlogArticleBySlug(slug: string): Promise<BlogArticle | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db`
      SELECT * FROM blog_articles WHERE slug = ${slug} LIMIT 1
    `;
    return rows[0] ? rowToArticle(rows[0]) : null;
  } catch (e) {
    console.error('[blog-db] getBlogArticleBySlug error:', e);
    return null;
  }
}

export async function getBlogArticleById(id: string): Promise<BlogArticle | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db`SELECT * FROM blog_articles WHERE id = ${id} LIMIT 1`;
    return rows[0] ? rowToArticle(rows[0]) : null;
  } catch (e) {
    console.error('[blog-db] getBlogArticleById error:', e);
    return null;
  }
}

/** Retorna todos os slugs publicados — para sitemap + generateStaticParams */
export async function getPublishedSlugs(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db`SELECT slug FROM blog_articles WHERE status = 'published'`;
    return rows.map(r => String(r.slug));
  } catch { return []; }
}

// ── WRITE ─────────────────────────────────────────────────────────────────────

export async function createBlogArticle(data: BlogArticleInput): Promise<BlogArticle | null> {
  const db = await getDb();
  if (!db) return null;

  const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  try {
    await db`
      INSERT INTO blog_articles (
        id, slug, title, seo_title, description, content,
        author, reviewer, category, keywords, related_articles,
        sources, status, published_at
      ) VALUES (
        ${id}, ${data.slug}, ${data.title}, ${data.seoTitle ?? null},
        ${data.description}, ${data.content}, ${data.author},
        ${data.reviewer ?? null}, ${data.category},
        ${data.keywords}, ${data.relatedArticles},
        ${JSON.stringify(data.sources)},
        ${data.status},
        ${data.status === 'published' ? (data.publishedAt ?? now) : null}
      )
    `;
    return getBlogArticleById(id);
  } catch (e) {
    console.error('[blog-db] createBlogArticle error:', e);
    return null;
  }
}

export async function updateBlogArticle(
  id: string,
  data: Partial<BlogArticleInput>
): Promise<BlogArticle | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date().toISOString();
  try {
    await db`
      UPDATE blog_articles SET
        slug             = COALESCE(${data.slug ?? null}, slug),
        title            = COALESCE(${data.title ?? null}, title),
        seo_title        = COALESCE(${data.seoTitle ?? null}, seo_title),
        description      = COALESCE(${data.description ?? null}, description),
        content          = COALESCE(${data.content ?? null}, content),
        author           = COALESCE(${data.author ?? null}, author),
        reviewer         = COALESCE(${data.reviewer ?? null}, reviewer),
        category         = COALESCE(${data.category ?? null}, category),
        keywords         = COALESCE(${data.keywords ?? null}, keywords),
        related_articles = COALESCE(${data.relatedArticles ?? null}, related_articles),
        sources          = COALESCE(${data.sources ? JSON.stringify(data.sources) : null}::jsonb, sources),
        status           = COALESCE(${data.status ?? null}, status),
        published_at     = CASE
          WHEN ${data.status ?? null} = 'published' AND published_at IS NULL
          THEN NOW()
          ELSE published_at
        END,
        updated_at       = ${now}
      WHERE id = ${id}
    `;
    return getBlogArticleById(id);
  } catch (e) {
    console.error('[blog-db] updateBlogArticle error:', e);
    return null;
  }
}

export async function deleteBlogArticle(id: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db`DELETE FROM blog_articles WHERE id = ${id}`;
    return true;
  } catch (e) {
    console.error('[blog-db] deleteBlogArticle error:', e);
    return false;
  }
}

/** Importa múltiplos artigos de uma só vez */
export async function bulkCreateBlogArticles(
  articles: BlogArticleInput[]
): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  for (const art of articles) {
    const result = await createBlogArticle(art);
    if (result) { created++; }
    else { errors.push(`Falhou: ${art.slug}`); }
  }

  return { created, errors };
}

// ── CONVERSION: static → BlogArticle ─────────────────────────────────────────

/** Converte o formato estático `ArticleFrontmatter` para `BlogArticle` */
export function staticToBlogArticle(
  fm: ArticleFrontmatter,
  content: string
): BlogArticle {
  return {
    id: `static_${fm.slug}`,
    slug: fm.slug,
    title: fm.title,
    description: fm.description,
    content,
    author: fm.author,
    reviewer: fm.reviewer,
    category: fm.category,
    keywords: fm.keywords ?? [],
    relatedArticles: fm.relatedArticles ?? [],
    sources: fm.sources ?? [],
    status: 'published',
    publishedAt: fm.publishedAt,
    createdAt: fm.publishedAt,
    updatedAt: fm.updatedAt ?? fm.publishedAt,
  };
}
