// Constantes e helpers de autenticação — sem 'use server'
// Importado tanto pelos server actions quanto pelo middleware

export const COOKIE_NAME = 'bv_admin';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export function getAdminToken(): string {
  return process.env.ADMIN_SECRET ?? 'bv-secure-token-9x2k7p4m8q1r';
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? 'Bvr@Admin#2026!';
}
