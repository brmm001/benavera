// src/lib/rep-guards.ts
// Guardas de autorização para as rotas do sistema de representantes.

import { NextResponse } from 'next/server';
import { getSession, type SessionPayload } from './auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** Admin Benavera (gestão total) ou, quando financeiro=true, também BENAVERA_FINANCEIRO. */
export async function requireRepAdmin(opts: { financeiro?: boolean } = {}): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  const allowed = session && (
    session.role === 'BENAVERA_ADMIN' || (opts.financeiro && session.role === 'BENAVERA_FINANCEIRO')
  );
  if (!session || !allowed) {
    return { ok: false, response: NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 }) };
  }
  return { ok: true, session };
}

