import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, BookOpen, Clock, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Política editorial',
  description:
    'Conheça as diretrizes de checagem, fontes oficiais e critérios de transparência utilizados na produção dos conteúdos informativos da Benavera.',
  alternates: { canonical: 'https://www.benavera.com.br/politica-editorial' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Política editorial',
    description: 'Diretrizes éticas, critérios de fontes e processo de revisão dos conteúdos da Benavera.',
    url: 'https://www.benavera.com.br/politica-editorial',
    type: 'website',
  },
};

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Política Editorial | Benavera',
  url: 'https://www.benavera.com.br/politica-editorial',
  description:
    'Processo de produção, checagem de fatos, fontes oficiais e responsabilidade editorial da Benavera.',
  publisher: {
    '@type': 'Organization',
    name: 'Benavera',
    url: 'https://www.benavera.com.br',
  },
};

const pillars = [
  {
    icon: BookOpen,
    title: '1. Produção Baseada em Fatos e Fontes Oficiais',
    content:
      'Nossos conteúdos são desenvolvidos com base em dados regulatórios e fontes oficiais, como Banco Central do Brasil (Bacen), Conselho Monetário Nacional (CMN), Código de Defesa do Consumidor (CDC), além de conselhos e associações de saúde (CFO, CFM). Não publicamos conteúdos sensacionalistas ou promessas irreais.',
  },
  {
    icon: ShieldCheck,
    title: '2. Processo de Revisão Editorial e Checagem',
    content:
      'Todos os guias e artigos passam por um fluxo de revisão interna que checa a veracidade dos conceitos financeiros abordados (como Custo Efetivo Total, prazos, taxas e amortização) e a clareza para o leitor leigo, evitando jargões técnicos excessivos.',
  },
  {
    icon: Clock,
    title: '3. Atualizações e Revisões Periódicas',
    content:
      'As normas financeiras e as práticas de mercado evoluem constantemente. Por isso, revisamos periodicamente nossos artigos e indicamos no topo da publicação tanto a data de publicação original quanto a data da última atualização realizada.',
  },
  {
    icon: FileText,
    title: '4. Independência e Transparência Comercial',
    content:
      'Nossos conteúdos educativos têm o objetivo de empoderar o paciente para tomar decisões conscientes. Não fazemos anúncios disfarçados de conteúdo nem recomendamos decisões financeiras que prejudiquem a estabilidade do leitor.',
  },
  {
    icon: AlertTriangle,
    title: '5. Isenção de Responsabilidade Profissional',
    content:
      'O conteúdo disponibilizado pela Benavera é estritamente informativo e educativo. Nossos textos não substituem diagnósticos médicos ou odontológicos, planos terapêuticos individuais ou consultoria jurídica e financeira especializada.',
  },
];

export default function PoliticaEditorialPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      {/* ===== HERO ===== */}
      <section
        style={{
          paddingTop: '8rem',
          paddingBottom: '4rem',
          background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera">
          <Breadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Política Editorial' },
            ]}
          />

          <div style={{ maxWidth: '680px', marginTop: '1.5rem' }}>
            <span
              className="section-tag"
              style={{ marginBottom: '1rem', display: 'inline-block' }}
            >
              Transparência e Confiança
            </span>
            <h1
              style={{
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.15',
                letterSpacing: '-0.025em',
                marginBottom: '1.25rem',
              }}
            >
              Política Editorial da Benavera
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#475569',
                lineHeight: '1.75',
                margin: 0,
              }}
            >
              Entenda como produzimos, checamos e atualizamos nossos conteúdos sobre planejamento financeiro e tratamentos de saúde.
            </p>
          </div>
        </div>
      </section>

      {/* ===== CORPO ===== */}
      <section style={{ padding: '4.5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {pillars.map((pillar, i) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={i}
                    style={{
                      background: '#fafafa',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '2rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: '#f0f4ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4040ca',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <h2
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: 0,
                        }}
                      >
                        {pillar.title}
                      </h2>
                    </div>
                    <p
                      style={{
                        fontSize: '0.9375rem',
                        color: '#475569',
                        lineHeight: '1.75',
                        margin: 0,
                      }}
                    >
                      {pillar.content}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Aviso Final */}
            <div style={{ marginTop: '3.5rem' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  fontSize: '0.875rem',
                  color: '#64748b',
                  lineHeight: '1.7',
                }}
              >
                <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: '#334155' }}>
                  Dúvidas, correções ou sugestões editoriais?
                </p>
                <p style={{ margin: 0 }}>
                  Caso identifique alguma informação desatualizada ou tenha sugestões de melhoria para nossos guias, entre em contato através do e-mail:{' '}
                  <a
                    href="mailto:contato@benavera.com.br"
                    style={{ color: '#4040ca', fontWeight: '600', textDecoration: 'none' }}
                  >
                    contato@benavera.com.br
                  </a>
                  .
                </p>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <FinancialDisclaimer />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
