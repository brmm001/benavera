import { isPublicPath } from '@/lib/seo';

export type Touch = {
  channel: string; source: string; medium: string; campaign: string;
  content: string; landing: string; referrer: string; at: string;
  representative: string; gclid?: string; gbraid?: string; wbraid?: string;
};
export const ANALYTICS_EVENTS = new Set([
  'page_view', 'whatsapp_clicked', 'cta_clicked', 'simulation_started',
  'simulation_step_completed', 'simulation_submitted', 'clinic_form_started',
  'clinic_form_submitted', 'calculator_used', 'article_cta_clicked',
]);

export function safeToken(value: unknown, max = 80): string {
  if (typeof value !== 'string') return '';
  const v = value.trim().replace(/\s+/g, '-');
  if (v.length > max || /@|\d{8,}/.test(v) || !/^[\p{L}\p{N}_.:-]*$/u.test(v)) return '';
  return v;
}
export function safePath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  const path = value.split(/[?#]/)[0].slice(0, 180);
  return isPublicPath(path) ? path : '/';
}
function host(value: unknown): string {
  if (typeof value !== 'string') return '';
  try { return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, '').slice(0, 120); } catch { return ''; }
}
function domainMatches(domain: string, suffix: string) { return domain === suffix || domain.endsWith(`.${suffix}`); }
export function classifyChannel(source: string, medium: string, referrer: string, paidClick = false): string {
  const s = source.toLowerCase(), m = medium.toLowerCase(), h = referrer.toLowerCase();
  if (s === 'chatgpt' || domainMatches(s, 'chatgpt.com') || domainMatches(h, 'chatgpt.com') || h === 'chat.openai.com') return 'ChatGPT';
  if (['perplexity', 'claude', 'gemini', 'copilot'].some(a => s === a) || ['perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com'].some(d => domainMatches(h, d))) return 'Outras IAs';
  if (paidClick || /^(cpc|ppc|paid|paid-search|paid_search|paid-social|paid_social|display)$/.test(m)) return 'Mídia paga';
  if (m === 'organic' || /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(h)) return 'Busca orgânica';
  if (m === 'email') return 'E-mail';
  if (m === 'representante' || m === 'referral-partner') return 'Representantes';
  if (m === 'social' || ['instagram.com', 'facebook.com', 'linkedin.com', 't.co', 'x.com', 'tiktok.com'].some(d => domainMatches(h, d))) return 'Redes sociais';
  if (s || h) return 'Referência / campanha';
  return 'Direto / não identificado';
}
export function buildTouch(input: Record<string, unknown>, marketing = false): Touch {
  let referrer = host(input.referrer);
  if (domainMatches(referrer, 'benavera.com.br') || referrer === 'localhost' || referrer.endsWith('.vercel.app')) referrer = '';
  const source = safeToken(input.utm_source), medium = safeToken(input.utm_medium);
  const representative = safeToken(input.ref);
  const click = (key: string) => marketing && typeof input[key] === 'string' && /^[\w-]{10,200}$/.test(input[key] as string) ? input[key] as string : undefined;
  const gclid = click('gclid'), gbraid = click('gbraid'), wbraid = click('wbraid');
  return { source: source || referrer || (representative ? 'representante' : '(direct)'), medium: medium || (representative ? 'representante' : referrer ? 'referral' : '(none)'),
    channel: representative && !source ? 'Representantes' : classifyChannel(source, medium, referrer, Boolean(gclid || gbraid || wbraid)),
    campaign: safeToken(input.utm_campaign), content: safeToken(input.utm_content), landing: safePath(input.path), referrer,
    representative, at: new Date().toISOString(), gclid, gbraid, wbraid };
}
