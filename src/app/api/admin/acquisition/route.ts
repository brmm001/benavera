import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAcquisitionReport } from '@/lib/acquisition-db';
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!['BENAVERA_ADMIN','BENAVERA_ANALYST'].includes(session.role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  const n = Number(request.nextUrl.searchParams.get('dias'));
  const data = await getAcquisitionReport([7,30,90].includes(n) ? n : 30);
  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const cell = (value: unknown) => '"' + String(value ?? '').replace(/^[=+@-]/, "' $&").replaceAll('"', '""') + '"';
    const rows = [['Canal','Leads','Cadastros de clínicas','Clínicas ativas','Financiamentos liberados','Volume liberado'], ...data.funnel.map(r => [r.channel,r.leads,r.registrations,r.active_clinics,r.financed,r.volume])];
    return new NextResponse('\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="benavera-aquisicao.csv"', 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
}
