// app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { createApplication } from '@/lib/application-service';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');
  const clinicId = searchParams.get('clinicId');

  try {
    let rows;
    const isBenaveraStaff = session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST';

    // Multi-tenant: clínica só vê suas próprias solicitações
    const effectiveClinicId = isBenaveraStaff
      ? (clinicId || null)
      : session.clinicId;

    if (effectiveClinicId && status && search) {
      const searchWild = `%${search}%`;
      rows = await sql`
        SELECT a.*, p.nome as patient_nome, p.cpf as patient_cpf, c.nome_fantasia as clinic_nome,
               u.name as creator_name
        FROM applications a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        WHERE a.clinic_id = ${effectiveClinicId} AND a.status = ${status}::application_status
          AND (p.nome ILIKE ${searchWild} OR p.cpf ILIKE ${searchWild} OR a.protocol ILIKE ${searchWild})
        ORDER BY a.created_at DESC LIMIT ${limit}
      `;
    } else if (effectiveClinicId && status) {
      rows = await sql`
        SELECT a.*, p.nome as patient_nome, p.cpf as patient_cpf, c.nome_fantasia as clinic_nome,
               u.name as creator_name
        FROM applications a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        WHERE a.clinic_id = ${effectiveClinicId} AND a.status = ${status}::application_status
        ORDER BY a.created_at DESC LIMIT ${limit}
      `;
    } else if (effectiveClinicId && search) {
      const searchWild = `%${search}%`;
      rows = await sql`
        SELECT a.*, p.nome as patient_nome, p.cpf as patient_cpf, c.nome_fantasia as clinic_nome,
               u.name as creator_name
        FROM applications a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        WHERE a.clinic_id = ${effectiveClinicId}
          AND (p.nome ILIKE ${searchWild} OR p.cpf ILIKE ${searchWild} OR a.protocol ILIKE ${searchWild})
        ORDER BY a.created_at DESC LIMIT ${limit}
      `;
    } else if (effectiveClinicId) {
      rows = await sql`
        SELECT a.*, p.nome as patient_nome, p.cpf as patient_cpf, c.nome_fantasia as clinic_nome,
               u.name as creator_name
        FROM applications a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        WHERE a.clinic_id = ${effectiveClinicId}
        ORDER BY a.created_at DESC LIMIT ${limit}
      `;
    } else if (status) {
      // Staff Benavera sem filtro de clínica — ver tudo
      rows = await sql`
        SELECT a.*, p.nome as patient_nome, p.cpf as patient_cpf, c.nome_fantasia as clinic_nome,
               u.name as creator_name, analyst.name as analyst_name
        FROM applications a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        LEFT JOIN users analyst ON analyst.id = a.assigned_analyst_id
        WHERE a.status = ${status}::application_status
        ORDER BY a.created_at ASC LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT a.*, p.nome as patient_nome, p.cpf as patient_cpf, c.nome_fantasia as clinic_nome,
               u.name as creator_name, analyst.name as analyst_name
        FROM applications a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = a.clinic_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        LEFT JOIN users analyst ON analyst.id = a.assigned_analyst_id
        ORDER BY a.created_at DESC LIMIT ${limit}
      `;
    }

    return NextResponse.json({ applications: rows });
  } catch (err) {
    console.error('[Applications GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar solicitações.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const allowedRoles = ['CLINIC_ADMIN', 'CLINIC_ATTENDANT', 'BENAVERA_ADMIN'];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { patientId, categoria, procedimento, valorTratamento, entrada, consentAccepted } = body;

    if (!consentAccepted) {
      return NextResponse.json({ error: 'Consentimento obrigatório.' }, { status: 400 });
    }
    if (!patientId || !valorTratamento || valorTratamento <= 0) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 });
    }

    const clinicId = session.clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: 'Clínica não identificada.' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0';

    const result = await createApplication({
      clinicId,
      patientId,
      categoria: categoria || 'outros',
      procedimento: procedimento || 'Não especificado',
      valorTratamento: Number(valorTratamento),
      entrada: Number(entrada) || 0,
      createdByUserId: session.userId,
      consentIp: ip,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err) {
    console.error('[Applications POST]', err);
    return NextResponse.json({ error: 'Não foi possível criar a solicitação.' }, { status: 500 });
  }
}
