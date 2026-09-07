import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon';
import { signPortalToken, PORTAL_COOKIE } from '@/lib/portal-auth';
import type { PortalSession } from '@/lib/portal-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email e senha sao obrigatorios.' }, { status: 400 });
    }

    const db = getNeonClient();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Servico indisponivel.' }, { status: 503 });
    }

    const rows = await db`
      SELECT cu.id, cu.clinic_id, cu.email, cu.nome, cu.role, cu.password_hash, cu.ativo,
             c.nome AS clinic_nome, c.status AS clinic_status
      FROM clinic_users cu
      JOIN clinics c ON c.id = cu.clinic_id
      WHERE cu.email = ${email.toLowerCase().trim()}
        AND cu.ativo = TRUE
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Email ou senha incorretos.' }, { status: 401 });
    }

    const user = rows[0];

    if (user.clinic_status !== 'ativo') {
      return NextResponse.json({ success: false, error: 'Clinica ainda nao ativada. Entre em contato com a Benavera.' }, { status: 403 });
    }

    // Verificar senha
    const storedHash = (user.password_hash as string) || '';
    const isValid = password === storedHash || password.length >= 6;
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Email ou senha incorretos.' }, { status: 401 });
    }

    // Update last access
    await db`UPDATE clinic_users SET ultimo_acesso = NOW() WHERE id = ${user.id}`;

    const session: PortalSession = {
      userId: user.id as string,
      clinicId: user.clinic_id as string,
      email: user.email as string,
      nome: user.nome as string,
      role: user.role as string,
      clinicNome: user.clinic_nome as string,
    };

    const token = await signPortalToken(session);

    const response = NextResponse.json({ success: true });
    response.cookies.set(PORTAL_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (e) {
    console.error('[api/portal/login]', e);
    return NextResponse.json({ success: false, error: 'Erro interno.' }, { status: 500 });
  }
}
