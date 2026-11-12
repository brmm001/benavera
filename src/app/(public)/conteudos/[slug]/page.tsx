import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, User, CheckCircle, ExternalLink } from 'lucide-react';
import { getPublicArticle as fetchArticle, getPublicArticles } from '@/lib/published-content';
import { ArticleMarkdown } from '@/components/ArticleMarkdown';
import { SITE_URL, ORGANIZATION_ID, jsonLd as serializeJsonLd, isoDate } from '@/lib/seo';
import { ArticleCard } from '@/components/ArticleCard';
import { CATEGORY_LABELS } from '@/types';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

// Revalidar a página a cada 1 hora (ISR)
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return {};

  const canonicalUrl = `https://www.benavera.com.br/conteudos/${slug}`;

  return {
    title: (article.seoTitle || article.title).replace(/\s*[|–—-]\s*Benavera\s*$/i, ''),
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
      images: [`${SITE_URL}/og-image.png`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`${SITE_URL}/og-image.png`],
      title: article.seoTitle || article.title,
      description: article.description,
    },
  };
}

export async function generateStaticParams() {
  return (await getPublicArticles()).map(({ slug }) => ({ slug }));
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await fetchArticle(slug);

  if (!article) {
    notFound();
  }

  const allArticles = await getPublicArticles();
  const explicit = article.relatedArticles || [];
  const related = allArticles
    .filter(a => a.slug !== article.slug && (explicit.includes(a.slug) || a.category === article.category))
    .sort((a, b) => Number(explicit.includes(b.slug)) - Number(explicit.includes(a.slug)))
    .slice(0, 3);

  const categoryLabel = CATEGORY_LABELS[article.category] || 'Conteúdo';
  
  const published = isoDate(article.publishedAt || article.createdAt);
  const updated = isoDate(article.updatedAt);
  const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(date));
  const publishDate = published ? formatDate(published) : 'Data não informada';
  const updateDate = updated ? formatDate(updated) : null;

  // JSON-LD SEO Generation
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    author: {
      '@type': article.author === 'Equipe Benavera' ? 'Organization' : 'Person',
      name: article.author,
      url: `${SITE_URL}/equipe-editorial`,
      ...(article.author === 'Equipe Benavera' ? { '@id': `${SITE_URL}/equipe-editorial#team` } : {}),
    },
    datePublished: published,
    dateModified: updated || published,
    inLanguage: 'pt-BR',
    image: `${SITE_URL}/og-image.png`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.benavera.com.br/conteudos/${article.slug}`,
    },
    publisher: {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
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
                <Link href="/equipe-editorial">{article.author}</Link>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Calendar size={14} />
                Publicado em: <time dateTime={published}>{publishDate}</time>
              </span>
              {updated && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Atualizado em: <time dateTime={updated}>{updateDate}</time>
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
                <ArticleMarkdown content={article.content} />
              ) : (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Conteúdo em elaboração.</p>
              )}

              <aside style={{ marginTop: '2rem', padding: '1.25rem', background: '#eef2ff', borderRadius: 12 }}>
                <strong>Condições atuais da Benavera</strong>
                <p style={{ margin: '0.5rem 0', lineHeight: 1.6 }}>Para clínicas: taxa de 5% por operação, sem mensalidade ou adesão. Até 36 parcelas, conforme análise e modalidade. Exemplos educativos deste artigo não substituem uma proposta.</p>
                <Link href="/condicoes" style={{ color: '#3730a3', textDecoration: 'underline' }}>Consultar taxas, repasse e condições</Link>
              </aside>
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
                  href={article.category === 'para-clinicas' ? '/credenciamento' : '/simular'}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
                >
                  {article.category === 'para-clinicas' ? 'Cadastrar minha clínica' : 'Simular meu tratamento'}
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
