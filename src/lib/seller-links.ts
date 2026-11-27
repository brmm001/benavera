// src/lib/seller-links.ts
// Motor de Links de Cadastro + Assinatura para Representantes e Atendentes + Comissões SaaS Separadas.

import { randomBytes } from 'crypto';
import { sql } from './benavera-db';
import {
  calculateSubscriptionPricing,
  validateAndLoadCoupon,
  type PricingCouponInput,
  type PricingPlanInput,
  type PricingResult,
} from './billing-service';
import { sendAtendenteCommissionEmail } from './email';

export type SellerType = 'REPRESENTANTE' | 'ATENDENTE';
export type AtendenteSaasComissaoStatus = 'PREVISTA' | 'A_RECEBER' | 'PAGA' | 'CANCELADA';

const LINK_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSellerLinkCode(prefix = 'BV'): string {
  const bytes = randomBytes(8);
  let body = '';
  for (let i = 0; i < 8; i++) body += LINK_ALPHABET[bytes[i] % LINK_ALPHABET.length];
  return `${prefix}-${body}`;
}

export function normalizeSellerLinkCode(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 24);
}

export function calculateCommissionAmount(baseAmount: number, percent: number): number {
  const base = Math.max(0, Number(baseAmount) || 0);
  const pct = Math.min(100, Math.max(0, Number(percent) || 0));
  return Math.round((base * pct / 100 + Number.EPSILON) * 100) / 100;
}

export function validateSellerLinkOffer(params: {
  discountPercent?: number | null;
  trialDays?: number | null;
  maxDiscountPercent: number;
  maxTrialDays: number;
}): { ok: true; discountPercent: number; trialDays: number } | { ok: false; error: string } {
  const maxDisc = Math.min(100, Math.max(0, Number(params.maxDiscountPercent) || 0));
  const maxTrial = Math.min(365, Math.max(0, Math.floor(Number(params.maxTrialDays) || 0)));

  const rawDisc = params.discountPercent === null || params.discountPercent === undefined ? 0 : Number(params.discountPercent);
  const rawTrial = params.trialDays === null || params.trialDays === undefined ? 0 : Math.floor(Number(params.trialDays));

  if (!Number.isFinite(rawDisc) || rawDisc < 0 || rawDisc > 100) {
    return { ok: false, error: 'Desconto inválido. Informe um percentual entre 0% e 100%.' };
  }
  const discountPercent = Math.round(rawDisc * 100) / 100;
  if (discountPercent > maxDisc) {
    return {
      ok: false,
      error:
        maxDisc <= 0
          ? 'Sua conta não possui alçada para conceder desconto direto neste link. Solicite liberação ao administrador.'
          : `O desconto máximo autorizado para sua conta é de ${maxDisc.toFixed(2).replace('.', ',')}%.`,
    };
  }

  if (!Number.isFinite(rawTrial) || rawTrial < 0 || rawTrial > 365) {
    return { ok: false, error: 'Período de carência/teste inválido.' };
  }
  if (rawTrial > maxTrial) {
    return {
      ok: false,
      error:
        maxTrial <= 0
          ? 'Sua conta não possui alçada para conceder carência/teste grátis neste link. Solicite liberação ao administrador.'
          : `A carência máxima autorizada para sua conta é de ${maxTrial} dias.`,
    };
  }

  return { ok: true, discountPercent, trialDays: rawTrial };
}

export function calculateSellerLinkPricing(params: {
  plan: PricingPlanInput;
  cycle: 'MONTHLY' | 'ANNUAL';
  discountPercent?: number | null;
  coupon?: PricingCouponInput | null;
  nowMs?: number;
}): PricingResult {
  return calculateSubscriptionPricing({
    plan: params.plan,
    cycle: params.cycle,
    discountPercent: params.discountPercent ?? 0,
    coupon: params.coupon ?? null,
    nowMs: params.nowMs,
  });
}

// ─── Carregar planos e cupons disponíveis para o gerador ─────────────────────

