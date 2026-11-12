import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, TrendingUp, Users, ShieldCheck, Zap } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Soluções financeiras para clínicas',
  description:
    'Compare cartão, boleto próprio, financiamento e antecipação para clínicas: custos, fluxo de caixa, análise e responsabilidades de cada alternativa.',
  alternates: { canonical: 'https://www.benavera.com.br/solucoes-financeiras-para-clinicas' },
  robots: { index: true, follow: true },
  openGraph: {
    images: ['https://www.benavera.com.br/og-image.png'],
    title: 'Soluções financeiras para clínicas',
    description: 'Apoio financeiro e alternativas de pagamento para pacientes em clínicas médicas e odontológicas.',
    url: 'https://www.benavera.com.br/solucoes-financeiras-para-clinicas',
    type: 'article',
  },
};

const faqItems = [
  {
    question: 'A clínica precisa pagar mensalidade ou taxa de adesão?',
    answer:
      'Na Benavera, a taxa da clínica é de 5% por operação, sem mensalidade ou adesão. Essa taxa não representa os juros do paciente. Confira as condições da proposta antes de contratar.',
  },
  {
    question: 'A clínica assume risco de inadimplência do paciente?',
    answer:
      'A responsabilidade depende da modalidade e do contrato. Confira quem concede o crédito, quem cobra e se existe coobrigação, além das regras de cancelamento e contestação.',
  },
  {
    question: 'Como a equipe da clínica apresenta a Benavera ao paciente?',
    answer:
      'Quando o paciente manifesta objeção ao valor da parcela ou limite do cartão, a equipe compartilha um link direto ou QR Code para que o paciente faça uma simulação neutra e personalizada.',
  },
  {
    question: 'Quanto tempo leva para começar a usar?',
    answer:
      'A clínica preenche o cadastro e envia os documentos no ambiente protegido. O uso depende da análise e da ativação. O cadastro inicial não equivale à aprovação ou à liberação imediata de crédito.',
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

export default function SolucoesClinicasPage() {
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
          background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
          color: 'white',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div className="container-benavera">
          <Breadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Soluções Financeiras para Clínicas' },
            ]}
          />

          <div style={{ maxWidth: '700px', marginTop: '1.5rem' }}>
            <span
              className="badge"
              style={{
                background: 'rgba(129, 149, 248, 0.15)',
                color: '#a5b9fc',
                border: '1px solid rgba(129, 149, 248, 0.3)',
                marginBottom: '1rem',
                display: 'inline-block',
              }}
            >
              Para Gestores e Clínicas
            </span>
            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                fontWeight: '800',
                color: 'white',
                lineHeight: '1.15',
                letterSpacing: '-0.025em',
                marginBottom: '1.25rem',
              }}
            >
              Cartão, boleto ou financiamento: o que comparar na clínica
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#cbd5e1',
                lineHeight: '1.75',
                marginBottom: '2rem',
              }}
            >
              O paciente quer realizar o tratamento, mas as formas de pagamento disponíveis na
              clínica não funcionam para ele. A Benavera é a ponte para viabilizar orçamentos de alto
              valor.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                href="/credenciamento"
                className="btn-primary"
                style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
              >
                Quero conhecer para minha clínica
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/clinicas"
                className="btn-ghost"
                style={{ color: '#e2e8f0', borderColor: '#334155' }}
              >
                Saiba como funciona
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CORPO ===== */}
      <section style={{ padding: '4.5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Resposta Direta */}
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
                Visão Geral
              </span>
              <h2
                style={{
                  fontSize: '1.375rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: '0.5rem 0 1rem',
                }}
              >
                Como a Benavera transforma a conversão de orçamentos?
              </h2>
              <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.75', margin: 0 }}>
                Uma alternativa de pagamento pode ajudar quando o orçamento não cabe no limite do cartão ou na entrada disponível. Compare o valor líquido, o prazo de recebimento, o custo para o paciente e as obrigações da clínica. A Benavera intermedeia alternativas de crédito, sujeitas à análise e às condições da operação.
              </p>
            </div>

            {/* Pilares */}
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '1.5rem',
              }}
            >
              Benefícios para sua clínica
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3.5rem',
              }}
            >
              <div
                style={{
                  background: '#fafafa',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    background: '#f0f4ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4040ca',
                    marginBottom: '1rem',
                  }}
                >
                  <TrendingUp size={20} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                  Maior Conversão
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                  Resgate pacientes decididos clinicamente que travavam apenas na forma de pagamento.
                </p>
              </div>

              <div
                style={{
                  background: '#fafafa',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    background: '#f0f4ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4040ca',
                    marginBottom: '1rem',
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                  Responsabilidades definidas
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                  Confira no contrato o responsável pelo crédito, pela cobrança e pelo risco, incluindo regras para cancelamento e contestação.
                </p>
              </div>

              <div
                style={{
                  background: '#fafafa',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    background: '#f0f4ff',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4040ca',
                    marginBottom: '1rem',
                  }}
                >
                  <Zap size={20} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                  Cadastro digital
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                  Envie o cadastro e os documentos no portal. A utilização começa após análise, ativação e orientação da equipe.
                </p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Diferenças entre as alternativas de pagamento</h2>
            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table className="acquisition-table">
                <thead><tr><th>Alternativa</th><th>Como funciona</th><th>O que conferir</th></tr></thead>
                <tbody>
                  <tr><td>Cartão</td><td>Usa o limite do paciente e a estrutura da adquirente.</td><td>Taxa, antecipação, prazo de recebimento e contestação.</td></tr>
                  <tr><td>Boleto próprio</td><td>A clínica concede o prazo e recebe conforme os pagamentos.</td><td>Entrada, fluxo de caixa, cobrança e risco de inadimplência.</td></tr>
                  <tr><td>Financiamento</td><td>A instituição analisa o paciente e apresenta uma proposta de crédito.</td><td>Juros, CET, valor líquido, repasse e responsabilidades contratuais.</td></tr>
                  <tr><td>Antecipação de recebíveis</td><td>Antecipa valores de vendas já realizadas.</td><td>Desconto, recebíveis elegíveis, garantias e prazo. Não é uma nova aprovação de crédito ao paciente.</td></tr>
                </tbody>
              </table>
            </div>
            <p style={{ lineHeight: 1.8, marginBottom: '3rem' }}>Na Benavera, a condição comercial da clínica é <strong>5% por operação, sem mensalidade ou adesão</strong>. O parcelamento pode chegar a 36 vezes, conforme análise e modalidade. <Link href="/condicoes" style={{ textDecoration: 'underline' }}>Consulte taxas e condições</Link> e <Link href="/benavera-ou-capim" style={{ textDecoration: 'underline' }}>os critérios para comparar Benavera e Capim</Link>.</p>

            {/* Artigos B2B */}
            <div
              style={{
                background: '#f0f4ff',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '3.5rem',
              }}
            >
              <p style={{ fontWeight: '700', color: '#2f3181', marginBottom: '0.75rem' }}>
                Conteúdos de gestão para clínicas:
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
                    href="/conteudos/como-clinicas-melhorar-conversao-orcamentos"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Como clínicas odontológicas podem melhorar a taxa de conversão
                  </Link>
                </li>
                <li>
                  <Link
                    href="/conteudos/por-que-pacientes-desistem-apos-orcamento"
                    style={{ color: '#4040ca', textDecoration: 'underline' }}
                  >
                    Por que pacientes desistem após o orçamento e como evitar
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
              Dúvidas frequentes de clínicas
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
                Cadastre sua clínica na Benavera
              </h3>
              <Link
                href="/credenciamento"
                className="btn-primary"
                style={{ display: 'inline-flex' }}
              >
                Cadastrar clínica agora
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
