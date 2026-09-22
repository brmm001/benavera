import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import bcrypt from 'bcryptjs';
import { sendClinicWelcomeEmail } from '@/lib/email';
import { REQUIRED_DOCUMENTS } from '@/lib/onboarding-db';
import { createInvite } from '@/lib/onboarding-tokens';
import { SignJWT } from 'jose';

const CLINIC_SESSION_SECRET = new TextEncoder().encode(
  process.env.CLINIC_SESSION_SECRET || process.env.JWT_SECRET || 'clinic-session-secret-change-me'
);
const CLINIC_SESSION_COOKIE = 'benavera_clinic_session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nomeClinica,
      cnpj,
      especialidade,
      cidade,
      estado,
      nomeResponsavel,
      cargo,
      whatsapp,
      email,
      password,
      volumeMensal,
      ticketMedio,
    } = body;

    if (!nomeClinica || !whatsapp || !email || !password) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando (Nome da clínica, WhatsApp, E-mail e Senha).' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verifica se usuário com este email já existe
    const existingUser = await sql`
      SELECT id, email, ativo, clinic_id FROM users WHERE email = ${cleanEmail} LIMIT 1
    `;

    if (existingUser[0]) {
      if (existingUser[0].ativo) {
        return NextResponse.json(
          { error: 'Já existe uma conta ativa com este e-mail. Por favor, acesse a tela de login.' },
          { status: 409 }
        );
      }

      // Usuário existe mas ainda está inativo (aguardando envio de documentos ou aprovação)
      const existingOnboarding = await sql`
        SELECT id, status FROM clinic_onboardings
        WHERE clinic_id = ${existingUser[0].clinic_id} OR created_by = ${existingUser[0].id} OR email = ${cleanEmail}
        ORDER BY created_at DESC LIMIT 1
      `;

      if (existingOnboarding[0]) {
        const onboardingId = String(existingOnboarding[0].id);
        const invite = await createInvite({
          onboardingId,
          createdBy: String(existingUser[0].id),
          expiryDays: 14,
        });

        const clinicSessionToken = await new SignJWT({
          onboardingId,
          inviteId: invite.inviteId,
          type: 'clinic_session',
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(CLINIC_SESSION_SECRET);

        const response = NextResponse.json({
          success: true,
          redirectUrl: `/c/${invite.token}/formulario`,
          message: 'Retomando seu credenciamento. Por favor, envie todos os documentos para liberação da conta.',
        });

        response.cookies.set(CLINIC_SESSION_COOKIE, clinicSessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });

        return response;
      }

      return NextResponse.json(
        { error: 'Já existe um cadastro com este e-mail aguardando análise de documentos.' },
        { status: 409 }
      );
    }

    // 2. Insere a clínica no banco com ativo = FALSE (bloqueada até admin aprovar após envio de docs)
    const clinicRows = await sql`
      INSERT INTO clinics (
        nome_fantasia, razao_social, cnpj, telefone, whatsapp, email,
        responsavel, cidade, estado, especialidade, ativo
      ) VALUES (
        ${nomeClinica}, ${nomeClinica}, ${cnpj || '00.000.000/0001-00'}, ${whatsapp}, ${whatsapp}, ${cleanEmail},
        ${nomeResponsavel || null}, ${cidade || 'São Paulo'}, ${estado || 'SP'},
        ${especialidade || 'Geral'}, FALSE
      )
      RETURNING id
    `;

    const clinicId = clinicRows[0].id;

    // 3. Hash seguro de senha com bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Cria o usuário com ativo = FALSE (bloqueado até admin aprovar após envio de docs)
    const userRows = await sql`
      INSERT INTO users (
        clinic_id, name, email, password_hash, role, ativo
      ) VALUES (
        ${clinicId}, ${nomeResponsavel || nomeClinica}, ${cleanEmail},
        ${passwordHash}, 'CLINIC_ADMIN', FALSE
      )
      RETURNING id
    `;

    const userId = userRows[0].id;

    // 5. Cria o registro de credenciamento (clinic_onboardings)
    const onboardingRows = await sql`
      INSERT INTO clinic_onboardings (
        trade_name, legal_name, cnpj, contact_name,
        phone, email, city, state, specialty,
        status, progress_percent, clinic_id, created_by
      ) VALUES (
        ${nomeClinica}, ${nomeClinica}, ${cnpj || null}, ${nomeResponsavel || nomeClinica},
        ${whatsapp}, ${cleanEmail}, ${cidade || 'São Paulo'}, ${estado || 'SP'}, ${especialidade || 'Geral'},
        'IN_PROGRESS', 25, ${clinicId}, ${userId}
      )
      RETURNING id
    `;

    const onboardingId = String(onboardingRows[0].id);

    // 6. Cria os slots para todos os documentos obrigatórios e opcionais
    for (const doc of REQUIRED_DOCUMENTS) {
      await sql`
        INSERT INTO onboarding_documents (onboarding_id, document_type, document_label, is_required)
        VALUES (${onboardingId}, ${doc.type}, ${doc.label}, ${doc.required})
      `;
    }

    // 7. Gera o token de convite/sessão para o preenchimento e envio de documentos
    const invite = await createInvite({
      onboardingId,
      createdBy: String(userId),
      expiryDays: 14,
    });

    // 8. Salva histórico no CRM comercial (clinic_leads)
    const leadId = 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    try {
      await sql`
        INSERT INTO clinic_leads (
          id, nome_responsavel, nome_clinica, cargo, whatsapp, email,
          cidade, estado, especialidade_principal, orcamentos_mensais, ticket_medio,
          pagina_origem, status_comercial
        ) VALUES (
          ${leadId}, ${nomeResponsavel || nomeClinica}, ${nomeClinica}, ${cargo || 'Sócio'},
          ${whatsapp}, ${cleanEmail}, ${cidade || 'SP'}, ${estado || 'SP'},
          ${especialidade || 'Geral'}, ${volumeMensal || null}, ${ticketMedio || null},
          '/credenciamento', 'em_credenciamento'
        )
      `;
    } catch (leadErr) {
      console.warn('Erro ao salvar clinic_lead histórico:', leadErr);
    }

    // 9. Email de boas-vindas / início de credenciamento (não bloqueia o fluxo)
    sendClinicWelcomeEmail({
      to: cleanEmail,
      clinicName: nomeClinica,
      responsavel: nomeResponsavel || nomeClinica,
    }).catch(err => console.warn('[Email Boas-vindas]', err));

    // 10. Gera o cookie de sessão da clínica para que a página de envio abra diretamente
    const clinicSessionToken = await new SignJWT({
      onboardingId,
      inviteId: invite.inviteId,
      type: 'clinic_session',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(CLINIC_SESSION_SECRET);

    const redirectUrl = `/c/${invite.token}/formulario`;

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      clinicId: String(clinicId),
      userId: String(userId),
      onboardingId,
      message: 'Cadastro inicial realizado com sucesso! Agora envie os documentos solicitados para que sua conta seja liberada.',
    });

    response.cookies.set(CLINIC_SESSION_COOKIE, clinicSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err: any) {
    console.error('Erro no credenciamento:', err);
    const message = err?.message || 'Erro ao processar credenciamento';
    if (message.includes('duplicate key') || message.includes('already exists') || message.includes('unique')) {
      return NextResponse.json({ error: 'Já existe um cadastro com este e-mail ou CNPJ.' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