export async function listActivePlansAndCoupons() {
  const [planRows, couponRows] = await Promise.all([
    sql`
      SELECT id, slug, name, description, price_monthly, price_annual, is_free, module_ids
      FROM saas_plans
      WHERE archived = FALSE
      ORDER BY is_free ASC, price_monthly ASC
    `,
    sql`
      SELECT code, discount_type, discount_value, expires_at, max_uses, used_count
      FROM saas_coupons
      WHERE active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_uses IS NULL OR used_count < max_uses)
      ORDER BY code ASC
    `,
  ]);

  return {
    plans: planRows.map(p => ({
      id: String(p.id),
      slug: String(p.slug || ''),
      name: String(p.name),
      description: p.description ? String(p.description) : '',
      price_monthly: Number(p.price_monthly || 0),
      price_annual: Number(p.price_annual || 0),
      is_free: Boolean(p.is_free),
      module_ids: Array.isArray(p.module_ids) ? (p.module_ids as string[]) : [],
    })),
    coupons: couponRows.map(c => ({
      code: String(c.code),
      discount_type: String(c.discount_type) === 'FIXED' ? ('FIXED' as const) : ('PERCENT' as const),
      discount_value: Number(c.discount_value || 0),
    })),
  };
}

export async function ensureAtendenteReferralCode(userId: string): Promise<string> {
  const cur = await sql`SELECT codigo_indicacao FROM users WHERE id = ${userId}::uuid LIMIT 1`;
  if (cur[0]?.codigo_indicacao) return String(cur[0].codigo_indicacao);

  for (let i = 0; i < 6; i++) {
    const code = generateSellerLinkCode('AT').replace('-', '');
    try {
      const upd = await sql`
        UPDATE users SET codigo_indicacao = ${code}, updated_at = NOW()
        WHERE id = ${userId}::uuid AND codigo_indicacao IS NULL
        RETURNING codigo_indicacao
      `;
      if (upd[0]?.codigo_indicacao) return String(upd[0].codigo_indicacao);
      const again = await sql`SELECT codigo_indicacao FROM users WHERE id = ${userId}::uuid LIMIT 1`;
      if (again[0]?.codigo_indicacao) return String(again[0].codigo_indicacao);
    } catch {
      // retry collision
    }
  }
  throw new Error('Não foi possível gerar código de indicação para o atendente.');
}

// ─── CRUD de Links de Cadastro + Assinatura ──────────────────────────────────

export interface SellerSignupLinkItem {
  id: string;
  code: string;
  seller_type: SellerType;
  label: string | null;
  plan_id: string;
  plan_name: string;
  plan_is_free: boolean;
  price_monthly: number;
  price_annual: number;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  coupon_code: string | null;
  discount_percent: number;
  trial_days: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  pricing: PricingResult;
  estimated_commission: number;
}

