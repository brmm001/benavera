import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Users, TrendingUp, Zap, BarChart3, Link2, Gift } from 'lucide-react';
import { ClinicLeadForm } from '@/components/ClinicLeadForm';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Benavera para Clínicas | Reduza a perda de pacientes no orçamento',
  description:
    'Transforme mais orçamentos em tratamentos realizados. A Benavera cria uma nova etapa comercial para clínicas quando o paciente quer fechar, mas a forma de pagamento impede a decisão.',
  alternates: { canonical: 'https://benavera.com.br/clinicas' },
};

export default function ClinicasPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '5rem',
        background: 'linear-gradient(160deg, #1c1d4c 0%, #2f3181 60%, #1c1d4c 100%)',
        color: 'white',
      }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '680px' }}>
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
              marginBottom: '1.5rem',
            }}>
              Para clínicas e prestadores
            </span>

            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              fontWeight: '800',
              lineHeight: '1.15',
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}>
              Transforme mais orçamentos em tratamentos realizados.
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
              color: '#a5b9fc',
              lineHeight: '1.75',
              marginBottom: '2.5rem',
              maxWidth: '560px',
            }}>
              Quando o paciente quer fechar, mas a forma de pagamento impede a decisão,
              a Benavera cria uma nova etapa comercial para sua clínica.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', marginBottom: '2rem' }}>
              <Link href="#piloto" id="hero-clinic-cta" className="btn-primary" style={{
                background: 'white',
                color: '#2f3181',
              }}>
                Participar do piloto
                <ArrowRight size={16} />
              </Link>
            </div>

            <div style={{
              background: 'rgba(129, 149, 248, 0.1)',
              border: '1px solid rgba(129, 149, 248, 0.2)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9375rem',
              color: '#c7d7fe',
            }}>
              <Gift size={18} style={{ color: '#8195f8', flexShrink: 0 }} />
              <span>
                <strong style={{ color: 'white' }}>Piloto inicial sem mensalidade</strong>{' '}
                e sem custo de implantação.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== O PROBLEMA B2B ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '600px', marginBottom: '3.5rem' }}>
            <span className="section-tag">O desafio</span>
            <h2 className="section-heading">
              Você já investiu para levar o paciente até o orçamento.
            </h2>
            <p className="section-subheading">
              Marketing, consulta, avaliação. O paciente quer realizar o tratamento. Mas na hora
              de fechar, a forma de pagamento disponível não funciona. E a venda se perde.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
            alignItems: 'start',
          }}
          className="lg:grid-cols-2"
          >
            {/* Sem Benavera */}
            <div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#ef4444',
                marginBottom: '1rem',
              }}>
                Sem Benavera
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  'Paciente chega',
                  'Faz avaliação',
                  'Recebe orçamento',
                  'Quer realizar o tratamento',
                  'Forma de pagamento não funciona',
                ].map((step, i, arr) => (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      background: i === arr.length - 1 ? '#fef2f2' : '#f8fafc',
                      border: `1px solid ${i === arr.length - 1 ? '#fecaca' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      width: '100%',
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: i === arr.length - 1 ? '#ef4444' : '#94a3b8',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '0.9375rem',
                        color: i === arr.length - 1 ? '#dc2626' : '#475569',
                        fontWeight: i === arr.length - 1 ? '600' : '400',
                      }}>
                        {step}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{
                        width: '1px',
                        height: '12px',
                        background: '#e2e8f0',
                        marginLeft: '1.375rem',
                      }} />
                    )}
                  </div>
                ))}
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.875rem 1rem',
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
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#309e92',
                marginBottom: '1rem',
              }}>
                Com Benavera
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  'Paciente chega',
                  'Recebe orçamento',
                  'Forma de pagamento é uma objeção',
                  'Benavera cria uma nova etapa',
                  'Novas possibilidades são apresentadas',
                ].map((step, i, arr) => (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      background: i === arr.length - 1 ? '#f0faf8' : '#f8fafc',
                      border: `1px solid ${i === arr.length - 1 ? '#b4e6de' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      width: '100%',
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: i === arr.length - 1 ? '#309e92' : '#94a3b8',
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '0.9375rem',
                        color: i === arr.length - 1 ? '#1e6560' : '#475569',
                        fontWeight: i === arr.length - 1 ? '600' : '400',
                      }}>
                        {step}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{
                        width: '1px',
                        height: '12px',
                        background: '#e2e8f0',
                        marginLeft: '1.375rem',
                      }} />
                    )}
                  </div>
                ))}
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.875rem 1rem',
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

      {/* ===== BENEFÍCIOS ===== */}
      <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto 3.5rem' }}>
            <span className="section-tag">Benefícios</span>
            <h2 className="section-heading">O que sua clínica ganha</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.25rem',
          }}>
            {[
              {
                icon: TrendingUp,
                title: 'Recuperação de oportunidades',
                desc: 'Crie um caminho específico para pacientes que não avançaram por causa da forma de pagamento.',
              },
              {
                icon: Zap,
                title: 'Processo simples',
                desc: 'Sua equipe não precisa se tornar especialista em crédito ou financiamento.',
              },
              {
                icon: BarChart3,
                title: 'Mais visibilidade comercial',
                desc: 'Acompanhe quantas oportunidades chegaram até a Benavera.',
              },
              {
                icon: Users,
                title: 'Melhor experiência',
                desc: 'O paciente entende melhor suas possibilidades antes de tomar uma decisão.',
              },
              {
                icon: Link2,
                title: 'Sem implementação complexa',
                desc: 'Comece usando apenas um link ou QR Code. Sem integração técnica necessária.',
              },
              {
                icon: Gift,
                title: 'Piloto sem custo',
                desc: 'Nesta fase, estamos selecionando clínicas para testar o modelo sem mensalidade.',
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
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
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

      {/* ===== COMO FUNCIONA ===== */}
      <section style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto 3.5rem' }}>
            <span className="section-tag">Como funciona</span>
            <h2 className="section-heading">Do cadastro ao resultado</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            maxWidth: '1000px',
            margin: '0 auto',
          }}>
            {[
              { step: '1', title: 'A clínica entra no piloto', desc: 'Cadastro e configuração simples, sem implementação técnica complexa.' },
              { step: '2', title: 'Recebe seu link Benavera', desc: 'Pode ser utilizado na recepção, WhatsApp ou após apresentação do orçamento.' },
              { step: '3', title: 'O paciente faz a simulação', desc: 'Ele informa o valor e suas preferências financeiras diretamente.' },
              { step: '4', title: 'Benavera acompanha', desc: 'A oportunidade entra no fluxo financeiro da plataforma.' },
              { step: '5', title: 'A clínica acompanha resultados', desc: 'Recebe informações sobre utilização e conversão conforme o produto evoluir.' },
            ].map((item) => (
              <div key={item.step} className="card-subtle" style={{ padding: '1.5rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: '#4040ca',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '0.9375rem',
                  color: 'white',
                  marginBottom: '1rem',
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
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

      {/* ===== FORMULÁRIO ===== */}
      <section id="piloto" style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
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
              <span className="section-tag">Cadastro</span>
              <h2 className="section-heading">
                Quero testar a Benavera na minha clínica
              </h2>
              <p className="section-subheading">
                Preencha o formulário e nossa equipe poderá entrar em contato para entender
                como vocês trabalham hoje e avaliar se existe aderência ao piloto.
              </p>

              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {[
                  'Seleção cuidadosa de clínicas para o piloto',
                  'Contato personalizado pela nossa equipe',
                  'Sem compromisso após a conversa',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle2 size={18} style={{ color: '#309e92', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.9375rem', color: '#475569' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '2rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
            }}>
              <ClinicLeadForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
