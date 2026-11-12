'use client';
import { ANALYTICS_EVENTS, safeToken } from '@/lib/acquisition';
import { isPublicPath } from '@/lib/seo';

// Declaração global de bibliotecas analíticas externas
declare global {
  interface Window {
    bvAnalyticsReady?: boolean;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

export type AllowedEventName =
  | 'simulation_started'
  | 'simulation_step_completed'
  | 'simulation_submitted'
  | 'clinic_form_started'
  | 'clinic_form_submitted'
  | 'calculator_used'
  | 'article_cta_clicked'
  | 'whatsapp_clicked'
  | (string & {});

export interface SafeEventProperties {
  category?: string;
  step?: number;
  total_steps?: number;
  calculator_type?: string;
  article_slug?: string;
  source?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TrackingEventObject {
  event: string;
  properties?: SafeEventProperties;
}

let pending: { event: string; path: string; target: string }[] = [];
let lastEvent = ''; let lastEventAt = 0;
export function pauseAnalytics() { window.bvAnalyticsReady = false; pending = []; }
export function flushAnalytics() {
  if (!window.bvAnalyticsReady) return;
  const events = pending; pending = [];
  for (const event of events) void fetch('/api/analytics/event', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), keepalive: true,
  }).catch(() => {});
}

/** Send only predefined events and campaign labels; never form values or full URLs. */
export function trackEvent(event: string | TrackingEventObject, properties?: SafeEventProperties): void {
  if (typeof window === 'undefined' || !isPublicPath(location.pathname)) return;
  if (!/(?:^|; )bv_consent=(analytics|all)(?:;|$)/.test(document.cookie)) return;
  const name = typeof event === 'object' ? event.event : event;
  if (!ANALYTICS_EVENTS.has(name) || name === 'page_view') return;
  const props = (typeof event === 'object' ? event.properties : properties) || {};
  if (lastEvent === name && Date.now() - lastEventAt < 500) return;
  lastEvent = name; lastEventAt = Date.now();
  pending.push({ event: name, path: location.pathname, target: safeToken(props.source || props.calculator_type) });
  pending = pending.slice(-30);
  flushAnalytics();
  const gaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  if (gaId && /^G-[A-Z0-9]+$/.test(gaId) && ['/', '/clinicas', '/condicoes', '/benavera-ou-capim', '/sobre', '/contato', '/como-funciona', '/solucoes-financeiras-para-clinicas', '/seja-representante'].includes(location.pathname)) {
    window.gtag?.('event', name, { send_to: gaId, page_location: 'https://www.benavera.com.br' + location.pathname, page_referrer: '' });
  }
}

/**
 * Funções utilitárias específicas e seguras
 */
export const analytics = {
  simulationStarted: (source?: string) =>
    trackEvent('simulation_started', { source }),

  simulationStepCompleted: (step: number, total_steps: number) =>
    trackEvent('simulation_step_completed', { step, total_steps }),

  simulationSubmitted: (category?: string) =>
    trackEvent('simulation_submitted', { category }),

  clinicFormStarted: (source?: string) =>
    trackEvent('clinic_form_started', { source }),

  clinicFormSubmitted: (source?: string) =>
    trackEvent('clinic_form_submitted', { source }),

  calculatorUsed: (calculator_type: string) =>
    trackEvent('calculator_used', { calculator_type }),

  articleCtaClicked: (article_slug: string) =>
    trackEvent('article_cta_clicked', { article_slug }),

  whatsappClicked: (source: string) =>
    trackEvent('whatsapp_clicked', { source }),
};
