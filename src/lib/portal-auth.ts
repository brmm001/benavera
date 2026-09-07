import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getNeonClient } from './neon';

const PORTAL_COOKIE = 'benavera_portal_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.PORTAL_JWT_SECRET || 'benavera-portal-dev-secret-change-in-production'
);

export interface PortalSession {
  userId: string;
  clinicId: string;
  email: string;
  nome: string;
  role: string;
  clinicNome: string;
}

export async function signPortalToken(session: PortalSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifyPortalToken(token: string): Promise<PortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as PortalSession;
  } catch {
    return null;
  }
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalToken(token);
}

export { PORTAL_COOKIE };
