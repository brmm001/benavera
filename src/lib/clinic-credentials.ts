// src/lib/clinic-credentials.ts
// Provisionamento seguro de clínica e usuário CLINIC_ADMIN a partir de um credenciamento.
// Garante que contas internas (BENAVERA_*, REPRESENTANTE) nunca tenham clinic_id ou senha sobrescritos.

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { sql } from './benavera-db';
import type { ClinicOnboarding } from './benavera-db';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL_CHARS = UPPER + LOWER + DIGITS;

function pickChar(alphabet: string, byte: number): string {
  return alphabet[byte % alphabet.length];
}

/**
 * Gera uma senha temporária forte (~69 bits de entropia), sem caracteres ambíguos (0/O/1/l/I)
 * e com garantia de conter maiúscula, minúscula e número.
 */
export function generateTemporaryPassword(): string {
  const bytes = randomBytes(16);
  const chars: string[] = [
    pickChar(UPPER, bytes[0]),
    pickChar(LOWER, bytes[1]),
    pickChar(DIGITS, bytes[2]),
  ];
  for (let i = 3; i < 12; i++) {
    chars.push(pickChar(ALL_CHARS, bytes[i]));
  }
  // Embaralhamento Fisher-Yates usando bytes criptográficos restantes
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[12 + (i % 4)] % (i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return `Bv-${chars.join('')}`;
}

export interface ProvisionClinicAccountResult {
  clinicId: string;
  userId: string;
  email: string;
  userName: string;
  createdNewUser: boolean;
  passwordReset: boolean;
  temporaryPassword: string | null;
}

export async function provisionClinicAccountFromOnboarding(
  onboarding: ClinicOnboarding,
  options?: { resetPassword?: boolean }
): Promise<ProvisionClinicAccountResult> {
  const cleanEmail = String(onboarding.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Credenciamento sem e-mail válido para criar conta de acesso.');
  }

  // 1. Verificar antes se o e-mail conflita com conta interna Benavera / Representante
  const existingUsers = await sql`
    SELECT id, name, email, role, clinic_id, ativo
    FROM users
    WHERE LOWER(TRIM(email)) = ${cleanEmail}
    LIMIT 1
  `;
  const existingUser = existingUsers[0];
  if (existingUser && !String(existingUser.role || '').startsWith('CLINIC_')) {
    throw new Error(
      `O e-mail ${cleanEmail} já pertence a um usuário interno (${existingUser.role}) e não pode ser vinculado como conta de clínica.`
    );
  }

  // 2. Garantir registro ativo em `clinics` e vínculo em `clinic_onboardings.clinic_id`
  let clinicId: string;
  if (onboarding.clinic_id) {
    clinicId = String(onboarding.clinic_id);
    await sql`
      UPDATE clinics
      SET
        ativo = TRUE,
        nome_fantasia = COALESCE(${onboarding.trade_name || null}, nome_fantasia),
        razao_social = COALESCE(${onboarding.legal_name || null}, razao_social),
        cnpj = COALESCE(${onboarding.cnpj || null}, cnpj),
        email = COALESCE(${cleanEmail}, email),
        cep = COALESCE(${onboarding.address_cep || null}, cep),
        logradouro = COALESCE(${onboarding.address_street || null}, logradouro),
        numero = COALESCE(${onboarding.address_number || null}, numero),
        complemento = COALESCE(${onboarding.address_complement || null}, complemento),
        bairro = COALESCE(${onboarding.address_neighborhood || null}, bairro),
        cidade = COALESCE(${onboarding.address_city || onboarding.city || null}, cidade),
        estado = COALESCE(${onboarding.address_state || onboarding.state || null}, estado),
        responsavel = COALESCE(${onboarding.legal_rep_name || onboarding.contact_name || null}, responsavel),
        cpf_responsavel = COALESCE(${onboarding.legal_rep_cpf || onboarding.contact_cpf || null}, cpf_responsavel),
        email_financeiro = COALESCE(${onboarding.email_financial || cleanEmail}, email_financeiro),
        site = COALESCE(${onboarding.website || null}, site),
        banco = COALESCE(${onboarding.bank_name || null}, banco),
        agencia = COALESCE(${onboarding.bank_agency || null}, agencia),
        conta = COALESCE(${onboarding.bank_account || null}, conta),
        chave_pix = COALESCE(${onboarding.bank_pix_key || null}, chave_pix),
        updated_at = NOW()
      WHERE id = ${clinicId}
    `;
  } else {
    // Verifica se já existe clínica vinculada ao usuário existente ou com mesmo e-mail
    const matchedClinicId = existingUser?.clinic_id ? String(existingUser.clinic_id) : null;
    if (matchedClinicId) {
      clinicId = matchedClinicId;
      await sql`
        UPDATE clinics
        SET
          ativo = TRUE,
          nome_fantasia = COALESCE(${onboarding.trade_name || null}, nome_fantasia),
          razao_social = COALESCE(${onboarding.legal_name || null}, razao_social),
          cnpj = COALESCE(${onboarding.cnpj || null}, cnpj),
          email = COALESCE(${cleanEmail}, email),
          cep = COALESCE(${onboarding.address_cep || null}, cep),
          logradouro = COALESCE(${onboarding.address_street || null}, logradouro),
          numero = COALESCE(${onboarding.address_number || null}, numero),
          complemento = COALESCE(${onboarding.address_complement || null}, complemento),
          bairro = COALESCE(${onboarding.address_neighborhood || null}, bairro),
          cidade = COALESCE(${onboarding.address_city || onboarding.city || null}, cidade),
          estado = COALESCE(${onboarding.address_state || onboarding.state || null}, estado),
          responsavel = COALESCE(${onboarding.legal_rep_name || onboarding.contact_name || null}, responsavel),
          cpf_responsavel = COALESCE(${onboarding.legal_rep_cpf || onboarding.contact_cpf || null}, cpf_responsavel),
          email_financeiro = COALESCE(${onboarding.email_financial || cleanEmail}, email_financeiro),
          site = COALESCE(${onboarding.website || null}, site),
          banco = COALESCE(${onboarding.bank_name || null}, banco),
          agencia = COALESCE(${onboarding.bank_agency || null}, agencia),
          conta = COALESCE(${onboarding.bank_account || null}, conta),
          chave_pix = COALESCE(${onboarding.bank_pix_key || null}, chave_pix),
          updated_at = NOW()
        WHERE id = ${clinicId}
      `;
    } else {
      const clinicRows = await sql`
        INSERT INTO clinics (
          nome_fantasia, razao_social, cnpj, email, email_financeiro, telefone, whatsapp,
          responsavel, cpf_responsavel, cep, logradouro, numero, complemento, bairro,
          cidade, estado, especialidade, site, banco, agencia, conta, chave_pix, ativo
        ) VALUES (
          ${onboarding.trade_name},
          ${onboarding.legal_name || onboarding.trade_name},
          ${onboarding.cnpj || '00.000.000/0001-00'},
          ${cleanEmail},
          ${onboarding.email_financial || cleanEmail},
          ${onboarding.phone},
          ${onboarding.phone},
          ${onboarding.legal_rep_name || onboarding.contact_name || null},
          ${onboarding.legal_rep_cpf || onboarding.contact_cpf || null},
          ${onboarding.address_cep || null},
          ${onboarding.address_street || null},
          ${onboarding.address_number || null},
          ${onboarding.address_complement || null},
          ${onboarding.address_neighborhood || null},
          ${onboarding.address_city || onboarding.city},
          ${onboarding.address_state || onboarding.state},
          ${onboarding.specialty || 'Geral'},
          ${onboarding.website || null},
          ${onboarding.bank_name || null},
          ${onboarding.bank_agency || null},
          ${onboarding.bank_account || null},
          ${onboarding.bank_pix_key || null},
          TRUE
        )
        RETURNING id
      `;
      clinicId = String(clinicRows[0].id);
    }

    await sql`
      UPDATE clinic_onboardings
      SET clinic_id = ${clinicId}, updated_at = NOW()
      WHERE id = ${onboarding.id}
    `;
  }

  // 3. Garantir usuário CLINIC_ADMIN ativo (cria se ainda não existir, ou redefine senha se solicitado)
  const displayName = String(
    onboarding.legal_rep_name || onboarding.contact_name || onboarding.trade_name || 'Responsável'
  ).trim();

  let userId: string;
  let createdNewUser = false;
  let passwordReset = false;
  let temporaryPassword: string | null = null;

  if (!existingUser) {
    temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const inserted = await sql`
      INSERT INTO users (clinic_id, name, email, password_hash, role, ativo)
      VALUES (${clinicId}, ${displayName}, ${cleanEmail}, ${passwordHash}, 'CLINIC_ADMIN'::user_role, TRUE)
      RETURNING id
    `;
    userId = String(inserted[0].id);
    createdNewUser = true;
  } else {
    userId = String(existingUser.id);
    if (options?.resetPassword) {
      temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      await sql`
        UPDATE users
        SET clinic_id = ${clinicId},
            password_hash = ${passwordHash},
            ativo = TRUE,
            updated_at = NOW()
        WHERE id = ${userId}
      `;
      passwordReset = true;
    } else {
      await sql`
        UPDATE users
        SET clinic_id = ${clinicId},
            ativo = TRUE,
            updated_at = NOW()
        WHERE id = ${userId}
      `;
    }
  }

  // 4. Ativar demais usuários da clínica já vinculados (somente roles CLINIC_*)
  await sql`
    UPDATE users
    SET ativo = TRUE, updated_at = NOW()
    WHERE clinic_id = ${clinicId}
      AND role::text LIKE 'CLINIC_%'
  `;

  return {
    clinicId,
    userId,
    email: cleanEmail,
    userName: existingUser?.name ? String(existingUser.name) : displayName,
    createdNewUser,
    passwordReset,
    temporaryPassword,
  };
}
