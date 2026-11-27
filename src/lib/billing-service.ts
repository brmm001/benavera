// src/lib/billing-service.ts
// Motor de mensalidades SaaS da Benavera (Mercado Pago + ciclos + carência de 7 dias + comissões).

import { sql } from './benavera-db';
import { logModuleAudit } from './clinic-modules';
import { syncComissoes } from './representantes-db';
import {
  cancelMpPreapprovalVerified,
  createMpBoletoPayment,
  createMpCheckoutPreference,
  createMpPixPayment,
  createMpPreapproval,
  getMpAuthorizedPayment,
  getMpPayment,
  getMpPreapproval,
  isMercadoPagoConfigured,
  MercadoPagoApiError,
} from './mercadopago';
import {
  sendSubscriptionCancelledEmail,
  sendSubscriptionGraceWarningEmail,
  sendSubscriptionInvoiceEmail,
  sendSubscriptionPaymentConfirmedEmail,
  sendSubscriptionSuspendedEmail,
} from './email';

export const GRACE_DAYS = 7;

export type BillingCycle = 'MONTHLY' | 'ANNUAL' | 'LIFETIME_FREE' | 'CUSTOM';
export type BillingPaymentMethod = 'CARD_RECURRING' | 'PIX' | 'BOLETO' | 'MANUAL';

export interface PricingPlanInput {
  price_monthly: number;
  price_annual: number;
  is_free: boolean;
}

export interface PricingCouponInput {
  code: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  active: boolean;
  expires_at?: string | null;
  max_uses?: number | null;
  used_count?: number;
}

export interface PricingResult {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  isFree: boolean;
  appliedCoupon: string | null;
}

function roundMoney(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function isCouponValidNow(coupon: PricingCouponInput | null | undefined, nowMs = Date.now()): boolean {
  if (!coupon || !coupon.active) return false;
  if (coupon.expires_at) {
    const exp = Date.parse(coupon.expires_at);
    if (Number.isFinite(exp) && exp < nowMs) return false;
  }
  if (coupon.max_uses !== null && coupon.max_uses !== undefined && (coupon.used_count ?? 0) >= coupon.max_uses) {
    return false;
  }
  return true;
}

export function calculateSubscriptionPricing(params: {
  plan: PricingPlanInput;
  cycle: 'MONTHLY' | 'ANNUAL';
  customPrice?: number | null;
  discountPercent?: number | null;
  coupon?: PricingCouponInput | null;
  nowMs?: number;
}): PricingResult {
  const { plan, cycle, customPrice, discountPercent, coupon, nowMs = Date.now() } = params;

  const planBase = cycle === 'ANNUAL' ? Number(plan.price_annual || 0) : Number(plan.price_monthly || 0);
  const baseAmount =
    customPrice !== null && customPrice !== undefined && Number.isFinite(Number(customPrice)) && Number(customPrice) >= 0
      ? roundMoney(Number(customPrice))
      : roundMoney(Math.max(0, planBase));

  if ((plan.is_free && (customPrice === null || customPrice === undefined)) || baseAmount <= 0) {
    return { baseAmount: 0, discountAmount: 0, finalAmount: 0, isFree: true, appliedCoupon: null };
  }

  let running = baseAmount;
  const pct = Math.min(100, Math.max(0, Number(discountPercent || 0)));
  if (pct > 0) {
    running = roundMoney(running * (1 - pct / 100));
  }

  let appliedCoupon: string | null = null;
  if (coupon && isCouponValidNow(coupon, nowMs)) {
    const val = Math.max(0, Number(coupon.discount_value || 0));
    if (coupon.discount_type === 'FIXED') {
      running = roundMoney(Math.max(0, running - val));
    } else {
      running = roundMoney(running * (1 - Math.min(100, val) / 100));
    }
    appliedCoupon = coupon.code;
  }

  const finalAmount = roundMoney(Math.max(0, running));
  const discountAmount = roundMoney(Math.max(0, baseAmount - finalAmount));
  return {
    baseAmount,
    discountAmount,
    finalAmount,
    isFree: finalAmount <= 0,
    appliedCoupon,
  };
}

export function computeNextPeriod(params: {
  currentPeriodEnd?: string | Date | null;
  cycle: 'MONTHLY' | 'ANNUAL';
  now?: Date;
}): { periodStart: Date; periodEnd: Date } {
  const now = params.now || new Date();
  const existingEnd = params.currentPeriodEnd ? new Date(params.currentPeriodEnd) : null;
  const periodStart = existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
  const periodEnd = new Date(periodStart.getTime());
  if (params.cycle === 'ANNUAL') {
    periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
  } else {
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  }
  return { periodStart, periodEnd };
}

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.benavera.com.br')
    .trim()
    .replace(/\/$/, '');
}

export async function validateAndLoadCoupon(codeRaw: string | null | undefined): Promise<PricingCouponInput | null> {
  const code = String(codeRaw || '').trim().toUpperCase();
  if (!code) return null;
  const rows = await sql`
    SELECT code, discount_type, discount_value, active, expires_at, max_uses, used_count
    FROM saas_coupons
    WHERE UPPER(code) = ${code}
    LIMIT 1
  `;
  const r = rows[0];
  if (!r) return null;
  const coupon: PricingCouponInput = {
    code: String(r.code),
    discount_type: String(r.discount_type) === 'FIXED' ? 'FIXED' : 'PERCENT',
    discount_value: Number(r.discount_value || 0),
    active: Boolean(r.active),
    expires_at: r.expires_at ? String(r.expires_at) : null,
    max_uses: r.max_uses !== null && r.max_uses !== undefined ? Number(r.max_uses) : null,
    used_count: Number(r.used_count || 0),
  };
  return isCouponValidNow(coupon) ? coupon : null;
}

// ── Iniciar Checkout (Cartão Recorrente, Pix ou Boleto/Checkout Pro) ─────────

