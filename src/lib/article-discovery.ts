import { CLINIC_FINANCING_PATH, IMPLANT_FINANCING_PATH } from './commercial';

type ArticleSummary = { slug: string; title: string; category: string; relatedArticles?: string[] };

// Links editoriais para as intenções prioritárias; o CMS pode estabelecer sua própria ordem.
const dentalFinance = ['financiamento-odontologico-como-funciona', 'como-parcelar-tratamento-odontologico', 'boleto-cartao-financiamento-tratamento', 'como-comparar-formas-pagamento-tratamento'];
const implants = ['implante-dentario-parcelado-no-boleto', 'protese-protocolo-parcelada-custos-pagamento', 'como-parcelar-implante-dentario', 'implante-carga-imediata-parcelado'];
const clinicFinance = ['financiamento-pacientes-clinicas', 'parcelamento-no-boleto-clinica-odontologica', 'escolher-parceiro-financeiro-clinica', 'financiamento-pacientes-aumenta-conversao-clinica'];

const editorialLinks: Record<string, readonly string[]> = {
  ...Object.fromEntries(dentalFinance.map(slug => [slug, dentalFinance])),
  'parcelamento-tratamento-odontologico': dentalFinance,
  ...Object.fromEntries(implants.map(slug => [slug, implants])),
  ...Object.fromEntries(clinicFinance.map(slug => [slug, clinicFinance])),
  'politica-parcelamento-clinicas': clinicFinance,
  'reduzir-inadimplencia-clinica': clinicFinance,
};

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const genericTerms = new Set(['como', 'para', 'clinica', 'clinicas', 'tratamento', 'tratamentos', 'particular', 'particulares', 'funciona', 'custos', 'cuidados', 'pagamento', 'parcelamento', 'parcelado', 'parcelada', 'parcelar']);
function topics(article: ArticleSummary) {
  return new Set(normalize(article.title)
    .replace(/odontologic\w*|odontologia|dentari\w*|dental|dentista\w*/g, 'odontologia')
    .split(/[^a-z]+/).filter(term => term.length > 3 && !genericTerms.has(term)));
}

export function selectRelatedArticles<T extends ArticleSummary>(article: ArticleSummary, published: readonly T[], limit = 3): T[] {
  if (limit <= 0) return [];
  const bySlug = new Map(published.filter(candidate => candidate.slug !== article.slug).map(candidate => [candidate.slug, candidate]));
  const preferred = [...new Set([...(article.relatedArticles || []), ...(editorialLinks[article.slug] || [])])];
  const selected = preferred.flatMap(slug => bySlug.has(slug) ? [bySlug.get(slug)!] : []).slice(0, limit);
  const selectedSlugs = new Set(selected.map(candidate => candidate.slug));
  const topic = topics(article);
  const forClinic = article.category === 'para-clinicas';
  const rest = [...bySlug.values()]
    .filter(candidate => !selectedSlugs.has(candidate.slug) && (candidate.category === 'para-clinicas') === forClinic)
    .map(candidate => ({ candidate, score: [...topics(candidate)].filter(term => topic.has(term)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.slug.localeCompare(b.candidate.slug));
  return [...selected, ...rest.slice(0, limit - selected.length).map(({ candidate }) => candidate)];
}

export function articleClinicDestination(article: ArticleSummary) {
  const topic = normalize(`${article.slug} ${article.title}`);
  if (/implante|protocolo|reabilitacao-oral/.test(topic)) {
    return { href: IMPLANT_FINANCING_PATH, label: 'Financiamento de implantes e protocolo para clínicas' };
  }
  if (/odontolog|dentari|dentista|dental/.test(topic)) {
    return { href: CLINIC_FINANCING_PATH, label: 'Financiamento odontológico para sua clínica' };
  }
  return { href: '/clinicas', label: 'Conhecer o financiamento para clínicas de saúde' };
}
