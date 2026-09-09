// app/api/payouts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const allowedRoles = ['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN', 'BENAVERA_ANALYST'];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const isBenaveraStaff = session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST';
  const clinicId = session.clinicId;

  try {
    let rows;
    if (isBenaveraStaff) {
      rows = await sql`
        SELECT py.*, a.protocol, p.nome as patient_nome, c.nome_fantasia as clinic_nome, fp.nome as partner_nome
        FROM payouts py
        LEFT JOIN applications a ON a.id = py.application_id
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = py.clinic_id
        LEFT JOIN financial_partners fp ON fp.id = py.partner_id
        ORDER BY py.created_at DESC LIMIT 50
      `;
    } else {
      rows = await sql`
        SELECT py.*, a.protocol, p.nome as patient_nome, c.nome_fantasia as clinic_nome, fp.nome as partner_nome
        FROM payouts py
        LEFT JOIN applications a ON a.id = py.application_id
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = py.clinic_id
        LEFT JOIN financial_partners fp ON fp.id = py.partner_id
        WHERE py.clinic_id = ${clinicId}
        ORDER BY py.created_at DESC LIMIT 50
      `;
    }

    return NextResponse.json({ payouts: rows });
  } catch (err) {
    console.error('[Payouts GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar repasses.' }, { status: 500 });
  }
}
