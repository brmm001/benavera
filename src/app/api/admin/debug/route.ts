import { NextRequest, NextResponse } from 'next/server';

// Rota de diagnóstico temporária para verificar auth e conexão com DB
export async function GET(request: NextRequest) {
  const diagnostics: Record<string, unknown> = {};

  // 1. Verifica o cookie
  const cookie = request.cookies.get('bv_admin');
  diagnostics.cookie_name = 'bv_admin';
  diagnostics.cookie_present = !!cookie;
  diagnostics.cookie_value_length = cookie?.value?.length ?? 0;

  // 2. Verifica o token esperado
  const expectedToken = process.env.ADMIN_SECRET || 'bv-admin-secret-fallback-2026';
  diagnostics.expected_token_length = expectedToken.length;
  diagnostics.token_matches = cookie?.value === expectedToken;

  // 3. Verifica variáveis de ambiente
  diagnostics.env_ADMIN_PASSWORD_set = !!process.env.ADMIN_PASSWORD;
  diagnostics.env_ADMIN_SECRET_set = !!process.env.ADMIN_SECRET;
  diagnostics.env_DATABASE_URL_set = !!process.env.DATABASE_URL;

  // 4. Testa conexão com o banco
  try {
    const { getPatientLeads } = await import('@/lib/db');
    const leads = await getPatientLeads({ status: 'all' });
    diagnostics.db_ok = true;
    diagnostics.db_leads_count = leads.length;
  } catch (e) {
    diagnostics.db_ok = false;
    diagnostics.db_error = String(e);
  }

  return NextResponse.json(diagnostics, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