export async function startClinicCheckout(params: {
  clinicId: string;
  planId: string;
  cycle: 'MONTHLY' | 'ANNUAL';
  paymentMethod: 'CARD_RECURRING' | 'PIX' | 'BOLETO';
  couponCode?: string | null;
  payerEmail?: string | null;
  /** Token de cartão gerado no front-end pelo Mercado Pago JS SDK v2 (Checkout Transparente) */
  cardTokenId?: string | null;
  payerName?: string | null;
  payerDocument?: string | null;
  payerAddress?: {
    zipCode?: string | null;
    streetName?: string | null;
    streetNumber?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    federalUnit?: string | null;
  } | null;
  /** Permite fallback para Checkout Pro (usado pelo Admin se a clínica não tiver endereço para boleto nativo) */
  allowHostedFallback?: boolean;
  actorId?: string | null;
  actorName?: string | null;
  sendInvoiceEmail?: boolean;
}) {
  const [clinicRows, planRows, subRows, obRows] = await Promise.all([
    sql`
      SELECT id, nome_fantasia, razao_social, email, email_financeiro, cnpj, cpf_responsavel, responsavel,
             cep, logradouro, numero, bairro, cidade, estado
      FROM clinics WHERE id = ${params.clinicId}::uuid LIMIT 1
    `,
    sql`SELECT * FROM saas_plans WHERE id = ${params.planId}::uuid AND archived = FALSE LIMIT 1`,
    sql`SELECT * FROM clinic_subscriptions WHERE clinic_id = ${params.clinicId}::uuid LIMIT 1`,
    sql`
      SELECT address_cep, address_street, address_number, address_neighborhood, address_city, address_state
      FROM clinic_onboardings WHERE clinic_id = ${params.clinicId}::uuid
      ORDER BY created_at DESC LIMIT 1
    `,
  ]);

  const clinic = clinicRows[0];
  if (!clinic) throw new Error('Clínica não encontrada.');
  const plan = planRows[0];
  if (!plan) throw new Error('Plano não encontrado ou arquivado.');
  const currentSub = subRows[0] || null;
  const obAddr = obRows[0] || null;

  const coupon = params.couponCode ? await validateAndLoadCoupon(params.couponCode) : null;
  if (params.couponCode && !coupon) {
    throw new Error('Cupom inválido, expirado ou esgotado.');
  }

  const samePlan = currentSub && String(currentSub.plan_id || '') === String(plan.id);
  const pricing = calculateSubscriptionPricing({
    plan: {
      price_monthly: Number(plan.price_monthly || 0),
      price_annual: Number(plan.price_annual || 0),
      is_free: Boolean(plan.is_free),
    },
    cycle: params.cycle,
    customPrice: samePlan && currentSub?.custom_price !== null && currentSub?.custom_price !== undefined
      ? Number(currentSub.custom_price)
      : null,
    discountPercent: samePlan ? Number(currentSub?.discount_percent || 0) : 0,
    coupon,
  });

  // Plano gratuito ou 100% descontado → cancela eventual recorrência ativa no Mercado Pago antes de ativar
  if (pricing.isFree) {
    if (currentSub?.mp_preapproval_id && isMercadoPagoConfigured()) {
      await cancelMpPreapprovalVerified(String(currentSub.mp_preapproval_id));
    }
    await sql`
      INSERT INTO clinic_subscriptions (
        clinic_id, plan_id, status, billing_cycle, is_exempt, coupon_code, payment_method,
        mp_preapproval_id, next_billing_at, cancel_at_period_end, updated_by, updated_at
      ) VALUES (
        ${params.clinicId}::uuid, ${plan.id}::uuid, 'EXEMPT', 'LIFETIME_FREE', TRUE, ${pricing.appliedCoupon}, 'MANUAL',
        NULL, NULL, FALSE, ${params.actorName || 'Sistema'}, NOW()
      )
      ON CONFLICT (clinic_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'EXEMPT',
        billing_cycle = 'LIFETIME_FREE',
        is_exempt = TRUE,
        coupon_code = EXCLUDED.coupon_code,
        mp_preapproval_id = NULL,
        next_billing_at = NULL,
        cancel_at_period_end = FALSE,
        grace_until = NULL,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `;
    return {
      freeActivated: true,
      amount: 0,
      invoiceId: null,
      checkoutUrl: null,
      pixQrCode: null,
      pixQrCodeBase64: null,
      pixExpiresAt: null,
    };
  }

  if (!isMercadoPagoConfigured()) {
    throw new Error('Mercado Pago ainda não configurado no servidor (MERCADOPAGO_ACCESS_TOKEN ausente).');
  }

  const payerEmail = String(params.payerEmail || clinic.email_financeiro || clinic.email || '').trim().toLowerCase();
  if (!payerEmail || !payerEmail.includes('@')) {
    throw new Error('Informe um e-mail financeiro válido da clínica para gerar a cobrança.');
  }

  // Garantir registro em clinic_subscriptions sem derrubar acesso se já estiver ACTIVE/TRIAL/GRACE
  const preserveStatus = currentSub && ['ACTIVE', 'TRIAL', 'GRACE'].includes(String(currentSub.status));
  const nextSubStatus = preserveStatus ? String(currentSub.status) : 'PENDING_PAYMENT';

  const subUpsert = await sql`
    INSERT INTO clinic_subscriptions (
      clinic_id, plan_id, status, billing_cycle, is_exempt, coupon_code, payment_method, mp_payer_email, updated_by, updated_at
    ) VALUES (
      ${params.clinicId}::uuid, ${plan.id}::uuid, ${nextSubStatus}, ${params.cycle}, FALSE,
      ${pricing.appliedCoupon}, ${params.paymentMethod}, ${payerEmail}, ${params.actorName || 'Clínica'}, NOW()
    )
    ON CONFLICT (clinic_id) DO UPDATE SET
      plan_id = CASE WHEN clinic_subscriptions.status IN ('ACTIVE','TRIAL','GRACE') THEN clinic_subscriptions.plan_id ELSE EXCLUDED.plan_id END,
      scheduled_plan_id = CASE WHEN clinic_subscriptions.status IN ('ACTIVE','TRIAL','GRACE') THEN EXCLUDED.plan_id ELSE NULL END,
      status = ${nextSubStatus},
      billing_cycle = EXCLUDED.billing_cycle,
      is_exempt = FALSE,
      coupon_code = COALESCE(EXCLUDED.coupon_code, clinic_subscriptions.coupon_code),
      payment_method = EXCLUDED.payment_method,
      mp_payer_email = EXCLUDED.mp_payer_email,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING id
  `;
  const subscriptionId = String(subUpsert[0].id);

  // Criar fatura pendente em saas_invoices
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const invRows = await sql`
    INSERT INTO saas_invoices (
      clinic_id, subscription_id, amount, status, cycle, due_date, payment_method,
      discount_amount, coupon_code, payload
    ) VALUES (
      ${params.clinicId}::uuid, ${subscriptionId}::uuid, ${pricing.finalAmount}, 'PENDING', ${params.cycle},
      ${dueDate}::date, ${params.paymentMethod}, ${pricing.discountAmount}, ${pricing.appliedCoupon},
      ${JSON.stringify({ plan_id: String(plan.id), plan_name: String(plan.name), base_amount: pricing.baseAmount })}::jsonb
    )
    RETURNING id
  `;
  const invoiceId = String(invRows[0].id);

  const baseUrl = getBaseUrl();
  const webhookUrl = `${baseUrl}/api/webhooks/mercadopago`;
  const cycleLabel = params.cycle === 'ANNUAL' ? 'Anual' : 'Mensal';
  const description = `Benavera — Plano ${String(plan.name)} (${cycleLabel})`;

  let checkoutUrl: string | null = null;
  let pixQrCode: string | null = null;
  let pixQrCodeBase64: string | null = null;
  let pixExpiresAt: string | null = null;
  let boletoDigitableLine: string | null = null;
  let boletoBarcode: string | null = null;
  let boletoPdfUrl: string | null = null;
  let boletoExpiresAt: string | null = null;
  let mpPaymentId: string | null = null;
  let mpPreapprovalId: string | null = null;
  let mpStatusInitial = 'pending';
  let activatedImmediately = false;
  let mpRaw: unknown = {};

  if (params.paymentMethod === 'CARD_RECURRING') {
    const pre = await createMpPreapproval({
      reason: description,
      externalReference: invoiceId,
      payerEmail,
      amount: pricing.finalAmount,
      frequency: params.cycle === 'ANNUAL' ? 12 : 1,
      frequencyType: 'months',
      backUrl: `${baseUrl}/painel/assinatura?mp_status=returned&invoice=${invoiceId}`,
      idempotencyKey: `preapproval-${invoiceId}`,
      cardTokenId: params.cardTokenId || null,
    });
    mpPreapprovalId = pre.id;
    checkoutUrl = pre.checkoutUrl;
    mpStatusInitial = String(pre.status || 'pending').toLowerCase();
    mpRaw = pre.raw;

    // Só grava mp_preapproval_id diretamente se ainda não houver recorrência ativa diferente;
    // se já existir outra, evita perder a referência antes da nova ser autorizada (evita cobrança dupla).
    const existingPreId = currentSub?.mp_preapproval_id ? String(currentSub.mp_preapproval_id) : null;
    if (!existingPreId || existingPreId === mpPreapprovalId) {
      await sql`
        UPDATE clinic_subscriptions
        SET mp_preapproval_id = ${mpPreapprovalId}, updated_at = NOW()
        WHERE id = ${subscriptionId}::uuid
      `;
    }
  } else if (params.paymentMethod === 'PIX') {
    const pix = await createMpPixPayment({
      amount: pricing.finalAmount,
      description,
      externalReference: invoiceId,
      payerEmail,
      payerFirstName: String(params.payerName || clinic.responsavel || clinic.nome_fantasia || 'Clínica'),
      payerDocument: String(params.payerDocument || clinic.cnpj || clinic.cpf_responsavel || ''),
      notificationUrl: webhookUrl,
      idempotencyKey: `pix-${invoiceId}`,
      expiresInHours: 24,
    });
    mpPaymentId = pix.id;
    pixQrCode = pix.qrCode;
    pixQrCodeBase64 = pix.qrCodeBase64;
    pixExpiresAt = pix.expiresAt;
    checkoutUrl = pix.ticketUrl;
    mpStatusInitial = String(pix.status || 'pending').toLowerCase();
    mpRaw = pix.raw;
  } else {
    // BOLETO — Checkout Transparente nativo via /v1/payments (bolbradesco)
    const doc = String(params.payerDocument || clinic.cnpj || clinic.cpf_responsavel || '').replace(/\D/g, '');
    const zipCode = String(params.payerAddress?.zipCode || clinic.cep || obAddr?.address_cep || '').replace(/\D/g, '');
    const streetName = String(params.payerAddress?.streetName || clinic.logradouro || obAddr?.address_street || '').trim();
    const streetNumber = String(params.payerAddress?.streetNumber || clinic.numero || obAddr?.address_number || 'S/N').trim();
    const neighborhood = String(params.payerAddress?.neighborhood || clinic.bairro || obAddr?.address_neighborhood || 'Centro').trim();
    const city = String(params.payerAddress?.city || clinic.cidade || obAddr?.address_city || '').trim();
    const federalUnit = String(params.payerAddress?.federalUnit || clinic.estado || obAddr?.address_state || '').trim().toUpperCase().slice(0, 2);

    const hasBoletoData = (doc.length === 11 || doc.length === 14) && zipCode.length === 8 && Boolean(streetName && city && federalUnit.length === 2);

    if (hasBoletoData) {
      const boleto = await createMpBoletoPayment({
        amount: pricing.finalAmount,
        description: `${description} — ${String(clinic.nome_fantasia)}`,
        externalReference: invoiceId,
        payerEmail,
        payerFullName: String(params.payerName || clinic.responsavel || clinic.razao_social || clinic.nome_fantasia || 'Clínica Benavera'),
        payerDocument: doc,
        payerAddress: { zipCode, streetName, streetNumber, neighborhood, city, federalUnit },
        notificationUrl: webhookUrl,
        idempotencyKey: `boleto-${invoiceId}`,
        expiresInDays: 3,
      });
      mpPaymentId = boleto.id;
      boletoDigitableLine = boleto.digitableLine;
      boletoBarcode = boleto.barcode;
      boletoPdfUrl = boleto.pdfUrl;
      boletoExpiresAt = boleto.expiresAt;
      checkoutUrl = boleto.pdfUrl;
      mpStatusInitial = String(boleto.status || 'pending').toLowerCase();
      mpRaw = boleto.raw;
    } else if (params.allowHostedFallback) {
      const pref = await createMpCheckoutPreference({
        title: description,
        description: `${description} — ${String(clinic.nome_fantasia)}`,
        amount: pricing.finalAmount,
        externalReference: invoiceId,
        payerEmail,
        backUrlSuccess: `${baseUrl}/painel/assinatura?mp_status=approved&invoice=${invoiceId}`,
        backUrlPending: `${baseUrl}/painel/assinatura?mp_status=pending&invoice=${invoiceId}`,
        backUrlFailure: `${baseUrl}/painel/assinatura?mp_status=failure&invoice=${invoiceId}`,
        notificationUrl: webhookUrl,
        idempotencyKey: `pref-${invoiceId}`,
      });
      checkoutUrl = pref.checkoutUrl;
      mpRaw = pref.raw;
    } else {
      throw new Error('Para emitir o boleto bancário transparente, informe CPF/CNPJ e endereço completo (CEP, rua, cidade e UF).');
    }
  }

  await sql`
    UPDATE saas_invoices
    SET
      mp_payment_id = COALESCE(${mpPaymentId}, mp_payment_id),
      mp_preapproval_id = COALESCE(${mpPreapprovalId}, mp_preapproval_id),
      mp_status = ${mpStatusInitial},
      checkout_url = ${checkoutUrl},
      pix_qr_code = ${pixQrCode},
      pix_qr_code_base64 = ${pixQrCodeBase64},
      pix_expires_at = ${pixExpiresAt},
      boleto_digitable_line = ${boletoDigitableLine},
      boleto_barcode = ${boletoBarcode},
      boleto_pdf_url = ${boletoPdfUrl},
      boleto_expires_at = ${boletoExpiresAt},
      external_id = COALESCE(${mpPaymentId || mpPreapprovalId}, external_id),
      payload = payload || ${JSON.stringify({ mp: mpRaw })}::jsonb,
      updated_at = NOW()
    WHERE id = ${invoiceId}::uuid
  `;

  // Se foi Cartão Recorrente Transparente com cardTokenId e o Mercado Pago já retornou 'authorized', ativa na hora!
  if (params.paymentMethod === 'CARD_RECURRING' && params.cardTokenId && mpStatusInitial === 'authorized') {
    await applyPaidInvoice({
      invoiceId,
      mpPreapprovalId,
      paymentMethod: 'CARD_RECURRING',
      rawPayload: mpRaw,
      actorName: 'Mercado Pago (Checkout Transparente)',
    });
    activatedImmediately = true;
  }

  await logModuleAudit({
    clinicId: params.clinicId,
    actorId: params.actorId || null,
    actorName: params.actorName || 'Sistema',
    scope: 'SUBSCRIPTION',
    targetId: invoiceId,
    action: `CREATE_CHECKOUT_${params.paymentMethod}`,
    newValue: {
      planId: String(plan.id),
      cycle: params.cycle,
      amount: pricing.finalAmount,
      coupon: pricing.appliedCoupon,
      transparentCard: Boolean(params.cardTokenId),
      activatedImmediately,
    },
  });

  if (params.sendInvoiceEmail && !activatedImmediately) {
    sendSubscriptionInvoiceEmail({
      to: payerEmail,
      clinicName: String(clinic.nome_fantasia),
      clinicId: params.clinicId,
      planName: String(plan.name),
      amount: pricing.finalAmount,
      dueDate,
      paymentUrl: checkoutUrl || `${baseUrl}/painel/assinatura`,
      pixCopyPaste: pixQrCode || boletoDigitableLine,
    }).catch(err => console.warn('[Email Fatura SaaS]', err));
  }

  return {
    freeActivated: false,
    activatedImmediately,
    invoiceId,
    subscriptionId,
    amount: pricing.finalAmount,
    baseAmount: pricing.baseAmount,
    discountAmount: pricing.discountAmount,
    appliedCoupon: pricing.appliedCoupon,
    paymentMethod: params.paymentMethod,
    mpStatus: mpStatusInitial,
    checkoutUrl,
    pixQrCode,
    pixQrCodeBase64,
    pixExpiresAt,
    boletoDigitableLine,
    boletoBarcode,
    boletoPdfUrl,
    boletoExpiresAt,
  };
}