export async function createSellerSignupLink(params: {
  sellerType: SellerType;
  representanteId?: string | null;
  atendenteUserId?: string | null;
  label?: string | null;
  planId: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  couponCode?: string | null;
  discountPercent?: number | null;
  trialDays?: number | null;
  maxUses?: number | null;
  expiresInDays?: number | null;
}): Promise<{ success: true; link: SellerSignupLinkItem } | { success: false; error: string }> {
  let maxDiscountPercent = 0;
  let maxTrialDays = 0;
  let mensalidadePercent = 0;

  if (params.sellerType === 'REPRESENTANTE') {
    if (!params.representanteId) return { success: false, error: 'Representante inválido.' };
    const r = await sql`
      SELECT id, ativo, mensalidade_percent, max_discount_percent, max_trial_days
      FROM representantes WHERE id = ${params.representanteId}::uuid LIMIT 1
    `;
    if (!r[0] || !r[0].ativo) return { success: false, error: 'Representante inativo ou não encontrado.' };
    maxDiscountPercent = Number(r[0].max_discount_percent || 0);
    maxTrialDays = Number(r[0].max_trial_days || 0);
    mensalidadePercent = Number(r[0].mensalidade_percent || 0);
  } else {
    if (!params.atendenteUserId) return { success: false, error: 'Atendente inválido.' };
    const u = await sql`
      SELECT id, ativo, role, mensalidade_percent, max_discount_percent, max_trial_days
      FROM users WHERE id = ${params.atendenteUserId}::uuid LIMIT 1
    `;
    if (!u[0] || !u[0].ativo) return { success: false, error: 'Atendente inativo ou não encontrado.' };
    if (String(u[0].role) !== 'BENAVERA_COMERCIAL' && String(u[0].role) !== 'BENAVERA_ADMIN') {
      return { success: false, error: 'Usuário sem permissão para gerar link de atendente.' };
    }
    maxDiscountPercent = Number(u[0].max_discount_percent || 0);
    maxTrialDays = Number(u[0].max_trial_days || 0);
    mensalidadePercent = Number(u[0].mensalidade_percent || 0);
  }

  const offerCheck = validateSellerLinkOffer({
    discountPercent: params.discountPercent,
    trialDays: params.trialDays,
    maxDiscountPercent,
    maxTrialDays,
  });
  if (!offerCheck.ok) return { success: false, error: offerCheck.error };

  const planRows = await sql`
    SELECT id, name, price_monthly, price_annual, is_free
    FROM saas_plans WHERE id = ${params.planId}::uuid AND archived = FALSE LIMIT 1
  `;
  const plan = planRows[0];
  if (!plan) return { success: false, error: 'Plano não encontrado ou arquivado.' };

  let validCoupon: PricingCouponInput | null = null;
  const cleanCoupon = params.couponCode ? String(params.couponCode).trim().toUpperCase() : null;
  if (cleanCoupon) {
    validCoupon = await validateAndLoadCoupon(cleanCoupon);
    if (!validCoupon) return { success: false, error: 'Cupom inválido, expirado ou esgotado.' };
  }

  const maxUses =
    params.maxUses !== null && params.maxUses !== undefined && Number(params.maxUses) > 0
      ? Math.min(10000, Math.floor(Number(params.maxUses)))
      : null;

  const expiresAt =
    params.expiresInDays !== null && params.expiresInDays !== undefined && Number(params.expiresInDays) > 0
      ? new Date(Date.now() + Math.min(365, Math.floor(Number(params.expiresInDays))) * 86400000).toISOString()
      : null;

  const label = params.label ? String(params.label).trim().slice(0, 160) : null;
  const cycle: 'MONTHLY' | 'ANNUAL' = params.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateSellerLinkCode('BV');
    try {
      const inserted = await sql`
        INSERT INTO seller_signup_links (
          code, seller_type, representante_id, atendente_user_id, label,
          plan_id, billing_cycle, coupon_code, discount_percent, trial_days,
          max_uses, expires_at, active
        ) VALUES (
          ${code}, ${params.sellerType},
          ${params.sellerType === 'REPRESENTANTE' ? params.representanteId : null}::uuid,
          ${params.sellerType === 'ATENDENTE' ? params.atendenteUserId : null}::uuid,
          ${label}, ${plan.id}::uuid, ${cycle},
          ${validCoupon ? validCoupon.code : null},
          ${offerCheck.discountPercent}, ${offerCheck.trialDays},
          ${maxUses}, ${expiresAt}::timestamptz, TRUE
        )
        RETURNING *
      `;
      const row = inserted[0];
      const pricing = calculateSellerLinkPricing({
        plan: {
          price_monthly: Number(plan.price_monthly || 0),
          price_annual: Number(plan.price_annual || 0),
          is_free: Boolean(plan.is_free),
        },
        cycle,
        discountPercent: offerCheck.discountPercent,
        coupon: validCoupon,
      });

      return {
        success: true,
        link: {
          id: String(row.id),
          code: String(row.code),
          seller_type: params.sellerType,
          label,
          plan_id: String(plan.id),
          plan_name: String(plan.name),
          plan_is_free: Boolean(plan.is_free),
          price_monthly: Number(plan.price_monthly || 0),
          price_annual: Number(plan.price_annual || 0),
          billing_cycle: cycle,
          coupon_code: validCoupon ? validCoupon.code : null,
          discount_percent: offerCheck.discountPercent,
          trial_days: offerCheck.trialDays,
          max_uses: maxUses,
          used_count: 0,
          expires_at: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
          active: true,
          created_at: new Date(String(row.created_at)).toISOString(),
          pricing,
          estimated_commission: calculateCommissionAmount(pricing.finalAmount, mensalidadePercent),
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!/code/i.test(msg)) throw err;
    }
  }

  return { success: false, error: 'Não foi possível gerar um código único para o link.' };
}

