import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTouch, classifyChannel, safePath, safeToken } from '../src/lib/acquisition';
import { isoDate, jsonLd } from '../src/lib/seo';
import { createSerialTaskQueue } from '../src/lib/serial-task-queue';

test('ChatGPT is attributed only from a recognized referrer or campaign', () => {
  assert.equal(buildTouch({ path: '/clinicas', referrer: 'https://chatgpt.com/c/example?secret=1' }).channel, 'ChatGPT');
  assert.equal(buildTouch({ path: '/clinicas', utm_source: 'chatgpt.com' }).channel, 'ChatGPT');
  assert.equal(buildTouch({ path: '/clinicas' }).channel, 'Direto / não identificado');
  assert.notEqual(buildTouch({ referrer: 'https://notchatgpt.com' }).channel, 'ChatGPT');
});
test('paid, organic, partner and other AI traffic remain distinct', () => {
  assert.equal(classifyChannel('google', 'cpc', ''), 'Mídia paga');
  assert.equal(classifyChannel('', '', 'www.google.com.br'), 'Busca orgânica');
  assert.equal(buildTouch({ ref: 'ABCDEF' }).channel, 'Representantes');
  assert.equal(buildTouch({ referrer: 'https://www.perplexity.ai/search/abc' }).channel, 'Outras IAs');
});
test('tracking excludes personal tokens, query strings and private routes', () => {
  assert.equal(safeToken('person@example.com'), '');
  assert.equal(safeToken('5547999999999'), '');
  assert.equal(safePath('/clinicas?email=person@example.com'), '/clinicas');
  assert.equal(safePath('/c/private-token/formulario'), '/');
  const touch = buildTouch({ referrer: 'https://google.com/search?q=sensitive', email: 'person@example.com', gclid: 'abcdefghijk123456789' });
  assert.equal(touch.referrer, 'google.com');
  assert.equal(touch.gclid, undefined);
  assert.ok(!JSON.stringify(touch).includes('sensitive'));
  assert.ok(!JSON.stringify(touch).includes('person@'));
});
test('own navigation is not a referral and malformed dates never render Invalid Date', () => {
  assert.equal(buildTouch({ referrer: 'https://www.benavera.com.br/clinicas' }).channel, 'Direto / não identificado');
  assert.equal(isoDate(undefined), undefined);
  assert.equal(isoDate('invalid'), undefined);
  assert.equal(isoDate('2026-11-12'), '2026-11-12T00:00:00.000Z');
});
test('JSON-LD cannot terminate its script element', () => {
  assert.ok(!jsonLd({ title: '</script><script>alert(1)</script>' }).includes('<'));
});

test('rapid navigation waits for the first cookie-setting response', async () => {
  const enqueue = createSerialTaskQueue();
  let release!: () => void;
  const firstResponse = new Promise<void>(resolve => { release = resolve; });
  let cookie = '', sessions = 0;
  const sources: string[] = [];
  const first = enqueue(async () => {
    if (!cookie) sessions++;
    await firstResponse;
    cookie = 'visitor-from-chatgpt';
  });
  const next = enqueue(async () => {
    if (!cookie) sessions++;
    sources.push(cookie);
  });
  await Promise.resolve();
  assert.deepEqual(sources, []);
  release();
  await Promise.all([first, next]);
  assert.equal(sessions, 1);
  assert.deepEqual(sources, ['visitor-from-chatgpt']);
});

test('revocation follows in-flight writes and a failed write does not block later requests', async () => {
  const enqueue = createSerialTaskQueue();
  let cookie = '';
  const write = enqueue(async () => { cookie = 'visitor'; });
  const failed = enqueue(async () => { throw new Error('temporary failure'); });
  const rejected = assert.rejects(failed, /temporary failure/);
  const revoke = enqueue(async () => { cookie = ''; });
  await Promise.all([write, rejected, revoke]);
  assert.equal(cookie, '');
});
