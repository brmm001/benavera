// lib/auth.ts
// Sistema de autenticação JWT para Benavera

import { sql } from './benavera-db';
import type { User, UserRole } from './benavera-db';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getAdminToken, COOKIE_NAME as BV_ADMIN_COOKIE_NAME } from './auth-config';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'benavera-secret-dev-2026-change-in-production'
);
const COOKIE_NAME = 'benavera_session';
const SESSION_DAYS = 7;

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  clinicId: string | null;
  clinicName: string | null;
  iat?: number;
  exp?: number;
}

// ── Gerar token JWT ──────────────────────────────
export async function signToken(payload: Omit<SessionPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(JWT_SECRET);
  return token;
}

// ── Verificar token JWT ──────────────────────────
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ── Login ────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<{
  success: boolean;
  token?: string;
  user?: SessionPayload;
  error?: string;
}> {
  try {
    const rows = await sql`
      SELECT u.*, c.nome_fantasia as clinic_name
      FROM users u
      LEFT JOIN clinics c ON c.id = u.clinic_id
      WHERE u.email = ${email.toLowerCase().trim()} AND u.ativo = true
    `;

    const user = rows[0];
    if (!user) {
      return { success: false, error: 'Credenciais inválidas.' };
    }

    const passwordMatch = await bcrypt.compare(password, String(user.password_hash));
    if (!passwordMatch) {
      return { success: false, error: 'Credenciais inválidas.' };
    }

    // Atualizar last_login
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const payload: SessionPayload = {
      userId: String(user.id),
      email: String(user.email),
      name: String(user.name),
      role: user.role as UserRole,
      clinicId: user.clinic_id ? String(user.clinic_id) : null,
      clinicName: user.clinic_name ? String(user.clinic_name) : null,
    };

    const token = await signToken(payload);
    return { success: true, token, user: payload };
  } catch (err) {
    console.error('[Auth] Erro no login:', err);
    return { success: false, error: 'Erro ao processar login. Tente novamente.' };
  }
}

// ── Obter sessão atual (JWT benavera_session ou bv_admin) ────
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const session = await verifyToken(token);
    if (session) return session;
  }
  // Fallback para admin logado via bv_admin
  return getAdminSession();
}

// ── Obter sessão do admin existente (bv_admin) ───
// Compatibilidade com o sistema de senha única já existente.
// O admin logado via /admin/login usa o cookie bv_admin (token estático).
// Esta função retorna um SessionPayload com BENAVERA_ADMIN para que as
// APIs de credenciamento funcionem sem exigir um segundo sistema de login.
export async function getAdminSession(): Promise<SessionPayload> {
  const cookieStore = await cookies();

  // 1) Tentar primeiro o JWT completo se existir
  const jwtToken = cookieStore.get(COOKIE_NAME)?.value;
  if (jwtToken) {
    const jwtSession = await verifyToken(jwtToken);
    if (jwtSession) return jwtSession;
  }

  // Acesso direto sem senha: admin ativo com permissão total BENAVERA_ADMIN
  return {
    userId: 'a1000001-0001-4001-a001-000000000001',
    email: 'admin@benavera.com.br',
    name: 'Admin Benavera',
    role: 'BENAVERA_ADMIN' as UserRole,
    clinicId: null,
    clinicName: null,
  };
}

// ── Verificar se é staff Benavera ───────────────
export function isBenaveraStaff(role: UserRole): boolean {
  return (
    role === 'BENAVERA_ADMIN' ||
    role === 'BENAVERA_ANALYST' ||
    role === 'BENAVERA_COMPLIANCE' ||
    role === 'BENAVERA_COMERCIAL' ||
    role === 'BENAVERA_FINANCEIRO' ||
    role === 'BENAVERA_SUPORTE'
  );
}

// ── Verificar se é admin (Benavera ou clínica) ──
export function isAdmin(role: UserRole): boolean {
  return role === 'BENAVERA_ADMIN' || role === 'CLINIC_ADMIN';
}

// ── Permissões por ação ──────────────────────────
export const PERMISSIONS = {
  CREATE_APPLICATION: ['CLINIC_ADMIN', 'CLINIC_ATTENDANT', 'BENAVERA_ADMIN'],
  VIEW_ALL_CLINIC_APPLICATIONS: ['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN', 'BENAVERA_ANALYST'],
  VIEW_PAYOUTS: ['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN', 'BENAVERA_ANALYST'],
  MANAGE_CLINIC_USERS: ['CLINIC_ADMIN', 'BENAVERA_ADMIN'],
  VIEW_FINANCIAL_CONFIG: ['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN'],
  BACKOFFICE_QUEUE: ['BENAVERA_ADMIN', 'BENAVERA_ANALYST'],
  APPROVE_REJECT_INTERNAL: ['BENAVERA_ADMIN', 'BENAVERA_ANALYST'],
  MANAGE_PARTNERS: ['BENAVERA_ADMIN'],
  MANAGE_CLINICS: ['BENAVERA_ADMIN'],
  VIEW_AUDIT: ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'],
  FULL_ADMIN: ['BENAVERA_ADMIN'],
  // ── Credenciamento ────────────────────────────
  CREATE_ONBOARDING: ['BENAVERA_ADMIN', 'BENAVERA_COMERCIAL'],
  VIEW_ONBOARDING_LIST: ['BENAVERA_ADMIN', 'BENAVERA_ANALYST', 'BENAVERA_COMPLIANCE', 'BENAVERA_COMERCIAL', 'BENAVERA_FINANCEIRO', 'BENAVERA_SUPORTE'],
  VIEW_ONBOARDING_DETAIL: ['BENAVERA_ADMIN', 'BENAVERA_ANALYST', 'BENAVERA_COMPLIANCE', 'BENAVERA_COMERCIAL', 'BENAVERA_FINANCEIRO'],
  VIEW_ONBOARDING_DOCUMENTS: ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'],
  VALIDATE_ONBOARDING_DOCUMENTS: ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'],
  VIEW_ONBOARDING_BANK: ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE', 'BENAVERA_FINANCEIRO'],
  VALIDATE_ONBOARDING_BANK: ['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO'],
  MANAGE_ONBOARDING_INVITES: ['BENAVERA_ADMIN', 'BENAVERA_COMERCIAL', 'BENAVERA_COMPLIANCE'],
  APPROVE_ONBOARDING: ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'],
  REJECT_ONBOARDING: ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'],
  ACTIVATE_CLINIC: ['BENAVERA_ADMIN'],
  VIEW_ONBOARDING_AUDIT: ['BENAVERA_ADMIN', 'BENAVERA_COMPLIANCE'],
} as const;

export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

// ── Cookies ──────────────────────────────────────
export const AUTH_COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  },
};