// ── Aplicar Fatura Paga (Idempotente + Renova Ciclo + Comissão Representante) ─

export async function applyPaidInvoice(params: {
  invoiceId: string;
  mpPaymentId?: string | null;
  mpPreapprovalId?: string | null;
  paymentMethod?: string | null;
  paidAt?: Date;
  rawPayload?: unknown;
  actorName?: string;
}): Promise<{ alreadyPaid: boolean; clinicId: string; periodEnd?: string }> {
  const rows = await sql`
    SELECT i.*, c.nome_fantasia, c.email, c.email_financeiro,
           cs.plan_id AS sub_plan_id, cs.scheduled_plan_id, cs.current_period_end,
           cs.mp_preapproval_id AS current_mp_preapproval_id
    FROM saas_invoices i
    JOIN clinics c ON c.id = i.clinic_id
    LEFT JOIN clinic_subscriptions cs ON cs.clinic_id = i.clinic_id
    WHERE i.id = ${params.invoiceId}::uuid
    LIMIT 1
  `;
  const inv = rows[0];
  if (!inv) throw new Error('Fatura não encontrada.');

  const clinicId = String(inv.clinic_id);
  if (String(inv.status) === 'PAID') {
    return { alreadyPaid: true, clinicId };
  }

  const paidAt = params.paidAt || new Date();
  const cycle: 'MONTHLY' | 'ANNUAL' = String(inv.cycle) === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  const { periodStart, periodEnd } = computeNextPeriod({
    currentPeriodEnd: inv.current_period_end ? String(inv.current_period_end) : null,
    cycle,
    now: paidAt,
  });

  // Atualização condicional garante idempotência mesmo sob webhooks concorrentes
  const updatedInv = await sql`
    UPDATE saas_invoices
    SET
      status = 'PAID',
      paid_at = ${paidAt.toISOString()},
      mp_payment_id = COALESCE(${params.mpPaymentId || null}, mp_payment_id),
      mp_preapproval_id = COALESCE(${params.mpPreapprovalId || null}, mp_preapproval_id),
      mp_status = 'approved',
      payment_method = COALESCE(${params.paymentMethod || null}, payment_method),
      period_start = ${periodStart.toISOString()},
      period_end = ${periodEnd.toISOString()},
      payload = payload || ${JSON.stringify(params.rawPayload ? { mp_paid: params.rawPayload } : {})}::jsonb,
      updated_at = NOW()
    WHERE id = ${params.invoiceId}::uuid AND status <> 'PAID'
    RETURNING id
  `;

  if (updatedInv.length === 0) {
    return { alreadyPaid: true, clinicId };
  }

  // Incrementar uso do cupom (uma única vez)
  if (inv.coupon_code) {
    await sql`
      UPDATE saas_coupons
      SET used_count = used_count + 1
      WHERE UPPER(code) = UPPER(${String(inv.coupon_code)})
    `;
  }

  const payloadObj = (typeof inv.payload === 'string' ? JSON.parse(inv.payload) : inv.payload || {}) as Record<string, unknown>;
  const targetPlanId = (payloadObj.plan_id as string | undefined) || (inv.scheduled_plan_id ? String(inv.scheduled_plan_id) : null) || (inv.sub_plan_id ? String(inv.sub_plan_id) : null);

  // Se uma NOVA recorrência (/preapproval) foi ativada enquanto havia outra antiga, cancela a antiga no Mercado Pago para evitar cobrança dupla!
  const newPreId = params.mpPreapprovalId || (inv.mp_preapproval_id ? String(inv.mp_preapproval_id) : null);
  const oldPreId = inv.current_mp_preapproval_id ? String(inv.current_mp_preapproval_id) : null;
  if (newPreId && oldPreId && oldPreId !== newPreId && isMercadoPagoConfigured()) {
    try {
      await cancelMpPreapprovalVerified(oldPreId);
    } catch (swapErr) {
      console.error('[Billing] Falha ao cancelar recorrência anterior na troca de plano:', oldPreId, swapErr);
    }
  }

  await sql`
    INSERT INTO clinic_subscriptions (
      clinic_id, plan_id, status, billing_cycle, is_exempt, payment_method,
      mp_preapproval_id, current_period_start, current_period_end, next_billing_at,
      grace_until, last_payment_at, failed_payment_count, cancel_at_period_end, cancelled_at, updated_by, updated_at
    ) VALUES (
      ${clinicId}::uuid, ${targetPlanId}::uuid, 'ACTIVE', ${cycle}, FALSE,
      ${params.paymentMethod || inv.payment_method || 'PIX'},
      ${newPreId},
      ${periodStart.toISOString()}, ${periodEnd.toISOString()}, ${periodEnd.toISOString()},
      NULL, ${paidAt.toISOString()}, 0, FALSE, NULL, ${params.actorName || 'Mercado Pago'}, NOW()
    )
    ON CONFLICT (clinic_id) DO UPDATE SET
      plan_id = COALESCE(${targetPlanId}::uuid, clinic_subscriptions.plan_id),
      scheduled_plan_id = NULL,
      status = 'ACTIVE',
      billing_cycle = ${cycle},
      is_exempt = FALSE,
      payment_method = COALESCE(${params.paymentMethod || inv.payment_method || null}, clinic_subscriptions.payment_method),
      mp_preapproval_id = COALESCE(${newPreId}, clinic_subscriptions.mp_preapproval_id),
      current_period_start = ${periodStart.toISOString()},
      current_period_end = ${periodEnd.toISOString()},
      next_billing_at = ${periodEnd.toISOString()},
      grace_until = NULL,
      last_payment_at = ${paidAt.toISOString()},
      failed_payment_count = 0,
      cancel_at_period_end = FALSE,
      cancelled_at = NULL,
      updated_by = ${params.actorName || 'Mercado Pago'},
      updated_at = NOW()
  `;

  await logModuleAudit({
    clinicId,
    actorName: params.actorName || 'Mercado Pago',
    scope: 'SUBSCRIPTION',
    targetId: params.invoiceId,
    action: 'INVOICE_PAID',
    newValue: {
      amount: Number(inv.amount),
      mpPaymentId: params.mpPaymentId || null,
      periodEnd: periodEnd.toISOString(),
    },
  });

  // Gerar comissão MENSALIDADE para representante vinculado (idempotente) e notificar por e-mail
  try {
    await syncComissoes(null);
    const { notifyRepresentanteUnlockedCommission } = await import('./email-reports');
    await notifyRepresentanteUnlockedCommission({
      clinicId,
      tipo: 'MENSALIDADE',
      refId: params.invoiceId,
    }).catch(() => {});
  } catch (repErr) {
    console.error('[Billing] Falha ao sincronizar comissão de mensalidade:', repErr);
  }

  // Enviar recibo por e-mail
  const toEmail = String(inv.email_financeiro || inv.email || '').trim();
  if (toEmail) {
    sendSubscriptionPaymentConfirmedEmail({
      to: toEmail,
      clinicName: String(inv.nome_fantasia || 'Clínica'),
      planName: String(payloadObj.plan_name || 'Plano Benavera'),
      amount: Number(inv.amount),
      nextBillingDate: periodEnd.toLocaleDateString('pt-BR'),
    }).catch(err => console.warn('[Email Recibo SaaS]', err));
  }

  return { alreadyPaid: false, clinicId, periodEnd: periodEnd.toISOString() };
}

