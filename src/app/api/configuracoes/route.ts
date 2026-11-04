import { NextRequest, NextResponse } from 'next/server';
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
    const clinicRows = await sql`
      SELECT *
      FROM clinics
      WHERE id = ${session.clinicId}
      LIMIT 1
    `;
    const clinic = clinicRows[0];
    if (!clinic) {
      return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });
    }

    const onboardingRows = await sql`
      SELECT bank_name, bank_code, bank_agency, bank_account, bank_pix_key, email_financial
      FROM clinic_onboardings
      WHERE clinic_id = ${session.clinicId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const ob = onboardingRows[0];

    const obBankLabel = ob?.bank_code && ob?.bank_name
      ? `${ob.bank_code} - ${ob.bank_name}`
      : (ob?.bank_name || '');

    return NextResponse.json({
      clinic: {
        nomeFantasia: String(clinic.nome_fantasia || ''),
        razaoSocial: String(clinic.razao_social || ''),
        cnpj: String(clinic.cnpj || ''),
        telefone: String(clinic.telefone || clinic.whatsapp || ''),
        emailFinanceiro: String(clinic.email_financeiro || ob?.email_financial || clinic.email || ''),
        chavePix: String(clinic.chave_pix || ob?.bank_pix_key || ''),
        tipoPix: String(clinic.tipo_pix || 'CNPJ'),
        banco: String(clinic.banco || obBankLabel || ''),
        agencia: String(clinic.agencia || ob?.bank_agency || ''),
        conta: String(clinic.conta || ob?.bank_account || ''),
        notifWhatsapp: clinic.notif_whatsapp !== false,
        notifEmail: clinic.notif_email !== false,
      },
    });
  } catch (err) {
    console.error('[Configuracoes GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar configurações.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!session.clinicId) {
    return NextResponse.json({ error: 'Sem clínica associada.' }, { status: 403 });
  }

  const allowedRoles = ['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN'];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Sem permissão para alterar configurações.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      nomeFantasia,
      razaoSocial,
      telefone,
      emailFinanceiro,
      chavePix,
      tipoPix,
      banco,
      agencia,
      conta,
      notifWhatsapp,
      notifEmail,
    } = body;

    if (!nomeFantasia || ! String(nomeFantasia).trim()) {
      return NextResponse.json({ error: 'Nome Fantasia é obrigatório.' }, { status: 400 });
    }

    await sql`
      UPDATE clinics
      SET
        nome_fantasia = ${String(nomeFantasia).trim()},
        razao_social = ${String(razaoSocial || nomeFantasia).trim()},
        telefone = ${telefone ? String(telefone).trim() : null},
        whatsapp = ${telefone ? String(telefone).trim() : null},
        email_financeiro = ${emailFinanceiro ? String(emailFinanceiro).trim() : null},
        chave_pix = ${chavePix ? String(chavePix).trim() : null},
        tipo_pix = ${tipoPix ? String(tipoPix).trim() : 'CNPJ'},
        banco = ${banco ? String(banco).trim() : null},
        agencia = ${agencia ? String(agencia).trim() : null},
        conta = ${conta ? String(conta).trim() : null},
        notif_whatsapp = ${Boolean(notifWhatsapp)},
        notif_email = ${Boolean(notifEmail)},
        updated_at = NOW()
      WHERE id = ${session.clinicId}
    `;

    // Sincronizar também com o registro de onboarding da clínica, se existir
    await sql`
      UPDATE clinic_onboardings
      SET
        trade_name = ${String(nomeFantasia).trim()},
        legal_name = ${String(razaoSocial || nomeFantasia).trim()},
        phone = COALESCE(${telefone ? String(telefone).trim() : null}, phone),
        email_financial = ${emailFinanceiro ? String(emailFinanceiro).trim() : null},
        bank_name = ${banco ? String(banco).trim() : null},
        bank_agency = ${agencia ? String(agencia).trim() : null},
        bank_account = ${conta ? String(conta).trim() : null},
        bank_pix_key = ${chavePix ? String(chavePix).trim() : null},
        updated_at = NOW()
      WHERE clinic_id = ${session.clinicId}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Configuracoes PUT]', err);
    return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 });
  }
}

