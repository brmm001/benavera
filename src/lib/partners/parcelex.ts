// src/lib/partners/parcelex.ts
// Conector REST da Parcelex implementando PartnerAdapter

import { PartnerHttpError, onlyDigits, partnerFetch } from './http';
import type {
  AuthorizeResult,
  HubApplicant,
  HubOffer,
  PartnerAdapter,
  PartnerStatus,
  QuoteResult,
} from './types';

const DEFAULT_TIMEOUT_MS = 12000;
const MAX_QUOTED_OFFERS = 8;

interface ParcelexOptionRaw {
  _id?: string;
  numberOfInstallments?: number;
  paymentInstallments?: number;
  interestRatePM?: number;
  cetPA?: number;
  cetPM?: number;
  financedAmount?: number;
  totalAmount?: number;
  downPaymentValue?: number;
}

interface ParcelexDownPaymentGroup {
  downPaymentPercentage?: number;
  downPaymentValue?: number;
  options?: ParcelexOptionRaw[];
}

interface ParcelexOptionsResponse {
  checkoutId?: string;
  result?: 'APPROVED' | 'DENIED' | 'NO_ACTION' | 'PRICE_OUT_RANGE' | string;
  refusalReason?: string;
  trackId?: string;
  error?: boolean;
  downPaymentOptions?: ParcelexDownPaymentGroup[];
}

interface ParcelexAuthorizeResponse {
  transactionId?: string;
  returnUrl?: string;
  onboardingToken?: string;
  orderId?: string;
  downPayment?: boolean;
  downPaymentValue?: number;
  financedAmount?: number;
  interestRatePM?: number;
  numberOfInstallments?: number;
  paymentInstallments?: number;
  totalAmount?: number;
}

interface ParcelexOnboardingLinkResponse {
  onboardingLink?: string;
}

interface ParcelexTransactionResponse {
  id?: string;
  transactionId?: string;
  status?: 'ABANDONED' | 'CANCELED' | 'CLOSED' | 'PENDING' | 'PROCESSING_CANCEL' | 'OPEN' | string;
  step?: string;
  cancelReason?: string;
  canceledAt?: string;
  financedAmount?: number;
  totalAmount?: number;
  transferValue?: number;
  transferedAt?: string;
}

