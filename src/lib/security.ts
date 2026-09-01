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
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) {
    // Para evitar vazamento de tamanho via timing, fazemos hashing fixo
    const hashA = crypto.createHash('sha256').update(bufA).digest();
    const hashB = crypto.createHash('sha256').update(bufB).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }
  return crypto.timingSafeEqual(bufA, bufB);
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

  if (cookieSecret && timingSafeCompare(cookieSecret, validToken)) {
    return true;
  }
  if (headerSecret && (timingSafeCompare(headerSecret, rawAdminSecret) || timingSafeCompare(headerSecret, validToken))) {
    return true;
  }

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
