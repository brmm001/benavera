import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export const metadata: Metadata = {
  title: 'Parcelamento de tratamento odontológico',
  description:
    'Conheça alternativas de parcelamento para tratamentos odontológicos como implantes, próteses e ortodontia. Planeje sem comprometer a renda.',
  alternates: { canonical: 'https://www.benavera.com.br/parcelamento-tratamento-odontologico' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Parcelamento de tratamento odontológico',
    description: 'Conheça alternativas de parcelamento para tratamentos odontológicos como implantes, próteses e ortodontia.',
    url: 'https://www.benavera.com.br/parcelamento-tratamento-odontologico',
    type: 'article',
  },
};

const faqItems = [
  {
    question: 'Consigo parcelar tratamento odontológico mesmo sem cartão de crédito com limite alto?',
    answer:
      'Sim. Além do cartão de crédito convencional, existem alternativas de financiamento bancário para saúde e parcelamento via boleto que não consomem o limite do seu cartão.',
  },
  {
    question: 'É obrigatório dar entrada no parcelamento odontológico?',
    answer:
      'Não necessariamente. Algumas instituições permitem parcelar o valor integral do orçamento, embora dar uma entrada reduza os juros totais e o valor da parcela mensal.',
  },
  {
    question: 'Quais tratamentos odontológicos podem ser parcelados?',
    answer:
      'Praticamente todos os procedimentos de média e alta complexidade, incluindo ortodontia (aparelhos e alinhadores), endodontia (canal), próteses dentárias, periodontia e reabilitação oral.',
  },
  {
    question: 'Como a Benavera me ajuda a parcelar?',
    answer:
      'A Benavera analisa o valor do seu orçamento e quanto você consegue pagar por mês, apresentando caminhos compatíveis sem você precisar peregrinar por bancos.',
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

export default function ParcelamentoOdontologicoPage() {
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
          background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div className="container-benavera">
          <Breadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Parcelamento Tratamento Odontológico' },
            ]}
          />

          <div style={{ maxWidth: '680px', marginTop: '1.5rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>
              Guia de Pagamento Odontológico
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
              Como parcelar seu tratamento odontológico
            </h1>
            <p
              style={{
                fontSize: '1.0625rem',
                color: '#475569',
                lineHeight: '1.75',
                marginBottom: '2rem',
              }}
            >
              Recebeu um orçamento do dentista e a parcela não cabe no bolso? Entenda as opções
              disponíveis no mercado para realizar o tratamento que você precisa sem comprometer sua
              estabilidade.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/simular" className="btn-primary">
                Simular parcelamento
                <ArrowRight size={16} />
              </Link>
              <Link href="/calculadoras" className="btn-ghost">
                Calcular parcelas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RESPOSTA DIRETA ===== */}
      <section style={{ padding: '4.5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Box Resposta Direta */}
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
                Resposta Rápida
              </span>
              <h2 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#0f172a', margin: '0.5rem 0 1rem' }}>
                Como funciona o parcelamento no dentista?
              </h2>
              <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.75', margin: 0 }}>
                O parcelamento odontológico particular ocorre por três canais: <strong>parcelamento direto com a clínica</strong> (normalmente em menos vezes), <strong>cartão de crédito</strong> (limitado ao saldo disponível no cartão) ou <strong>financiamento para saúde</strong> (com prazos estendidos de 12 a 36 meses). A melhor escolha depende do seu limite de cartão, do valor total e de quanto você pode pagar por mês.
              </p>
            </div>

            {/* Comparativo de Opções */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '1.25rem' }}>
              Comparativo das opções de pagamento
            </h2>
            <div style={{ overflowX: 'auto', marginBottom: '3rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Modalidade</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Prazo Médio</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Usa Limite do Cartão?</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Ponto de Atenção</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0', fontWeight: '600' }}>Direto na Clínica</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>2 a 6 meses</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>Não</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>Exige entrada e parcelas mais altas</td>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0', fontWeight: '600' }}>Cartão de Crédito</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>1 a 12 meses</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>Sim (bloqueia o total)</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>Risco de rotativo se a fatura atrasar</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0', fontWeight: '600' }}>Financiamento Saúde</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>12 a 36 meses</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>Não</td>
                    <td style={{ padding: '0.875rem 1rem', border: '1px solid #e2e8f0' }}>Verificar CET e juros totais</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cuidados e Orientações */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '1.25rem' }}>
              Entrada, prazo, juros e CET: o que você precisa saber
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#0f172a' }}>Entrada:</strong> Dar uma entrada (ex: 20% a 30%) reduz o valor sobre o qual incidem juros, barateando o custo total.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#0f172a' }}>Custo Efetivo Total (CET):</strong> Exija sempre a informação do CET anual antes de assinar. Ele consolida juros, IOF e taxas administrativas.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={20} style={{ color: '#4040ca', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#0f172a' }}>Direito de Amortização:</strong> Pelo Código de Defesa do Consumidor, você tem o direito de quitar parcelas antecipadamente com desconto proporcional dos juros.
                </div>
              </div>
            </div>

            {/* Links Relacionados */}
            <div style={{ background: '#f0f4ff', borderRadius: '12px', padding: '1.5rem', marginBottom: '3.5rem' }}>
              <p style={{ fontWeight: '700', color: '#2f3181', marginBottom: '0.75rem' }}>
                Artigos e conteúdos recomendados:
              </p>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <Link href="/conteudos/parcelamento-tratamento-odontologico" style={{ color: '#4040ca', textDecoration: 'underline' }}>
                    Guia detalhado sobre formas de parcelamento odontológico
                  </Link>
                </li>
                <li>
                  <Link href="/conteudos/como-comparar-formas-pagamento-tratamento" style={{ color: '#4040ca', textDecoration: 'underline' }}>
                    Como comparar cartão e financiamento pelo CET
                  </Link>
                </li>
                <li>
                  <Link href="/conteudos/entrada-maior-ou-parcela-menor" style={{ color: '#4040ca', textDecoration: 'underline' }}>
                    Entrada maior ou parcela menor: qual a melhor estratégia?
                  </Link>
                </li>
              </ul>
            </div>

            {/* FAQ */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '1.25rem' }}>
              Perguntas frequentes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3.5rem' }}>
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
                  <summary style={{ fontWeight: '600', color: '#0f172a', cursor: 'pointer', outline: 'none' }}>
                    {item.question}
                  </summary>
                  <p style={{ margin: '0.75rem 0 0', color: '#475569', lineHeight: '1.7', fontSize: '0.9375rem' }}>
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>

            {/* Disclaimer & CTA */}
            <div style={{ marginBottom: '2rem' }}>
              <FinancialDisclaimer />
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '1rem' }}>
                Pronto para descobrir como viabilizar seu tratamento?
              </h3>
              <Link href="/simular" className="btn-primary" style={{ display: 'inline-flex' }}>
                Simular meu tratamento odontológico
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
