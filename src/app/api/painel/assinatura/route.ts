// GET /api/painel/assinatura — Estado atual da assinatura, planos disponíveis e faturas da clínica
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { getMercadoPagoPublicKey, isMercadoPagoConfigured } from '@/lib/mercadopago';
import { GRACE_DAYS } from '@/lib/billing-service';

export async function GET() {
  const session = await getSession();
  if (!session || !session.clinicId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const [subRows, plansRows, invoicesRows, clinicRows, obRows] = await Promise.all([
      sql`
        SELECT cs.*, sp.name AS plan_name, sp.slug AS plan_slug, sp.price_monthly, sp.price_annual, sp.is_free AS plan_is_free
        FROM clinic_subscriptions cs
        LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
        WHERE cs.clinic_id = ${session.clinicId}::uuid
        LIMIT 1
      `,
      sql`
        SELECT id, name, slug, description, price_monthly, price_annual, is_free, trial_days, max_users, module_ids
        FROM saas_plans
        WHERE archived = FALSE
        ORDER BY is_free DESC, price_monthly ASC, created_at ASC
      `,
      sql`
        SELECT id, amount, status, cycle, due_date, paid_at, payment_method, mp_status,
               checkout_url, pix_qr_code, pix_qr_code_base64, pix_expires_at,
               boleto_digitable_line, boleto_barcode, boleto_pdf_url, boleto_expires_at,
               period_start, period_end, discount_amount, coupon_code, created_at
        FROM saas_invoices
        WHERE clinic_id = ${session.clinicId}::uuid
        ORDER BY created_at DESC
        LIMIT 30
      `,
      sql`
        SELECT id, nome_fantasia, razao_social, responsavel, email, email_financeiro,
               cnpj, cpf_responsavel, cep, logradouro, numero, bairro, cidade, estado
        FROM clinics WHERE id = ${session.clinicId}::uuid LIMIT 1
      `,
      sql`
        SELECT address_cep, address_street, address_number, address_neighborhood, address_city, address_state
        FROM clinic_onboardings WHERE clinic_id = ${session.clinicId}::uuid
        ORDER BY created_at DESC LIMIT 1
      `,
    ]);

    const c = clinicRows[0] || null;
    const ob = obRows[0] || null;
    const clinicInfo = c
      ? {
          id: c.id,
          nome_fantasia: c.nome_fantasia,
          razao_social: c.razao_social,
          responsavel: c.responsavel,
          email: c.email,
          email_financeiro: c.email_financeiro,
          document: c.cnpj || c.cpf_responsavel || '',
          cep: c.cep || ob?.address_cep || '',
          logradouro: c.logradouro || ob?.address_street || '',
          numero: c.numero || ob?.address_number || '',
          bairro: c.bairro || ob?.address_neighborhood || '',
          cidade: c.cidade || ob?.address_city || '',
          estado: c.estado || ob?.address_state || '',
        }
      : null;

    return NextResponse.json(
      {
        success: true,
        mercadoPagoConfigured: isMercadoPagoConfigured(),
        mercadoPagoPublicKey: getMercadoPagoPublicKey() || null,
        graceDays: GRACE_DAYS,
        clinic: clinicInfo,
        subscription: subRows[0] || null,
        plans: plansRows,
        invoices: invoicesRows,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Painel Assinatura GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar dados da assinatura.' }, { status: 500 });
  }
}
