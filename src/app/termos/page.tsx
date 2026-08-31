import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso | Benavera',
  description: 'Leia os Termos de Uso da plataforma Benavera.',
  alternates: { canonical: 'https://benavera.com.br/termos' },
};

const sections = [
  {
    title: '1. Aceitação dos termos',
    content: `Ao acessar e utilizar a plataforma Benavera, você concorda com estes Termos de Uso. Se não concordar com qualquer parte, recomendamos que não utilize nossos serviços.`,
  },
  {
    title: '2. O que é a Benavera',
    content: `A Benavera é uma plataforma tecnológica que organiza informações sobre possibilidades de pagamento para tratamentos. Não somos uma instituição financeira, não concedemos crédito diretamente e não garantimos aprovação de qualquer proposta.`,
  },
  {
    title: '3. Uso permitido',
    content: `A plataforma destina-se a pessoas físicas que desejam entender possibilidades de pagamento para tratamentos, e a clínicas e prestadores de serviços de saúde interessados em reduzir orçamentos perdidos por objeções financeiras.

Você se compromete a fornecer informações verídicas ao utilizar nossos formulários e a não utilizar a plataforma para fins ilícitos.`,
  },
  {
    title: '4. Limitações do serviço',
    content: `A Benavera não garante:
- Aprovação de crédito ou financiamento
- Disponibilidade de qualquer produto financeiro específico
- Condições determinadas de taxa, prazo ou valor
- Que as informações apresentadas representem uma oferta vinculante

Qualquer oferta de crédito ou financiamento é de responsabilidade exclusiva do parceiro financeiro que a realiza.`,
  },
  {
    title: '5. Responsabilidade',
    content: `A Benavera não se responsabiliza por decisões financeiras tomadas com base nas informações apresentadas pela plataforma. As informações têm caráter orientativo e não substituem aconselhamento financeiro profissional.`,
  },
  {
    title: '6. Propriedade intelectual',
    content: `Todo o conteúdo presente na plataforma Benavera — incluindo textos, design, logotipo e código — é de propriedade da Benavera ou de seus licenciantes. É proibida a reprodução sem autorização expressa.`,
  },
  {
    title: '7. Alterações nos termos',
    content: `Podemos atualizar estes Termos de Uso a qualquer momento. O uso continuado da plataforma após alterações implica aceitação dos novos termos.`,
  },
  {
    title: '8. Lei aplicável',
    content: `Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo — SP para dirimir eventuais conflitos.`,
  },
  {
    title: '9. Contato',
    content: `Para dúvidas sobre estes termos, entre em contato: contato@benavera.com.br`,
  },
];

export default function TermosPage() {
  return (
    <>
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '4rem',
        background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '640px' }}>
            <span className="section-tag" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
              Legal
            </span>
            <h1 style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: '1.2',
              letterSpacing: '-0.03em',
              marginBottom: '1rem',
            }}>
              Termos de Uso
            </h1>
            <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
              Última atualização: agosto de 2026
            </p>
          </div>
        </div>
      </section>

      <section style={{ padding: '4rem 0 6rem', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '720px' }}>
            {sections.map((section, i) => (
              <div key={i} style={{
                marginBottom: '2.5rem',
                paddingBottom: '2.5rem',
                borderBottom: i < sections.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  marginBottom: '0.875rem',
                }}>
                  {section.title}
                </h2>
                {section.content.split('\n').map((para, pi) => {
                  if (para.startsWith('- ')) return null;
                  return para.trim() ? (
                    <p key={pi} style={{
                      fontSize: '0.9375rem',
                      color: '#475569',
                      lineHeight: '1.75',
                      margin: '0 0 0.75rem',
                    }}>
                      {para}
                    </p>
                  ) : null;
                })}
                {section.content.includes('\n- ') && (
                  <ul style={{
                    paddingLeft: '1.5rem',
                    margin: '0.5rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.375rem',
                  }}>
                    {section.content
                      .split('\n')
                      .filter(l => l.startsWith('- '))
                      .map((item, ii) => (
                        <li key={ii} style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.65' }}>
                          {item.replace('- ', '')}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
