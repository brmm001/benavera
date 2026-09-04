import { getBlogArticles } from './src/lib/blog-db';

async function main() {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_1XPh7JtnbqTr@ep-lively-queen-axlifs9v-pooler.c-4.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
  
  const articles = await getBlogArticles();
  console.log(`getBlogArticles retornou ${articles.length} artigos.`);
  if (articles.length === 0) {
     console.log('Isso significa que ocorreu um erro dentro de getBlogArticles!');
  }
}

main().catch(console.error);