export async function listSellerSignupLinks(params: {
  sellerType: SellerType;
  representanteId?: string | null;
  atendenteUserId?: string | null;
  mensalidadePercent?: number;
}): Promise<SellerSignupLinkItem[]> {
  const rows =
    params.sellerType === 'REPRESENTANTE'
      ? await sql`
          SELECT l.*, sp.name AS plan_name, sp.price_monthly, sp.price_annual, sp.is_free AS plan_is_free,
                 sc.discount_type AS c_type, sc.discount_value AS c_val, sc.active AS c_active,
                 sc.expires_at AS c_exp, sc.max_uses AS c_max, sc.used_count AS c_used
          FROM seller_signup_links l
          JOIN saas_plans sp ON sp.id = l.plan_id
          LEFT JOIN saas_coupons sc ON l.coupon_code IS NOT NULL AND UPPER(sc.code) = UPPER(l.coupon_code)
          WHERE l.seller_type = 'REPRESENTANTE' AND l.representante_id = ${params.representanteId}::uuid
          ORDER BY l.created_at DESC
          LIMIT 100
        `
      : await sql`
          SELECT l.*, sp.name AS plan_name, sp.price_monthly, sp.price_annual, sp.is_free AS plan_is_free,
                 sc.discount_type AS c_type, sc.discount_value AS c_val, sc.active AS c_active,
                 sc.expires_at AS c_exp, sc.max_uses AS c_max, sc.used_count AS c_used
          FROM seller_signup_links l
          JOIN saas_plans sp ON sp.id = l.plan_id
          LEFT JOIN saas_coupons sc ON l.coupon_code IS NOT NULL AND UPPER(sc.code) = UPPER(l.coupon_code)
          WHERE l.seller_type = 'ATENDENTE' AND l.atendente_user_id = ${params.atendenteUserId}::uuid
          ORDER BY l.created_at DESC
          LIMIT 100
        `;

  const pct = Number(params.mensalidadePercent || 0);

  return rows.map(r => {
    const cycle: 'MONTHLY' | 'ANNUAL' = String(r.billing_cycle) === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    const coupon: PricingCouponInput | null = r.coupon_code && r.c_type
      ? {
          code: String(r.coupon_code),
          discount_type: String(r.c_type) === 'FIXED' ? 'FIXED' : 'PERCENT',
          discount_value: Number(r.c_val || 0),
          active: Boolean(r.c_active),
          expires_at: r.c_exp ? new Date(String(r.c_exp)).toISOString() : null,
          max_uses: r.c_max !== null && r.c_max !== undefined ? Number(r.c_max) : null,
          used_count: Number(r.c_used || 0),
        }
      : null;

    const pricing = calculateSellerLinkPricing({
      plan: {
        price_monthly: Number(r.price_monthly || 0),
        price_annual: Number(r.price_annual || 0),
        is_free: Boolean(r.plan_is_free),
      },
      cycle,
      discountPercent: Number(r.discount_percent || 0),
      coupon,
    });

    return {
      id: String(r.id),
      code: String(r.code),
      seller_type: params.sellerType,
      label: r.label ? String(r.label) : null,
      plan_id: String(r.plan_id),
      plan_name: String(r.plan_name),
      plan_is_free: Boolean(r.plan_is_free),
      price_monthly: Number(r.price_monthly || 0),
      price_annual: Number(r.price_annual || 0),
      billing_cycle: cycle,
      coupon_code: r.coupon_code ? String(r.coupon_code) : null,
      discount_percent: Number(r.discount_percent || 0),
      trial_days: Number(r.trial_days || 0),
      max_uses: r.max_uses !== null && r.max_uses !== undefined ? Number(r.max_uses) : null,
      used_count: Number(r.used_count || 0),
      expires_at: r.expires_at ? new Date(String(r.expires_at)).toISOString() : null,
      active: Boolean(r.active),
      created_at: new Date(String(r.created_at)).toISOString(),
      pricing,
      estimated_commission: calculateCommissionAmount(pricing.finalAmount, pct),
    };
  });
}

