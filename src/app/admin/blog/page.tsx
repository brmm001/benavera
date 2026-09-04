import { getBlogArticles } from '@/lib/blog-db';
import { BlogManager } from './BlogManager';

// Middleware já garante autenticação
export default async function AdminBlogPage() {
  const articles = await getBlogArticles({ status: 'all' });
  return <BlogManager initialArticles={articles} />;
}
