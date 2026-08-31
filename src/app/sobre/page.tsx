import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Target, Eye, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sobre a Benavera',
  description:
    'A Benavera é uma plataforma que organiza a jornada financeira de pacientes que precisam de alternativas para pagar tratamentos, e ajuda clínicas a reduzirem orçamentos perdidos.',
  alternates: { canonical: 'https://benavera.com.br/sobre' },
};

export default function SobrePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '640px' }}>
            <span className="section-tag" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
              Sobre
            </span>
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: '1.15',
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
            }}>
              O que é a Benavera
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: '#475569',
              lineHeight: '1.8',
              maxWidth: '540px',
            }}>
              A Benavera é uma plataforma que organiza a jornada financeira relacionada
              ao pagamento de tratamentos. Atuamos entre pacientes que precisam de
              alternativas de pagamento e clínicas que perdem oportunidades por causa
              de objeções financeiras.
            </p>
          </div>
        </div>
      </section>

      {/* ===== PROPÓSITO ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2rem',
          }}>
            {[
              {
                icon: Target,
                title: 'Nossa missão',
                desc: 'Tornar a jornada financeira de tratamentos mais simples, transparente e acessível para pacientes e clínicas.',
              },
              {
                icon: Eye,
                title: 'Nossa visão',
                desc: 'Um mercado de saúde onde a decisão de tratamento não seja limitada pela falta de alternativas de pagamento adequadas.',
              },
              {
                icon: Heart,
                title: 'Nossos valores',
                desc: 'Transparência sobre o que somos e o que não somos. Honestidade sobre o que a plataforma garante — e o que não garante.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card" style={{ padding: '2rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: '#f0f4ff',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}>
                    <Icon size={22} style={{ color: '#4040ca' }} />
                  </div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.75rem' }}>
                    {item.title}
                  </h2>
                  <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.75', margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CONTEXTO ===== */}
      <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '3rem',
            alignItems: 'start',
          }}
          className="lg:grid-cols-2"
          >
            <div>
              <span className="section-tag">O problema que resolvemos</span>
              <h2 className="section-heading">
                Boas intenções, forma de pagamento impossível
              </h2>
              <p className="section-subheading">
                Pacientes muitas vezes chegam até o orçamento querendo realizar o tratamento,
                mas a forma de pagamento disponível não se encaixa na sua situação. Limite
                insuficiente no cartão, parcelas acima do que consegue pagar, ausência de
                entrada — são barreiras que não dizem respeito ao desejo de fazer o tratamento.
              </p>
              <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.75', marginTop: '1rem' }}>
                Do outro lado, clínicas investem em marketing, consultas e avaliações para levar
                o paciente até o orçamento — e perdem a oportunidade por um problema que não é
                clínico, mas financeiro.
              </p>
              <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.75', marginTop: '1rem' }}>
                A Benavera cria uma etapa específica para esse momento: quando o paciente quer
                fechar mas a forma de pagamento impede a decisão.
              </p>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}>
              <p style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#64748b',
                marginBottom: '1.5rem',
              }}>
                O que a Benavera é — e o que não é
              </p>

              {[
                { isTrue: true, text: 'Uma plataforma que organiza possibilidades de pagamento para tratamentos' },
                { isTrue: true, text: 'Uma nova etapa comercial para clínicas quando o pagamento é a objeção' },
                { isTrue: true, text: 'Transparente sobre o que garante — e sobre o que não garante' },
                { isTrue: false, text: 'Um banco ou instituição financeira' },
                { isTrue: false, text: 'Uma garantia de aprovação de crédito' },
                { isTrue: false, text: 'Um serviço que cobra o paciente por simular' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  paddingBottom: i < 5 ? '0.875rem' : 0,
                  borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none',
                  marginBottom: i < 5 ? '0.875rem' : 0,
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: item.isTrue ? '#f0faf8' : '#fef2f2',
                    border: `1px solid ${item.isTrue ? '#b4e6de' : '#fecaca'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: item.isTrue ? '#309e92' : '#ef4444',
                  }}>
                    {item.isTrue ? '✓' : '✕'}
                  </div>
                  <span style={{
                    fontSize: '0.9rem',
                    color: '#475569',
                    lineHeight: '1.6',
                  }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: '800',
            color: '#0f172a',
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
          }}>
            Conheça mais sobre a Benavera
          </h2>
          <p style={{
            fontSize: '1.0625rem',
            color: '#475569',
            marginBottom: '2.5rem',
            maxWidth: '420px',
            margin: '0 auto 2.5rem',
            lineHeight: '1.75',
          }}>
            Seja você um paciente em busca de alternativas ou uma clínica querendo reduzir orçamentos perdidos.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', justifyContent: 'center' }}>
            <Link href="/simular" className="btn-primary">
              Simular possibilidades
              <ArrowRight size={16} />
            </Link>
            <Link href="/clinicas" className="btn-secondary">
              Para clínicas
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
