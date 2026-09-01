import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, User, CheckCircle, ExternalLink } from 'lucide-react';
import { getArticleBySlug, getRelatedArticles, articleContent } from '@/content/articles';
import { ArticleCard } from '@/components/ArticleCard';
import { CATEGORY_LABELS } from '@/types';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const canonicalUrl = `https://www.benavera.com.br/conteudos/${slug}`;

  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      url: canonicalUrl,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
    },
  };
}

export async function generateStaticParams() {
  const { articles } = await import('@/content/articles');
  return articles.map((a) => ({ slug: a.slug }));
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// Renderiza markdown simples como HTML semântico com tabelas e listas
function renderContent(content: string) {
  const lines = content.trim().split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let tableLines: string[] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableLines.length < 2) return;
    const headers = tableLines[0]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const rows = tableLines
      .slice(2)
      .map((row) =>
        row
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    elements.push(
      <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '1.75rem 0' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9375rem',
          }}
        >
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {headers.map((h, hi) => (
                <th
                  key={hi}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: '700',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? 'white' : '#f8fafc' }}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      padding: '0.75rem 1rem',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
    inTable = false;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table
    if (line.startsWith('|')) {
      inTable = true;
      tableLines.push(line);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
            fontWeight: '700',
            color: '#0f172a',
            marginTop: '2.5rem',
            marginBottom: '1rem',
            letterSpacing: '-0.015em',
          }}
        >
          {line.replace('## ', '')}
        </h2>
      );
    }
    // H3
    else if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: '1.125rem',
            fontWeight: '700',
            color: '#0f172a',
            marginTop: '2rem',
            marginBottom: '0.75rem',
          }}
        >
          {line.replace('### ', '')}
        </h3>
      );
    }
    // Bullet list
    else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].replace(/^- /, ''));
        i++;
      }
      elements.push(
        <ul
          key={`ul-${i}`}
          style={{
            paddingLeft: '1.5rem',
            margin: '0.75rem 0 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          {items.map((item, ii) => (
            <li
              key={ii}
              style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.65' }}
              dangerouslySetInnerHTML={{ __html: renderInline(item) }}
            />
          ))}
        </ul>
      );
      continue;
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          style={{
            paddingLeft: '1.5rem',
            margin: '0.75rem 0 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          {items.map((item, ii) => (
            <li
              key={ii}
              style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.65' }}
              dangerouslySetInnerHTML={{ __html: renderInline(item) }}
            />
          ))}
        </ol>
      );
      continue;
    }
    // Paragraph
    else if (line.trim() !== '') {
      elements.push(
        <p
          key={i}
          style={{
            fontSize: '0.9375rem',
            color: '#475569',
            lineHeight: '1.75',
            margin: '0 0 1rem',
          }}
          dangerouslySetInnerHTML={{ __html: renderInline(line) }}
        />
      );
    }

    i++;
  }

  if (inTable) flushTable();

  return elements;
}

const articleSchema = (article: ReturnType<typeof getArticleBySlug>) => {
  if (!article) return null;
  const url = `https://www.benavera.com.br/conteudos/${article.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    author: {
      '@type': 'Organization',
      name: article.author || 'Equipe Benavera',
      url: 'https://www.benavera.com.br',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Benavera',
      url: 'https://www.benavera.com.br',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.benavera.com.br/logo.png',
      },
    },
  };
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const content = articleContent[slug] || '';
  const related = article.relatedArticles ? getRelatedArticles(article.relatedArticles) : [];

  const publishDate = new Date(article.publishedAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const updateDate = new Date(article.updatedAt).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const schema = articleSchema(article);

  return (
    <>
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}

      {/* ===== HERO ===== */}
      <section
        style={{
          paddingTop: '8rem',
          paddingBottom: '3rem',
          background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera">
          <Breadcrumb
            items={[{ label: 'Conteúdos', href: '/conteudos' }, { label: article.title }]}
          />

          <div style={{ maxWidth: '720px', marginTop: '1.5rem' }}>
            <span
              className="badge badge-blue"
              style={{ marginBottom: '1.25rem', display: 'inline-block' }}
            >
              {CATEGORY_LABELS[article.category]}
            </span>

            <h1
              style={{
                fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                marginBottom: '1.25rem',
              }}
            >
              {article.title}
            </h1>

            <p
              style={{
                fontSize: '1.0625rem',
                color: '#475569',
                lineHeight: '1.75',
                marginBottom: '1.5rem',
                maxWidth: '620px',
              }}
            >
              {article.description}
            </p>

            {/* Metadados E-E-A-T */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                fontSize: '0.875rem',
                color: '#64748b',
                flexWrap: 'wrap',
                paddingTop: '0.5rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <User size={14} style={{ color: '#4040ca' }} />
                {article.author}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Calendar size={14} />
                Publicado em: <time dateTime={article.publishedAt}>{publishDate}</time>
              </span>
              {article.updatedAt && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Atualizado em: <time dateTime={article.updatedAt}>{updateDate}</time>
                </span>
              )}
              {article.reviewer && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    color: '#0284c7',
                    fontWeight: '500',
                  }}
                >
                  <CheckCircle size={14} />
                  {article.reviewer}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTEÚDO ===== */}
      <section style={{ padding: '3.5rem 0 5rem', background: 'white' }}>
        <div className="container-benavera">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '4rem',
              alignItems: 'start',
            }}
          >
            {/* Artigo */}
            <article style={{ maxWidth: '740px' }}>
              {content ? (
                renderContent(content)
              ) : (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Conteúdo em elaboração.</p>
              )}

              {/* Fontes */}
              {article.sources && article.sources.length > 0 && (
                <div
                  style={{
                    marginTop: '3rem',
                    padding: '1.5rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: '0.875rem',
                    }}
                  >
                    Fontes oficiais e referências
                  </p>
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {article.sources.map((source, i) => (
                      <li key={i}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.875rem',
                            color: '#4040ca',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                          }}
                        >
                          {source.title} — {source.organization}
                          <ExternalLink size={12} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Aviso Editorial e Financeiro */}
              <div
                style={{
                  marginTop: '2.5rem',
                  padding: '1.25rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  lineHeight: '1.65',
                }}
              >
                <p style={{ margin: '0 0 0.5rem' }}>
                  <strong>Aviso Editorial:</strong> O conteúdo deste artigo é informativo e não
                  substitui a consulta médica/odontológica ou a orientação financeira individual.
                  Saiba mais em nossa{' '}
                  <Link
                    href="/politica-editorial"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Política Editorial
                  </Link>
                  .
                </p>
                <FinancialDisclaimer compact />
              </div>

              {/* Navegação */}
              <div
                style={{
                  marginTop: '3rem',
                  paddingTop: '2rem',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <Link
                  href="/conteudos"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    color: '#475569',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={16} />
                  Todos os conteúdos
                </Link>
                <Link
                  href="/simular"
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
                >
                  Simular meu tratamento
                  <ArrowRight size={14} />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ===== RELACIONADOS ===== */}
      {related.length > 0 && (
        <section
          style={{ padding: '4rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}
        >
          <div className="container-benavera">
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '1.5rem',
                letterSpacing: '-0.01em',
              }}
            >
              Leitura relacionada
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {related.map((a) => (
                <ArticleCard key={a.slug} {...a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
