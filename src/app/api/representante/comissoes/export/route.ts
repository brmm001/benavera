// GET: exporta o extrato de comissões do representante autenticado em CSV
import { NextRequest, NextResponse } from 'next/server';
import { getRepresentanteSession, listComissoes, syncComissoes } from '@/lib/representantes-db';

function csv(v: unknown): string {
  let s = String(v ?? '');
  // Evita injeção de fórmulas em planilhas
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const ctx = await getRepresentanteSession();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  await syncComissoes(ctx.rep.id);
  const status = request.nextUrl.searchParams.get('status');
  const rows = await listComissoes(ctx.rep.id, status);

  const header = ['Competência', 'Clínica', 'Tipo', 'Base (valor financiado)', 'Percentual', 'Comissão', 'Status'];
  const lines = [header.map(csv).join(';')];
  for (const r of rows) {
    lines.push([
      r.competencia ?? '', r.clinica, r.tipo,
      r.base_valor.toFixed(2).replace('.', ','), `${r.percent}%`,
      r.valor.toFixed(2).replace('.', ','), r.status,
    ].map(csv).join(';'));
  }
  return new NextResponse('\uFEFF' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="comissoes.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

