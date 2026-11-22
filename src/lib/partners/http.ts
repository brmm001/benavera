// src/lib/partners/http.ts
// Cliente HTTP seguro para conectores de financeiras (timeout, retry controlado e sanitização)

export class PartnerHttpError extends Error {
  readonly status: number;
  readonly errorCode?: string | number;

  constructor(message: string, status: number, errorCode?: string | number) {
    super(message);
    this.name = 'PartnerHttpError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

export interface PartnerFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Retry único em falha transitória (rede / 5xx). Usar apenas em operações idempotentes. */
  retryOnTransient?: boolean;
}

export function onlyDigits(value: string | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}

/** Mascara CPF para logs e auditoria: ***.***.***-12 */
export function maskCpf(cpf: string | null | undefined): string {
  const digits = onlyDigits(cpf);
  if (digits.length < 2) return '***.***.***-**';
  return `***.***.***-${digits.slice(-2)}`;
}

function createCombinedSignal(timeoutMs: number, externalSignal?: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Timeout após ${timeoutMs}ms`));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort(externalSignal.reason);
      return { signal: controller.signal, cleanup: () => {} };
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    },
  };
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

async function parseErrorResponse(res: Response): Promise<{ errorCode?: string | number; message: string }> {
  try {
    const text = await res.text();
    if (!text) return { message: `HTTP ${res.status}` };
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      const errorCode =
        typeof parsed.errorCode === 'string' || typeof parsed.errorCode === 'number'
          ? parsed.errorCode
          : undefined;
      const msg = typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message.trim().slice(0, 240)
        : `HTTP ${res.status}`;
      return { errorCode, message: msg };
    }
    return { message: `HTTP ${res.status}` };
  } catch {
    return { message: `HTTP ${res.status}` };
  }
}

export async function partnerFetch<T = Record<string, unknown>>(
  url: string,
  options: PartnerFetchOptions = {}
): Promise<T> {
  const {
    method = 'POST',
    body,
    headers = {},
    timeoutMs = 12000,
    signal,
    retryOnTransient = false,
  } = options;

  const maxAttempts = retryOnTransient ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new PartnerHttpError('Requisição cancelada por timeout do hub.', 408);
    }

    const { signal: attemptSignal, cleanup } = createCombinedSignal(timeoutMs, signal);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: attemptSignal,
        cache: 'no-store',
      });

      cleanup();

      if (!res.ok) {
        const parsed = await parseErrorResponse(res);
        const err = new PartnerHttpError(parsed.message, res.status, parsed.errorCode);
        // Nunca faz retry em 4xx
        if (res.status >= 400 && res.status < 500) {
          throw err;
        }
        // 5xx: retry único apenas se retryOnTransient estiver habilitado
        lastError = err;
        if (attempt < maxAttempts) continue;
        throw err;
      }

      const text = await res.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (err) {
      cleanup();
      if (err instanceof PartnerHttpError && err.status >= 400 && err.status < 500) {
        throw err;
      }
      if (signal?.aborted) {
        throw new PartnerHttpError('Timeout na comunicação com a financeira.', 408);
      }
      lastError = err;
      if (attempt < maxAttempts) continue;
    }
  }

  if (lastError instanceof PartnerHttpError) {
    throw lastError;
  }
  const msg = lastError instanceof Error ? lastError.message.slice(0, 200) : 'Falha de comunicação com a financeira.';
  throw new PartnerHttpError(msg, 502);
}
