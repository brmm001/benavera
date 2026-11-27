// POST /api/assinar/[code]/registrar — Cadastra clínica pelo link do vendedor, vincula comissão e libera SaaS ou abre checkout
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { sql } from '@/lib/benavera-db';
import { AUTH_COOKIE, signToken } from '@/lib/auth';
import { getClinicSessionKey } from '@/lib/secrets';
import {
  getRequiredDocumentsForPersonType,
  normalizePersonType,
  resolveClinicDocumentForStorage,
} from '@/lib/onboarding-db';
import { createInvite } from '@/lib/onboarding-tokens';
import { vincularClinica } from '@/lib/representantes-db';
import { resolvePublicSellerSignupLink, vincularClinicaAtendente } from '@/lib/seller-links';
import { logModuleAudit } from '@/lib/clinic-modules';
import { attachAttribution } from '@/lib/acquisition-db';
import { sendClinicWelcomeEmail } from '@/lib/email';

const CLINIC_SESSION_COOKIE = 'benavera_clinic_session';
const ONBOARDING_BLOCK_REASON =
  'Envie e aguarde a aprovação dos documentos de credenciamento para liberar novos financiamentos. Todos os módulos do seu plano já estão liberados.';

const registerSchema = z.object({
  personType: z.enum(['PJ', 'PF']).default('PJ'),
  nomeClinica: z.string().trim().min(2, 'Informe o nome da clínica ou consultório.').max(180),
  cnpj: z.string().max(24).optional().nullable(),
  cpf: z.string().max(20).optional().nullable(),
  especialidade: z.string().max(120).optional().nullable(),
  cep: z.string().max(16).optional().nullable(),
  rua: z.string().max(160).optional().nullable(),
  numero: z.string().max(30).optional().nullable(),
  complemento: z.string().max(100).optional().nullable(),
  bairro: z.string().max(100).optional().nullable(),
  cidade: z.string().max(100).optional().nullable(),
  estado: z.string().max(4).optional().nullable(),
  nomeResponsavel: z.string().trim().min(2, 'Informe o nome do responsável.').max(150),
  cargo: z.string().max(80).optional().nullable(),
  whatsapp: z.string().trim().min(8, 'Informe um WhatsApp válido.').max(30),
  email: z.string().trim().email('Informe um e-mail válido.').max(180),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres.').max(120),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const resolved = await resolvePublicSellerSignupLink(code);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { link } = resolved;

    const rawBody = await req.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstErr = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      return NextResponse.json(
        { error: firstErr || 'Preencha todos os campos obrigatórios corretamente.' },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const personType = normalizePersonType(d.personType);
    const cleanEmail = d.email.toLowerCase().trim();
    const cleanCpf = d.cpf?.trim() || null;
    const cleanCnpj = personType === 'PF' ? null : (d.cnpj?.trim() || null);
    const cleanCity = (d.cidade || 'São Paulo').trim();
    const cleanState = (d.estado || 'SP').trim().toUpperCase().slice(0, 2);

    // Verificar duplicidade de e-mail antes de consumir uso do link
    const existingUser = await sql`
      SELECT id FROM users WHERE LOWER(TRIM(email)) = ${cleanEmail} LIMIT 1
    `;
    if (existingUser[0]) {
      return NextResponse.json(
        { error: 'Já existe uma conta cadastrada com este e-mail. Acesse o login para gerenciar sua assinatura.' },
        { status: 409 }
      );
    }

    // Consumo atômico do link (protege contra race condition em links de uso único)
    const consumed = await sql`
      UPDATE seller_signup_links
      SET used_count = used_count + 1, updated_at = NOW()
      WHERE id = ${link.id}::uuid
        AND active = TRUE
        AND (max_uses IS NULL OR used_count < max_uses)
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING id
    `;
    if (consumed.length === 0) {
      return NextResponse.json(
        { error: 'Este link de assinatura não está mais disponível ou atingiu o limite de usos.' },
        { status: 410 }
      );
    }

    let clinicId = '';
    let userId = '';
    let inviteToken = '';
    let nextStep: 'DASHBOARD' | 'CHECKOUT' = 'CHECKOUT';
    let trialEndsAtIso: string | null = null;

    try {
      const clinicDocForStorage = resolveClinicDocumentForStorage({
        personType,
        cnpj: cleanCnpj,
        cpf: cleanCpf,
      });
      const clinicLegalName = personType === 'PF' ? d.nomeResponsavel : d.nomeClinica;

      // 1. Cria a clínica JÁ ATIVA para uso dos módulos SaaS, porém com novos financiamentos bloqueados até aprovação documental
      const clinicRows = await sql`
        INSERT INTO clinics (
          person_type, nome_fantasia, razao_social, cnpj, cpf_responsavel,
          telefone, whatsapp, email, email_financeiro, responsavel,
          cep, logradouro, numero, complemento, bairro, cidade, estado,
          especialidade, ativo, allow_new_applications, new_applications_block_reason
        ) VALUES (
          ${personType}, ${d.nomeClinica}, ${clinicLegalName}, ${clinicDocForStorage}, ${cleanCpf},
          ${d.whatsapp}, ${d.whatsapp}, ${cleanEmail}, ${cleanEmail}, ${d.nomeResponsavel},
          ${d.cep || null}, ${d.rua || null}, ${d.numero || null}, ${d.complemento || null}, ${d.bairro || null},
          ${cleanCity}, ${cleanState},
          ${d.especialidade || 'Geral'}, TRUE, FALSE, ${ONBOARDING_BLOCK_REASON}
        )
        RETURNING id
      `;
      clinicId = String(clinicRows[0].id);

      // 2. Cria usuário CLINIC_ADMIN já ativo para entrar no painel / concluir checkout
      const passwordHash = await bcrypt.hash(d.password, 10);
      const userRows = await sql`
        INSERT INTO users (clinic_id, name, email, password_hash, role, ativo)
        VALUES (${clinicId}::uuid, ${d.nomeResponsavel}, ${cleanEmail}, ${passwordHash}, 'CLINIC_ADMIN', TRUE)
        RETURNING id
      `;
      userId = String(userRows[0].id);

      // 3. Cria onboarding de documentos em aberto para posterior liberação de financiamentos
      const bankDocDefault = personType === 'PF' ? cleanCpf : cleanCnpj;
      const bankHolderDefault = personType === 'PF' ? d.nomeResponsavel : d.nomeClinica;
      const onboardingRows = await sql`
        INSERT INTO clinic_onboardings (
          person_type, trade_name, legal_name, cnpj, contact_name, contact_cpf,
          phone, email, city, state, specialty,
          address_cep, address_street, address_number, address_complement, address_neighborhood,
          address_city, address_state,
          email_admin, email_financial,
          legal_rep_name, legal_rep_cpf, legal_rep_role, legal_rep_email, legal_rep_phone, legal_rep_has_powers,
          tech_rep_name, tech_rep_cpf, tech_rep_council_state,
          bank_account_type, bank_holder_name, bank_holder_document, bank_pix_key,
          status, progress_percent, clinic_id, created_by
        ) VALUES (
          ${personType}, ${d.nomeClinica}, ${clinicLegalName}, ${cleanCnpj}, ${d.nomeResponsavel}, ${cleanCpf},
          ${d.whatsapp}, ${cleanEmail}, ${cleanCity}, ${cleanState}, ${d.especialidade || 'Geral'},
          ${d.cep || null}, ${d.rua || null}, ${d.numero || null}, ${d.complemento || null}, ${d.bairro || null},
          ${cleanCity}, ${cleanState},
          ${cleanEmail}, ${cleanEmail},
          ${d.nomeResponsavel}, ${cleanCpf}, ${d.cargo || (personType === 'PF' ? 'Profissional Autônomo (PF)' : 'Diretor / Sócio')},
          ${cleanEmail}, ${d.whatsapp}, TRUE,
          ${d.nomeResponsavel}, ${cleanCpf}, ${cleanState},
          'corrente', ${bankHolderDefault}, ${bankDocDefault}, ${bankDocDefault},
          'IN_PROGRESS', 35, ${clinicId}::uuid, ${userId}::uuid
        )
        RETURNING id
      `;
      const onboardingId = String(onboardingRows[0].id);

      for (const doc of getRequiredDocumentsForPersonType(personType)) {
        await sql`
          INSERT INTO onboarding_documents (onboarding_id, document_type, document_label, is_required)
          VALUES (${onboardingId}, ${doc.type}, ${doc.label}, ${doc.required})
        `;
      }

      const invite = await createInvite({
        onboardingId,
        createdBy: userId,
        expiryDays: 30,
      });
      inviteToken = invite.token;

      // 4. Vincular automaticamente ao vendedor (Representante ou Atendente)
      if (link.sellerType === 'REPRESENTANTE' && link.representanteId) {
        await vincularClinica({
          representanteId: link.representanteId,
          clinicId,
          origem: 'CODIGO',
          porQuem: `link:${link.code}`,
          motivo: `Cadastro + Assinatura via link ${link.code}`,
        });
      } else if (link.sellerType === 'ATENDENTE' && link.atendenteUserId) {
        await vincularClinicaAtendente({
          atendenteUserId: link.atendenteUserId,
          clinicId,
          signupLinkId: link.id,
          origem: 'LINK_ASSINATURA',
          criadoPor: `link:${link.code}`,
        });

        // Melhor esforço: registrar também em prospect_clinics para visibilidade no painel do atendente
        const docDigits = String(cleanCnpj || cleanCpf || '').replace(/\D/g, '');
        if (docDigits.length === 11 || docDigits.length === 14) {
          await sql`
            INSERT INTO prospect_clinics (
              person_type, cnpj, nome_fantasia, razao_social, responsavel, telefone, email,
              cidade, estado, especialidade, status, assigned_to, created_by
            ) VALUES (
              ${personType}, ${docDigits}, ${d.nomeClinica}, ${clinicLegalName}, ${d.nomeResponsavel},
              ${d.whatsapp}, ${cleanEmail}, ${cleanCity}, ${cleanState}, ${d.especialidade || 'Geral'},
              'vinculada', ${link.atendenteUserId}::uuid, ${link.atendenteUserId}::uuid
            )
            ON CONFLICT (cnpj) DO NOTHING
          `.catch(() => {});
        }
      }

      // 5. Configurar assinatura strictly server-side a partir do link
      if (link.pricing.isFree) {
        await sql`
          INSERT INTO clinic_subscriptions (
            clinic_id, plan_id, status, billing_cycle, is_exempt, discount_percent, coupon_code,
            payment_method, mp_payer_email, signup_link_id, updated_by, updated_at
          ) VALUES (
            ${clinicId}::uuid, ${link.plan.id}::uuid, 'EXEMPT', 'LIFETIME_FREE', TRUE,
            ${link.discountPercent}, ${link.couponCode}, 'MANUAL', ${cleanEmail},
            ${link.id}::uuid, ${`Link ${link.code}`}, NOW()
          )
        `;
        nextStep = 'DASHBOARD';
      } else if (link.trialDays > 0) {
        // Carência / período de teste grátis: clínica entra sem precisar de cartão e paga ao final dos X dias
        trialEndsAtIso = new Date(Date.now() + link.trialDays * 86400000).toISOString();
        await sql`
          INSERT INTO clinic_subscriptions (
            clinic_id, plan_id, status, billing_cycle, is_exempt, discount_percent, coupon_code,
            trial_ends_at, current_period_start, current_period_end, next_billing_at,
            mp_payer_email, signup_link_id, updated_by, updated_at
          ) VALUES (
            ${clinicId}::uuid, ${link.plan.id}::uuid, 'TRIAL', ${link.billingCycle}, FALSE,
            ${link.discountPercent}, ${link.couponCode},
            ${trialEndsAtIso}::timestamptz, NOW(), ${trialEndsAtIso}::timestamptz, ${trialEndsAtIso}::timestamptz,
            ${cleanEmail}, ${link.id}::uuid, ${`Link ${link.code}`}, NOW()
          )
        `;
        nextStep = 'DASHBOARD';
      } else {
        // Sem trial: cria PENDING_PAYMENT e avança imediatamente para a Etapa 2 (Checkout Transparente)
        await sql`
          INSERT INTO clinic_subscriptions (
            clinic_id, plan_id, status, billing_cycle, is_exempt, discount_percent, coupon_code,
            mp_payer_email, signup_link_id, updated_by, updated_at
          ) VALUES (
            ${clinicId}::uuid, ${link.plan.id}::uuid, 'PENDING_PAYMENT', ${link.billingCycle}, FALSE,
            ${link.discountPercent}, ${link.couponCode},
            ${cleanEmail}, ${link.id}::uuid, ${`Link ${link.code}`}, NOW()
          )
        `;
        nextStep = 'CHECKOUT';
      }

      await logModuleAudit({
        clinicId,
        actorId: userId,
        actorName: d.nomeResponsavel,
        scope: 'SUBSCRIPTION',
        targetId: link.id,
        action: 'SIGNUP_VIA_SELLER_LINK',
        newValue: {
          code: link.code,
          sellerType: link.sellerType,
          planId: link.plan.id,
          cycle: link.billingCycle,
          discountPercent: link.discountPercent,
          couponCode: link.couponCode,
          trialDays: link.trialDays,
          nextStep,
        },
      });

      // Histórico comercial + atribuição (melhor esforço)
      const leadId = 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      await sql`
        INSERT INTO clinic_leads (
          id, nome_responsavel, nome_clinica, cargo, whatsapp, email, cidade, estado,
          especialidade_principal, pagina_origem, status_comercial, assigned_to
        ) VALUES (
          ${leadId}, ${d.nomeResponsavel}, ${d.nomeClinica}, ${d.cargo || 'Sócio'},
          ${d.whatsapp}, ${cleanEmail}, ${cleanCity}, ${cleanState},
          ${d.especialidade || 'Geral'}, ${`/assinar/${link.code}`}, 'em_credenciamento',
          ${link.sellerType === 'ATENDENTE' ? link.atendenteUserId : null}::uuid
        )
      `.catch(() => {});
      await attachAttribution('clinic', clinicId).catch(() => {});
      await attachAttribution('clinic_lead', leadId).catch(() => {});

      sendClinicWelcomeEmail({
        to: cleanEmail,
        clinicName: d.nomeClinica,
        responsavel: d.nomeResponsavel,
      }).catch(() => {});

      // 6. Emitir sessão JWT real (benavera_session) + cookie de onboarding
      const sessionToken = await signToken({
        userId,
        email: cleanEmail,
        name: d.nomeResponsavel,
        role: 'CLINIC_ADMIN',
        clinicId,
        clinicName: d.nomeClinica,
      });

      const clinicOnboardingJwt = await new SignJWT({
        onboardingId,
        inviteId: invite.inviteId,
        type: 'clinic_session',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(await getClinicSessionKey());

      const response = NextResponse.json(
        {
          success: true,
          clinicId,
          nextStep,
          trialEndsAt: trialEndsAtIso,
          onboardingUrl: `/c/${inviteToken}/formulario`,
          dashboardUrl: '/dashboard',
          payerDefaults: {
            email: cleanEmail,
            name: d.nomeResponsavel,
            document: cleanCnpj || cleanCpf || '',
            address: {
              zipCode: d.cep || '',
              streetName: d.rua || '',
              streetNumber: d.numero || 'S/N',
              neighborhood: d.bairro || 'Centro',
              city: cleanCity,
              federalUnit: cleanState,
            },
          },
        },
        { status: 201, headers: { 'Cache-Control': 'no-store' } }
      );

      response.cookies.set(AUTH_COOKIE.name, sessionToken, AUTH_COOKIE.options);
      response.cookies.set(CLINIC_SESSION_COOKIE, clinicOnboardingJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });

      return response;
    } catch (innerErr) {
      await sql`
        UPDATE seller_signup_links SET used_count = GREATEST(0, used_count - 1)
        WHERE id = ${link.id}::uuid
      `.catch(() => {});
      throw innerErr;
    }
  } catch (err) {
    console.error('[API Assinar Registrar POST]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao concluir cadastro.';
    if (/duplicate key|already exists|unique/i.test(msg)) {
      return NextResponse.json(
        { error: 'Já existe uma clínica cadastrada com este e-mail ou CPF/CNPJ. Faça login ou contate seu consultor.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
