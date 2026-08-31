'use client';

import Link from 'next/link';
import type { ArticleCategory } from '@/types';
import { CATEGORY_LABELS } from '@/types';
import { ArrowRight } from 'lucide-react';

interface ArticleCardProps {
  title: string;
  slug: string;
  description: string;
  category: ArticleCategory;
  updatedAt: string;
  author: string;
}

export function ArticleCard({ title, slug, description, category, updatedAt, author }: ArticleCardProps) {
  const date = new Date(updatedAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '1.75rem',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      height: '100%',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
    }}
    >
      {/* Category badge */}
      <div style={{ marginBottom: '1rem' }}>
        <span className="badge badge-blue">
          {CATEGORY_LABELS[category]}
        </span>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: '1.0625rem',
        fontWeight: '700',
        color: '#0f172a',
        lineHeight: '1.4',
        marginBottom: '0.75rem',
        flex: 1,
      }}>
        <Link href={`/conteudos/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {title}
        </Link>
      </h2>

      {/* Description */}
      <p style={{
        fontSize: '0.9375rem',
        color: '#475569',
        lineHeight: '1.65',
        marginBottom: '1.25rem',
        flex: 1,
      }}>
        {description}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '1rem',
        borderTop: '1px solid #f1f5f9',
        marginTop: 'auto',
      }}>
        <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
          <span>{author}</span>
          <span style={{ margin: '0 0.375rem' }}>·</span>
          <time dateTime={updatedAt}>{date}</time>
        </div>
        <Link
          href={`/conteudos/${slug}`}
          aria-label={`Ler: ${title}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#4040ca',
            textDecoration: 'none',
            transition: 'gap 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.gap = '0.5rem';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.gap = '0.25rem';
          }}
        >
          Ler <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