// ── Processar Webhook Mercado Pago (sempre consulta API oficial do MP) ───────

export async function processMercadoPagoWebhook(params: {
  eventType: string;
  resourceId: string;
  requestId: string | null;
  signatureValid: boolean;
  rawPayload: unknown;
}): Promise<{ processed: boolean; duplicate?: boolean; action?: string }> {
  const { eventType, resourceId, requestId, signatureValid, rawPayload } = params;

  // Deduplicação por (event_type, resource_id, request_id) já processado
  if (requestId) {
    const dup = await sql`
      SELECT id FROM mp_webhook_events
      WHERE event_type = ${eventType} AND resource_id = ${resourceId} AND request_id = ${requestId} AND processed = TRUE
      LIMIT 1
    `;
    if (dup.length > 0) {
      return { processed: true, duplicate: true };
    }
  }

  const evtRows = await sql`
    INSERT INTO mp_webhook_events (request_id, event_type, resource_id, signature_valid, processed, payload)
    VALUES (${requestId}, ${eventType}, ${resourceId}, ${signatureValid}, FALSE, ${JSON.stringify(rawPayload || {})}::jsonb)
    RETURNING id
  `;
  const evtId = String(evtRows[0].id);

  if (!signatureValid) {
    return { processed: false, action: 'rejected_invalid_signature' };
  }

  try {
    let action = 'ignored';

    if (eventType === 'payment') {
      const payment = await getMpPayment(resourceId);
      const mpId = String(payment.id);
      const mpStatus = String(payment.status || '').toLowerCase();
      const extRef = payment.external_reference ? String(payment.external_reference) : null;
      const preapprovalId = payment.preapproval_id ? String(payment.preapproval_id) : null;

      // Encontrar fatura por mp_payment_id ou external_reference (UUID)
      const isUuid = extRef && /^[0-9a-f-]{36}$/i.test(extRef);
      let invoiceId: string | null = null;
      const foundByMp = await sql`SELECT id FROM saas_invoices WHERE mp_payment_id = ${mpId} LIMIT 1`;
      if (foundByMp[0]) {
        invoiceId = String(foundByMp[0].id);
      } else if (isUuid) {
        const foundById = await sql`SELECT id FROM saas_invoices WHERE id = ${extRef}::uuid LIMIT 1`;
        if (foundById[0]) invoiceId = String(foundById[0].id);
      }

      // Se é cobrança recorrente de ciclo subsequente vinculada a um preapproval_id, criar fatura automaticamente
      if (!invoiceId && preapprovalId) {
        const subRows = await sql`
          SELECT cs.id, cs.clinic_id, cs.billing_cycle, cs.plan_id, sp.name AS plan_name
          FROM clinic_subscriptions cs
          LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
          WHERE cs.mp_preapproval_id = ${preapprovalId}
          LIMIT 1
        `;
        if (subRows[0]) {
          const createdInv = await sql`
            INSERT INTO saas_invoices (
              clinic_id, subscription_id, amount, status, cycle, due_date, payment_method,
              mp_payment_id, mp_preapproval_id, mp_status, external_id, payload
            ) VALUES (
              ${subRows[0].clinic_id}::uuid, ${subRows[0].id}::uuid,
              ${Number(payment.transaction_amount || 0)}, 'PENDING',
              ${String(subRows[0].billing_cycle || 'MONTHLY')}, CURRENT_DATE, 'CARD_RECURRING',
              ${mpId}, ${preapprovalId}, ${mpStatus}, ${mpId},
              ${JSON.stringify({ plan_id: subRows[0].plan_id, plan_name: subRows[0].plan_name, recurring_auto: true })}::jsonb
            )
            ON CONFLICT (mp_payment_id) WHERE mp_payment_id IS NOT NULL DO UPDATE SET updated_at = NOW()
            RETURNING id
          `;
          invoiceId = String(createdInv[0].id);
        }
      }

      if (invoiceId) {
        if (mpStatus === 'approved') {
          const res = await applyPaidInvoice({
            invoiceId,
            mpPaymentId: mpId,
            mpPreapprovalId: preapprovalId,
            paymentMethod: payment.payment_method_id === 'pix' ? 'PIX' : payment.payment_method_id ? String(payment.payment_method_id).toUpperCase() : null,
            paidAt: payment.date_approved ? new Date(payment.date_approved) : new Date(),
            rawPayload: payment,
          });
          action = res.alreadyPaid ? 'already_paid' : 'invoice_paid';
        } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
          await sql`
            UPDATE saas_invoices SET status = 'FAILED', mp_status = ${mpStatus}, mp_payment_id = COALESCE(mp_payment_id, ${mpId}), updated_at = NOW()
            WHERE id = ${invoiceId}::uuid AND status <> 'PAID'
          `;
          await sql`
            UPDATE clinic_subscriptions
            SET failed_payment_count = failed_payment_count + 1, updated_at = NOW()
            WHERE clinic_id = (SELECT clinic_id FROM saas_invoices WHERE id = ${invoiceId}::uuid)
          `;
          action = `payment_${mpStatus}`;
        } else if (mpStatus === 'refunded' || mpStatus === 'charged_back') {
          await sql`
            UPDATE saas_invoices SET status = 'REFUNDED', mp_status = ${mpStatus}, updated_at = NOW()
            WHERE id = ${invoiceId}::uuid
          `;
          action = `payment_${mpStatus}`;
        } else {
          await sql`
            UPDATE saas_invoices SET mp_status = ${mpStatus}, mp_payment_id = COALESCE(mp_payment_id, ${mpId}), updated_at = NOW()
            WHERE id = ${invoiceId}::uuid
          `;
          action = `payment_${mpStatus}`;
        }
      }
    } else if (eventType === 'subscription_authorized_payment') {
      const authPay = await getMpAuthorizedPayment(resourceId);
      const preId = authPay.preapproval_id ? String(authPay.preapproval_id) : null;
      const innerPaymentId = authPay.payment?.id ? String(authPay.payment.id) : String(authPay.id);
      const st = String(authPay.payment?.status || authPay.status || '').toLowerCase();

      if (preId && (st === 'approved' || st === 'processed')) {
        const subRows = await sql`
          SELECT cs.id, cs.clinic_id, cs.billing_cycle, cs.plan_id, sp.name AS plan_name
          FROM clinic_subscriptions cs
          LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
          WHERE cs.mp_preapproval_id = ${preId}
          LIMIT 1
        `;
        if (subRows[0]) {
          // Usa fatura pendente do preapproval ou cria nova para renovação
          const pendingInv = await sql`
            SELECT id FROM saas_invoices
            WHERE mp_preapproval_id = ${preId} AND status = 'PENDING'
            ORDER BY created_at DESC LIMIT 1
          `;
          let invId = pendingInv[0] ? String(pendingInv[0].id) : null;
          if (!invId) {
            const existingByMp = await sql`SELECT id FROM saas_invoices WHERE mp_payment_id = ${innerPaymentId} LIMIT 1`;
            invId = existingByMp[0] ? String(existingByMp[0].id) : null;
          }
          if (!invId) {
            const created = await sql`
              INSERT INTO saas_invoices (
                clinic_id, subscription_id, amount, status, cycle, due_date, payment_method,
                mp_payment_id, mp_preapproval_id, mp_status, external_id, payload
              ) VALUES (
                ${subRows[0].clinic_id}::uuid, ${subRows[0].id}::uuid,
                ${Number(authPay.transaction_amount || 0)}, 'PENDING',
                ${String(subRows[0].billing_cycle || 'MONTHLY')}, CURRENT_DATE, 'CARD_RECURRING',
                ${innerPaymentId}, ${preId}, 'approved', ${innerPaymentId},
                ${JSON.stringify({ plan_id: subRows[0].plan_id, plan_name: subRows[0].plan_name, recurring_auto: true })}::jsonb
              )
              RETURNING id
            `;
            invId = String(created[0].id);
          }
          const res = await applyPaidInvoice({
            invoiceId: invId,
            mpPaymentId: innerPaymentId,
            mpPreapprovalId: preId,
            paymentMethod: 'CARD_RECURRING',
            rawPayload: authPay,
          });
          action = res.alreadyPaid ? 'already_paid' : 'recurring_invoice_paid';
        }
      }
    } else if (eventType === 'subscription_preapproval') {
      const pre = await getMpPreapproval(resourceId);
      const preId = String(pre.id);
      const st = String(pre.status || '').toLowerCase();

      let subRows = await sql`
        SELECT id, clinic_id, current_period_end, status FROM clinic_subscriptions
        WHERE mp_preapproval_id = ${preId}
        LIMIT 1
      `;
      // Também permite localizar trocas de plano/cartão pendentes via saas_invoices
      if (!subRows[0]) {
        const invRef = await sql`
          SELECT clinic_id FROM saas_invoices WHERE mp_preapproval_id = ${preId} ORDER BY created_at DESC LIMIT 1
        `;
        if (invRef[0]) {
          subRows = await sql`
            SELECT id, clinic_id, current_period_end, status FROM clinic_subscriptions
            WHERE clinic_id = ${invRef[0].clinic_id}::uuid
            LIMIT 1
          `;
        }
      }
      if (subRows[0]) {
        if (st === 'authorized') {
          // Se há fatura PENDING vinculada a este preapproval (primeira cobrança aprovada na adesão), quitar
          const pendingInv = await sql`
            SELECT id FROM saas_invoices
            WHERE mp_preapproval_id = ${preId} AND status = 'PENDING'
            ORDER BY created_at DESC LIMIT 1
          `;
          if (pendingInv[0]) {
            await applyPaidInvoice({
              invoiceId: String(pendingInv[0].id),
              mpPreapprovalId: preId,
              paymentMethod: 'CARD_RECURRING',
              rawPayload: pre,
            });
          } else {
            await sql`
              UPDATE clinic_subscriptions
              SET status = 'ACTIVE',
                  next_billing_at = COALESCE(${pre.next_payment_date || null}::timestamptz, next_billing_at),
                  updated_at = NOW()
              WHERE id = ${subRows[0].id}::uuid AND mp_preapproval_id = ${preId}
            `;
          }
          action = 'preapproval_authorized';
        } else if (st === 'cancelled') {
          await cancelClinicSubscription({
            clinicId: String(subRows[0].clinic_id),
            immediate: false,
            cancelledBy: 'MERCADO_PAGO',
            actorName: 'Mercado Pago (Webhook)',
            reason: 'Cancelamento confirmado via Mercado Pago',
            skipRemoteCancelIds: [preId],
          });
          action = 'preapproval_cancelled';
        } else if (st === 'paused') {
          const graceUntil = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
          await sql`
            UPDATE clinic_subscriptions
            SET status = 'GRACE', grace_until = COALESCE(grace_until, ${graceUntil}::timestamptz), updated_at = NOW()
            WHERE id = ${subRows[0].id}::uuid AND status = 'ACTIVE' AND mp_preapproval_id = ${preId}
          `;
          action = 'preapproval_paused_grace';
        }
      }
    }

    await sql`
      UPDATE mp_webhook_events SET processed = TRUE, processed_at = NOW() WHERE id = ${evtId}::uuid
    `;
    return { processed: true, action };
  } catch (err) {
    // IDs fictícios do botão "Simular notificação" do Mercado Pago (ex: id=123456) retornam 404 na API oficial.
    // Como a assinatura HMAC já foi validada acima, respondemos 200 sem gerar retry infinito.
    if (err instanceof MercadoPagoApiError && err.status === 404) {
      await sql`
        UPDATE mp_webhook_events
        SET processed = TRUE, processed_at = NOW(), error = 'resource_not_found_404'
        WHERE id = ${evtId}::uuid
      `;
      return { processed: true, action: 'resource_not_found' };
    }
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    await sql`UPDATE mp_webhook_events SET error = ${msg} WHERE id = ${evtId}::uuid`;
    throw err;
  }
}

