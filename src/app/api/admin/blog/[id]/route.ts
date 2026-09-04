import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  getBlogArticleById,
  updateBlogArticle,
  deleteBlogArticle,
} from '@/lib/blog-db';

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const article = await getBlogArticleById(id);
  if (!article) return NextResponse.json({ success: false, error: 'Não encontrado.' }, { status: 404 });
  return NextResponse.json({ success: true, article });
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await updateBlogArticle(id, body);
    if (!updated) return NextResponse.json({ success: false, error: 'Artigo não encontrado.' }, { status: 404 });
    revalidatePath('/admin/blog');
    revalidatePath('/conteudos');
    return NextResponse.json({ success: true, article: updated });
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Dados inválidos.' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const ok = await deleteBlogArticle(id);
  if (!ok) return NextResponse.json({ success: false, error: 'Artigo não encontrado.' }, { status: 404 });
  revalidatePath('/admin/blog');
  revalidatePath('/conteudos');
  return NextResponse.json({ success: true });
}
