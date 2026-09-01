import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Link2, BarChart3, Users, Zap } from 'lucide-react';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Como funciona',
  description:
    'Entenda passo a passo como a Benavera conecta pacientes a opções viáveis de parcelamento e auxilia clínicas a viabilizarem tratamentos.',
  alternates: { canonical: 'https://www.benavera.com.br/como-funciona' },
};

const stepsPatient = [
  {
    step: '1',
    title: 'Você informa o valor do tratamento',
    desc: 'Diga o valor do procedimento que precisa realizar. Não precisa ter orçamento fechado.',
  },
  {
    step: '2',
    title: 'Informa suas preferências financeiras',
    desc: 'Qual parcela consegue pagar por mês? Tem algum valor para entrada? Responda o que souber.',
  },
  {
    step: '3',
    title: 'A Benavera organiza as possibilidades',
    desc: 'Com base nas suas respostas, a plataforma apresenta os caminhos que podem funcionar para a sua situação.',
  },
  {
    step: '4',
    title: 'Você decide como avançar',
    desc: 'Sem compromisso. Você escolhe se e quando seguir com alguma alternativa apresentada.',
  },
];

const stepsClinic = [
  {
    step: '1',
    title: 'A clínica cadastra-se no piloto',
    desc: 'Processo simples, sem implementação técnica complexa.',
  },
  {
    step: '2',
    title: 'Recebe um link personalizado',
    desc: 'Utilizado na recepção, WhatsApp ou após a apresentação do orçamento.',
  },
  {
    step: '3',
    title: 'O paciente acessa e simula',
    desc: 'Ele informa as preferências financeiras diretamente na plataforma.',
  },
  {
    step: '4',
    title: 'A clínica acompanha resultados',
    desc: 'Visualize quantas oportunidades foram redirecionadas para a Benavera.',
  },
];

export default function ComoFuncionaPage() {
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
              Plataforma
            </span>
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: '1.15',
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}>
              Como a Benavera funciona
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: '#475569',
              lineHeight: '1.75',
              marginBottom: '2.5rem',
              maxWidth: '520px',
            }}>
              A Benavera é uma plataforma que organiza a jornada financeira relacionada
              ao pagamento de tratamentos. Ela atua para dois públicos: pacientes que
              precisam de alternativas de pagamento e clínicas que querem reduzir a
              perda de orçamentos por causa da forma de pagamento.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
              <Link href="/simular" id="como-funciona-cta-simular" className="btn-primary">
                Simular possibilidades
                <ArrowRight size={16} />
              </Link>
              <Link href="/clinicas" id="como-funciona-cta-clinicas" className="btn-secondary">
                Para clínicas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARA PACIENTES ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '520px', marginBottom: '3.5rem' }}>
            <span className="section-tag">Para pacientes</span>
            <h2 className="section-heading">Da simulação às possibilidades</h2>
            <p className="section-subheading">
              Você informa o que precisa, a Benavera organiza as alternativas disponíveis
              de forma simples e transparente.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
          }}>
            {stepsPatient.map((item) => (
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

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <Link href="/simular" className="btn-primary">
              Começar simulação gratuita
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== PARA CLÍNICAS ===== */}
      <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '520px', marginBottom: '3.5rem' }}>
            <span className="section-tag">Para clínicas</span>
            <h2 className="section-heading">Uma nova etapa comercial</h2>
            <p className="section-subheading">
              Quando o paciente quer fechar mas a forma de pagamento impede,
              a Benavera cria uma alternativa sem que a clínica precise se
              tornar especialista em crédito.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
          }}>
            {stepsClinic.map((item) => (
              <div key={item.step} className="card" style={{ padding: '1.5rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: 'linear-gradient(135deg, #4040ca, #2f3181)',
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

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <Link href="/clinicas#piloto" className="btn-primary">
              Quero participar do piloto
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== DIFERENCIAIS ===== */}
      <section style={{ padding: '5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto 3.5rem' }}>
            <span className="section-tag">O que nos diferencia</span>
            <h2 className="section-heading">Simples, transparente, sem pressão</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.25rem',
          }}>
            {[
              {
                icon: CheckCircle2,
                title: 'Sem compromisso',
                desc: 'Simular não obriga você a contratar. Você decide se e quando avançar.',
              },
              {
                icon: Zap,
                title: 'Processo simples',
                desc: 'Responda algumas perguntas objetivas. Sem burocracia logo de início.',
              },
              {
                icon: Link2,
                title: 'Sem implementação técnica',
                desc: 'Para clínicas, basta um link. Não é necessário integração ou software.',
              },
              {
                icon: BarChart3,
                title: 'Transparência',
                desc: 'A Benavera não garante aprovação. Apresentamos possibilidades, não promessas.',
              },
              {
                icon: Users,
                title: 'Atendimento humano',
                desc: 'Nossa equipe acompanha o processo e está disponível para dúvidas.',
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

      {/* ===== AVISO FINANCEIRO ===== */}
      <section style={{ paddingBottom: '4rem', background: 'white' }}>
        <div className="container-benavera">
          <FinancialDisclaimer />
        </div>
      </section>
    </>
  );
}
