// API /api/atendente/links — Listar, criar e ativar/desativar links de cadastro + assinatura do atendente
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import {
  createSellerSignupLink,
  ensureAtendenteReferralCode,
  listActivePlansAndCoupons,
  listSellerSignupLinks,
  toggleSellerSignupLink,
} from '@/lib/seller-links';

async function getAtendenteContext() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') return null;

  const rows = await sql`
    SELECT id, name, ativo, codigo_indicacao, mensalidade_percent, comissao_periodo_meses,
           max_discount_percent, max_trial_days
    FROM users WHERE id = ${session.userId}::uuid LIMIT 1
  `;
  const u = rows[0];
  if (!u || !u.ativo) return null;

  const codigo = u.codigo_indicacao ? String(u.codigo_indicacao) : await ensureAtendenteReferralCode(session.userId);
  return {
    userId: String(u.id),
    name: String(u.name),
    codigoIndicacao: codigo,
    mensalidadePercent: Number(u.mensalidade_percent || 0),
    periodoMeses: u.comissao_periodo_meses === null || u.comissao_periodo_meses === undefined ? null : Number(u.comissao_periodo_meses),
    maxDiscountPercent: Number(u.max_discount_percent || 0),
    maxTrialDays: Number(u.max_trial_days || 0),
  };
}

export async function GET() {
  const ctx = await getAtendenteContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const [links, catalog] = await Promise.all([
      listSellerSignupLinks({
        sellerType: 'ATENDENTE',
        atendenteUserId: ctx.userId,
        mensalidadePercent: ctx.mensalidadePercent,
      }),
      listActivePlansAndCoupons(),
    ]);

    return NextResponse.json(
      {
        success: true,
        seller: {
          type: 'ATENDENTE',
          name: ctx.name,
          codigoIndicacao: ctx.codigoIndicacao,
          comissaoPercent: 0,
          mensalidadePercent: ctx.mensalidadePercent,
          periodoMeses: ctx.periodoMeses,
          maxDiscountPercent: ctx.maxDiscountPercent,
          maxTrialDays: ctx.maxTrialDays,
        },
        plans: catalog.plans,
        coupons: catalog.coupons,
        links,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Atendente Links GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar links de assinatura.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAtendenteContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    if (!body.planId) {
      return NextResponse.json({ error: 'Selecione um plano.' }, { status: 400 });
    }

    const res = await createSellerSignupLink({
      sellerType: 'ATENDENTE',
      atendenteUserId: ctx.userId,
      label: body.label ?? null,
      planId: String(body.planId),
      billingCycle: body.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
      couponCode: body.couponCode ?? null,
      discountPercent: body.discountPercent ?? 0,
      trialDays: body.trialDays ?? 0,
      maxUses: body.maxUses ?? null,
      expiresInDays: body.expiresInDays ?? null,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, link: res.link }, { status: 201 });
  } catch (err) {
    console.error('[API Atendente Links POST]', err);
    return NextResponse.json({ error: 'Erro ao gerar link de assinatura.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAtendenteContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    if (!body.id || typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Informe id e active.' }, { status: 400 });
    }
    const ok = await toggleSellerSignupLink({
      id: String(body.id),
      sellerType: 'ATENDENTE',
      atendenteUserId: ctx.userId,
      active: body.active,
    });
    if (!ok) return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API Atendente Links PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar link.' }, { status: 500 });
  }
}
