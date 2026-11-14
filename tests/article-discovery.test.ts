import assert from 'node:assert/strict';
import test from 'node:test';
import { articles } from '../src/content/articles';
import { selectRelatedArticles, articleClinicDestination } from '../src/lib/article-discovery';
import { CLINIC_FINANCING_PATH, IMPLANT_FINANCING_PATH } from '../src/lib/commercial';
import { buildTouch } from '../src/lib/acquisition';

test('general dental finance recommends payment decisions, not sedation or dental procedures', () => {
  const article = articles.find(a => a.slug === 'financiamento-odontologico-como-funciona')!;
  assert.deepEqual(selectRelatedArticles(article, [...articles].reverse()).map(a => a.slug), [
    'como-parcelar-tratamento-odontologico', 'boleto-cartao-financiamento-tratamento', 'como-comparar-formas-pagamento-tratamento',
  ]);
});

test('editor selections preserve order, ignore unpublished and self references, and deduplicate', () => {
  const article = articles[0];
  const explicit = [article.slug, 'draft-not-in-published-list', articles[2].slug, articles[2].slug, articles[1].slug];
  const result = selectRelatedArticles({ ...article, relatedArticles: explicit }, articles);
  assert.equal(result.length, 3);
  assert.deepEqual(result.slice(0, 2).map(a => a.slug), [articles[2].slug, articles[1].slug]);
  assert.equal(new Set(result.map(a => a.slug)).size, 3);
});

test('clinic recommendations stay in clinic material; no unrelated filler is required', () => {
  const article = articles.find(a => a.slug === 'financiamento-pacientes-clinicas')!;
  assert.ok(selectRelatedArticles(article, articles).every(a => a.category === 'para-clinicas'));
  assert.deepEqual(selectRelatedArticles({ slug: 'unrelated', title: 'Tema único', category: 'para-clinicas' }, articles), []);
  assert.deepEqual(selectRelatedArticles(article, articles, 0), []);
});

test('implant, dentistry and other specialties lead to the corresponding clinic page', () => {
  assert.equal(articleClinicDestination({ slug: 'implante-dentario', title: '', category: '' }).href, IMPLANT_FINANCING_PATH);
  assert.equal(articleClinicDestination({ slug: '', title: 'Financiamento odontológico', category: '' }).href, CLINIC_FINANCING_PATH);
  assert.equal(articleClinicDestination({ slug: '', title: 'Cirurgia de catarata', category: '' }).href, '/clinicas');
});

test('new commercial landing pages retain acquisition path and ChatGPT origin', () => {
  for (const path of [CLINIC_FINANCING_PATH, IMPLANT_FINANCING_PATH]) {
    const touch = buildTouch({ path: `${path}?utm_source=chatgpt.com`, utm_source: 'chatgpt.com' });
    assert.equal(touch.landing, path);
    assert.equal(touch.channel, 'ChatGPT');
  }
});
