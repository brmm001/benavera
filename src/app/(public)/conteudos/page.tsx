import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getBlogArticles } from '@/lib/blog-db';
import { articles as staticArticles } from '@/content/articles';
import { ArticleCard } from '@/components/ArticleCard';
import { CATEGORY_LABELS } from '@/types';
import type { ArticleCategory } from '@/types';

// Revalidar a cada 1 hora (ISR)
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Conteúdos e guias sobre tratamentos',
  description:
    'Artigos e guias práticos sobre planejamento financeiro e formas de pagamento para tratamentos de saúde. Informação clara para sua decisão.',
  alternates: { canonical: 'https://www.benavera.com.br/conteudos' },
};

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Conteúdos e guias sobre tratamentos | Benavera',
  description:
    'Artigos e guias práticos sobre planejamento financeiro e formas de pagamento para tratamentos de saúde.',
  url: 'https://www.benavera.com.br/conteudos',
};

const CATEGORIES: ArticleCategory[] = [
  'formas-de-pagamento',
  'planejamento-financeiro',
  'tratamentos-e-custos',
  'para-clinicas',
];

export default async function ConteudosPage() {
  // Buscar artigos do BD
  const dbArticles = await getBlogArticles({ status: 'published' });

  // Merge estáticos com BD (evitando duplicação de slug)
  const allArticles = [...dbArticles];
  const dbSlugs = new Set(dbArticles.map(a => a.slug));
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

  // Ordenar por data mais recente
  allArticles.sort((a, b) => {
    const dA = new Date(a.publishedAt || a.createdAt).getTime();
    const dB = new Date(b.publishedAt || b.createdAt).getTime();
    return dB - dA;
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionSchema),
        }}
      />
      {/* ===== HERO ===== */}
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '4rem',
        background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '620px' }}>
            <span className="section-tag" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
              Conteúdos
            </span>
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: '1.15',
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}>
              Informação prática sobre pagamento de tratamentos
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: '#475569',
              lineHeight: '1.75',
              maxWidth: '520px',
            }}>
              Artigos claros e sem jargão sobre formas de pagamento, planejamento financeiro
              e o que considerar antes de contratar qualquer solução.
            </p>
          </div>
        </div>
      </section>

      {/* ===== TODOS OS ARTIGOS ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">

          {/* Artigos em destaque */}
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: '1.375rem',
              fontWeight: '700',
              color: '#0f172a',
              marginBottom: '1.5rem',
              letterSpacing: '-0.01em',
            }}>
              Artigos recentes
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}>
              {allArticles.slice(0, 6).map((article) => (
                <ArticleCard key={article.slug} {...article} />
              ))}
            </div>
          </div>

          {/* Por categoria */}
          {CATEGORIES.map((category) => {
            const categoryArticles = allArticles.filter((a) => a.category === category);
            if (categoryArticles.length === 0) return null;
            return (
              <div key={category} style={{ marginBottom: '3.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}>
                  <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}>
                    {CATEGORY_LABELS[category]}
                  </h2>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                }}>
                  {categoryArticles.map((article) => (
                    <ArticleCard key={article.slug} {...article} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{
        padding: '5rem 0',
        background: 'linear-gradient(160deg, #1c1d4c 0%, #2f3181 60%, #1c1d4c 100%)',
        color: 'white',
      }}>
        <div className="container-benavera" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: '800',
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
          }}>
            Pronto para entender suas possibilidades?
          </h2>
          <p style={{
            fontSize: '1.0625rem',
            color: '#a5b9fc',
            marginBottom: '2.5rem',
            maxWidth: '480px',
            margin: '0 auto 2.5rem',
            lineHeight: '1.75',
          }}>
            Faça uma simulação gratuita e sem compromisso.
          </p>
          <Link href="/simular" className="btn-primary" style={{
            background: 'white',
            color: '#2f3181',
          }}>
            Simular possibilidades
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
