// lib/secrets.ts
// Resolução centralizada de segredos de assinatura (JWT).
// - Nunca usa strings fixas conhecidas em produção (antes havia fallbacks públicos no código,
//   o que permitia forjar sessões caso a variável de ambiente não estivesse configurada).
// - Se JWT_SECRET não existir em produção, deriva uma chave forte (SHA-256) a partir de
//   segredos já existentes no servidor (ADMIN_SECRET / DATABASE_URL), que nunca saem do backend.
// - Compatível com Edge Runtime (usa Web Crypto).

const cache = new Map<string, Uint8Array>();

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

async function resolveKey(purpose: string, primary: Array<string | undefined>): Promise<Uint8Array> {
  const cached = cache.get(purpose);
  if (cached) return cached;

  const explicit = primary.find(v => v && v.trim().length > 0);
  let key: Uint8Array;

  if (explicit) {
    key = new TextEncoder().encode(explicit.trim());
  } else {
    const base = process.env.ADMIN_SECRET || process.env.DATABASE_URL;
    if (base && base.trim()) {
      key = await sha256(`benavera:${purpose}:${base.trim()}`);
    } else if (process.env.NODE_ENV !== 'production') {
      key = await sha256(`benavera:${purpose}:local-dev-only`);
    } else {
      throw new Error(`Segredo de assinatura (${purpose}) não configurado. Defina JWT_SECRET no ambiente.`);
    }
  }

  cache.set(purpose, key);
  return key;
}

/** Chave das sessões principais (clínica, staff, atendente) — cookie benavera_session */
export function getJwtKey(): Promise<Uint8Array> {
  return resolveKey('session', [process.env.JWT_SECRET]);
}

/** Chave das sessões do wizard de credenciamento — cookie benavera_clinic_session */
export function getClinicSessionKey(): Promise<Uint8Array> {
  return resolveKey('clinic-session', [process.env.CLINIC_SESSION_SECRET, process.env.JWT_SECRET && `${process.env.JWT_SECRET}:clinic`]);
}

/** Chave do portal legado — cookie benavera_portal_session */
export function getPortalKey(): Promise<Uint8Array> {
  return resolveKey('portal', [process.env.PORTAL_JWT_SECRET, process.env.JWT_SECRET && `${process.env.JWT_SECRET}:portal`]);
}

/** Comparação de strings em tempo constante (evita timing attacks em senhas/tokens). */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const len = Math.max(ea.length, eb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  }
  return diff === 0;
}

