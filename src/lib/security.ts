import type { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Sanitiza strings removendo tags HTML, scripts e caracteres perigosos.
 */
export function sanitizeString(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') // Remove script blocks completely
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '') // Remove style blocks
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript pseudo-protocol
    .trim();
}

/**
 * Sanitiza recursivamente objetos e dicionários.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Mascara dados pessoais (PII) para exibição segura em logs de servidor.
 */
export function maskPII(str: string | undefined): string {
  if (!str) return '';
  if (str.includes('@')) {
    const [user, domain] = str.split('@');
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : '***';
    return `${maskedUser}@${domain}`;
  }
  // Telefone / dígitos
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 2)}*****${digits.slice(-4)}`;
  }
  // Nome
  const parts = str.trim().split(' ');
  return parts.map((p) => (p.length > 1 ? `${p[0]}***` : p)).join(' ');
}

/**
 * Comparação segura de strings em tempo constante para evitar ataques de temporização (Timing Attacks).
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  
  // Hash as strings localmente usando uma técnica segura que não depende do Node.js crypto.timingSafeEqual
  // Isto evita crashes em ambientes serverless como Vercel/Render onde o Buffer/crypto pode ter quirks
  let mismatch = a.length === b.length ? 0 : 1;
  const len = Math.max(a.length, b.length);
  
  for (let i = 0; i < len; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= (charA ^ charB);
  }
  
  return mismatch === 0 && a.length === b.length;
}

/**
 * Retorna a senha administrativa configurada em variável de ambiente.
 */
export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || 'benavera2026';
}

/**
 * Retorna o segredo de assinatura de sessão administrativa.
 */
export function getAdminSecretToken(): string {
  const password = getAdminPassword();
  const secretSalt = process.env.ADMIN_SECRET || 'benavera-admin-secret-salt-2026';
  return crypto.createHash('sha256').update(`${password}:${secretSalt}`).digest('hex');
}

/**
 * Valida autorização administrativa via Header ou Cookie seguro.
 */
export function isAuthorizedAdmin(request: NextRequest): boolean {
  const validToken = getAdminSecretToken();
  const rawAdminSecret = process.env.ADMIN_SECRET || 'benavera-admin-secret-2026';

  const headerSecret = request.headers.get('x-admin-secret');
  const cookieSecret = request.cookies.get('benavera_admin_token')?.value;

  console.log('[DEBUG AUTH] validToken:', validToken);
  console.log('[DEBUG AUTH] cookieSecret:', cookieSecret);

  if (cookieSecret && timingSafeCompare(cookieSecret, validToken)) {
    return true;
  }
  if (headerSecret && (timingSafeCompare(headerSecret, rawAdminSecret) || timingSafeCompare(headerSecret, validToken))) {
    return true;
  }

  console.log('[DEBUG AUTH] Failed! cookieSecret vs validToken mismatch or missing');
  return false;
}

/**
 * Obtém o IP real do cliente através de proxies reversos ou headers diretos.
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
