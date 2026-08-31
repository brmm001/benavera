import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Benavera',
  description: 'Entenda como a Benavera coleta, usa e protege seus dados pessoais.',
  alternates: { canonical: 'https://benavera.com.br/privacidade' },
};

const sections = [
  {
    title: '1. Quem somos',
    content: `A Benavera é uma plataforma tecnológica que organiza a jornada financeira relacionada ao pagamento de tratamentos. Nesta Política de Privacidade, explicamos como coletamos, usamos e protegemos seus dados pessoais ao interagir com nosso site e serviços.`,
  },
  {
    title: '2. Dados que coletamos',
    content: `Coletamos dados que você nos fornece diretamente, como nome, e-mail, telefone, cidade e informações sobre seu tratamento ou clínica. Também podemos coletar dados de navegação (como cookies e parâmetros UTM) para entender como você chegou até nós e melhorar a experiência.`,
  },
  {
    title: '3. Como usamos seus dados',
    content: `Usamos seus dados para:
- Entrar em contato após uma simulação ou solicitação de cadastro no piloto
- Avaliar aderência ao perfil de atendimento da Benavera
- Melhorar nossos serviços e comunicações
- Cumprir obrigações legais

Não vendemos seus dados a terceiros.`,
  },
  {
    title: '4. Base legal',
    content: `O tratamento dos seus dados é realizado com base no seu consentimento (fornecido ao preencher nossos formulários) e, quando aplicável, no legítimo interesse da Benavera para fins de contato e melhoria do serviço, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).`,
  },
  {
    title: '5. Compartilhamento de dados',
    content: `Podemos compartilhar seus dados com parceiros que auxiliam na prestação do serviço (como plataformas de comunicação e análise), sempre sob acordos de confidencialidade. Quando a natureza do serviço envolver parceiros financeiros, você será informado antes de qualquer encaminhamento.`,
  },
  {
    title: '6. Retenção dos dados',
    content: `Mantemos seus dados pelo tempo necessário para prestar o serviço solicitado e cumprir obrigações legais. Você pode solicitar a exclusão dos seus dados a qualquer momento.`,
  },
  {
    title: '7. Seus direitos',
    content: `Conforme a LGPD, você tem direito a:
- Confirmar a existência de tratamento dos seus dados
- Acessar os dados que temos sobre você
- Corrigir dados incompletos, inexatos ou desatualizados
- Solicitar a exclusão dos dados
- Revogar o consentimento a qualquer momento

Para exercer esses direitos, entre em contato conosco pelo e-mail indicado nesta política.`,
  },
  {
    title: '8. Cookies',
    content: `Utilizamos cookies para melhorar a experiência de navegação e entender como os usuários chegam até o nosso site (por meio de parâmetros UTM). Você pode desativar cookies nas configurações do seu navegador, mas isso pode afetar algumas funcionalidades.`,
  },
  {
    title: '9. Alterações nesta política',
    content: `Esta política pode ser atualizada periodicamente. Recomendamos verificar esta página regularmente. A data da última atualização está indicada ao final do documento.`,
  },
  {
    title: '10. Contato',
    content: `Para dúvidas sobre esta política ou para exercer seus direitos, entre em contato: privacidade@benavera.com.br`,
  },
];

export default function PrivacidadePage() {
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
              Política de Privacidade
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
                  if (para.startsWith('- ')) {
                    return null; // handled below
                  }
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
