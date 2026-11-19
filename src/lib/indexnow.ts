// src/lib/indexnow.ts
// IndexNow (Microsoft Bing, Yandex, etc.): avisa os buscadores quando uma URL é criada/atualizada/removida.
// A chave é pública por definição do protocolo: precisa estar acessível em {SITE}/{KEY}.txt (ver /public).

import { SITE_URL } from './seo';

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'b001e61b2ee847ebbde6101056527954';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10000;

/** Converte slugs/paths em URLs absolutas do próprio site (ignora qualquer outro host). */
export function toSiteUrls(pathsOrUrls: string[]): string[] {
  const host = new URL(SITE_URL).host;
  const out = new Set<string>();
  for (const item of pathsOrUrls) {
    try {
      const u = new URL(item, SITE_URL);
      if (u.host === host) out.add(`${SITE_URL}${u.pathname === '/' ? '' : u.pathname}${u.search}`);
    } catch { /* ignora entradas inválidas */ }
  }
  return [...out];
}

/**
 * Envia URLs ao IndexNow. Nunca lança erro (indexação é best-effort e não deve quebrar o fluxo do CMS).
 * Só executa em produção, a menos que force=true.
 */
export async function submitToIndexNow(
  pathsOrUrls: string[],
  opts: { force?: boolean } = {}
): Promise<{ submitted: number; ok: boolean; status?: number; skipped?: string }> {
  const urlList = toSiteUrls(pathsOrUrls).slice(0, MAX_URLS_PER_REQUEST);
  if (urlList.length === 0) return { submitted: 0, ok: true, skipped: 'sem URLs' };
  if (process.env.NODE_ENV !== 'production' && !opts.force) {
    return { submitted: 0, ok: true, skipped: 'ambiente não-produção' };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(8000),
    });
    // 200 = ok, 202 = recebido (validação da chave pendente)
    const ok = res.status === 200 || res.status === 202;
    if (!ok) console.error('[IndexNow] Resposta inesperada:', res.status);
    return { submitted: urlList.length, ok, status: res.status };
  } catch (err) {
    console.error('[IndexNow] Falha ao enviar:', err);
    return { submitted: 0, ok: false };
  }
}
