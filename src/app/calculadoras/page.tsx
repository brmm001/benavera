import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ParcelaCalculator, TotalPagoCalculator } from '@/components/CalculadorasClient';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Calculadoras de Pagamento e Parcelamento de Tratamentos',
  description:
    'Use nossas calculadoras para simular estimativas de parcelas e entender o total pago em tratamentos odontológicos, cirurgias e procedimentos de saúde.',
  alternates: { canonical: 'https://www.benavera.com.br/calculadoras' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Calculadoras de Pagamento | Benavera',
    description:
      'Estime parcelas e planeje o pagamento do seu tratamento particular com clareza.',
    url: 'https://www.benavera.com.br/calculadoras',
    type: 'website',
  },
};

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Calculadoras de Pagamento | Benavera',
  url: 'https://www.benavera.com.br/calculadoras',
  description:
    'Ferramentas gratuitas para estimar parcelas e planejar o pagamento de tratamentos particulares.',
  publisher: {
    '@type': 'Organization',
    name: 'Benavera',
    url: 'https://www.benavera.com.br',
  },
};

export default function CalculadorasPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
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
          <div style={{ maxWidth: '620px' }}>
            <span
              className="section-tag"
              style={{ marginBottom: '1.5rem', display: 'inline-block' }}
            >
              Calculadoras
            </span>
            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.15',
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
              }}
            >
              Calculadoras de pagamento
            </h1>
            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                color: '#475569',
                lineHeight: '1.75',
                maxWidth: '520px',
              }}
            >
              Ferramentas simples para estimar parcelas e entender o total pago em um parcelamento.
              Valores são hipotéticos e auxiliam no seu planejamento financeiro.
            </p>
          </div>
        </div>
      </section>

      {/* ===== CALCULADORAS ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem',
              alignItems: 'start',
            }}
          >
            <ParcelaCalculator />
            <TotalPagoCalculator />
          </div>

          <div style={{ marginTop: '3rem', maxWidth: '720px' }}>
            <FinancialDisclaimer />
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section
        style={{
          padding: '4rem 0',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera" style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(1.375rem, 3vw, 1.875rem)',
              fontWeight: '700',
              color: '#0f172a',
              marginBottom: '0.875rem',
              letterSpacing: '-0.02em',
            }}
          >
            Quer entender suas alternativas reais?
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: '#475569',
              marginBottom: '2rem',
              maxWidth: '400px',
              margin: '0 auto 2rem',
              lineHeight: '1.75',
            }}
          >
            Faça uma simulação gratuita e sem compromisso.
          </p>
          <Link href="/simular" className="btn-primary">
            Simular meu tratamento
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
