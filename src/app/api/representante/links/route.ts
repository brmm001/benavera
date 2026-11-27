// API /api/representante/links — Listar, criar e ativar/desativar links de cadastro + assinatura do representante
import { NextRequest, NextResponse } from 'next/server';
import { getRepresentanteSession } from '@/lib/representantes-db';
import {
  createSellerSignupLink,
  listActivePlansAndCoupons,
  listSellerSignupLinks,
  toggleSellerSignupLink,
} from '@/lib/seller-links';

export async function GET() {
  const ctx = await getRepresentanteSession();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const [links, catalog] = await Promise.all([
      listSellerSignupLinks({
        sellerType: 'REPRESENTANTE',
        representanteId: ctx.rep.id,
        mensalidadePercent: ctx.rep.mensalidade_percent,
      }),
      listActivePlansAndCoupons(),
    ]);

    return NextResponse.json(
      {
        success: true,
        seller: {
          type: 'REPRESENTANTE',
          name: ctx.rep.nome,
          codigoIndicacao: ctx.rep.codigo_indicacao,
          comissaoPercent: ctx.rep.comissao_percent,
          mensalidadePercent: ctx.rep.mensalidade_percent,
          periodoMeses: ctx.rep.periodo_meses,
          maxDiscountPercent: ctx.rep.max_discount_percent,
          maxTrialDays: ctx.rep.max_trial_days,
        },
        plans: catalog.plans,
        coupons: catalog.coupons,
        links,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Representante Links GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar links de assinatura.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getRepresentanteSession();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    if (!body.planId) {
      return NextResponse.json({ error: 'Selecione um plano.' }, { status: 400 });
    }

    const res = await createSellerSignupLink({
      sellerType: 'REPRESENTANTE',
      representanteId: ctx.rep.id,
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
    console.error('[API Representante Links POST]', err);
    return NextResponse.json({ error: 'Erro ao gerar link de assinatura.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getRepresentanteSession();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    if (!body.id || typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Informe id e active.' }, { status: 400 });
    }
    const ok = await toggleSellerSignupLink({
      id: String(body.id),
      sellerType: 'REPRESENTANTE',
      representanteId: ctx.rep.id,
      active: body.active,
    });
    if (!ok) return NextResponse.json({ error: 'Link não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API Representante Links PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar link.' }, { status: 500 });
  }
}