export async function toggleSellerSignupLink(params: {
  id: string;
  sellerType: SellerType;
  representanteId?: string | null;
  atendenteUserId?: string | null;
  active: boolean;
}): Promise<boolean> {
  const rows =
    params.sellerType === 'REPRESENTANTE'
      ? await sql`
          UPDATE seller_signup_links SET active = ${params.active}, updated_at = NOW()
          WHERE id = ${params.id}::uuid AND seller_type = 'REPRESENTANTE' AND representante_id = ${params.representanteId}::uuid
          RETURNING id
        `
      : await sql`
          UPDATE seller_signup_links SET active = ${params.active}, updated_at = NOW()
          WHERE id = ${params.id}::uuid AND seller_type = 'ATENDENTE' AND atendente_user_id = ${params.atendenteUserId}::uuid
          RETURNING id
        `;
  return rows.length > 0;
}

// ─── Resolução pública segura do link (/assinar/[code]) ──────────────────────

export interface ResolvedPublicSellerLink {
  id: string;
  code: string;
  sellerType: SellerType;
  sellerName: string;
  representanteId: string | null;
  atendenteUserId: string | null;
  label: string | null;
  plan: {
    id: string;
    name: string;
    description: string;
    price_monthly: number;
    price_annual: number;
    is_free: boolean;
    modules: { id: string; name: string; description: string }[];
  };
  billingCycle: 'MONTHLY' | 'ANNUAL';
  couponCode: string | null;
  discountPercent: number;
  trialDays: number;
  pricing: PricingResult;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
}

