import { NextRequest, NextResponse } from 'next/server';

// Rota de diagnóstico PÚBLICA (fora do /api/admin) para inspecionar cookies e env
export async function GET(request: NextRequest) {
  const diagnostics: Record<string, unknown> = {};

  // 1. Lista TODOS os cookies que chegaram na requisição
  const allCookies: Record<string, string> = {};
  request.cookies.getAll().forEach(c => {
    // Mascara o valor para segurança, mostra só os primeiros 6 chars
    allCookies[c.name] = c.value.substring(0, 6) + '...';
  });
  diagnostics.all_cookies = allCookies;
  diagnostics.cookie_bv_admin_present = !!request.cookies.get('bv_admin');

  // 2. Token esperado (primeiros 6 chars)
  const expectedToken = process.env.ADMIN_SECRET || 'bv-admin-secret-fallback-2026';
  diagnostics.expected_token_preview = expectedToken.substring(0, 6) + '...';
  diagnostics.expected_token_length = expectedToken.length;

  const cookieValue = request.cookies.get('bv_admin')?.value;
  diagnostics.cookie_value_preview = cookieValue ? cookieValue.substring(0, 6) + '...' : 'AUSENTE';
  diagnostics.cookie_value_length = cookieValue?.length ?? 0;
  diagnostics.token_matches = cookieValue === expectedToken;

  // 3. Variáveis de ambiente (apenas presença)
  diagnostics.env_ADMIN_PASSWORD_set = !!process.env.ADMIN_PASSWORD;
  diagnostics.env_ADMIN_SECRET_set = !!process.env.ADMIN_SECRET;
  diagnostics.env_DATABASE_URL_set = !!(process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL);

  // 4. Testa banco de dados
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
