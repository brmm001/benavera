// app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, isBenaveraStaff } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { createApplication, NewApplicationsBlockedError } from '@/lib/application-service';

function maskCpfIfNeeded(cpf: unknown): string {
  const s = String(cpf || '');
  return s.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/, '$1.***.***-$4');
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || null;
  const searchRaw = (searchParams.get('search') || '').trim();
  const searchWild = searchRaw ? `%${searchRaw}%` : null;
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const clinicIdParam = searchParams.get('clinicId') || null;

  try {
    const staff = isBenaveraStaff(session.role);

    // Multi-tenant: clínica só vê suas próprias solicitações
    const effectiveClinicId = staff ? clinicIdParam : session.clinicId;

    const rows = await sql`
      SELECT
        a.*,
        p.nome AS patient_nome,
        p.cpf AS patient_cpf,
        p.data_nascimento AS patient_nasc,
        p.celular AS patient_celular,
        p.email AS patient_email,
        p.cidade AS patient_cidade,
        p.estado AS patient_estado,
        p.renda_mensal AS patient_renda,
        p.profissao AS patient_profissao,
        c.nome_fantasia AS clinic_nome,
        c.cnpj AS clinic_cnpj,
        c.telefone AS clinic_telefone,
        c.whatsapp AS clinic_whatsapp,
        c.cidade AS clinic_cidade,
        c.estado AS clinic_estado,
        u.name AS creator_name,
        u.email AS creator_email,
        analyst.name AS analyst_name
      FROM applications a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN clinics c ON c.id = a.clinic_id
      LEFT JOIN users u ON u.id = a.created_by_user_id
      LEFT JOIN users analyst ON analyst.id = a.assigned_analyst_id
      WHERE (${effectiveClinicId}::uuid IS NULL OR a.clinic_id = ${effectiveClinicId}::uuid)
        AND (${status}::text IS NULL OR a.status::text = ${status})
        AND (
          ${searchWild}::text IS NULL
          OR p.nome ILIKE ${searchWild}
          OR p.cpf ILIKE ${searchWild}
          OR p.celular ILIKE ${searchWild}
          OR p.email ILIKE ${searchWild}
          OR a.protocol ILIKE ${searchWild}
          OR a.procedimento ILIKE ${searchWild}
          OR a.categoria ILIKE ${searchWild}
          OR c.nome_fantasia ILIKE ${searchWild}
        )
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;

    const applications = staff
      ? rows
      : rows.map(r => ({
          ...r,
          patient_cpf: maskCpfIfNeeded(r.patient_cpf),
        }));

    let allowNewApplications = true;
    let newApplicationsBlockReason: string | null = null;
    if (!staff && session.clinicId) {
      const clinicMeta = await sql`
        SELECT c.allow_new_applications, c.new_applications_block_reason,
               cs.status AS sub_status, cs.is_exempt AS sub_exempt, cs.current_period_end AS sub_period_end
        FROM clinics c
        LEFT JOIN clinic_subscriptions cs ON cs.clinic_id = c.id
        WHERE c.id = ${session.clinicId}
        LIMIT 1
      `;
      if (clinicMeta[0]) {
        const subStatus = String(clinicMeta[0].sub_status || 'EXEMPT');
        const subExempt = clinicMeta[0].sub_exempt === undefined || clinicMeta[0].sub_exempt === null ? true : Boolean(clinicMeta[0].sub_exempt);
        const pMs = clinicMeta[0].sub_period_end ? Date.parse(String(clinicMeta[0].sub_period_end)) : NaN;
        const subBlocked = !subExempt && (subStatus === 'SUSPENDED' || subStatus === 'PAST_DUE' || (subStatus === 'CANCELLED' && !(Number.isFinite(pMs) && pMs > Date.now())));
        allowNewApplications = clinicMeta[0].allow_new_applications !== false && !subBlocked;
        newApplicationsBlockReason = subBlocked
          ? 'Assinatura suspensa por pendência financeira. Regularize em Assinatura e Faturas.'
          : (clinicMeta[0].new_applications_block_reason ? String(clinicMeta[0].new_applications_block_reason) : null);
      }
    }

    return NextResponse.json(
      {
        applications,
        allowNewApplications,
        newApplicationsBlockReason,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
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

    // Verificar se a clínica tem permissão e assinatura regular para criar novos financiamentos
    const clinicRows = await sql`
      SELECT c.ativo, c.allow_new_applications, c.new_applications_block_reason,
             cs.status AS sub_status, cs.is_exempt AS sub_exempt, cs.current_period_end AS sub_period_end
      FROM clinics c
      LEFT JOIN clinic_subscriptions cs ON cs.clinic_id = c.id
      WHERE c.id = ${clinicId}
      LIMIT 1
    `;
    const clinic = clinicRows[0];
    if (!clinic || !clinic.ativo) {
      return NextResponse.json(
        { error: 'Clínica inativa ou não autorizada.', code: 'CLINIC_INACTIVE' },
        { status: 403 }
      );
    }
    const postSubStatus = String(clinic.sub_status || 'EXEMPT');
    const postSubExempt = clinic.sub_exempt === undefined || clinic.sub_exempt === null ? true : Boolean(clinic.sub_exempt);
    const postPeriodMs = clinic.sub_period_end ? Date.parse(String(clinic.sub_period_end)) : NaN;
    const postSubBlocked = !postSubExempt && (postSubStatus === 'SUSPENDED' || postSubStatus === 'PAST_DUE' || (postSubStatus === 'CANCELLED' && !(Number.isFinite(postPeriodMs) && postPeriodMs > Date.now())));
    if (postSubBlocked) {
      return NextResponse.json(
        {
          error: 'Assinatura suspensa por pendência financeira. Regularize o pagamento em Assinatura e Faturas para criar novos financiamentos.',
          code: 'SUBSCRIPTION_SUSPENDED',
          paymentUrl: '/painel/assinatura',
        },
        { status: 403 }
      );
    }
    if (clinic.allow_new_applications === false) {
      return NextResponse.json(
        {
          error:
            (clinic.new_applications_block_reason ? String(clinic.new_applications_block_reason) : null) ||
            'A criação de novos financiamentos está temporariamente bloqueada para esta clínica. O restante do painel permanece liberado.',
          code: 'NEW_APPLICATIONS_BLOCKED',
        },
        { status: 403 }
      );
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
    if (err instanceof NewApplicationsBlockedError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    console.error('[Applications POST]', err);
    return NextResponse.json({ error: 'Não foi possível criar a solicitação.' }, { status: 500 });
  }
}
