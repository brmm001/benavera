import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Parcelamento de Procedimentos Estéticos e Dermatológicos | Benavera',
  description:
    'Saiba como parcelar harmonização facial, bioestimuladores de colágeno, botox, peelings e cirurgias estéticas de forma planejada e sem comprometer sua renda.',
  alternates: { canonical: 'https://www.benavera.com.br/parcelamento-procedimento-estetico' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Parcelamento de Procedimentos Estéticos | Benavera',
    description: 'Alternativas de pagamento para estética médica e odontológica.',
    url: 'https://www.benavera.com.br/parcelamento-procedimento-estetico',
    type: 'article',
  },
};

const faqItems = [
  {
    question: 'Quais procedimentos estéticos podem ser parcelados?',
    answer:
      'Harmonização facial e orofacial, aplicação de toxina botulínica (Botox), preenchimento com ácido hialurônico, bioestimuladores de colágeno (Radiesse, Sculptra), tecnologias a laser e procedimentos cirúrgicos corporais/faciais.',
  },
  {
    question: 'Vale a pena parcelar procedimentos que exigem manutenção periódica?',
    answer:
      'Para procedimentos de manutenção semestral ou anual (como botox), o ideal é manter as parcelas dentro do período de efeito para não acumular parcelamentos sobrepostos.',
  },
  {
    question: 'Posso parcelar pacotes completos de tratamento estético?',
    answer:
      'Sim. Clínicas e profissionais costumam montar protocolos anuais ou semestrais, cujo valor total pode ser financiado ou parcelado.',
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

export default function ParcelamentoEsteticoPage() {
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
              { label: 'Parcelamento Procedimento Estético' },
            ]}
          />

          <div style={{ maxWidth: '680px', marginTop: '1.5rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
              Estética e Harmonização
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
              Parcelamento de procedimentos estéticos
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#475569',
                lineHeight: '1.75',
                marginBottom: '2rem',
              }}
            >
              Realize tratamentos estéticos faciais e corporais com planejamento financeiro.
              Descubra alternativas de parcelamento que não sobrecarregam seu orçamento mensal.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/simular" className="btn-primary">
                Simular procedimento
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
                Como planejar o pagamento de procedimentos estéticos?
              </h2>
              <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.75', margin: 0 }}>
                Procedimentos de harmonização facial, bioestimuladores e protocolos estéticos podem ser pagos via <strong>cartão de crédito em até 10x ou 12x</strong> ou através de <strong>parcelamento estendido especializado em saúde e estética</strong>. A chave é ajustar a parcela para que termine antes do próximo ciclo de manutenção do procedimento.
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
              Principais procedimentos atendidos
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
                  <strong style={{ color: '#0f172a' }}>Harmonização Facial e Preenchimentos:</strong>{' '}
                  Ácido hialurônico em lábios, mandíbula, malar e olheiras.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>Bioestimuladores e Tecnologias:</strong>{' '}
                  Estímulo de colágeno com produtos injetáveis e aparelhos de ultrassom microfocado.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>Cirurgias Plásticas e Reparadoras:</strong>{' '}
                  Rinoplastia, blefaroplastia, mamoplastia e lipoaspiração.
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
                Recomendamos também:
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
                    href="/conteudos/entrada-maior-ou-parcela-menor"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Entrada maior ou parcela menor: como decidir?
                  </Link>
                </li>
                <li>
                  <Link
                    href="/calculadoras"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Simule os valores de parcela em nossa calculadora
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
              Dúvidas frequentes sobre procedimentos estéticos
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
                Planeje seu tratamento estético com tranquilidade
              </h3>
              <Link href="/simular" className="btn-primary" style={{ display: 'inline-flex' }}>
                Simular procedimento estético
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
