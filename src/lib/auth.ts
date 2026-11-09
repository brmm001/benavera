// lib/auth.ts
// Sistema de autenticação JWT para Benavera

import { sql } from './benavera-db';
import type { User, UserRole } from './benavera-db';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getAdminToken, COOKIE_NAME as BV_ADMIN_COOKIE_NAME } from './auth-config';
import { getJwtKey, safeEqual } from './secrets';

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
    .sign(await getJwtKey());
  return token;
}

// ── Verificar token JWT (apenas assinatura/expiração) ──
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await getJwtKey(), { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ── Revalidar sessão no banco ─────────────────────
// O JWT sozinho não basta: usuários/clínicas desativados, removidos ou com role alterada
// precisam perder o acesso imediatamente, mesmo com um cookie ainda dentro da validade.
async function revalidateSession(session: SessionPayload): Promise<SessionPayload | null> {
  try {
    if (!session?.userId) return null;
    const rows = await sql`
      SELECT u.id, u.email, u.name, u.role, u.ativo, u.clinic_id,
             c.nome_fantasia AS clinic_name, c.ativo AS clinic_ativo
      FROM users u
      LEFT JOIN clinics c ON c.id = u.clinic_id
      WHERE u.id = ${session.userId}
      LIMIT 1
    `;
    const u = rows[0];
    if (!u) return null;
    if (!u.ativo) return null;
    if (u.clinic_id && !u.clinic_ativo) return null;
    if (String(u.role) !== String(session.role)) return null;
    if (String(u.clinic_id || '') !== String(session.clinicId || '')) return null;

    // Representante de vendas: precisa ter cadastro ativo em `representantes`
    if (String(u.role) === 'REPRESENTANTE') {
      const rep = await sql`SELECT 1 FROM representantes WHERE user_id = ${session.userId} AND ativo = TRUE LIMIT 1`;
      if (rep.length === 0) return null;
    }

    return {
      ...session,
      email: String(u.email),
      name: String(u.name),
      role: u.role as UserRole,
      clinicId: u.clinic_id ? String(u.clinic_id) : null,
      clinicName: u.clinic_name ? String(u.clinic_name) : null,
    };
  } catch (err) {
    console.error('[Auth] Falha ao revalidar sessão:', err);
    return null;
  }
}

async function getValidatedJwtSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = await verifyToken(token);
  if (!decoded) return null;
  return revalidateSession(decoded);
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
      SELECT u.*, c.nome_fantasia as clinic_name, c.ativo as clinic_ativo
      FROM users u
      LEFT JOIN clinics c ON c.id = u.clinic_id
      WHERE u.email = ${email.toLowerCase().trim()}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user) {
      return { success: false, error: 'Credenciais inválidas.' };
    }

    const passwordMatch = await bcrypt.compare(password, String(user.password_hash));
    if (!passwordMatch) {
      return { success: false, error: 'Credenciais inválidas.' };
    }

    // Se o usuário ou a clínica estiverem inativos, bloqueia o login até aprovação
    const isUserActive = Boolean(user.ativo);
    const isClinicActive = user.clinic_id ? Boolean(user.clinic_ativo) : true;

    if (!isUserActive || !isClinicActive) {
      // Busca status do credenciamento para detalhar para a clínica
      const onboardingRows = await sql`
        SELECT status FROM clinic_onboardings
        WHERE clinic_id = ${user.clinic_id} OR created_by = ${user.id} OR email = ${user.email}
        ORDER BY created_at DESC LIMIT 1
      `;
      const obStatus = onboardingRows[0]?.status;

      if (obStatus === 'SUBMITTED' || obStatus === 'UNDER_REVIEW') {
        return {
          success: false,
          error: 'Sua conta está em análise de credenciamento e aguarda a aprovação dos documentos pela administração. Assim que aprovada, seu acesso será liberado.',
        };
      } else if (obStatus === 'IN_PROGRESS' || obStatus === 'PENDING_DOCUMENTS' || obStatus === 'DRAFT' || obStatus === 'PRE_REGISTERED') {
        return {
          success: false,
          error: 'Seu credenciamento ainda não foi concluído. Envie todos os documentos solicitados para que sua conta possa ser avaliada e liberada.',
        };
      } else if (obStatus === 'CORRECTION_REQUIRED') {
        return {
          success: false,
          error: 'Foram solicitadas correções na documentação do seu credenciamento. Acesse o link enviado por e-mail para regularizar.',
        };
      } else if (obStatus === 'REJECTED') {
        return {
          success: false,
          error: 'Seu pedido de credenciamento não foi aprovado pela administração. Entre em contato com o suporte Benavera.',
        };
      }

      return {
        success: false,
        error: 'Sua conta ainda não foi liberada. É obrigatório enviar todos os documentos e aguardar aprovação pelo administrador.',
      };
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

// ── Obter sessão atual (JWT benavera_session ou fallback admin via bv_admin) ────
// Retorna null se não houver nenhum cookie válido.
export async function getSession(): Promise<SessionPayload | null> {
  const session = await getValidatedJwtSession();
  if (session) return session;
  // Fallback para admin logado via bv_admin
  return getLegacyAdminSession();
}

// ── Obter sessão apenas do JWT real (sem fallback de admin) ──────
// Retorna null se não houver cookie JWT válido.
// Use em APIs que precisam distinguir "não logado" vs "admin mock".
export async function getJwtSession(): Promise<SessionPayload | null> {
  return getValidatedJwtSession();
}

// ── Obter sessão do admin existente (bv_admin) ───
// Compatibilidade com o sistema de senha única já existente.
// O admin logado via /admin/login usa o cookie bv_admin (token estático).
// Esta função retorna um SessionPayload com BENAVERA_ADMIN para que as
// APIs de credenciamento funcionem sem exigir um segundo sistema de login.
// Retorna null se o cookie bv_admin estiver ausente ou inválido.
export async function getAdminSession(): Promise<SessionPayload | null> {
  // 1) JWT completo — SOMENTE se for staff Benavera (nunca devolve sessão de clínica)
  const jwtSession = await getValidatedJwtSession();
  if (jwtSession && isBenaveraStaff(jwtSession.role)) return jwtSession;

  // 2) Cookie bv_admin (token estático do login admin)
  return getLegacyAdminSession();
}

async function getLegacyAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(BV_ADMIN_COOKIE_NAME)?.value;
  if (!adminCookie) return null;

  let expectedToken: string;
  try {
    expectedToken = getAdminToken();
  } catch {
    return null;
  }
  if (!safeEqual(adminCookie, expectedToken)) return null;

  // Cookie bv_admin válido — retorna sessão admin
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
  // ── Atendentes / Área Comercial ───────────────────────────────────────
  VIEW_OWN_LEADS: ['BENAVERA_COMERCIAL', 'BENAVERA_ADMIN'],
  VIEW_OWN_CLINICS: ['BENAVERA_COMERCIAL', 'BENAVERA_ADMIN'],
  CREATE_PROSPECT_CLINIC: ['BENAVERA_COMERCIAL', 'BENAVERA_ADMIN'],
  VIEW_OWN_COMMISSIONS: ['BENAVERA_COMERCIAL', 'BENAVERA_ADMIN'],
  MANAGE_ATENDENTES: ['BENAVERA_ADMIN'],
  MANAGE_COMMISSIONS: ['BENAVERA_ADMIN'],
  APPROVE_COMMISSIONS: ['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO'],
  TRANSFER_CLINIC: ['BENAVERA_ADMIN'],
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
