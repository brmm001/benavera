import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Parcelamento de cirurgia oftalmológica',
  description:
    'Entenda como parcelar cirurgias oftalmológicas como catarata e correção refrativa a laser. Simule alternativas de pagamento com segurança.',
  alternates: { canonical: 'https://www.benavera.com.br/parcelamento-cirurgia-oftalmologica' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Parcelamento de cirurgia oftalmológica',
    description: 'Entenda como parcelar cirurgias oftalmológicas como catarata e correção refrativa a laser.',
    url: 'https://www.benavera.com.br/parcelamento-cirurgia-oftalmologica',
    type: 'article',
  },
};

const faqItems = [
  {
    question: 'Quais cirurgias oftalmológicas são mais parceladas?',
    answer:
      'Cirurgia refrativa a laser para correção de miopia, astigmatismo e hipermetropia (LASIK e PRK), cirurgia de catarata com lentes intraoculares trifocais ou tóricas, e cirurgias de ceratocone (Crosslinking e anel de Ferrara).',
  },
  {
    question: 'O plano de saúde cobre cirurgia de miopia?',
    answer:
      'Os planos cobrem cirurgia refrativa apenas sob critérios específicos da ANS (geralmente miopia moderada a alta associada ou não a astigmatismo). Casos fora da diretriz precisam ser realizados de forma particular.',
  },
  {
    question: 'Posso parcelar o valor dos dois olhos juntos?',
    answer:
      'Sim. O orçamento consolidado para ambos os olhos pode ser simulado e parcelado em um único contrato.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function ParcelamentoOftalmologicaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ===== HERO ===== */}
      <section
        style={{
          paddingTop: '8rem',
          paddingBottom: '4rem',
          background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera">
          <Breadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Parcelamento Cirurgia Oftalmológica' },
            ]}
          />

          <div style={{ maxWidth: '680px', marginTop: '1.5rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
              Saúde Ocular e Cirurgias
            </span>
            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.15',
                letterSpacing: '-0.025em',
                marginBottom: '1.25rem',
              }}
            >
              Parcelamento de cirurgia oftalmológica
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#475569',
                lineHeight: '1.75',
                marginBottom: '2rem',
              }}
            >
              Livre-se dos óculos de grau ou trate a catarata com lentes modernas. Conheça as opções
              de parcelamento para procedimentos oftalmológicos particulares.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/simular" className="btn-primary">
                Simular cirurgia oftalmológica
                <ArrowRight size={16} />
              </Link>
              <Link href="/calculadoras" className="btn-ghost">
                Calcular parcelas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CORPO ===== */}
      <section style={{ padding: '4.5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Box Resposta Direta */}
            <div
              style={{
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '3rem',
              }}
            >
              <span className="section-label" style={{ color: '#4040ca' }}>
                Resposta Rápida
              </span>
              <h2
                style={{
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: '0.5rem 0 1rem',
                }}
              >
                Como pagar cirurgia de miopia ou catarata?
              </h2>
              <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.75', margin: 0 }}>
                Cirurgias refrativas (LASIK/PRK) e procedimentos de catarata são realizados em clínicas oftalmológicas especializadas. O parcelamento pode ser feito em <strong>até 12x no cartão de crédito</strong> ou através de <strong>crédito para procedimentos de saúde em prazos de até 24x ou 36x</strong>, viabilizando parcelas mensais confortáveis.
              </p>
            </div>

            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '1.25rem',
              }}
            >
              Procedimentos oftalmológicos frequentes
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                marginBottom: '3rem',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>Cirurgia Refrativa a Laser (LASIK / PRK / SMILE):</strong>{' '}
                  Indicada para correção definitiva de miopia, astigmatismo e hipermetropia.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>Cirurgia de Catarata com Lentes Premium:</strong>{' '}
                  Substituição do cristalino opaco por lentes intraoculares que também corrigem a visão para perto e longe.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>Tratamento para Ceratocone:</strong>{' '}
                  Crosslinking da córnea e implante de anéis intracorneanos (Anel de Ferrara).
                </div>
              </div>
            </div>

            {/* Links Relacionados */}
            <div
              style={{
                background: '#f0f4ff',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '3.5rem',
              }}
            >
              <p style={{ fontWeight: '700', color: '#2f3181', marginBottom: '0.75rem' }}>
                Conteúdos recomendados:
              </p>
              <ul
                style={{
                  paddingLeft: '1.25rem',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <li>
                  <Link
                    href="/conteudos/como-comparar-formas-pagamento-tratamento"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Como comparar formas de pagamento pelo Custo Efetivo Total
                  </Link>
                </li>
                <li>
                  <Link
                    href="/conteudos/como-planejar-pagamento-tratamento-alto-valor"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Planejamento financeiro para procedimentos particulares
                  </Link>
                </li>
              </ul>
            </div>

            {/* FAQ */}
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '1.25rem',
              }}
            >
              Perguntas frequentes
            </h2>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '3.5rem',
              }}
            >
              {faqItems.map((item, i) => (
                <details
                  key={i}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    background: '#fafafa',
                  }}
                >
                  <summary
                    style={{
                      fontWeight: '600',
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {item.question}
                  </summary>
                  <p
                    style={{
                      margin: '0.75rem 0 0',
                      color: '#475569',
                      lineHeight: '1.7',
                      fontSize: '0.9375rem',
                    }}
                  >
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <FinancialDisclaimer />
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '1rem',
                }}
              >
                Pronto para simular seu procedimento ocular?
              </h3>
              <Link href="/simular" className="btn-primary" style={{ display: 'inline-flex' }}>
                Simular cirurgia oftalmológica
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
