// src/app/api/admin/atendentes/route.ts
// Admin: listar e criar atendentes (BENAVERA_COMERCIAL)

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAtendentes } from '@/lib/atendente-db';
import { sql } from '@/lib/benavera-db';
import bcrypt from 'bcryptjs';

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const err = requireAdmin(session);
  if (err) return err;

  const search = request.nextUrl.searchParams.get('search') || undefined;

  try {
    const atendentes = await getAtendentes({ search });
    return NextResponse.json({ success: true, atendentes });
  } catch (e) {
    console.error('[API Admin Atendentes GET]', e);
    return NextResponse.json({ error: 'Erro ao listar atendentes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const err = requireAdmin(session);
  if (err) return err;

  try {
    const body = await request.json();
    const { name, email, password, lead_limit, receiving_leads } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // Verificar se e-mail já existe
    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'E-mail já cadastrado no sistema.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const rows = await sql`
      INSERT INTO users (name, email, password_hash, role, ativo, lead_limit, receiving_leads)
      VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash},
        'BENAVERA_COMERCIAL', TRUE, ${lead_limit ?? 30}, ${receiving_leads ?? true})
      RETURNING id, name, email, role, ativo, lead_limit, receiving_leads, created_at
    `;

    return NextResponse.json({ success: true, atendente: rows[0] }, { status: 201 });
  } catch (e) {
    console.error('[API Admin Atendentes POST]', e);
    return NextResponse.json({ error: 'Erro ao criar atendente.' }, { status: 500 });
  }
}
