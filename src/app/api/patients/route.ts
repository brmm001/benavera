// app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const clinicId = session.clinicId;

  if (!clinicId) return NextResponse.json({ patients: [] });

  try {
    let rows;
    if (search) {
      const q = `%${search}%`;
      rows = await sql`
        SELECT id, nome, cpf, data_nascimento, celular, email
        FROM patients
        WHERE clinic_id = ${clinicId}
          AND (nome ILIKE ${q} OR cpf ILIKE ${q} OR celular ILIKE ${q})
        ORDER BY nome ASC LIMIT 20
      `;
    } else {
      rows = await sql`
        SELECT id, nome, cpf, data_nascimento, celular, email
        FROM patients WHERE clinic_id = ${clinicId}
        ORDER BY nome ASC LIMIT 50
      `;
    }

    // Mascarar CPF
    const patients = rows.map(p => ({
      ...p,
      cpf_masked: String(p.cpf || '').replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.***-$2'),
    }));

    return NextResponse.json({ patients });
  } catch (err) {
    console.error('[Patients GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar pacientes.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const allowedRoles = ['CLINIC_ADMIN', 'CLINIC_ATTENDANT', 'BENAVERA_ADMIN'];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const clinicId = session.clinicId;
  if (!clinicId) return NextResponse.json({ error: 'Clínica não identificada.' }, { status: 400 });

  try {
    const body = await request.json();
    const { nome, cpf, dataNascimento, celular, email } = body;

    if (!nome || !cpf) {
      return NextResponse.json({ error: 'Nome e CPF são obrigatórios.' }, { status: 400 });
    }

    // Verificar se paciente já existe nesta clínica
    const existing = await sql`
      SELECT id FROM patients WHERE clinic_id = ${clinicId} AND cpf = ${cpf}
    `;

    if (existing[0]) {
      return NextResponse.json({ id: String(existing[0].id), existing: true });
    }

    const rows = await sql`
      INSERT INTO patients (clinic_id, nome, cpf, data_nascimento, celular, email)
      VALUES (${clinicId}, ${nome}, ${cpf}, ${dataNascimento || null}, ${celular || null}, ${email || null})
      RETURNING id
    `;

    return NextResponse.json({ id: String(rows[0].id), existing: false }, { status: 201 });
  } catch (err) {
    console.error('[Patients POST]', err);
    return NextResponse.json({ error: 'Erro ao cadastrar paciente.' }, { status: 500 });
  }
}
