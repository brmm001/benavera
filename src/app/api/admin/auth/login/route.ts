import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// Configuração central de autenticação — TUDO em um lugar só
// ─────────────────────────────────────────────────────────────
const COOKIE_NAME = 'bv_admin';

function getExpectedPassword(): string {
  return process.env.ADMIN_PASSWORD || 'benavera2026';
}

function getExpectedToken(): string {
  // O token que vai ficar no cookie é simplesmente o ADMIN_SECRET (ou um fallback).
  // O middleware compara o cookie com esse valor diretamente.
  return process.env.ADMIN_SECRET || 'bv-admin-secret-fallback-2026';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };
    const provided = (body.password || '').trim();
    const expected = getExpectedPassword().trim();

    if (!provided || provided !== expected) {
      return NextResponse.json(
        { success: false, error: 'Senha incorreta.' },
        { status: 401 }
      );
    }

    const token = getExpectedToken();

    const response = NextResponse.json({
      success: true,
      redirectUrl: '/admin/leads',
    });

    // Seta o cookie APENAS no NextResponse (forma mais confiável e direta no Edge/Node)
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // false para garantir que funcione em HTTP e HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro interno.' },
      { status: 500 }
    );
  }
}
