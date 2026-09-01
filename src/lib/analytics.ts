'use client';

import type { TrackingEvent } from '@/types';

// Declaração de tipos para extensões de janela
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (command: string, ...args: unknown[]) => void;
  }
}

/**
 * Dispara eventos analíticos seguros (sem PII) para GA4, Meta Pixel e Microsoft Clarity.
 */
export function trackEvent(event: TrackingEvent): void {
  if (typeof window === 'undefined') return;

  const eventName = event.event;
  const properties = event.properties || {};

  // Log de desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics Event]', eventName, properties);
  }

  try {
    // 1. Google Analytics (GA4)
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, properties);
    }

    // 2. Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('trackCustom', eventName, properties);
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
