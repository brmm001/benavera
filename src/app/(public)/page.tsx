import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Building2, Users, CreditCard, TrendingUp, User } from 'lucide-react';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';
import { ArticleCard } from '@/components/ArticleCard';
import { articles } from '@/content/articles';

export const metadata: Metadata = {
  title: {
    absolute: 'Benavera | Infraestrutura financeira para clínicas e pacientes',
  },
  description:
    'A Benavera conecta clínicas a soluções de financiamento para pacientes, aumentando conversão de orçamentos. Para pacientes: simulação gratuita de parcelamento de tratamentos particulares.',
  alternates: { canonical: 'https://www.benavera.com.br' },
};

const faqItems = [
  {
    question: 'O que é a Benavera?',
    answer:
      'A Benavera é uma plataforma B2B2C que conecta clínicas a soluções financeiras para pacientes. Para clínicas, oferece proposta digital, CRM e gestão de crédito. Para pacientes, conecta a opções viáveis de parcelamento para tratamentos particulares.',
  },
  {
    question: 'A Benavera é para clínicas ou para pacientes?',
    answer:
      'Para ambos. Para clínicas: aumenta a taxa de conversão de orçamentos, oferece proposta digital e acompanha o paciente até o fechamento. Para pacientes: conecta a alternativas de parcelamento compatíveis com seu orçamento.',
  },
  {
    question: 'A simulação garante que vou conseguir crédito?',
    answer:
      'Não. A simulação serve para você entender o que precisaria e consultar se existem opções compatíveis. Qualquer concessão de crédito depende da análise e dos critérios do parceiro financeiro responsável.',
  },
  {
    question: 'Preciso já ter escolhido uma clínica?',
    answer:
      'Não. Você pode simular mesmo antes de ter um orçamento fechado. Se já tiver o orçamento em mãos, informe o valor para ter uma simulação mais precisa.',
  },
  {
    question: 'A simulação tem algum custo?',
    answer: 'Não. A simulação inicial é totalmente gratuita para o paciente.',
  },
  {
    question: 'Posso desistir depois de simular?',
    answer:
      'Sim. Fazer a simulação não gera nenhuma obrigação de contratação. Você avalia as condições com total liberdade antes de qualquer decisão.',
  },
  {
    question: 'Quanto custa para a clínica usar a Benavera?',
    answer:
      'Estamos em fase de expansão com clínicas parceiras. Entre em contato pelo formulário de credenciamento para conhecer as condições disponíveis nesta fase.',
  },
];

