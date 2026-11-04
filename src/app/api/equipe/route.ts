import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import bcrypt from 'bcryptjs';

const ALLOWED_CLINIC_ROLES = ['CLINIC_ADMIN', 'CLINIC_ATTENDANT', 'CLINIC_FINANCIAL'] as const;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!session.clinicId) {
    return NextResponse.json({ error: 'Sem clínica associada.' }, { status: 403 });
  }

  try {
    const members = await sql`
      SELECT id, name, email, role, ativo, last_login_at, created_at
      FROM users
      WHERE clinic_id = ${session.clinicId}
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ members });
  } catch (err: any) {
    console.error('[Equipe API GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar equipe.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!session.clinicId) {
    return NextResponse.json({ error: 'Sem clínica associada.' }, { status: 403 });
  }
  if (!hasPermission(session.role, 'MANAGE_CLINIC_USERS')) {
    return NextResponse.json({ error: 'Apenas administradores da clínica podem adicionar membros.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, role, password } = body;

    if (!name || !String(name).trim() || !email || !String(email).trim() || !password) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    const cleanRole = ALLOWED_CLINIC_ROLES.includes(role) ? role : 'CLINIC_ATTENDANT';
    const cleanEmail = String(email).toLowerCase().trim();

    const existing = await sql`SELECT id FROM users WHERE email = ${cleanEmail} LIMIT 1`;
    if (existing[0]) {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com este e-mail.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const rows = await sql`
      INSERT INTO users (clinic_id, name, email, password_hash, role, ativo)
      VALUES (${session.clinicId}, ${String(name).trim()}, ${cleanEmail}, ${passwordHash}, ${cleanRole}::user_role, true)
      RETURNING id, name, email, role, ativo, last_login_at, created_at
    `;

    return NextResponse.json({ member: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error('[Equipe API POST]', err);
    return NextResponse.json({ error: 'Erro ao adicionar membro.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!session.clinicId) {
    return NextResponse.json({ error: 'Sem clínica associada.' }, { status: 403 });
  }
  if (!hasPermission(session.role, 'MANAGE_CLINIC_USERS')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { memberId, ativo } = body;

    if (!memberId || typeof ativo !== 'boolean') {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    if (String(memberId) === String(session.userId) && !ativo) {
      return NextResponse.json({ error: 'Você não pode desativar sua própria conta.' }, { status: 400 });
    }

    const rows = await sql`
      UPDATE users
      SET ativo = ${ativo}, updated_at = NOW()
      WHERE id = ${memberId} AND clinic_id = ${session.clinicId}
      RETURNING id, name, email, role, ativo, last_login_at, created_at
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ member: rows[0] });
  } catch (err: any) {
    console.error('[Equipe API PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar membro.' }, { status: 500 });
  }
}
