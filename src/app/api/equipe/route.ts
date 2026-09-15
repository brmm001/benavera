import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

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
    console.error('[Equipe API]', err);
    return NextResponse.json({ error: 'Erro ao buscar equipe.' }, { status: 500 });
  }
}
