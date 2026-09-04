import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getBlogArticles } from '@/lib/blog-db';
import { articles as staticArticles } from '@/content/articles';

// Cache de 1 hora
export const revalidate = 3600;

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'llms.txt');
    let baseContent = await fs.readFile(filePath, 'utf-8');

    // Buscar artigos do DB
    const dbArticles = await getBlogArticles({ status: 'published' });
    const dbSlugs = new Set(dbArticles.map(a => a.slug));
    
    // Merge com estáticos
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

    if (allArticles.length > 0) {
      baseContent += '\n\n## Artigos e Guias Publicados\n';
      for (const article of allArticles) {
        baseContent += `- **${article.title}**\n`;
        baseContent += `  Resumo: ${article.description}\n`;
        baseContent += `  URL: https://www.benavera.com.br/conteudos/${article.slug}\n`;
      }
    }

    return new NextResponse(baseContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    return new NextResponse('# Benavera\nhttps://www.benavera.com.br', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
