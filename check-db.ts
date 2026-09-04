import { getNeonClient } from './src/lib/neon';

async function main() {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_1XPh7JtnbqTr@ep-lively-queen-axlifs9v-pooler.c-4.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
  
  const db = getNeonClient();
  const rows = await db`SELECT id, slug, title FROM blog_articles`;
  console.log(`Encontrados ${rows.length} artigos no banco.`);
  rows.forEach(r => console.log(`- ${r.slug}: ${r.title}`));
}

main().catch(console.error);