export async function resolvePublicSellerSignupLink(
  rawCode: string
): Promise<{ ok: true; link: ResolvedPublicSellerLink } | { ok: false; error: string; status: number }> {
  const code = normalizeSellerLinkCode(rawCode);
  if (code.length < 5) {
    return { ok: false, error: 'Link de assinatura inválido.', status: 404 };
  }

  const rows = await sql`
    SELECT l.*,
           sp.name AS plan_name, sp.description AS plan_description,
           sp.price_monthly, sp.price_annual, sp.is_free AS plan_is_free,
           sp.archived AS plan_archived, sp.module_ids AS plan_module_ids,
           r.nome AS rep_nome, r.ativo AS rep_ativo,
           u.name AS atend_nome, u.ativo AS atend_ativo
    FROM seller_signup_links l
    JOIN saas_plans sp ON sp.id = l.plan_id
    LEFT JOIN representantes r ON r.id = l.representante_id
    LEFT JOIN users u ON u.id = l.atendente_user_id
    WHERE UPPER(l.code) = ${code}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return { ok: false, error: 'Link de assinatura não encontrado.', status: 404 };
  if (!row.active) return { ok: false, error: 'Este link de assinatura foi desativado.', status: 410 };
  if (row.plan_archived) return { ok: false, error: 'O plano deste link não está mais disponível.', status: 410 };
  if (row.expires_at && new Date(String(row.expires_at)).getTime() < Date.now()) {
    return { ok: false, error: 'Este link de assinatura expirou. Solicite um novo link ao seu consultor.', status: 410 };
  }
  if (row.max_uses !== null && row.max_uses !== undefined && Number(row.used_count) >= Number(row.max_uses)) {
    return { ok: false, error: 'Este link de assinatura já atingiu o limite máximo de utilizações.', status: 410 };
  }

  const sellerType = String(row.seller_type) === 'ATENDENTE' ? 'ATENDENTE' : 'REPRESENTANTE';
  const sellerActive = sellerType === 'REPRESENTANTE' ? Boolean(row.rep_ativo) : Boolean(row.atend_ativo);
  if (!sellerActive) {
    return { ok: false, error: 'O consultor responsável por este link não está mais ativo.', status: 410 };
  }

  const sellerName = sellerType === 'REPRESENTANTE' ? String(row.rep_nome || 'Consultor Benavera') : String(row.atend_nome || 'Consultor Benavera');
  const cycle: 'MONTHLY' | 'ANNUAL' = String(row.billing_cycle) === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  const coupon = row.coupon_code ? await validateAndLoadCoupon(String(row.coupon_code)) : null;
  const pricing = calculateSellerLinkPricing({
    plan: {
      price_monthly: Number(row.price_monthly || 0),
      price_annual: Number(row.price_annual || 0),
      is_free: Boolean(row.plan_is_free),
    },
    cycle,
    discountPercent: Number(row.discount_percent || 0),
    coupon,
  });

  const moduleIds = Array.isArray(row.plan_module_ids) ? (row.plan_module_ids as string[]) : [];
  const modRows =
    moduleIds.length > 0
      ? await sql`
          SELECT id, name, description FROM platform_modules
          WHERE id = ANY(${moduleIds}::text[]) AND is_active_global = TRUE
          ORDER BY sort_order ASC, name ASC
        `
      : [];

  return {
    ok: true,
    link: {
      id: String(row.id),
      code: String(row.code),
      sellerType,
      sellerName,
      representanteId: row.representante_id ? String(row.representante_id) : null,
      atendenteUserId: row.atendente_user_id ? String(row.atendente_user_id) : null,
      label: row.label ? String(row.label) : null,
      plan: {
        id: String(row.plan_id),
        name: String(row.plan_name),
        description: row.plan_description ? String(row.plan_description) : '',
        price_monthly: Number(row.price_monthly || 0),
        price_annual: Number(row.price_annual || 0),
        is_free: Boolean(row.plan_is_free),
        modules: modRows.map(m => ({
          id: String(m.id),
          name: String(m.name),
          description: String(m.description || ''),
        })),
      },
      billingCycle: cycle,
      couponCode: coupon ? coupon.code : null,
      discountPercent: Number(row.discount_percent || 0),
      trialDays: Number(row.trial_days || 0),
      pricing,
      maxUses: row.max_uses !== null && row.max_uses !== undefined ? Number(row.max_uses) : null,
      usedCount: Number(row.used_count || 0),
      expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    },
  };
}

// ─── Vínculo Atendente ↔ Clínica SaaS + Motor de Comissões Separadas ─────────

export async function vincularClinicaAtendente(params: {
  atendenteUserId: string;
  clinicId: string;
  signupLinkId?: string | null;
  origem?: string;
  criadoPor?: string;
}): Promise<{ success: boolean; vinculoId?: string }> {
  const userRows = await sql`
    SELECT id, mensalidade_percent, comissao_periodo_meses
    FROM users WHERE id = ${params.atendenteUserId}::uuid LIMIT 1
  `;
  const u = userRows[0];
  if (!u) return { success: false };

  const pct = Math.min(100, Math.max(0, Number(u.mensalidade_percent || 0)));
  const periodo =
    u.comissao_periodo_meses !== null && u.comissao_periodo_meses !== undefined && Number(u.comissao_periodo_meses) > 0
      ? Math.floor(Number(u.comissao_periodo_meses))
      : null;

  await sql`
    UPDATE atendente_vinculos
    SET ativo = FALSE, fim = LEAST(COALESCE(fim, NOW()), NOW()), updated_at = NOW()
    WHERE clinic_id = ${params.clinicId}::uuid AND ativo = TRUE
  `;

  const rows = await sql`
    INSERT INTO atendente_vinculos (
      atendente_user_id, clinic_id, signup_link_id, mensalidade_percent, periodo_meses,
      inicio, fim, ativo, origem, criado_por
    ) VALUES (
      ${params.atendenteUserId}::uuid, ${params.clinicId}::uuid, ${params.signupLinkId ?? null}::uuid,
      ${pct}, ${periodo},
      NOW(),
      CASE WHEN ${periodo}::int IS NULL THEN NULL ELSE NOW() + (${periodo}::int * INTERVAL '1 month') END,
      TRUE, ${params.origem || 'LINK_ASSINATURA'}, ${params.criadoPor || 'link'}
    )
    RETURNING id
  `;

  await syncAtendenteSaasComissoes(params.atendenteUserId);
  return { success: true, vinculoId: String(rows[0].id) };
}

export async function syncAtendenteSaasComissoes(atendenteUserId?: string | null): Promise<void> {
  const userId = atendenteUserId ?? null;
  await sql`
    INSERT INTO atendente_saas_comissoes (
      atendente_user_id, vinculo_id, clinic_id, invoice_id,
      base_valor, percent, valor, status, competencia, liberada_em
    )
    SELECT v.atendente_user_id, v.id, v.clinic_id, i.id,
           COALESCE(i.amount, 0), v.mensalidade_percent,
           ROUND(COALESCE(i.amount, 0) * v.mensalidade_percent / 100, 2),
           CASE WHEN i.status = 'PAID' THEN 'A_RECEBER'
                WHEN i.status IN ('REFUNDED', 'CANCELLED') THEN 'CANCELADA'
                ELSE 'PREVISTA' END,
           COALESCE(i.paid_at::date, i.due_date, i.created_at::date),
           CASE WHEN i.status = 'PAID' THEN COALESCE(i.paid_at, NOW()) END
    FROM atendente_vinculos v
    JOIN saas_invoices i ON i.clinic_id = v.clinic_id
                        AND i.amount > 0
                        AND i.status IN ('PAID', 'REFUNDED', 'CANCELLED')
                        AND COALESCE(i.paid_at, i.created_at) >= v.inicio
                        AND (v.fim IS NULL OR COALESCE(i.paid_at, i.created_at) <= v.fim)
    WHERE v.mensalidade_percent > 0
      AND (${userId}::uuid IS NULL OR v.atendente_user_id = ${userId}::uuid)
    ON CONFLICT (vinculo_id, invoice_id) DO UPDATE SET
      base_valor = EXCLUDED.base_valor,
      valor = EXCLUDED.valor,
      status = EXCLUDED.status,
      competencia = EXCLUDED.competencia,
      liberada_em = COALESCE(atendente_saas_comissoes.liberada_em, EXCLUDED.liberada_em),
      updated_at = NOW()
    WHERE atendente_saas_comissoes.status <> 'PAGA'
      AND (atendente_saas_comissoes.status, atendente_saas_comissoes.valor, atendente_saas_comissoes.base_valor)
          IS DISTINCT FROM (EXCLUDED.status, EXCLUDED.valor, EXCLUDED.base_valor)
  `;
}

export interface AtendenteSaasComissaoRow {
  id: string;
  atendente_user_id: string;
  atendente_name: string;
  clinic_id: string;
  clinica_nome: string;
  invoice_id: string;
  cycle: string;
  base_valor: number;
  percent: number;
  valor: number;
  status: AtendenteSaasComissaoStatus;
  competencia: string | null;
  liberada_em: string | null;
  paga_em: string | null;
  observacao: string | null;
  comprovante_url: string | null;
}

export async function listAtendenteSaasComissoes(options?: {
  atendenteUserId?: string | null;
  status?: string | null;
}): Promise<{
  comissoes: AtendenteSaasComissaoRow[];
  totais: { prevista: number; a_receber: number; paga: number; cancelada: number };
}> {
  await syncAtendenteSaasComissoes(options?.atendenteUserId ?? null);

  const userId = options?.atendenteUserId ?? null;
  const st = options?.status && options.status !== 'all' ? options.status : null;

  const rows = await sql`
    SELECT c.*, u.name AS atendente_name, cl.nome_fantasia AS clinica_nome, i.cycle AS invoice_cycle
    FROM atendente_saas_comissoes c
    JOIN users u ON u.id = c.atendente_user_id
    JOIN clinics cl ON cl.id = c.clinic_id
    LEFT JOIN saas_invoices i ON i.id = c.invoice_id
    WHERE (${userId}::uuid IS NULL OR c.atendente_user_id = ${userId}::uuid)
      AND (${st}::text IS NULL OR c.status = ${st})
    ORDER BY c.competencia DESC NULLS LAST, c.created_at DESC
    LIMIT 500
  `;

  const comissoes: AtendenteSaasComissaoRow[] = rows.map(r => ({
    id: String(r.id),
    atendente_user_id: String(r.atendente_user_id),
    atendente_name: String(r.atendente_name || 'Atendente'),
    clinic_id: String(r.clinic_id),
    clinica_nome: String(r.clinica_nome || 'Clínica'),
    invoice_id: String(r.invoice_id),
    cycle: String(r.invoice_cycle || 'MONTHLY'),
    base_valor: Number(r.base_valor || 0),
    percent: Number(r.percent || 0),
    valor: Number(r.valor || 0),
    status: String(r.status) as AtendenteSaasComissaoStatus,
    competencia: r.competencia ? new Date(String(r.competencia)).toISOString().slice(0, 10) : null,
    liberada_em: r.liberada_em ? new Date(String(r.liberada_em)).toISOString() : null,
    paga_em: r.paga_em ? new Date(String(r.paga_em)).toISOString() : null,
    observacao: r.observacao ? String(r.observacao) : null,
    comprovante_url: r.comprovante_url ? String(r.comprovante_url) : null,
  }));

  const sum = (s: AtendenteSaasComissaoStatus) =>
    Math.round(comissoes.filter(c => c.status === s).reduce((acc, c) => acc + c.valor, 0) * 100) / 100;

  return {
    comissoes,
    totais: {
      prevista: sum('PREVISTA'),
      a_receber: sum('A_RECEBER'),
      paga: sum('PAGA'),
      cancelada: sum('CANCELADA'),
    },
  };
}

export async function updateAtendenteSaasComissaoStatus(params: {
  id: string;
  status: 'PAGA' | 'CANCELADA' | 'A_RECEBER';
  observacao?: string | null;
  comprovanteUrl?: string | null;
  pagoPor: string;
}): Promise<boolean> {
  const rows = await sql`
    UPDATE atendente_saas_comissoes
    SET status = ${params.status},
        observacao = COALESCE(${params.observacao ?? null}, observacao),
        comprovante_url = COALESCE(${params.comprovanteUrl ?? null}, comprovante_url),
        paga_em = CASE WHEN ${params.status} = 'PAGA' THEN NOW() ELSE paga_em END,
        pago_por = CASE WHEN ${params.status} = 'PAGA' THEN ${params.pagoPor} ELSE pago_por END,
        updated_at = NOW()
    WHERE id = ${params.id}::uuid
    RETURNING id, atendente_user_id, valor
  `;
  if (!rows[0]) return false;

  if (params.status === 'PAGA') {
    const info = await sql`
      SELECT u.name, u.email, cl.nome_fantasia
      FROM atendente_saas_comissoes c
      JOIN users u ON u.id = c.atendente_user_id
      JOIN clinics cl ON cl.id = c.clinic_id
      WHERE c.id = ${params.id}::uuid LIMIT 1
    `;
    if (info[0]?.email) {
      await sendAtendenteCommissionEmail({
        to: String(info[0].email),
        userId: String(rows[0].atendente_user_id),
        atendenteName: String(info[0].name || 'Comercial'),
        evento: `Mensalidade SaaS — ${String(info[0].nome_fantasia || 'Clínica')}`,
        valor: Number(rows[0].valor || 0),
        status: 'paga',
        justificativa: params.observacao || null,
        commissionId: String(rows[0].id),
      }).catch(() => {});
    }
  }
  return true;
}
