// app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await params;

  try {
    const rows = await sql`
      SELECT a.*,
        p.nome as patient_nome, p.cpf as patient_cpf, p.data_nascimento as patient_nasc,
        p.celular as patient_celular, p.email as patient_email,
        c.nome_fantasia as clinic_nome, c.cnpj as clinic_cnpj,
        u.name as creator_name,
        analyst.name as analyst_name
      FROM applications a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN clinics c ON c.id = a.clinic_id
      LEFT JOIN users u ON u.id = a.created_by_user_id
      LEFT JOIN users analyst ON analyst.id = a.assigned_analyst_id
      WHERE a.id = ${id}
    `;

    if (!rows[0]) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });

    const app = rows[0];

    // Multi-tenant: clínica só pode ver suas próprias solicitações
    const isBenaveraStaff = session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST';
    if (!isBenaveraStaff && String(app.clinic_id) !== session.clinicId) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Buscar proposals
    const proposals = await sql`
      SELECT pr.*, fp.nome as partner_nome
      FROM proposals pr
      LEFT JOIN financial_partners fp ON fp.id = pr.partner_id
      WHERE pr.application_id = ${id} AND pr.ativa = true
      ORDER BY pr.created_at ASC
    `;

    // Buscar event logs
    const events = await sql`
      SELECT * FROM event_logs
      WHERE application_id = ${id}
      ORDER BY created_at ASC
    `;

    // Buscar funding attempts
    const attempts = await sql`
      SELECT fa.*, fp.nome as partner_nome
      FROM funding_attempts fa
      LEFT JOIN financial_partners fp ON fp.id = fa.partner_id
      WHERE fa.application_id = ${id}
      ORDER BY fa.submitted_at ASC
    `;

    // Buscar documentos
    const documents = await sql`
      SELECT * FROM documents WHERE application_id = ${id} ORDER BY created_at DESC
    `;

    // Mascarar CPF para clínica
    if (!isBenaveraStaff && app.patient_cpf) {
      const cpf = String(app.patient_cpf);
      app.patient_cpf = cpf.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.***-$2');
    }

    return NextResponse.json({
      application: app,
      proposals,
      events,
      attempts,
      documents,
    });
  } catch (err) {
    console.error('[Application GET by ID]', err);
    return NextResponse.json({ error: 'Erro ao buscar solicitação.' }, { status: 500 });
  }
}
