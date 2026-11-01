// Constantes e helpers de autenticação — sem 'use server'
// Importado tanto pelos server actions quanto pelo middleware

export const COOKIE_NAME = 'bv_admin';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export function getAdminToken(): string {
  const token = process.env.ADMIN_SECRET;
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_SECRET não configurado em produção.');
    }
    return 'bv-dev-token-local-only';
  }
  return token;
}

export function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_PASSWORD não configurado em produção.');
    }
    return 'dev-password-local-only';
  }
  return password;
}
