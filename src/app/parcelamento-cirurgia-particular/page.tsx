import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Parcelamento de Cirurgia Particular | Benavera',
  description:
    'Como pagar ou parcelar cirurgias particulares eletivas, ortopédicas, vasculares e gerais sem plano de saúde ou fora da rede credenciada.',
  alternates: { canonical: 'https://www.benavera.com.br/parcelamento-cirurgia-particular' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Parcelamento de Cirurgia Particular | Benavera',
    description: 'Alternativas de parcelamento para cirurgias particulares.',
    url: 'https://www.benavera.com.br/parcelamento-cirurgia-particular',
    type: 'article',
  },
};

const faqItems = [
  {
    question: 'Quais cirurgias particulares podem ser parceladas?',
    answer:
      'Cirurgias eletivas programadas, como cirurgias ortopédicas (joelho, ombro, quadril), ginecológicas, urológicas, vasculares (varizes), otorrinolaringológicas e gerais (hérnias, vesícula).',
  },
  {
    question: 'O que normalmente está incluso no orçamento cirúrgico particular?',
    answer:
      'Um orçamento cirúrgico completo inclui: honorários da equipe médica (cirurgião, auxiliares e instrumentador), honorários do anestesista, diária e taxa de sala cirúrgica do hospital, além de materiais especiais (OPME) e medicamentos.',
  },
  {
    question: 'Consigo parcelar as despesas do hospital e dos médicos juntos?',
    answer:
      'Em muitas soluções de financiamento para saúde, sim. O valor global do procedimento é consolidado em uma única operação de parcelamento.',
  },
  {
    question: 'A aprovação do parcelamento é rápida?',
    answer:
      'Para cirurgias eletivas, a análise de crédito costuma levar de algumas horas a poucos dias úteis após o envio das informações.',
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

export default function ParcelamentoCirurgiaPage() {
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
              { label: 'Parcelamento Cirurgia Particular' },
            ]}
          />

          <div style={{ maxWidth: '680px', marginTop: '1.5rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
              Guia de Cirurgias Eletivas
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
              Parcelamento de cirurgia particular
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#475569',
                lineHeight: '1.75',
                marginBottom: '2rem',
              }}
            >
              Precisa realizar uma cirurgia particular e não tem o valor total à vista? Conheça as
              formas de parcelar os custos hospitalares e a equipe médica.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/simular" className="btn-primary">
                Simular cirurgia
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
                Como funciona o pagamento de cirurgias particulares?
              </h2>
              <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.75', margin: 0 }}>
                Cirurgias particulares somam taxas hospitalares, anestesia e honorários médicos. Para não adiar um procedimento importante para sua saúde, é possível utilizar <strong>financiamento médico estruturado em até 36x a 48x</strong>, ou combinar <strong>cartão de crédito + entrada</strong> para compor o valor exigido pelo hospital e pelos cirurgiões.
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
              O que compõe o custo de uma cirurgia particular
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
                  <strong style={{ color: '#0f172a' }}>Honorários da Equipe Médica:</strong> Cirurgião
                  principal, médicos auxiliares e instrumentador cirúrgico.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>Equipe de Anestesiologia:</strong> Consulta
                  pré-anestésica e honorários durante todo o ato cirúrgico e recuperação pós-anestésica.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2
                  size={20}
                  style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong style={{ color: '#0f172a' }}>Hospital e OPME:</strong> Diária de internação,
                  uso do centro cirúrgico, medicamentos e órteses, próteses ou materiais especiais.
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
                Conteúdos complementares:
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
                    Como avaliar o Custo Efetivo Total (CET) antes de contratar
                  </Link>
                </li>
                <li>
                  <Link
                    href="/conteudos/como-planejar-pagamento-tratamento-alto-valor"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Planejamento financeiro para procedimentos cirúrgicos
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
              Perguntas frequentes sobre cirurgias particulares
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
                Simule as condições para sua cirurgia particular
              </h3>
              <Link href="/simular" className="btn-primary" style={{ display: 'inline-flex' }}>
                Simular cirurgia particular
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