function getConfig(): { apiKey: string; baseUrl: string; timeoutMs: number } | null {
  const apiKey = (process.env.PARCELEX_API_KEY || '').trim();
  const rawBase = (process.env.PARCELEX_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!apiKey || !rawBase || !rawBase.startsWith('https://')) {
    return null;
  }
  try {
    const parsed = new URL(rawBase);
    if (parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  const timeoutRaw = Number(process.env.PARCELEX_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw >= 1000 && timeoutRaw <= 60000
    ? timeoutRaw
    : DEFAULT_TIMEOUT_MS;

  return { apiKey, baseUrl: rawBase, timeoutMs };
}

function validateApplicantForParcelex(applicant: HubApplicant): string[] {
  const missing: string[] = [];
  const p = applicant.patient;
  if (onlyDigits(p.cpf).length !== 11) missing.push('cpf');
  if (onlyDigits(p.celular).length < 10) missing.push('celular');
  if (!p.email?.trim()) missing.push('email');
  if (onlyDigits(p.cep).length !== 8) missing.push('cep');
  if (!p.logradouro?.trim()) missing.push('logradouro');
  if (!p.numero?.trim()) missing.push('numero');
  if (!p.cidade?.trim()) missing.push('cidade');
  if (!p.estado?.trim()) missing.push('estado');
  return missing;
}

function extractBestOffers(groups: ParcelexDownPaymentGroup[] | undefined, fallbackFinanced: number): HubOffer[] {
  if (!Array.isArray(groups) || groups.length === 0) return [];

  // Priorizar entrada 0% e, em seguida, menores percentuais de entrada
  const sortedGroups = [...groups].sort((a, b) => {
    const pa = Number(a.downPaymentPercentage ?? 0);
    const pb = Number(b.downPaymentPercentage ?? 0);
    if (pa === 0 && pb !== 0) return -1;
    if (pb === 0 && pa !== 0) return 1;
    return pa - pb;
  });

  const selectedByInstallments = new Map<number, HubOffer>();

  for (const group of sortedGroups) {
    const options = Array.isArray(group.options) ? group.options : [];
    const bestInGroup = new Map<number, ParcelexOptionRaw>();

    for (const opt of options) {
      if (!opt._id || !opt.numberOfInstallments || !opt.paymentInstallments) continue;
      const installments = Number(opt.numberOfInstallments);
      const current = bestInGroup.get(installments);
      const optTotal = Number(opt.totalAmount ?? opt.paymentInstallments * installments);
      const curTotal = current
        ? Number(current.totalAmount ?? Number(current.paymentInstallments) * installments)
        : Number.POSITIVE_INFINITY;

      if (!current || optTotal < curTotal) {
        bestInGroup.set(installments, opt);
      }
    }

    const orderedInstallments = [...bestInGroup.keys()].sort((a, b) => a - b);
    for (const installments of orderedInstallments) {
      if (selectedByInstallments.has(installments)) continue;
      const opt = bestInGroup.get(installments)!;
      const entrada = Number(opt.downPaymentValue ?? group.downPaymentValue ?? 0);
      const valorParcela = Number(opt.paymentInstallments);
      const valorFinanciado = Number(opt.financedAmount ?? fallbackFinanced);
      const valorTotal = Number(opt.totalAmount ?? valorParcela * installments + entrada);

      selectedByInstallments.set(installments, {
        externalOptionId: String(opt._id),
        parcelas: installments,
        valorParcela,
        entrada,
        valorFinanciado,
        valorTotal,
        taxaMensal: typeof opt.interestRatePM === 'number' ? opt.interestRatePM : undefined,
        cetAnual: typeof opt.cetPA === 'number' ? opt.cetPA : undefined,
        validadeHoras: 24,
      });

      if (selectedByInstallments.size >= MAX_QUOTED_OFFERS) {
        return [...selectedByInstallments.values()];
      }
    }
  }

  return [...selectedByInstallments.values()];
}

function sanitizeOptionsResponse(
  data: ParcelexOptionsResponse,
  offers: HubOffer[]
): Record<string, unknown> {
  return {
    checkoutId: data.checkoutId || null,
    result: data.result || null,
    refusalReason: data.refusalReason || null,
    trackId: data.trackId || null,
    offersCount: offers.length,
    offersSummary: offers.map(o => ({
      parcelas: o.parcelas,
      valorParcela: o.valorParcela,
      entrada: o.entrada,
      valorTotal: o.valorTotal,
      taxaMensal: o.taxaMensal ?? null,
    })),
  };
}

export const parcelexAdapter: PartnerAdapter = {
  slug: 'parcelex',

  isConfigured(): boolean {
    return getConfig() !== null;
  },

  async quote(applicant: HubApplicant, signal: AbortSignal): Promise<QuoteResult> {
    const cfg = getConfig();
    if (!cfg) {
      return {
        status: 'ERROR',
        offers: [],
        motivo: 'Integração Parcelex não configurada no ambiente.',
        raw: { error: 'NOT_CONFIGURED' },
      };
    }

    const missing = validateApplicantForParcelex(applicant);
    if (missing.length > 0) {
      return {
        status: 'ERROR',
        offers: [],
        motivo: `Dados do paciente incompletos: ${missing.join(', ')}`,
        raw: { missingFields: missing },
      };
    }

    const p = applicant.patient;
    const payload = {
      apiKey: cfg.apiKey,
      cpf: onlyDigits(p.cpf),
      phone: onlyDigits(p.celular),
      email: p.email.trim(),
      zipCode: onlyDigits(p.cep),
      addressStreet: p.logradouro.trim(),
      addressNumber: p.numero.trim(),
      addressComplement: (p.complemento || '').trim(),
      city: p.cidade.trim(),
      state: p.estado.trim(),
      device: 'desktop',
      source: 'site',
      shipping: 0,
      productPrice: applicant.valorFinanciado,
      productAmount: 1,
      products: [
        {
          id: applicant.applicationId,
          name: applicant.procedimento || applicant.categoria || 'Procedimento Clínico',
          amount: 1,
          value: applicant.valorFinanciado,
          ...(applicant.categoria ? { category: applicant.categoria } : {}),
        },
      ],
    };

    try {
      const data = await partnerFetch<ParcelexOptionsResponse>(`${cfg.baseUrl}/options`, {
        method: 'POST',
        body: payload,
        timeoutMs: cfg.timeoutMs,
        signal,
        retryOnTransient: true,
      });

      const offers =
        data.result === 'APPROVED'
          ? extractBestOffers(data.downPaymentOptions, applicant.valorFinanciado)
          : [];
      const sanitized = sanitizeOptionsResponse(data, offers);

      if (data.result === 'APPROVED' && offers.length > 0) {
        return {
          status: 'OFFERS',
          externalId: data.checkoutId,
          offers,
          raw: sanitized,
        };
      }

      if (
        data.result === 'DENIED' ||
        data.result === 'NO_ACTION' ||
        data.result === 'PRICE_OUT_RANGE' ||
        data.result === 'APPROVED'
      ) {
        return {
          status: 'REJECTED',
          externalId: data.checkoutId,
          offers: [],
          motivo: data.refusalReason || data.result || 'Sem ofertas disponíveis',
          raw: sanitized,
        };
      }

      return {
        status: 'ERROR',
        externalId: data.checkoutId,
        offers: [],
        motivo: data.refusalReason || 'Resposta inesperada da Parcelex',
        raw: sanitized,
      };
    } catch (err) {
      const httpErr = err instanceof PartnerHttpError ? err : null;
      return {
        status: 'ERROR',
        offers: [],
        motivo: httpErr ? httpErr.message : 'Erro ao consultar Parcelex.',
        raw: {
          httpStatus: httpErr?.status ?? 500,
          errorCode: httpErr?.errorCode ?? null,
        },
      };
    }
  },

  async authorize(externalOptionId: string, orderId: string): Promise<AuthorizeResult> {
    const cfg = getConfig();
    if (!cfg) {
      throw new PartnerHttpError('Integração Parcelex não configurada no ambiente.', 500);
    }

    const data = await partnerFetch<ParcelexAuthorizeResponse>(`${cfg.baseUrl}/authorize`, {
      method: 'POST',
      body: {
        apiKey: cfg.apiKey,
        optionId: externalOptionId,
        orderId,
      },
      timeoutMs: cfg.timeoutMs,
      retryOnTransient: false,
    });

    if (!data.transactionId) {
      throw new PartnerHttpError('Parcelex não retornou transactionId na autorização.', 502);
    }

    let redirectUrl = data.returnUrl?.trim() || undefined;
    if (!redirectUrl) {
      try {
        const linkData = await partnerFetch<ParcelexOnboardingLinkResponse>(
          `${cfg.baseUrl}/public/transaction/${encodeURIComponent(data.transactionId)}/onboarding-link`,
          {
            method: 'GET',
            headers: { 'x-parcelex-apikey': cfg.apiKey },
            timeoutMs: cfg.timeoutMs,
            retryOnTransient: true,
          }
        );
        if (linkData.onboardingLink?.trim()) {
          redirectUrl = linkData.onboardingLink.trim();
        }
      } catch {
        // Se falhar o fallback de onboarding-link, mantemos sem redirectUrl sem abortar a autorização já efetuada
      }
    }

    return {
      externalTransactionId: data.transactionId,
      redirectUrl,
      raw: {
        transactionId: data.transactionId,
        orderId: data.orderId || orderId,
        downPayment: Boolean(data.downPayment),
        downPaymentValue: data.downPaymentValue ?? 0,
        financedAmount: data.financedAmount ?? null,
        interestRatePM: data.interestRatePM ?? null,
        numberOfInstallments: data.numberOfInstallments ?? null,
        paymentInstallments: data.paymentInstallments ?? null,
        totalAmount: data.totalAmount ?? null,
        hasReturnUrl: Boolean(redirectUrl),
      },
    };
  },

  async getStatus(externalTransactionId: string): Promise<PartnerStatus> {
    const cfg = getConfig();
    if (!cfg) {
      throw new PartnerHttpError('Integração Parcelex não configurada no ambiente.', 500);
    }

    const data = await partnerFetch<ParcelexTransactionResponse>(
      `${cfg.baseUrl}/public/transaction/${encodeURIComponent(externalTransactionId)}`,
      {
        method: 'POST',
        body: { apiKey: cfg.apiKey },
        timeoutMs: cfg.timeoutMs,
        retryOnTransient: true,
      }
    );

    const status = String(data.status || '').toUpperCase();
    const step = data.step ? String(data.step).toUpperCase() : undefined;
    const cancelReason = data.cancelReason ? String(data.cancelReason).toUpperCase() : undefined;

    let normalized: PartnerStatus['normalized'] = 'IN_PROGRESS';
    if (cancelReason === 'ONBOARDING_REFUSED') {
      normalized = 'DENIED';
    } else if (status === 'CANCELED' || status === 'PROCESSING_CANCEL') {
      normalized = 'CANCELLED';
    } else if (status === 'ABANDONED') {
      normalized = 'ABANDONED';
    } else if (status === 'CLOSED' || (status === 'OPEN' && step === 'COMPLETE')) {
      normalized = 'APPROVED';
    } else {
      normalized = 'IN_PROGRESS';
    }

    return {
      normalized,
      externalStatus: status || 'UNKNOWN',
      step,
      raw: {
        id: data.id || null,
        transactionId: data.transactionId || externalTransactionId,
        status: data.status || null,
        step: data.step || null,
        cancelReason: data.cancelReason || null,
        canceledAt: data.canceledAt || null,
        financedAmount: data.financedAmount ?? null,
        totalAmount: data.totalAmount ?? null,
        transferValue: data.transferValue ?? null,
        transferedAt: data.transferedAt || null,
      },
    };
  },

  async cancel(externalTransactionId: string): Promise<void> {
    const cfg = getConfig();
    if (!cfg) {
      throw new PartnerHttpError('Integração Parcelex não configurada no ambiente.', 500);
    }

    await partnerFetch(`${cfg.baseUrl}/cancel`, {
      method: 'POST',
      body: {
        apiKey: cfg.apiKey,
        transactionId: externalTransactionId,
      },
      timeoutMs: cfg.timeoutMs,
      retryOnTransient: false,
    });
  },
};
