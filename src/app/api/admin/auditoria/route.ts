// src/app/api/admin/auditoria/route.ts
// Trilha real de auditoria de solicitações e eventos do sistema (sem dados fake/demo)
import { NextResponse } from 'next/server';
import { getSession, isBenaveraStaff } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!isBenaveraStaff(session.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const rows = await sql`
      SELECT
        e.id,
        e.application_id,
        a.protocol,
        c.nome_fantasia AS clinic_nome,
        p.nome AS patient_nome,
        a.valor_financiado,
        e.event AS event_type,
        e.old_status AS from_status,
        e.new_status AS to_status,
        e.actor_name,
        e.actor_type AS actor_role,
        e.metadata,
        e.created_at
      FROM event_logs e
      LEFT JOIN applications a ON a.id = e.application_id
      LEFT JOIN clinics c ON c.id = a.clinic_id
      LEFT JOIN patients p ON p.id = a.patient_id
      ORDER BY e.created_at DESC
      LIMIT 200
    `;

    return NextResponse.json(
      { success: true, logs: rows },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Admin Auditoria GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar trilha de auditoria.' }, { status: 500 });
  }
}
