import Link from 'next/link';
import { ArticleMarkdown } from '@/components/ArticleMarkdown';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

export function InformationPage({ title, intro, content, clinicCta = true }: {
  title: string; intro: string; content: string; clinicCta?: boolean;
}) {
  return <>
    <section style={{ background: '#f8fafc', padding: '7rem 0 3rem', borderBottom: '1px solid #e2e8f0' }}>
      <div className="container-benavera" style={{ maxWidth: 940 }}>
        <Breadcrumb items={[{ label: title }]} />
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.15, color: '#0f172a', margin: '1.25rem 0' }}>{title}</h1>
        <p style={{ fontSize: '1.2rem', lineHeight: 1.7, color: '#475569' }}>{intro}</p>
        {clinicCta && <nav aria-label="Conheça a solução" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
          <Link href="/credenciamento" className="btn-primary">Cadastrar minha clínica</Link>
          <Link href="/condicoes" className="btn-secondary">Ver taxas e condições</Link>
        </nav>}
      </div>
    </section>
    <section className="container-benavera" style={{ maxWidth: 940, paddingTop: '2rem', paddingBottom: '4rem' }}>
      <ArticleMarkdown content={content} />
      <div style={{ marginTop: '2rem' }}><FinancialDisclaimer compact /></div>
      <nav aria-label="Próximos passos" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
        {clinicCta && <Link href="/credenciamento" className="btn-primary">Cadastrar minha clínica</Link>}
        <Link href="/contato" className="btn-secondary">Falar com a Benavera</Link>
      </nav>
    </section>
  </>;
}
