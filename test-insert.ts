import { createBlogArticle } from './src/lib/blog-db';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
  console.log('DB URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
  const art = await createBlogArticle({
    slug: 'teste-' + Date.now(),
    title: 'Teste',
    description: 'Teste',
    content: 'Teste',
    author: 'Teste',
    category: 'tratamentos-e-custos',
    keywords: [],
    relatedArticles: [],
    sources: [],
    status: 'draft',
  } as any);
  console.log(art);
}

main().catch(console.error);