// ── Cancelar assinatura (pela clínica, pelo admin ou via webhook MP) ─────────
// Garante cancelamento REAL e VERIFICADO no Mercado Pago antes de marcar cancelado no banco.

function toIsoOrNull(val: unknown): string | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function cancelClinicSubscription(params: {
  clinicId: string;
  immediate?: boolean;
  reason?: string | null;
  cancelledBy?: 'CLINIC' | 'ADMIN' | 'MERCADO_PAGO';
  actorId?: string | null;
  actorName?: string | null;
  skipRemoteCancelIds?: string[];
}) {
  const [subRows, clinicRows, openPreRows] = await Promise.all([
    sql`
      SELECT cs.*, sp.name AS plan_name
      FROM clinic_subscriptions cs
      LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
      WHERE cs.clinic_id = ${params.clinicId}::uuid
      LIMIT 1
    `,
    sql`
      SELECT id, nome_fantasia, email, email_financeiro
      FROM clinics WHERE id = ${params.clinicId}::uuid LIMIT 1
    `,
    sql`
      SELECT DISTINCT mp_preapproval_id
      FROM saas_invoices
      WHERE clinic_id = ${params.clinicId}::uuid
        AND mp_preapproval_id IS NOT NULL
        AND COALESCE(mp_status, '') <> 'cancelled'
    `,
  ]);

  const sub = subRows[0];
  if (!sub) throw new Error('Nenhuma assinatura encontrada para esta clínica.');
  const clinic = clinicRows[0];

  const immediate = Boolean(params.immediate);
  const skipSet = new Set((params.skipRemoteCancelIds || []).map(String));

  // Coletar TODOS os mp_preapproval_id possivelmente ativos da clínica (evita recorrência órfã!)
  const preIds = new Set<string>();
  if (sub.mp_preapproval_id) preIds.add(String(sub.mp_preapproval_id));
  for (const r of openPreRows) {
    if (r.mp_preapproval_id) preIds.add(String(r.mp_preapproval_id));
  }

  const cancelledPreapprovalIds: string[] = [];
  if (preIds.size > 0) {
    const toCancelRemotely = Array.from(preIds).filter(id => !skipSet.has(id));
    if (toCancelRemotely.length > 0 && !isMercadoPagoConfigured()) {
      throw new Error(
        'Mercado Pago não configurado no servidor; não foi possível cancelar a cobrança recorrente no gateway.'
      );
    }
    for (const preId of toCancelRemotely) {
      // Estrito: se o Mercado Pago não confirmar o cancelamento, lança erro e NÃO mascara no banco!
      await cancelMpPreapprovalVerified(preId);
      cancelledPreapprovalIds.push(preId);
    }
    for (const skippedId of skipSet) {
      if (preIds.has(skippedId)) cancelledPreapprovalIds.push(skippedId);
    }
  }

  const alreadyCancelledFully =
    String(sub.status) === 'CANCELLED' &&
    !sub.mp_preapproval_id &&
    cancelledPreapprovalIds.length === 0;

  const currentPeriodEndIso = toIsoOrNull(sub.current_period_end);

  if (alreadyCancelledFully) {
    return {
      cancelled: true,
      alreadyCancelled: true,
      immediate,
      keepUntilPeriodEnd: false,
      cancelledPreapprovalIds: [],
      currentPeriodEnd: currentPeriodEndIso,
      status: 'CANCELLED',
    };
  }

  const periodEndDate = currentPeriodEndIso ? new Date(currentPeriodEndIso) : null;
  const hasFuturePaidPeriod = Boolean(periodEndDate && periodEndDate.getTime() > Date.now());
  const canKeepUntilEnd =
    !immediate && hasFuturePaidPeriod && (String(sub.status) === 'ACTIVE' || String(sub.status) === 'TRIAL');
  const nextStatus = canKeepUntilEnd ? String(sub.status) : 'CANCELLED';
  const nextPeriodEndIso = immediate ? new Date().toISOString() : currentPeriodEndIso;

  await sql`
    UPDATE clinic_subscriptions
    SET cancel_at_period_end = TRUE,
        cancelled_at = COALESCE(cancelled_at, NOW()),
        status = ${nextStatus},
        mp_preapproval_id = NULL,
        next_billing_at = NULL,
        grace_until = NULL,
        scheduled_plan_id = NULL,
        current_period_end = ${nextPeriodEndIso},
        updated_by = ${params.actorName || 'Clínica'},
        updated_at = NOW()
    WHERE clinic_id = ${params.clinicId}::uuid
  `;

  // Cancelar faturas PENDING abertas para não ficarem cobranças fantasmas pendentes
  await sql`
    UPDATE saas_invoices
    SET status = 'CANCELLED', mp_status = 'cancelled', updated_at = NOW()
    WHERE clinic_id = ${params.clinicId}::uuid AND status = 'PENDING'
  `;

  // Marcar mp_status = 'cancelled' nos registros de preapproval cancelados (preservando status PAID das já pagas)
  if (cancelledPreapprovalIds.length > 0) {
    await sql`
      UPDATE saas_invoices
      SET mp_status = 'cancelled', updated_at = NOW()
      WHERE clinic_id = ${params.clinicId}::uuid
        AND mp_preapproval_id = ANY(${cancelledPreapprovalIds}::text[])
    `;
  }

  const cancelledBy = params.cancelledBy || 'CLINIC';
  await logModuleAudit({
    clinicId: params.clinicId,
    actorId: params.actorId || null,
    actorName: params.actorName || (cancelledBy === 'ADMIN' ? 'Administrador' : 'Clínica'),
    scope: 'SUBSCRIPTION',
    targetId: String(sub.id),
    action: immediate ? 'CANCEL_SUBSCRIPTION_IMMEDIATE' : 'CANCEL_SUBSCRIPTION',
    newValue: {
      cancelledBy,
      immediate,
      keepUntilPeriodEnd: canKeepUntilEnd,
      cancelledPreapprovalIds,
      reason: params.reason || null,
    },
  });

  // Enviar e-mail de confirmação de cancelamento via Resend
  const toEmail = String(clinic?.email_financeiro || clinic?.email || '').trim();
  if (toEmail) {
    const byLabel =
      cancelledBy === 'ADMIN'
        ? `solicitado pelo administrador (${params.actorName || 'Benavera'})`
        : cancelledBy === 'MERCADO_PAGO'
          ? 'confirmado no Mercado Pago'
          : 'solicitado pela clínica';
    await sendSubscriptionCancelledEmail({
      to: toEmail,
      clinicName: String(clinic?.nome_fantasia || 'Clínica'),
      clinicId: params.clinicId,
      planName: String(sub.plan_name || 'Plano Benavera'),
      keepUntilPeriodEnd: canKeepUntilEnd,
      accessUntilDate: nextPeriodEndIso ? new Date(nextPeriodEndIso).toLocaleDateString('pt-BR') : null,
      cancelledByLabel: byLabel,
      reason: params.reason || null,
    }).catch(() => {});
  }

  return {
    cancelled: true,
    alreadyCancelled: false,
    immediate,
    keepUntilPeriodEnd: canKeepUntilEnd,
    cancelledPreapprovalIds,
    currentPeriodEnd: nextPeriodEndIso,
    status: nextStatus,
  };
}

