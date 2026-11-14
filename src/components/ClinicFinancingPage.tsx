import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { ArticleMarkdown } from '@/components/ArticleMarkdown';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ClinicFinancingLinks } from '@/components/ClinicFinancingLinks';
import { COMMERCIAL } from '@/lib/commercial';
import { jsonLd, ORGANIZATION_ID, SITE_URL } from '@/lib/seo';

interface Props {
  title: string;
  intro: string;
  path: string;
  content: string;
  faqs: ReadonlyArray<{ question: string; answer: string }>;
}

export function ClinicFinancingPage({ title, intro, path, content, faqs }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Service', '@id': `${SITE_URL}${path}#service`, name: title,
        description: intro, url: `${SITE_URL}${path}`, serviceType: 'Intermediação de crédito para tratamentos odontológicos',
        provider: { '@id': ORGANIZATION_ID }, audience: { '@type': 'BusinessAudience', audienceType: 'Clínicas odontológicas' } },
      { '@type': 'FAQPage', '@id': `${SITE_URL}${path}#perguntas`,
        mainEntity: faqs.map(({ question, answer }) => ({ '@type': 'Question', name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    ],
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    <section style={{ background: 'linear-gradient(145deg, #f8fafc, #eef2ff)', padding: '7rem 0 3.5rem', borderBottom: '1px solid #e2e8f0' }}>
      <div className="container-benavera" style={{ maxWidth: 1040 }}>
        <Breadcrumb items={[{ label: 'Para clínicas', href: '/clinicas' }, { label: title }]} />
        <p className="section-tag" style={{ marginTop: '1.5rem' }}>Benavera para odontologia</p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.35rem)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.03em', color: '#0f172a', maxWidth: 850, margin: '1rem 0 1.25rem' }}>{title}</h1>
        <p style={{ fontSize: '1.125rem', lineHeight: 1.8, color: '#475569', maxWidth: 800 }}>{intro}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: '1rem', margin: '2rem 0' }}>
          {[
            { value: `${COMMERCIAL.clinicFeePercent}%`, label: 'Taxa por operação para a clínica' },
            { value: `Até ${COMMERCIAL.maxInstallments}x`, label: 'Conforme análise e modalidade' },
            { value: 'Sem mensalidade', label: 'E sem taxa de adesão' },
          ].map(item => <div key={item.value} style={{ padding: '1.25rem', border: '1px solid #dbe1f3', borderRadius: 16, background: 'white' }}>
            <strong style={{ fontSize: '1.6rem', color: '#2f3181', display: 'block' }}>{item.value}</strong>
            <span style={{ color: '#475569', lineHeight: 1.6 }}>{item.label}</span>
          </div>)}
        </div>
        <nav aria-label="Começar com a Benavera" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/credenciamento" className="btn-primary">Credenciar minha clínica <ArrowRight size={17} /></Link>
          <Link href="/condicoes" className="btn-secondary">Ver todas as condições</Link>
        </nav>
        <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: '1.25rem', lineHeight: 1.6 }}>A taxa da clínica é diferente dos juros do paciente. A instituição responsável apresenta juros, CET e contrato antes da assinatura.</p>
      </div>
    </section>
    <section className="container-benavera" style={{ maxWidth: 940, paddingTop: '3rem', paddingBottom: '3rem' }}>
      <ArticleMarkdown content={content} />
      <section aria-labelledby="perguntas" style={{ marginTop: '3rem' }}>
        <h2 id="perguntas" style={{ fontSize: '1.75rem', color: '#0f172a', fontWeight: 750, marginBottom: '1.25rem' }}>Perguntas que a clínica precisa responder</h2>
        {faqs.map(({ question, answer }) => <div key={question} style={{ padding: '1.25rem 0', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{question}</h3>
          <p style={{ color: '#475569', lineHeight: 1.8 }}>{answer}</p>
        </div>)}
      </section>
      <div style={{ margin: '2.5rem 0', padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16 }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#2f3181', marginBottom: '0.75rem' }}><CheckCircle2 size={19} /> Do orçamento à proposta</p>
        <p style={{ lineHeight: 1.8, color: '#475569', marginBottom: '1rem' }}>Tenha em mãos o cadastro da clínica e um orçamento de referência. O credenciamento inicia a avaliação; a liberação para operar depende da validação. Pelo atendimento, sua equipe pode esclarecer a modalidade disponível e os documentos necessários.</p>
        <nav aria-label="Solicitar credenciamento" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/credenciamento" className="btn-primary">Iniciar credenciamento</Link>
          <Link href="/contato" className="btn-secondary">Falar com a Benavera</Link>
        </nav>
      </div>
      <ClinicFinancingLinks />
      <p style={{ marginTop: '2rem', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.7 }}>Informações revisadas em {COMMERCIAL.reviewedLabel}. Publicação da Benavera, responsável pela oferta de intermediação. <Link href="/sobre" style={{ textDecoration: 'underline' }}>Conheça a empresa</Link>. Crédito sujeito à análise; repasse, limites e responsabilidade por inadimplência dependem da proposta e do contrato.</p>
    </section>
  </>;
}
