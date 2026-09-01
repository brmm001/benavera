'use client';

// Declaração global de bibliotecas analíticas externas
declare global {
  interface Window {
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

/**
 * Dispara eventos analíticos estritamente anônimos (sem PII) para GA4, Meta Pixel e Microsoft Clarity.
 */
export function trackEvent(
  event: string | TrackingEventObject,
  properties?: SafeEventProperties
): void {
  if (typeof window === 'undefined') return;

  const eventName = typeof event === 'object' && event !== null ? event.event : event;
  const eventProps =
    (typeof event === 'object' && event !== null ? event.properties : properties) || {};

  // Log seguro em ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics Safe Event]', eventName, eventProps);
  }

  try {
    // 1. Google Analytics (GA4)
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventProps);
    }

    // 2. Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, eventProps);
    }

    // 3. Microsoft Clarity Custom Event
    if (typeof window.clarity === 'function') {
      window.clarity('event', eventName);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics Error]', error);
    }
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
