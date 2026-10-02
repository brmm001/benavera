// app/api/auth/me/route.ts
// Retorna a sessão do usuário logado (JWT real apenas — sem fallback de admin)
import { NextResponse } from 'next/server';
import { getJwtSession } from '@/lib/auth';

export async function GET() {
  const session = await getJwtSession();

  // Sem sessão JWT real → 401
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  return NextResponse.json({ user: session });
}
