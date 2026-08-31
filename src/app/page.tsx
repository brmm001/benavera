import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Eye, Lock, AlertCircle, ChevronDown } from 'lucide-react';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';
import { ArticleCard } from '@/components/ArticleCard';
import { articles } from '@/content/articles';

export const metadata: Metadata = {
  title: 'Benavera | Possibilidades de pagamento para tratamentos',
  description:
    'Entenda possibilidades de pagamento para seu tratamento ou conheça como a Benavera pode ajudar sua clínica a reduzir orçamentos perdidos.',
  alternates: { canonical: 'https://benavera.com.br/' },
};

const faqItems = [
  {
    question: 'A Benavera é um banco?',
    answer:
      'A Benavera é uma plataforma que organiza a jornada financeira relacionada ao pagamento de tratamentos e pode trabalhar com parceiros responsáveis pela oferta de soluções financeiras.',
  },
  {
    question: 'A simulação garante aprovação?',
    answer:
      'Não. A simulação serve para entender sua necessidade. Qualquer oferta depende dos critérios e condições do parceiro responsável pela análise.',
  },
  {
    question: 'Preciso já ter escolhido uma clínica?',
    answer:
      'Não necessariamente. Caso já tenha um orçamento, ele ajuda a tornar a simulação mais precisa.',
  },
  {
    question: 'A Benavera cobra para fazer a simulação?',
    answer: 'A simulação inicial não possui custo para o usuário.',
  },
  {
    question: 'Posso desistir depois de simular?',
    answer:
      'Sim. Fazer uma simulação não obriga você a contratar uma solução financeira.',
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

export default function HomePage() {
  const featuredArticles = articles.slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ===== HERO ===== */}
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
        borderBottom: '1px solid #e2e8f0',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Decorative blob */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: '-80px',
          right: '-120px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99, 112, 241, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div className="container-benavera">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
          className="lg:grid-cols-2"
          >
            {/* Left: Copy */}
            <div>
              <div className="badge badge-blue" style={{ marginBottom: '1.25rem' }}>
                Programa piloto aberto para clínicas
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: '800',
                lineHeight: '1.15',
                color: '#0f172a',
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
                maxWidth: '560px',
              }}>
                Seu tratamento pode caber nos seus planos.
              </h1>

              <p style={{
                fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
                color: '#475569',
                lineHeight: '1.75',
                marginBottom: '2rem',
                maxWidth: '500px',
              }}>
                A Benavera ajuda você a entender possibilidades de pagamento para realizar
                o tratamento que precisa, de forma simples e transparente.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', marginBottom: '2rem' }}>
                <Link href="/simular" id="hero-cta-patient" className="btn-primary">
                  Simular possibilidades
                  <ArrowRight size={16} />
                </Link>
                <Link href="/clinicas" id="hero-cta-clinic" className="btn-secondary">
                  Tenho uma clínica
                </Link>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                {[
                  'Sem aprovação garantida',
                  'Simulação gratuita',
                  'Você decide antes de contratar',
                ].map((item) => (
                  <div key={item} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#64748b',
                  }}>
                    <CheckCircle2 size={15} style={{ color: '#309e92', flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Simulation preview card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                width: '100%',
                maxWidth: '400px',
              }}>
                <div style={{
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  marginBottom: '1.25rem',
                }}>
                  Exemplo de simulação
                </div>

                {[
                  { label: 'Valor do tratamento', value: 'R$ 12.000', highlight: false },
                  { label: 'Entrada', value: 'R$ 3.000', highlight: false },
                  { label: 'Valor a financiar', value: 'R$ 9.000', highlight: false },
                  { label: 'Parcela desejada', value: 'R$ 450/mês', highlight: true },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.875rem 0',
                    borderBottom: row.highlight ? 'none' : '1px solid #f1f5f9',
                    ...(row.highlight ? {
                      background: '#f0f4ff',
                      margin: '0.5rem -0.5rem -0.5rem',
                      padding: '1rem 0.5rem',
                      borderRadius: '12px',
                    } : {}),
                  }}>
                    <span style={{
                      fontSize: '0.9375rem',
                      color: row.highlight ? '#2f3181' : '#64748b',
                      fontWeight: row.highlight ? '600' : '400',
                    }}>
                      {row.label}
                    </span>
                    <span style={{
                      fontSize: row.highlight ? '1.125rem' : '0.9375rem',
                      fontWeight: row.highlight ? '800' : '600',
                      color: row.highlight ? '#4040ca' : '#0f172a',
                    }}>
                      {row.value}
                    </span>
                  </div>
                ))}

                <Link
                  href="/simular"
                  id="hero-card-cta"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
                >
                  Ver possibilidades
                  <ArrowRight size={16} />
                </Link>

                <p style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  textAlign: 'center',
                  marginTop: '0.875rem',
                  lineHeight: '1.5',
                }}>
                  Simulação inicial. Condições reais dependem da análise e dos parceiros disponíveis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== O PROBLEMA ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
            <span className="section-tag">Por que a Benavera existe</span>
            <h2 className="section-heading">
              O tratamento certo não deveria parar na forma de pagamento.
            </h2>
            <p className="section-subheading">
              Muitas pessoas chegam até a etapa do orçamento e percebem que as formas de pagamento
              disponíveis naquele momento não combinam com sua realidade financeira. A Benavera
              organiza esse processo para tornar as possibilidades mais fáceis de entender.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {[
              {
                num: '01',
                title: 'Entenda seu orçamento',
                desc: 'Veja quanto precisa financiar e qual parcela faria sentido para você.',
              },
              {
                num: '02',
                title: 'Consulte possibilidades',
                desc: 'Organizamos as informações necessárias para consultar alternativas disponíveis.',
              },
              {
                num: '03',
                title: 'Decida com clareza',
                desc: 'Compare as condições antes de assumir qualquer compromisso.',
              },
            ].map((item) => (
              <div key={item.num} className="card-subtle" style={{ position: 'relative' }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '900',
                  color: '#e0eaff',
                  lineHeight: '1',
                  marginBottom: '1rem',
                  letterSpacing: '-0.05em',
                }}>
                  {item.num}
                </div>
                <h3 style={{
                  fontSize: '1.0625rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '0.625rem',
                }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.65', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA PARA PACIENTES ===== */}
      <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 3.5rem' }}>
            <span className="section-tag">Para pacientes</span>
            <h2 className="section-heading">Como funciona</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}>
            {[
              { step: '1', title: 'Conte sobre seu tratamento', desc: 'Informe o valor aproximado e algumas informações básicas.' },
              { step: '2', title: 'Escolha o que cabe no orçamento', desc: 'Informe entrada e parcela desejada.' },
              { step: '3', title: 'Consulte possibilidades', desc: 'A Benavera organiza sua solicitação e verifica caminhos disponíveis.' },
              { step: '4', title: 'Avalie antes de contratar', desc: 'Você conhece as condições antes de decidir.' },
            ].map((item) => (
              <div key={item.step} className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#4040ca',
                  color: 'white',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.125rem',
                  margin: '0 auto 1.25rem',
                }}>
                  {item.step}
                </div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '0.625rem',
                }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.65', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/simular" id="section-cta-patient" className="btn-primary">
              Começar simulação
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== BLOCO CLÍNICAS ===== */}
      <section style={{
        padding: '5rem 0',
        background: '#1c1d4c',
        color: 'white',
      }}>
        <div className="container-benavera">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '3rem',
            alignItems: 'center',
          }}
          className="lg:grid-cols-2"
          >
            <div>
              <span style={{
                display: 'inline-block',
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#8195f8',
                background: 'rgba(129, 149, 248, 0.12)',
                padding: '0.25rem 0.75rem',
                borderRadius: '100px',
                marginBottom: '1.25rem',
              }}>
                Para clínicas
              </span>

              <h2 style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: '800',
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                marginBottom: '1.25rem',
              }}>
                Sua clínica perde pacientes na hora do orçamento?
              </h2>

              <p style={{
                fontSize: '1.0625rem',
                color: '#a5b9fc',
                lineHeight: '1.75',
                marginBottom: '2rem',
              }}>
                A Benavera ajuda sua equipe a criar uma nova alternativa quando o paciente quer
                realizar o tratamento, mas a forma de pagamento impede o fechamento.
              </p>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                {[
                  'Menos orçamentos abandonados',
                  'Processo simples para a equipe',
                  'Novas alternativas financeiras',
                  'Implantação inicial simples',
                  'Piloto sem custo nesta fase',
                ].map((item) => (
                  <li key={item} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9375rem',
                    color: '#e0eaff',
                  }}>
                    <CheckCircle2 size={16} style={{ color: '#83d2c7', flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>

              <Link href="/clinicas" id="section-cta-clinic" className="btn-primary" style={{
                background: 'white',
                color: '#2f3181',
              }}>
                Conhecer Benavera para Clínicas
                <ArrowRight size={16} />
              </Link>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '2rem',
            }}>
              <div style={{
                fontSize: '0.8125rem',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#8195f8',
                marginBottom: '1.5rem',
              }}>
                Programa piloto Benavera
              </div>
              <p style={{
                fontSize: '1.0625rem',
                color: '#e0eaff',
                lineHeight: '1.7',
                marginBottom: '1.5rem',
              }}>
                Estamos selecionando clínicas para participar do programa piloto e construir
                juntos a primeira geração do produto.
              </p>
              <div style={{
                background: 'rgba(129, 149, 248, 0.1)',
                border: '1px solid rgba(129, 149, 248, 0.2)',
                borderRadius: '12px',
                padding: '1.25rem',
                fontSize: '0.9375rem',
                color: '#c7d7fe',
                lineHeight: '1.6',
              }}>
                <strong style={{ color: 'white' }}>Sem mensalidade</strong> e{' '}
                <strong style={{ color: 'white' }}>sem custo de implantação</strong> nesta fase inicial.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRANSPARÊNCIA ===== */}
      <section style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto 3.5rem' }}>
            <span className="section-tag">Confiança</span>
            <h2 className="section-heading">Sem promessas impossíveis.</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}>
            {[
              {
                icon: AlertCircle,
                title: 'Sem aprovação garantida',
                desc: 'Cada proposta depende das condições e critérios do parceiro financeiro.',
              },
              {
                icon: Eye,
                title: 'Você decide',
                desc: 'Nenhuma contratação acontece sem que as condições sejam apresentadas previamente.',
              },
              {
                icon: ShieldCheck,
                title: 'Transparência',
                desc: 'Valores, condições, taxas e custos devem ser conhecidos antes de qualquer contratação.',
              },
              {
                icon: Lock,
                title: 'Privacidade',
                desc: 'Tratamos seus dados com responsabilidade e coletamos apenas o necessário para cada etapa.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: '#f0f4ff',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}>
                    <Icon size={20} style={{ color: '#4040ca' }} />
                  </div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    marginBottom: '0.5rem',
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.65', margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CONTEÚDOS ===== */}
      <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2.5rem',
          }}>
            <div>
              <span className="section-tag">Conteúdos</span>
              <h2 className="section-heading">Entenda melhor antes de decidir.</h2>
            </div>
            <Link href="/conteudos" style={{
              fontSize: '0.9375rem',
              fontWeight: '600',
              color: '#4040ca',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              flexShrink: 0,
            }}>
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}>
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
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span className="section-tag">Perguntas frequentes</span>
              <h2 className="section-heading">Dúvidas comuns</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    background: 'white',
                    overflow: 'hidden',
                  }}
                >
                  <summary style={{
                    padding: '1.25rem 1.5rem',
                    fontWeight: '600',
                    fontSize: '1rem',
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    listStyle: 'none',
                    userSelect: 'none',
                    gap: '1rem',
                  }}>
                    {item.question}
                    <ChevronDown size={18} style={{ flexShrink: 0, color: '#94a3b8' }} />
                  </summary>
                  <div style={{
                    padding: '0 1.5rem 1.25rem',
                    fontSize: '0.9375rem',
                    color: '#475569',
                    lineHeight: '1.75',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '1rem',
                  }}>
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section style={{
        padding: '5rem 0',
        background: 'linear-gradient(135deg, #2f3181 0%, #4040ca 100%)',
        color: 'white',
      }}>
        <div className="container-benavera" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: '800',
            lineHeight: '1.2',
            letterSpacing: '-0.02em',
            marginBottom: '1.25rem',
          }}>
            Pronto para entender suas possibilidades?
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: '#c7d7fe',
            marginBottom: '2.5rem',
            maxWidth: '500px',
            margin: '0 auto 2.5rem',
            lineHeight: '1.7',
          }}>
            Faça uma simulação gratuita e sem compromisso.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/simular" id="footer-cta-patient" className="btn-primary" style={{
              background: 'white',
              color: '#2f3181',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}>
              Simular possibilidades
              <ArrowRight size={16} />
            </Link>
            <Link href="/clinicas" id="footer-cta-clinic" className="btn-secondary" style={{
              borderColor: 'rgba(255,255,255,0.4)',
              color: 'white',
            }}>
              Sou uma clínica
            </Link>
          </div>
          <div style={{ marginTop: '2rem' }}>
            <FinancialDisclaimer compact />
          </div>
        </div>
      </section>
    </>
  );
}
