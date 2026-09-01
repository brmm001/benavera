import type { PatientLead, ClinicLead, TrackingEvent } from '@/types';
export { trackEvent } from '@/lib/analytics';

// ============================================================
// LEAD SUBMISSION
// ============================================================

export async function submitLead(
  data: Omit<PatientLead | ClinicLead, 'timestamp'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const payload = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  const endpoint =
    process.env.NEXT_PUBLIC_BENAVERA_LEAD_ENDPOINT ||
    (data.tipoLead === 'clinic' ? '/api/leads/clinic' : '/api/leads/patient');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = (await response.json()) as { success?: boolean; id?: string; error?: string };

    if (!response.ok || json.success === false) {
      return {
        success: false,
        error: json.error || `Erro no servidor (${response.status}). Tente novamente.`,
      };
    }

    return { success: true, id: json.id };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Tempo limite excedido. Verifique sua conexão e tente novamente.' };
    }
    console.error('[Benavera] Erro ao enviar lead:', err);
    return {
      success: false,
      error: 'Não foi possível enviar sua solicitação no momento. Verifique sua conexão e tente novamente.',
    };
  }
}

// ============================================================
// UTM PARAMS
// ============================================================

export function captureUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const result: Record<string, string> = {};

  utmKeys.forEach((key) => {
    const value = params.get(key);
    if (value) {
      const camelKey = key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());
      result[camelKey] = value;
      sessionStorage.setItem(key, value);
    } else {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const camelKey = key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());
        result[camelKey] = stored;
      }
    }
  });

  return result;
}

export function getStoredUTMs(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const result: Record<string, string> = {};

  utmKeys.forEach((key) => {
    const value = sessionStorage.getItem(key);
    if (value) {
      const camelKey = key.replace(/_([a-z])/g, (_, l: string) => l.toUpperCase());
      result[camelKey] = value;
    }
  });

  return result;
}

// ============================================================
// FORMATAÇÃO BRASILEIRA
// ============================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatCurrencyInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  return digits;
}

export function parseCurrencyInput(value: string): number {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}