// ── Rotina diária (Cron) — Carência de 7 dias → Suspensão ────────────────────

export async function runSubscriptionLifecycleSweep(): Promise<{
  movedToGrace: number;
  movedToSuspended: number;
  movedToCancelled: number;
}> {
  const baseUrl = getBaseUrl();
  const paymentUrl = `${baseUrl}/painel/assinatura`;

  // 1. Assinaturas canceladas que chegaram ao fim do ciclo pago → CANCELLED
  const cancelledRows = await sql`
    UPDATE clinic_subscriptions
    SET status = 'CANCELLED', updated_by = 'Cron Billing', updated_at = NOW()
    WHERE is_exempt = FALSE
      AND cancel_at_period_end = TRUE
      AND status IN ('ACTIVE', 'GRACE', 'TRIAL')
      AND current_period_end IS NOT NULL
      AND current_period_end < NOW()
    RETURNING clinic_id
  `;

  // 2. Assinaturas ACTIVE vencidas ou TRIAL expirados → GRACE (+7 dias)
  const graceRows = await sql`
    UPDATE clinic_subscriptions cs
    SET status = 'GRACE',
        grace_until = NOW() + (${GRACE_DAYS}::int * INTERVAL '1 day'),
        updated_by = 'Cron Billing',
        updated_at = NOW()
    FROM clinics c
    WHERE cs.clinic_id = c.id
      AND cs.is_exempt = FALSE
      AND cs.cancel_at_period_end = FALSE
      AND (
        (cs.status = 'ACTIVE' AND cs.current_period_end IS NOT NULL AND cs.current_period_end < NOW())
        OR (cs.status = 'TRIAL' AND cs.trial_ends_at IS NOT NULL AND cs.trial_ends_at < NOW())
      )
    RETURNING cs.clinic_id, cs.grace_until, c.nome_fantasia, COALESCE(c.email_financeiro, c.email) AS email
  `;

  for (const r of graceRows) {
    if (r.email) {
      sendSubscriptionGraceWarningEmail({
        to: String(r.email),
        clinicName: String(r.nome_fantasia || 'Clínica'),
        graceDays: GRACE_DAYS,
        graceUntil: new Date(String(r.grace_until)).toLocaleDateString('pt-BR'),
        paymentUrl,
      }).catch(err => console.warn('[Email Carência]', err));
    }
  }

  // 3. Assinaturas GRACE cujo prazo de 7 dias expirou → SUSPENDED
  const suspendedRows = await sql`
    UPDATE clinic_subscriptions cs
    SET status = 'SUSPENDED',
        updated_by = 'Cron Billing',
        updated_at = NOW()
    FROM clinics c
    WHERE cs.clinic_id = c.id
      AND cs.is_exempt = FALSE
      AND cs.status = 'GRACE'
      AND cs.grace_until IS NOT NULL
      AND cs.grace_until < NOW()
    RETURNING cs.clinic_id, c.nome_fantasia, COALESCE(c.email_financeiro, c.email) AS email
  `;

  for (const r of suspendedRows) {
    await logModuleAudit({
      clinicId: String(r.clinic_id),
      actorName: 'Cron Billing',
      scope: 'SUBSCRIPTION',
      targetId: String(r.clinic_id),
      action: 'SUSPEND_OVERDUE',
      newValue: { grace_days: GRACE_DAYS },
    });
    if (r.email) {
      sendSubscriptionSuspendedEmail({
        to: String(r.email),
        clinicName: String(r.nome_fantasia || 'Clínica'),
        paymentUrl,
      }).catch(err => console.warn('[Email Suspensão]', err));
    }
  }

  return {
    movedToGrace: graceRows.length,
    movedToSuspended: suspendedRows.length,
    movedToCancelled: cancelledRows.length,
  };
}
