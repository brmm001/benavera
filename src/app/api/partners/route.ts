// app/api/partners/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { getAdapter } from '@/lib/partners/registry';

function getWebhookInfo(apiSlug: string | null): { path: string | null; authConfigured: boolean } {
  if (apiSlug === 'konsiga') {
    const authConfigured = Boolean(
      (process.env.KONSIGA_WEBHOOK_USERNAME || '').trim() &&
        (process.env.KONSIGA_WEBHOOK_PASSWORD || '').trim()
    );
    return { path: '/api/webhooks/konsiga', authConfigured };
  }
  if (apiSlug === 'parcelex') {
    const token = (process.env.PARCELEX_WEBHOOK_TOKEN || '').trim();
    return {
      path: '/api/webhooks/parcelex/<PARCELEX_WEBHOOK_TOKEN>',
      authConfigured: token.length >= 32,
    };
  }
  return { path: null, authConfigured: false };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  try {
    const rows = await sql`
      SELECT * FROM financial_partners ORDER BY prioridade ASC, nome ASC
    `;
    const partners = rows.map(row => {
      const apiSlug = row.api_slug ? String(row.api_slug) : null;
      const adapter = getAdapter(apiSlug);
      const webhook = getWebhookInfo(apiSlug);
      return {
        ...row,
        env_configured: adapter ? adapter.isConfigured() : false,
        webhook_path: webhook.path,
        webhook_configured: webhook.authConfigured,
      };
    });
    return NextResponse.json({ partners });
  } catch (err) {
    console.error('[Partners GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar parceiros.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'MANAGE_PARTNERS')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nome, nome_legal, cnpj, prioridade, ticket_minimo, ticket_maximo, prazo_maximo, comissao_benavera_percent, modo } = body;

    const rows = await sql`
      INSERT INTO financial_partners (nome, nome_legal, cnpj, prioridade, ticket_minimo, ticket_maximo, prazo_maximo, comissao_benavera_percent, modo)
      VALUES (${nome}, ${nome_legal || null}, ${cnpj || null}, ${prioridade || 50}, ${ticket_minimo || 1000}, ${ticket_maximo || 100000}, ${prazo_maximo || 48}, ${comissao_benavera_percent || 0.02}, ${modo || 'MANUAL'}::partner_mode)
      RETURNING id
    `;
    return NextResponse.json({ id: String(rows[0].id) }, { status: 201 });
  } catch (err) {
    console.error('[Partners POST]', err);
    return NextResponse.json({ error: 'Erro ao criar parceiro.' }, { status: 500 });
  }
}
