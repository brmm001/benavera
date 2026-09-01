import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { ClinicLeadForm } from '@/components/ClinicLeadForm';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Benavera para Clínicas | Não perca o tratamento na hora do orçamento',
  description:
    'A Benavera entra quando o paciente quer realizar o tratamento, mas as formas de pagamento disponíveis não funcionam para ele. Saiba como funciona para sua clínica.',
  alternates: { canonical: 'https://benavera.com.br/clinicas' },
};

const faqClinicItems = [
  {
    question: 'O que a Benavera faz exatamente?',
    answer:
      'A Benavera organiza a jornada financeira do paciente que quer realizar um tratamento mas não consegue pagar com as formas disponíveis na clínica. Ela verifica se existem alternativas compatíveis com o orçamento do paciente e, quando fazem sentido, facilita o avanço.',
  },
  {
    question: 'Preciso integrar algum sistema?',
    answer:
      'Não. Para começar, basta um link ou QR Code que sua equipe compartilha com o paciente. Não há implementação técnica complexa na fase inicial.',
  },
  {
    question: 'Quanto custa para a clínica?',
    answer:
      'Nesta fase, estamos trabalhando com clínicas parceiras sem mensalidade e sem custo de implantação. O modelo comercial será definido conforme o produto evolui.',
  },
  {
    question: 'A Benavera garante que o paciente vai fechar?',
    answer:
      'Não. A Benavera cria uma nova alternativa quando a forma de pagamento é o obstáculo. Se existirem caminhos compatíveis, ela os apresenta. A decisão é sempre do paciente.',
  },
];

const faqClinicSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqClinicItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function ClinicasPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqClinicSchema) }}
      />

      {/* ===== HERO ===== */}
      <section
        className="hero-section"
        style={{
          paddingTop: '8rem',
          paddingBottom: '5rem',
          background: '#0f172a',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container-benavera">
          <div style={{ maxWidth: '680px', position: 'relative' }}>

            <h1 style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              fontWeight: '800',
              lineHeight: '1.1',
              letterSpacing: '-0.035em',
              marginBottom: '1.375rem',
              color: 'white',
            }}>
              Não perca o tratamento na hora do orçamento.
            </h1>

            <p style={{
              fontSize: 'clamp(1.0625rem, 2vw, 1.25rem)',
              color: '#94a3b8',
              lineHeight: '1.7',
              marginBottom: '2.5rem',
              maxWidth: '560px',
            }}>
              A Benavera entra quando o paciente quer realizar o tratamento,
              mas as formas de pagamento disponíveis não funcionam para ele.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', marginBottom: '3rem' }}>
              <Link
                href="#contato"
                id="hero-clinic-cta"
                className="btn-primary"
                style={{
                  background: 'white',
                  color: '#0f172a',
                  fontSize: '1rem',
                  padding: '0.9375rem 1.875rem',
                }}
              >
                Quero oferecer a Benavera
                <ArrowRight size={17} />
              </Link>
              <Link
                href="#como-funciona"
                className="btn-ghost"
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#94a3b8' }}
              >
                Como funciona
              </Link>
            </div>

            <div style={{
              display: 'inline-block',
              padding: '0.75rem 1.25rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              color: '#64748b',
              lineHeight: '1.6',
            }}>
              Nesta fase, trabalhamos com clínicas parceiras sem mensalidade
              e sem custo de implantação.
            </div>
          </div>
        </div>
      </section>

      {/* ===== O PROBLEMA ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
            <span className="section-label">O momento que você conhece bem</span>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.025em',
              lineHeight: '1.2',
              margin: '0 0 1.25rem',
            }}>
              Você investiu para levar o paciente até o orçamento.
            </h2>
            <p style={{
              fontSize: '1.0625rem',
              color: '#64748b',
              lineHeight: '1.75',
              margin: 0,
            }}>
              Marketing, consulta, avaliação, diagnóstico. O paciente quer fazer o tratamento.
              Gostou. Confia na clínica. Mas na hora de fechar, a forma de pagamento disponível
              não cabe no orçamento dele. E a venda se perde.
            </p>
          </div>

          {/* Fluxo tipográfico */}
          <div className="grid-lg-2" style={{ gap: '3rem', alignItems: 'start' }}>

            {/* Sem Benavera */}
            <div>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#ef4444',
                marginBottom: '1.5rem',
              }}>
                Como acontece hoje
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { text: 'Paciente chega', last: false },
                  { text: 'Faz a avaliação', last: false },
                  { text: 'Recebe o orçamento', last: false },
                  { text: 'Quer fechar', last: false },
                  { text: 'Forma de pagamento não funciona', last: true },
                ].map((item, i, arr) => (
                  <div key={item.text}>
                    <div style={{
                      padding: '0.875rem 1.125rem',
                      background: item.last ? '#fef2f2' : '#f8fafc',
                      borderRadius: '10px',
                      fontSize: '0.9375rem',
                      color: item.last ? '#dc2626' : '#475569',
                      fontWeight: item.last ? '600' : '400',
                      border: `1px solid ${item.last ? '#fecaca' : '#f1f5f9'}`,
                    }}>
                      {item.text}
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: '1px', height: '10px', background: '#e2e8f0', marginLeft: '1.25rem' }} />
                    )}
                  </div>
                ))}
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.875rem 1.125rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  fontWeight: '700',
                  color: '#dc2626',
                  textAlign: 'center',
                }}>
                  Venda perdida
                </div>
              </div>
            </div>

            {/* Com Benavera */}
            <div>
              <div style={{
                fontSize: '0.6875rem',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#309e92',
                marginBottom: '1.5rem',
              }}>
                Com a Benavera
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { text: 'Paciente chega', last: false },
                  { text: 'Recebe o orçamento', last: false },
                  { text: 'Pagamento é uma objeção', last: false },
                  { text: 'Clínica indica a Benavera', last: false },
                  { text: 'Paciente consulta alternativas', last: true },
                ].map((item, i, arr) => (
                  <div key={item.text}>
                    <div style={{
                      padding: '0.875rem 1.125rem',
                      background: item.last ? '#f0faf8' : '#f8fafc',
                      borderRadius: '10px',
                      fontSize: '0.9375rem',
                      color: item.last ? '#1e6560' : '#475569',
                      fontWeight: item.last ? '600' : '400',
                      border: `1px solid ${item.last ? '#b4e6de' : '#f1f5f9'}`,
                    }}>
                      {item.text}
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: '1px', height: '10px', background: '#e2e8f0', marginLeft: '1.25rem' }} />
                    )}
                  </div>
                ))}
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.875rem 1.125rem',
                  background: '#f0faf8',
                  border: '1px solid #b4e6de',
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  fontWeight: '700',
                  color: '#1e6560',
                  textAlign: 'center',
                }}>
                  Nova chance de fechamento
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== O QUE MUDA ===== */}
      <section
        id="como-funciona"
        style={{
          padding: '5rem 0',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera">
          <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
            <span className="section-label">O que muda para sua clínica</span>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.375rem)',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.025em',
              lineHeight: '1.2',
              margin: 0,
            }}>
              Mais alternativas quando o paciente precisa.
            </h2>
          </div>

          {/* Lista tipográfica — sem cards com ícones */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '0',
            maxWidth: '900px',
          }}>
            {[
              {
                title: 'Recuperação de orçamentos',
                desc: 'Crie um caminho específico para pacientes que não avançaram por causa do pagamento.',
              },
              {
                title: 'Sem complexidade para a equipe',
                desc: 'Sua equipe indica a Benavera com um link ou QR Code. Sem treinamento extenso.',
              },
              {
                title: 'Visibilidade sobre o que está perdendo',
                desc: 'Saiba quantas oportunidades chegam até a Benavera e o que acontece com cada uma.',
              },
              {
                title: 'Reativação de leads',
                desc: 'Pacientes que saíram sem fechar podem ser recontactados quando novas alternativas surgirem.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                style={{
                  padding: '1.75rem 2rem',
                  borderBottom: i < 2 ? '1px solid #e2e8f0' : 'none',
                  borderRight: i % 2 === 0 ? '1px solid #e2e8f0' : 'none',
                }}
              >
                <h3 style={{
                  fontSize: '1.0625rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: '0 0 0.625rem',
                  letterSpacing: '-0.01em',
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '0.9375rem',
                  color: '#64748b',
                  lineHeight: '1.65',
                  margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMO COMEÇAR ===== */}
      <section style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ marginBottom: '3.5rem' }}>
            <span className="section-label">Para começar</span>
            <h2 style={{
              fontSize: 'clamp(1.625rem, 3.5vw, 2.25rem)',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.025em',
              lineHeight: '1.25',
              margin: '0',
              maxWidth: '480px',
            }}>
              Simples do começo ao fim.
            </h2>
          </div>

          <div className="steps-inline" style={{ maxWidth: '900px' }}>
            {[
              {
                n: '01',
                title: 'Cadastro da clínica',
                desc: 'Conversa inicial com nossa equipe e configuração básica. Sem implementação técnica.',
              },
              {
                n: '02',
                title: 'Link ou QR Code',
                desc: 'Sua equipe compartilha com pacientes na recepção, no WhatsApp ou após o orçamento.',
              },
              {
                n: '03',
                title: 'Paciente simula',
                desc: 'Ele informa o valor e quanto consegue pagar. A Benavera verifica as alternativas.',
              },
              {
                n: '04',
                title: 'Você acompanha',
                desc: 'Recebe informações sobre utilização e resultados conforme o produto avança.',
              },
            ].map((item) => (
              <div key={item.n} className="step-inline-item">
                <span className="step-inline-number">{item.n}</span>
                <h3 className="step-inline-title">{item.title}</h3>
                <p className="step-inline-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem' }}>
              <span className="section-label">Perguntas frequentes</span>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: '-0.025em',
                margin: 0,
              }}>
                O que queremos saber antes de ligar
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {faqClinicItems.map((item) => (
                <details
                  key={item.question}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: 'white',
                    overflow: 'hidden',
                  }}
                >
                  <summary style={{
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
                  }}>
                    {item.question}
                    <ChevronDown size={17} style={{ flexShrink: 0, color: '#94a3b8' }} />
                  </summary>
                  <div style={{
                    padding: '0 1.375rem 1.125rem',
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

      {/* ===== FORMULÁRIO ===== */}
      <section id="contato" style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div className="grid-lg-2-asymmetric" style={{ alignItems: 'start' }}>

            {/* Left: Copy */}
            <div style={{ position: 'sticky', top: '5.5rem' }}>
              <span className="section-label">Primeiro contato</span>
              <h2 style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.375rem)',
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: '-0.025em',
                lineHeight: '1.2',
                margin: '0 0 1.25rem',
              }}>
                Fale com nossa equipe.
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#64748b',
                lineHeight: '1.75',
                margin: '0 0 2rem',
              }}>
                Preencha o formulário e entramos em contato para entender
                como sua clínica trabalha e se existe aderência ao modelo.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'Seleção cuidadosa de clínicas para o piloto',
                  'Sem compromisso após a conversa',
                  'Nesta fase: sem mensalidade, sem custo de implantação',
                ].map((item) => (
                  <div key={item} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem',
                    fontSize: '0.9375rem',
                    color: '#475569',
                    lineHeight: '1.5',
                  }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#309e92',
                      flexShrink: 0,
                      marginTop: '0.5rem',
                    }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Form */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: 'clamp(1.5rem, 4vw, 2.25rem)',
            }}>
              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.0625rem', fontWeight: '700', color: '#0f172a' }}>
                  Dados da clínica
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                  Campos com <span style={{ color: '#ef4444' }}>*</span> são obrigatórios.
                </p>
              </div>
              <ClinicLeadForm />
            </div>
          </div>
        </div>
      </section>

      <FinancialDisclaimer />
    </>
  );
}