const clinicBenefits = [
  {
    icon: TrendingUp,
    title: 'Mais orçamentos viram tratamentos',
    desc: 'Ofereça condições de parcelamento que o paciente consegue pagar. Reduza a perda por restrições financeiras.',
  },
  {
    icon: CreditCard,
    title: 'Proposta digital em minutos',
    desc: 'Crie e envie propostas por WhatsApp ou link. O paciente recebe, analisa e avança sem sair de casa.',
  },
  {
    icon: Users,
    title: 'CRM e acompanhamento',
    desc: 'Acompanhe cada paciente desde o orçamento até o repasse. Sem planilha, sem papel.',
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

const treatments = [
  { label: 'Odontologia', href: '/parcelamento-tratamento-odontologico' },
  { label: 'Implantes e próteses', href: '/financiamento-implante-dentario' },
  { label: 'Cirurgias particulares', href: '/parcelamento-cirurgia-particular' },
  { label: 'Oftalmologia', href: '/parcelamento-cirurgia-oftalmologica' },
  { label: 'Estética', href: '/parcelamento-procedimento-estetico' },
  { label: 'Outros tratamentos', href: '/simular' },
];

export default function HomePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const featuredArticles = articles.slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ===== HERO B2C (padrao SEO, H1 canonico) ===== */}
      <section
        className="hero-section"
        style={{
          paddingTop: '8rem',
          paddingBottom: '5rem',
          background: '#fafafa',
          borderBottom: '1px solid #e2e8f0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div className="container-benavera">
          <div className="grid-lg-2" style={{ alignItems: 'center' }}>
            {/* Left: Copy */}
            <div>
              <span
                className="section-label"
                style={{
                  color: '#3730a3',
                  marginBottom: '0.875rem',
                  display: 'inline-block',
                  fontWeight: '700',
                }}
              >
                Alternativas de pagamento para tratamentos particulares
              </span>

              <h1
                style={{
                  fontSize: 'clamp(2.125rem, 5vw, 3.375rem)',
                  fontWeight: '800',
                  lineHeight: '1.12',
                  color: '#0f172a',
                  letterSpacing: '-0.035em',
                  marginBottom: '1.25rem',
                  maxWidth: '540px',
                }}
              >
                Recebeu um orçamento e a parcela ficou pesada?
              </h1>

              <p
                style={{
                  fontSize: 'clamp(1.0625rem, 2vw, 1.1875rem)',
                  color: '#334155',
                  lineHeight: '1.65',
                  marginBottom: '0.75rem',
                  maxWidth: '500px',
                  fontWeight: '600',
                }}
              >
                Seu tratamento pode caber nos seus planos.
              </p>

              <p
                style={{
                  fontSize: 'clamp(0.9375rem, 1.8vw, 1.0625rem)',
                  color: '#64748b',
                  lineHeight: '1.7',
                  marginBottom: '2.25rem',
                  maxWidth: '480px',
                }}
              >
                Informe o valor do procedimento, quanto tem de entrada e quanto consegue pagar por mês.
                A Benavera busca alternativas compatíveis com seu orçamento.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.875rem',
                  marginBottom: '2.25rem',
                }}
              >
                <Link
                  href="/simular"
                  id="hero-cta-patient"
                  className="btn-primary"
                  style={{ fontSize: '1rem', padding: '0.9375rem 1.875rem' }}
                >
                  Simular meu tratamento
                  <ArrowRight size={17} />
                </Link>
                <Link href="/como-funciona" id="hero-cta-secondary" className="btn-ghost">
                  Como funciona
                </Link>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {[
                  'Simulação gratuita',
                  'Você decide antes de contratar',
                ].map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: '0.8125rem',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: '#309e92',
                        flexShrink: 0,
                        display: 'inline-block',
                      }}
                    />
                    {item}
                  </span>
                ))}
              </div>

              {/* Link B2B discreto — sem competir com H1 B2C */}
              <Link
                href="/clinicas"
                id="hero-clinic-link"
                className="link-muted"
                style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Building2 size={13} />
                Tem uma clínica? Conheça a Benavera para clínicas
                <ArrowRight size={13} />
              </Link>
            </div>

            {/* Right: Simulation example card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '2rem',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
                  width: '100%',
                  maxWidth: '380px',
                }}
              >
                <span className="section-label" style={{ marginBottom: '1.5rem', display: 'block' }}>
                  Exemplo de simulação
                </span>

                <div className="narrative-block">
                  <div className="narrative-row">
                    <span className="narrative-row-label">Tratamento</span>
                    <span className="narrative-row-value">R$ 12.000</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-row-label">Entrada disponível</span>
                    <span className="narrative-row-value">R$ 2.000</span>
                  </div>
                  <div className="narrative-row">
                    <span className="narrative-row-label">Valor a financiar</span>
                    <span className="narrative-row-value">R$ 10.000</span>
                  </div>
                  <div
                    className="narrative-row"
                    style={{ borderBottom: 'none', paddingBottom: '0.25rem' }}
                  >
                    <span className="narrative-row-label">Quer pagar até</span>
                    <span className="narrative-row-value highlight">R$ 500/mês</span>
                  </div>
                </div>

                <Link
                  href="/simular"
                  id="hero-card-cta"
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1.75rem' }}
                >
                  Ver alternativas
                  <ArrowRight size={16} />
                </Link>

                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                    marginTop: '1rem',
                    lineHeight: '1.5',
                  }}
                >
                  Simulação inicial. Condições reais dependem da análise.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARA CLINICAS — Nova secao B2B ===== */}
      <section
        style={{
          padding: '5rem 0',
          background: '#0f172a',
          borderTop: '1px solid #1e293b',
        }}
      >
        <div className="container-benavera">
          <div className="grid-lg-2" style={{ alignItems: 'center', gap: '4rem' }}>
            <div>
              <span className="section-label" style={{ color: '#8195f8' }}>Para clínicas de saúde e odontologia</span>
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 4vw, 2.625rem)',
                  fontWeight: '800',
                  lineHeight: '1.15',
                  letterSpacing: '-0.025em',
                  color: 'white',
                  margin: '0 0 1.25rem',
                }}
              >
                Mais tratamentos aprovados. Mais receita para sua clínica.
              </h2>
              <p style={{ fontSize: '1.0625rem', color: '#94a3b8', lineHeight: '1.75', margin: '0 0 2rem' }}>
                Ofereça novas formas de pagamento, acompanhe seus pacientes e transforme mais orçamentos em tratamentos realizados com a Benavera.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
                <Link
                  href="/clinicas"
                  id="b2b-hero-cta"
                  className="btn-primary"
                  style={{ gap: '0.5rem' }}
                >
                  <Building2 size={16} />
                  Credenciar minha clínica
                </Link>
                <Link href="/solucoes-financeiras-para-clinicas" id="b2b-hero-secondary" className="btn-ghost" style={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.15)' }}>
                  Saber mais
                </Link>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1rem',
              }}
            >
              {clinicBenefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.title}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1.125rem',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(99,112,241,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8195f8',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: '700', color: 'white', marginBottom: '0.25rem' }}>{b.title}</div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.6' }}>{b.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUAL TRATAMENTO ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '680px', marginBottom: '2.5rem' }}>
            <span className="section-label">Tratamentos cobertos</span>
            <h2
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.125rem)',
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: '-0.025em',
                lineHeight: '1.25',
                margin: '0 0 1rem',
              }}
            >
              Qual tratamento você está buscando?
            </h2>
            <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: '1.7', margin: 0 }}>
              A Benavera atende diferentes tipos de procedimentos particulares. Veja se o seu está aqui.
            </p>
          </div>

          <ul className="treatment-list" aria-label="Categorias de tratamento">
            {treatments.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  id={`treatment-${t.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: '2.5rem' }}>
            <Link
              href="/simular"
              id="treatments-cta"
              className="btn-secondary"
              style={{ display: 'inline-flex' }}
            >
              Meu tratamento não está listado
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SITUAÇÃO REAL ===== */}
      <section
        style={{
          padding: '5rem 0',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera">
          <div className="grid-lg-2" style={{ alignItems: 'center', gap: '4rem' }}>
            {/* Left: Narrative numbers */}
            <div>
              <span className="section-label">Como funciona na prática</span>
              <h2
                style={{
                  fontSize: 'clamp(1.625rem, 3.5vw, 2.375rem)',
                  fontWeight: '800',
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  lineHeight: '1.2',
                  margin: '0 0 1.25rem',
                }}
              >
                Você tem o orçamento.
                <br />
                Agora precisa descobrir como pagar.
              </h2>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#64748b',
                  lineHeight: '1.75',
                  margin: '0 0 2.5rem',
                }}
              >
                A Benavera organiza essas informações e verifica se existem alternativas de
                pagamento compatíveis com o que você pode pagar por mês.
              </p>
              <Link href="/simular" id="scenario-cta" className="btn-primary">
                Simular com meu orçamento
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Right: Narrative data block */}
            <div
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '2rem 2.25rem',
              }}
            >
              <div className="narrative-block">
                <div className="narrative-row">
                  <span className="narrative-row-label">Tratamento odontológico</span>
                  <span className="narrative-row-value">R$ 15.000</span>
                </div>
                <div className="narrative-row">
                  <span className="narrative-row-label">Entrada disponível</span>
                  <span className="narrative-row-value">R$ 3.000</span>
                </div>
                <div className="narrative-row">
                  <span className="narrative-row-label">Quer pagar até</span>
                  <span className="narrative-row-value highlight">R$ 600/mês</span>
                </div>
              </div>
              <div
                style={{
                  marginTop: '1.75rem',
                  padding: '1rem 1.25rem',
                  background: '#f0f4ff',
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  color: '#2f3181',
                  lineHeight: '1.6',
                }}
              >
                A Benavera usa essas informações para verificar quais caminhos existem e apresentar os
                que fizerem sentido para você.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ marginBottom: '3.5rem' }}>
            <span className="section-label">Passo a passo</span>
            <h2
              style={{
                fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)',
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: '-0.025em',
                lineHeight: '1.25',
                margin: '0',
                maxWidth: '480px',
              }}
            >
              Três passos. Sem burocracia.
            </h2>
          </div>

          <div className="steps-inline">
            {[
              {
                n: '01',
                title: 'Informe o tratamento e o valor',
                desc: 'Escolha o tipo de procedimento e diga quanto custa, ou faça uma estimativa.',
              },
              {
                n: '02',
                title: 'Diga quanto consegue pagar',
                desc: 'Informe a entrada disponível e o valor máximo de parcela mensal.',
              },
              {
                n: '03',
                title: 'Veja as alternativas disponíveis',
                desc: 'A Benavera mostra os caminhos compatíveis. Você decide se quer avançar.',
              },
            ].map((item) => (
              <div key={item.n} className="step-inline-item">
                <span className="step-inline-number">{item.n}</span>
                <h3 className="step-inline-title">{item.title}</h3>
                <p className="step-inline-desc">{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '3.5rem' }}>
            <Link href="/simular" id="steps-cta" className="btn-primary">
              Começar agora
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== POR QUE A BENAVERA ===== */}
      <section
        style={{
          padding: '5.5rem 0',
          background: '#0f172a',
          color: 'white',
          borderTop: '1px solid #1e293b',
        }}
      >
        <div className="container-benavera">
          <div style={{ maxWidth: '680px' }}>
            <span className="section-label" style={{ color: '#8195f8' }}>
              Por que a Benavera existe
            </span>

            <h2
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: '800',
                lineHeight: '1.2',
                letterSpacing: '-0.025em',
                margin: '0 0 2rem',
                color: 'white',
              }}
            >
              O tratamento certo não deveria parar na hora de pagar.
            </h2>

            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                color: '#94a3b8',
                lineHeight: '1.8',
                margin: '0 0 1.5rem',
              }}
            >
              Muitas pessoas chegam à etapa do orçamento, querem fazer o tratamento, mas percebem
              que o parcelamento disponível na clínica não cabe no seu bolso. A venda à vista está
              fora de cogitação. O plano de saúde não cobre.
            </p>

            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                color: '#94a3b8',
                lineHeight: '1.8',
                margin: '0 0 2.5rem',
              }}
            >
              A Benavera foi criada para esse momento. Não prometemos aprovação, não garantimos
              taxas. Mas organizamos a sua situação e verificamos se existem alternativas que façam
              sentido para o seu orçamento.
            </p>

            <div
              style={{
                padding: '1.25rem 1.5rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                color: '#cbd5e1',
                lineHeight: '1.65',
              }}
            >
              A simulação não tem custo e não gera compromisso. Você vê as condições antes de
              qualquer decisão.
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTEÚDOS ===== */}
      <section
        style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}
      >
        <div className="container-benavera">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: '2.5rem',
            }}
          >
            <div>
              <span className="section-label">Conteúdos</span>
              <h2
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: '800',
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  margin: 0,
                }}
              >
                Entenda antes de decidir.
              </h2>
            </div>
            <Link
              href="/conteudos"
              style={{
                fontSize: '0.9375rem',
                fontWeight: '600',
                color: '#4040ca',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                flexShrink: 0,
              }}
            >
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {featuredArticles.map((article) => (
              <ArticleCard key={article.slug} {...article} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem' }}>
              <span className="section-label">Perguntas frequentes</span>
              <h2
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: '800',
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  margin: 0,
                }}
              >
                Dúvidas comuns
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: 'white',
                    overflow: 'hidden',
                  }}
                >
                  <summary
                    style={{
                      padding: '1.125rem 1.375rem',
                      fontWeight: '600',
                      fontSize: '0.9375rem',
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      listStyle: 'none',
                      userSelect: 'none',
                      gap: '1rem',
                    }}
                  >
                    {item.question}
                    <ChevronDown size={17} style={{ flexShrink: 0, color: '#94a3b8' }} />
                  </summary>
                  <div
                    style={{
                      padding: '0 1.375rem 1.125rem',
                      fontSize: '0.9375rem',
                      color: '#475569',
                      lineHeight: '1.75',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '1rem',
                    }}
                  >
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section
        style={{
          padding: '5rem 0',
          background: 'white',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera">
          <div className="grid-lg-2" style={{ gap: '3rem', alignItems: 'flex-start' }}>
            {/* Paciente */}
            <div>
              <h2
                style={{
                  fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)',
                  fontWeight: '800',
                  lineHeight: '1.2',
                  letterSpacing: '-0.025em',
                  color: '#0f172a',
                  margin: '0 0 1rem',
                }}
              >
                Já sabe quanto custa seu tratamento?
              </h2>
              <p
                style={{
                  fontSize: '1.0625rem',
                  color: '#64748b',
                  lineHeight: '1.7',
                  margin: '0 0 2rem',
                }}
              >
                Informe o valor e descubra quanto ficaria por mês.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <Link
                  href="/simular"
                  id="footer-cta-patient"
                  className="btn-primary"
                  style={{ fontSize: '1rem', padding: '0.9375rem 1.875rem' }}
                >
                  Simular agora
                  <ArrowRight size={17} />
                </Link>
                <FinancialDisclaimer compact />
              </div>
            </div>

            {/* Clínica */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '2rem',
              }}
            >
              <span className="section-label" style={{ marginBottom: '0.875rem' }}>Para clínicas</span>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  margin: '0 0 0.75rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Transforme orçamentos em tratamentos realizados.
              </h3>
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: '#64748b',
                  lineHeight: '1.65',
                  margin: '0 0 1.5rem',
                }}
              >
                Proposta digital, crédito para pacientes e acompanhamento do início ao repasse.
              </p>
              <Link
                href="/clinicas"
                id="footer-cta-clinic"
                className="btn-secondary"
                style={{ display: 'inline-flex', gap: '0.5rem' }}
              >
                <Building2 size={15} />
                Conhecer a Benavera para clínicas
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
