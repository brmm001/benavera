import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, User, CheckCircle, ExternalLink } from 'lucide-react';
import { getBlogArticleBySlug, staticToBlogArticle, getPublishedSlugs, getBlogArticles } from '@/lib/blog-db';
import { getArticleBySlug as getStaticArticleBySlug, articleContent as staticArticleContent } from '@/content/articles';
import { ArticleCard } from '@/components/ArticleCard';
import { CATEGORY_LABELS } from '@/types';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

// Revalidar a página a cada 1 hora (ISR)
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

async function fetchArticle(slug: string) {
  // Tenta DB primeiro
  const dbArticle = await getBlogArticleBySlug(slug);
  if (dbArticle && dbArticle.status === 'published') {
    return dbArticle;
  }
  // Fallback para estático
  const staticArticle = getStaticArticleBySlug(slug);
  if (staticArticle) {
    const content = staticArticleContent[slug] ?? '';
    return staticToBlogArticle(staticArticle, content);
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return {};

  const canonicalUrl = `https://www.benavera.com.br/conteudos/${slug}`;

  return {
    title: article.seoTitle || article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title: article.seoTitle || article.title,
      description: article.description,
      type: 'article',
      url: canonicalUrl,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seoTitle || article.title,
      description: article.description,
    },
  };
}

export async function generateStaticParams() {
  const { articles: staticArticles } = await import('@/content/articles');
  const dbSlugs = await getPublishedSlugs();
  const staticSlugs = staticArticles.map(a => a.slug);
  const allSlugs = Array.from(new Set([...dbSlugs, ...staticSlugs]));
  return allSlugs.map(slug => ({ slug }));
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
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid #e2e8f0' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                    <span dangerouslySetInnerHTML={{ __html: renderInline(cell) }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Ignorar separadores de tabela (|---|---|)
    if (line.match(/^\|(?:-+|:?-+:?|\|)+\|$/)) {
      i++;
      continue;
    }

    // Tabela
    if (line.startsWith('|')) {
      inTable = true;
      tableLines.push(line);
      i++;
      continue;
    } else if (inTable) {
      flushTable();
      inTable = false;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#0f172a',
            marginTop: '2rem',
            marginBottom: '1rem',
            lineHeight: '1.4',
            letterSpacing: '-0.01em',
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: renderInline(line.replace('### ', '')) }} />
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            color: '#0f172a',
            marginTop: '2.5rem',
            marginBottom: '1rem',
            lineHeight: '1.3',
            letterSpacing: '-0.02em',
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: renderInline(line.replace('## ', '')) }} />
        </h2>
      );
    }
    // Listas
    else if (line.startsWith('- ')) {
      const listItems = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        listItems.push(lines[i].replace('- ', ''));
        i++;
      }
      elements.push(
        <ul
          key={i}
          style={{
            margin: '1rem 0',
            paddingLeft: '1.25rem',
            color: '#334155',
            lineHeight: '1.7',
            fontSize: '1.0625rem',
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '0.5rem' }}>
              <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            </li>
          ))}
        </ul>
      );
      continue; // Não incrementa 'i' aqui, pois o while já o fez
    }
    // Parágrafos
    else {
      elements.push(
        <p
          key={i}
          style={{
            fontSize: '1.0625rem',
            lineHeight: '1.7',
            color: '#334155',
            marginBottom: '1.25rem',
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
        </p>
      );
    }
    i++;
  }
  if (inTable) flushTable();

  return elements;
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticle(slug);

  if (!article) {
    notFound();
  }

  // Related articles fetching
  let related: any[] = [];
  if (article.relatedArticles && article.relatedArticles.length > 0) {
    const promises = article.relatedArticles.map(async (rSlug) => {
      const rel = await fetchArticle(rSlug);
      if (rel) {
        return {
          title: rel.title,
          slug: rel.slug,
          description: rel.description,
          category: rel.category,
        };
      }
      return null;
    });
    const results = await Promise.all(promises);
    related = results.filter(Boolean);
  } else {
    // Busca 3 da mesma categoria se não tiver related específicos
    const allArticles = await getBlogArticles({ status: 'published', category: article.category, limit: 4 });
    related = allArticles
      .filter(a => a.slug !== article.slug)
      .slice(0, 3)
      .map(a => ({ title: a.title, slug: a.slug, description: a.description, category: a.category }));
    
    // Fallback pra static se precisar
    if (related.length < 3) {
      const { articles: staticArticles } = await import('@/content/articles');
      const staticRelated = staticArticles
        .filter(a => a.category === article.category && a.slug !== article.slug)
        .slice(0, 3 - related.length)
        .map(a => ({ title: a.title, slug: a.slug, description: a.description, category: a.category }));
      related = [...related, ...staticRelated];
    }
  }

  const categoryLabel = CATEGORY_LABELS[article.category] || 'Conteúdo';
  
  // Format dates
  const publishDate = article.publishedAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(article.publishedAt))
    : 'Data não informada';
    
  const updateDate = article.updatedAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(article.updatedAt))
    : null;

  // JSON-LD SEO Generation
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt || article.publishedAt || article.createdAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.benavera.com.br/conteudos/${article.slug}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Benavera',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.benavera.com.br/icon.svg',
      },
    },
  };

  // Detect FAQs from Markdown for rich snippets
  const faqs: { question: string; answer: string }[] = [];
  const lines = article.content.split('\n');
  let currentQ = '';
  let currentA = '';
  let inFaqSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toLowerCase().includes('perguntas frequentes') && line.startsWith('##')) {
      inFaqSection = true;
      continue;
    }
    if (inFaqSection) {
      if (line.startsWith('## ') || line.startsWith('### ')) {
        inFaqSection = false; // Next section started
      } else if (line.startsWith('**') && line.endsWith('?**')) {
        if (currentQ && currentA) {
          faqs.push({ question: currentQ, answer: currentA.trim() });
          currentA = '';
        }
        currentQ = line.replace(/\*\*/g, '');
      } else if (currentQ && line) {
        currentA += line + ' ';
      }
    }
  }
  if (currentQ && currentA) {
    faqs.push({ question: currentQ, answer: currentA.trim() });
  }

  const faqJsonLd = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      }
    }))
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* ===== HEADER DO ARTIGO ===== */}
      <section
        style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '4rem 0 3rem',
        }}
      >
        <div className="container-benavera">
          <div style={{ maxWidth: '800px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <Breadcrumb
                items={[
                  { label: 'Conteúdos', href: '/conteudos' },
                  { label: categoryLabel },
                ]}
              />
            </div>

            <h1
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.15',
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
              }}
            >
              {article.title}
            </h1>

            <p
              style={{
                fontSize: '1.125rem',
                color: '#475569',
                lineHeight: '1.6',
                marginBottom: '2rem',
                fontWeight: '400',
              }}
            >
              {article.description}
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1.5rem',
                fontSize: '0.875rem',
                color: '#64748b',
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
              {article.content ? (
                renderContent(article.content)
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
                          {source.title} {source.organization && `— ${source.organization}`}
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
