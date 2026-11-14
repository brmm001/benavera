import Link from 'next/link';
import { articleClinicDestination } from '@/lib/article-discovery';
import { COMMERCIAL } from '@/lib/commercial';

export function ArticleCommercialCta({ article }: { article: { slug: string; title: string; category: string } }) {
  const destination = articleClinicDestination(article);
  const clinic = article.category === 'para-clinicas';
  return <aside aria-label="Próximo passo com a Benavera" style={{ marginTop: '2rem', padding: '1.5rem', background: '#eef2ff', border: '1px solid #dbe1f3', borderRadius: 16 }}>
    <h2 style={{ fontWeight: 750, color: '#2f3181', fontSize: '1.25rem' }}>{clinic ? 'Leve esta alternativa para sua clínica' : 'Quer avaliar uma forma de pagamento?'}</h2>
    <p style={{ margin: '0.75rem 0', color: '#475569', lineHeight: 1.7 }}>{clinic
      ? `${COMMERCIAL.clinicCost}. ${COMMERCIAL.installmentCondition}. Conheça o credenciamento e as condições de repasse antes de encaminhar uma proposta.`
      : `O paciente pode solicitar uma análise e conferir as condições disponíveis. ${COMMERCIAL.installmentCondition}. Os exemplos deste artigo são educativos e não substituem uma proposta.`}</p>
    <nav aria-label="Continuar a partir do artigo" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
      <Link href={clinic ? destination.href : '/simular'} className="btn-primary">{clinic ? 'Conhecer a solução para clínicas' : 'Solicitar uma simulação'}</Link>
      {!clinic && <Link href={destination.href} style={{ color: '#3730a3', textDecoration: 'underline' }}>Sou da clínica: {destination.label.toLowerCase()}</Link>}
      <Link href="/condicoes" style={{ color: '#3730a3', textDecoration: 'underline' }}>Taxas e condições</Link>
    </nav>
  </aside>;
}
