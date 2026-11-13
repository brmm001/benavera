'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { isPublicPath, SITE_URL } from '@/lib/seo';
import { flushAnalytics, trackEvent, pauseAnalytics } from '@/lib/analytics';
import { createSerialTaskQueue } from '@/lib/serial-task-queue';

type Consent = 'essential' | 'analytics' | 'all';
const GOOGLE_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';
const ADS_ID = 'AW-625816226';
const configuredClarity = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID || '';
const CLARITY_ID = /^[a-z0-9]+$/i.test(configuredClarity) ? configuredClarity : 'ybp8ugw8gf';
// Never load third-party trackers on treatment content, forms, or authenticated routes.
const EXTERNAL_PATHS = ['/', '/clinicas', '/condicoes', '/benavera-ou-capim', '/sobre', '/contato', '/como-funciona', '/solucoes-financeiras-para-clinicas', '/seja-representante'];
function readConsent(): Consent | null {
  const match = document.cookie.match(/(?:^|; )bv_consent=(essential|analytics|all)(?:;|$)/);
  return match ? match[1] as Consent : null;
}
function subscribeConsent(listener: () => void) {
  window.addEventListener('bv:consent', listener);
  return () => window.removeEventListener('bv:consent', listener);
}
function writeConsent(value: Consent) {
  document.cookie = `bv_consent=${value}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  window.dispatchEvent(new Event('bv:consent'));
}
function campaignParams() {
  const query = new URLSearchParams(location.search);
  return Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','ref','gclid','gbraid','wbraid'].map(key => [key, query.get(key) || '']));
}
export function PublicAnalytics() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const lastPage = useRef('');
  const externalLoaded = useRef(false);
  const entry = useRef<Record<string, string> | null>(null);
  const sessionQueue = useRef(createSerialTaskQueue());
  const isPublic = isPublicPath(pathname);
  const externalAllowed = EXTERNAL_PATHS.includes(pathname);
  const gaId = /^G-[A-Z0-9]+$/.test(GOOGLE_ID) ? GOOGLE_ID : '';
  const googleEnabled = externalAllowed && (consent === 'all' || (consent === 'analytics' && !!gaId));

  useEffect(() => {
    const preferences = () => setShow(true);
    window.addEventListener('bv:privacy', preferences);
    return () => window.removeEventListener('bv:privacy', preferences);
  }, []);

  useEffect(() => {
    if (!entry.current && isPublic) {
      entry.current = { path: pathname, referrer: document.referrer, ...campaignParams() };
    }
    if (!isPublic || !consent || consent === 'essential') return;
    const key = pathname + location.search;
    if (lastPage.current === key) return;
    const firstPage = !lastPage.current;
    lastPage.current = key;
    window.bvAnalyticsReady = false;
    const body = firstPage ? entry.current : { path: pathname, referrer: '', ...campaignParams() };
    // A fast navigation must wait until the first response installs its HttpOnly cookies.
    // Otherwise two concurrent requests create two visitors and can lose the first source.
    void sessionQueue.current(async () => {
      if (!['analytics', 'all'].includes(readConsent() || '')) return;
      const response = await fetch('/api/analytics/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
      if (!response.ok) throw new Error('Analytics session unavailable');
      if (['analytics', 'all'].includes(readConsent() || '')) {
        window.bvAnalyticsReady = true; flushAnalytics();
      }
    }).catch(() => { lastPage.current = ''; });
  }, [pathname, consent, isPublic]);

  useEffect(() => {
    if (externalLoaded.current && !externalAllowed) {
      window.clarity?.('stop');
      window.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      // Unload trackers before rendering a form/private journey in a lasting document.
      window.location.replace(window.location.href);
    }
  }, [pathname, externalAllowed]);

  useEffect(() => {
    if (!googleEnabled || !loaded) return;
    externalLoaded.current = true;
    window.gtag?.('consent', 'update', { analytics_storage: 'granted', ad_storage: consent === 'all' ? 'granted' : 'denied', ad_user_data: consent === 'all' ? 'granted' : 'denied', ad_personalization: 'denied' });
    if (gaId) window.gtag?.('event', 'page_view', { send_to: gaId, page_location: SITE_URL + pathname, page_referrer: '', page_title: document.title });
  }, [pathname, consent, loaded, googleEnabled, gaId]);

  useEffect(() => {
    if (!isPublic) return;
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = new URL(anchor.href, location.origin);
      if (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com') trackEvent('whatsapp_clicked');
      else if (url.origin === location.origin && ['/credenciamento', '/simular', '/simuladorclinicas'].includes(url.pathname)) trackEvent('cta_clicked', { source: url.pathname.slice(1) });
      if (externalLoaded.current && url.origin === location.origin && !EXTERNAL_PATHS.includes(url.pathname) && !event.ctrlKey && !event.metaKey && anchor.target !== '_blank') {
        event.preventDefault(); event.stopImmediatePropagation(); window.location.assign(anchor.href);
      }
    };
    const started = new WeakSet<HTMLFormElement>();
    const focus = (event: FocusEvent) => {
      const form = (event.target as Element)?.closest?.('form');
      if (form && !started.has(form)) {
        started.add(form);
        trackEvent(pathname === '/simular' ? 'simulation_started' : 'clinic_form_started');
      }
    };
    document.addEventListener('click', click, true);
    document.addEventListener('focusin', focus);
    return () => { document.removeEventListener('click', click, true); document.removeEventListener('focusin', focus); };
  }, [pathname, isPublic]);

  async function choose(value: Consent) {
    if (consent === 'essential' && value !== 'essential') {
      entry.current = { path: pathname, referrer: document.referrer, ...campaignParams() };
      lastPage.current = '';
    }
    writeConsent(value);
    if (value === 'essential') {
      pauseAnalytics();
      lastPage.current = '';
      // Delete after any in-flight session response, so revocation cannot be undone by it.
      await sessionQueue.current(async () => { await fetch('/api/analytics/session', { method: 'DELETE' }); }).catch(() => {});
    }
    if (externalLoaded.current && value !== consent) { location.reload(); return; }
    setShow(false);
  }

  if (!isPublic) return null;
  return <>
    {googleEnabled && <>
      <Script id="bv-google-consent" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());${gaId ? `gtag('config','${gaId}',{send_page_view:false,page_location:'${SITE_URL}${pathname}',page_referrer:''});` : ''}${consent === 'all' ? `gtag('config','${ADS_ID}',{send_page_view:false,allow_ad_personalization_signals:false});` : ''}`}</Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId || ADS_ID}`} strategy="afterInteractive" onLoad={() => { externalLoaded.current = true; setLoaded(true); }} />
    </>}
    {consent === 'all' && externalAllowed && <Script id="bv-clarity" strategy="afterInteractive" onReady={() => { externalLoaded.current = true; window.clarity?.('consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' }); }}>{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script','${CLARITY_ID}');`}</Script>}
    {(show || consent === null) && <section role="dialog" aria-label="Preferências de privacidade" style={{ position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 760, margin: 'auto', zIndex: 10000, padding: 20, borderRadius: 16, background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', boxShadow: '0 8px 40px #0003' }}>
      <p style={{ fontWeight: 700 }}>Suas preferências de privacidade</p>
      <p style={{ fontSize: 14, lineHeight: 1.6, margin: '8px 0 14px' }}>Com sua permissão, medimos a origem das visitas e os cliques para melhorar o site. Marketing também habilita Google Ads e análise de navegação nas páginas institucionais. Formulários e áreas privadas ficam fora das gravações. Você pode alterar a escolha no rodapé. <Link href="/privacidade" style={{ textDecoration: 'underline' }}>Política de privacidade</Link>.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{([['essential','Só essenciais'],['analytics','Permitir métricas'],['all','Métricas e marketing']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => void choose(value)} style={{ border: '1px solid #6366f1', color: '#3730a3', background: '#fff', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}>{label}</button>)}</div>
    </section>}
  </>;
}
