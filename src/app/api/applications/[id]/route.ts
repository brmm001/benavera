// app/api/applications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, isBenaveraStaff } from '@/lib/auth';
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
        p.cep as patient_cep, p.logradouro as patient_logradouro, p.numero as patient_numero,
        p.complemento as patient_complemento, p.bairro as patient_bairro,
        p.cidade as patient_cidade, p.estado as patient_estado,
        p.renda_mensal as patient_renda, p.profissao as patient_profissao, p.vinculo as patient_vinculo,
        c.nome_fantasia as clinic_nome, c.cnpj as clinic_cnpj,
        c.telefone as clinic_telefone, c.whatsapp as clinic_whatsapp, c.email as clinic_email,
        c.cidade as clinic_cidade, c.estado as clinic_estado,
        u.name as creator_name, u.email as creator_email,
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
    const staff = isBenaveraStaff(session.role);
    if (!staff && String(app.clinic_id) !== session.clinicId) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Buscar consentimento LGPD registrado
    const consentRows = await sql`
      SELECT consent_version, ip_address, created_at FROM consent_records
      WHERE application_id = ${id} ORDER BY created_at DESC LIMIT 1
    `;

    // Buscar proposals
    const proposals = await sql`
      SELECT pr.*, fp.nome as partner_nome, fp.api_slug as partner_api_slug
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
      SELECT fa.*, fp.nome as partner_nome, fp.api_slug as partner_api_slug
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
    if (!staff && app.patient_cpf) {
      const cpf = String(app.patient_cpf);
      app.patient_cpf = cpf.replace(/(\d{3})\.\d{3}\.\d{3}-(\d{2})/, '$1.***.***-$2');
    }

    return NextResponse.json({
      application: app,
      proposals,
      events,
      attempts,
      documents,
      consent: consentRows[0] || null,
    });
  } catch (err) {
    console.error('[Application GET by ID]', err);
    return NextResponse.json({ error: 'Erro ao buscar solicitação.' }, { status: 500 });
  }
}
