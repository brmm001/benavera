import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, TrendingUp, Users, ShieldCheck, Zap } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Soluções financeiras para clínicas',
  description:
    'Apoio financeiro e alternativas de parcelamento para pacientes em clínicas médicas e odontológicas. Reduza a desistência de novos tratamentos.',
  alternates: { canonical: 'https://www.benavera.com.br/solucoes-financeiras-para-clinicas' },
  robots: { index: true, follow: true },
  openGraph: {
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
      'Não há custo fixo de adesão para clínicas participantes da fase inicial da Benavera. A proposta é apoiar a clínica no fechamento de procedimentos que seriam perdidos.',
  },
  {
    question: 'A clínica assume risco de inadimplência do paciente?',
    answer:
      'Não. As soluções de parcelamento estruturado são viabilizadas diretamente por parceiros financeiros credenciados, sem que a clínica arque com risco de crédito ou cobrança.',
  },
  {
    question: 'Como a equipe da clínica apresenta a Benavera ao paciente?',
    answer:
      'Quando o paciente manifesta objeção ao valor da parcela ou limite do cartão, a equipe compartilha um link direto ou QR Code para que o paciente faça uma simulação neutra e personalizada.',
  },
  {
    question: 'Quanto tempo leva para começar a usar?',
    answer:
      'O cadastro é simplificado e leva menos de 5 minutos. Uma vez cadastrada, a clínica recebe o material de orientação e o link para atendimento.',
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
              Soluções financeiras para clínicas não perderem orçamentos
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
                href="/clinicas#formulario"
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
                Apresentar um orçamento odontológico ou médico de R$ 5.000 a R$ 30.000 e ouvir "vou pensar" é o maior ralo de receita das clínicas. A Benavera atua no exato momento da objeção financeira, oferecendo ao paciente um caminho simplificado de simulação de parcelas sem exigir burocracia ou risco financeiro da clínica.
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
                  Zero Risco de Crédito
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                  A clínica não vira banco, não emite carnê próprio e não assume risco de cobrança.
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
                  Implementação Imediata
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6', margin: 0 }}>
                  Sem integrações de software pesadas. Link e material pronto para uso imediato no balcão e WhatsApp.
                </p>
              </div>
            </div>

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
                href="/clinicas#formulario"
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
