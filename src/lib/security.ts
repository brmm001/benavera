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

import { SignJWT, jwtVerify } from 'jose';

// Chave secreta em Uint8Array para uso do jose
function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_SECRET || 'benavera-admin-secret-2026-very-long-string-for-security';
  return new TextEncoder().encode(secret);
}

/**
 * Retorna a senha administrativa configurada em variável de ambiente.
 */
export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || 'benavera2026';
}

/**
 * Gera um token JWT seguro para o administrador
 */
export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

/**
 * Valida um token JWT e retorna verdadeiro se for válido
 */
export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.role === 'admin';
  } catch (error) {
    console.log('[DEBUG AUTH] Token JWT inválido ou expirado');
    return false;
  }
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
