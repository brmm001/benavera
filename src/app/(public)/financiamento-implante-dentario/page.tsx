import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Financiamento e parcelamento de implante dentário',
  description:
    'Entenda como funciona o parcelamento e financiamento de implantes dentários unitários ou prótese protocolo. Planeje parcelas e opções de pagamento.',
  alternates: { canonical: 'https://www.benavera.com.br/financiamento-implante-dentario' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Financiamento e parcelamento de implante dentário',
    description: 'Alternativas e prazos de parcelamento para implantes e prótese protocolo sobre implantes.',
    url: 'https://www.benavera.com.br/financiamento-implante-dentario',
    type: 'article',
  },
};

const faqItems = [
  {
    question: 'Quanto custa parcelar um implante dentário?',
    answer:
      'O valor depende do tipo de implante (nacional ou importado), necessidade de enxerto ósseo e tipo de prótese (resina, porcelana ou zircônia). Os valores costumam variar de R$ 2.500 por elemento a R$ 15.000+ em protocolos totais.',
  },
  {
    question: 'Posso financiar 100% do implante sem entrada?',
    answer:
      'Em muitas instituições parceiras, sim. No entanto, fornecer uma entrada inicial ajuda a reduzir a taxa de juros e torna as parcelas mensais mais acessíveis.',
  },
  {
    question: 'O plano de saúde ou odontológico cobre implante dentário?',
    answer:
      'A maioria dos planos odontológicos básicos cobre apenas extrações e restaurações, deixando implantes e próteses definitivas de fora por serem considerados procedimentos de alto custo.',
  },
  {
    question: 'O que é prótese protocolo sobre implantes e como parcelar?',
    answer:
      'É a fixação de uma prótese completa sobre implantes para quem perdeu todos os dentes de uma arcada. Por ser um tratamento de valor mais elevado, o parcelamento estendido (de 18 a 36 meses) é a forma mais comum de viabilização.',
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

export default function FinanciamentoImplantePage() {
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
              { label: 'Financiamento Implante Dentário' },
            ]}
          />

          <div style={{ maxWidth: '680px', marginTop: '1.5rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
              Guia de Implantes e Próteses
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
              Financiamento e parcelamento de implante dentário
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#475569',
                lineHeight: '1.75',
                marginBottom: '2rem',
              }}
            >
              Recupere o sorriso e a mastigação sem sufoco no orçamento. Conheça as formas reais de
              parcelar implantes individuais e próteses protocolo no Brasil.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/simular" className="btn-primary">
                Simular implante
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
                Como pagar um implante dentário particular?
              </h2>
              <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.75', margin: 0 }}>
                Implantes dentários envolvem custos com pinos de titânio ou zircônia, enxertos e confecção protética. Por se tratar de um investimento expressivo, as formas mais comuns são: <strong>parcelamento estendido em até 36x</strong> via crédito saúde, <strong>parcelamento no cartão de crédito em 10x ou 12x</strong>, ou <strong>pagamento por etapas cirúrgica e protética</strong>.
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
              Etapas comuns do pagamento de implantes
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
                  <strong style={{ color: '#0f172a' }}>1. Etapa Cirúrgica (Fixação do Pino):</strong>{' '}
                  Geralmente representa 40% a 50% do custo total e é realizada no início do
                  tratamento.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>2. Cicatrização (Osseointegração):</strong>{' '}
                  Período de 3 a 6 meses onde o paciente continua pagando as parcelas mensais sem
                  novos custos cirúrgicos.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>3. Etapa Protética (Dente Definitivo):</strong>{' '}
                  Colocação da coroa ou prótese definitiva sobre o implante cicatrizado.
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
                Leia também:
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
                    href="/conteudos/como-planejar-pagamento-tratamento-alto-valor"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Como planejar o pagamento de tratamentos de alto valor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/parcelamento-tratamento-odontologico"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Guia geral de parcelamento de tratamentos odontológicos
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
              Dúvidas frequentes sobre implantes
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
                Faça uma simulação para seu implante
              </h3>
              <Link href="/simular" className="btn-primary" style={{ display: 'inline-flex' }}>
                Simular implante dentário
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
