// POST registra pagamento manual de comissões A_RECEBER do representante
import { NextRequest, NextResponse } from 'next/server';
import { requireRepAdmin, isUuid } from '@/lib/rep-guards';
import { registrarPagamento } from '@/lib/representantes-db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRepAdmin({ financeiro: true });
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({}));
    const comissaoIds = Array.isArray(body.comissaoIds) ? body.comissaoIds.filter(isUuid) : undefined;
    const pagoEm = typeof body.pagoEm === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.pagoEm) ? body.pagoEm : null;

    const result = await registrarPagamento({
      representanteId: id,
      comissaoIds,
      observacao: typeof body.observacao === 'string' ? body.observacao.slice(0, 1000) : null,
      comprovanteUrl: typeof body.comprovanteUrl === 'string' && /^https?:\/\//.test(body.comprovanteUrl) ? body.comprovanteUrl.slice(0, 1000) : null,
      pagoEm,
      pagoPor: `${g.session.name} (${g.session.userId})`,
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, total: result.total, pagamentoId: result.pagamentoId });
  } catch (e) {
    console.error('[API Admin Representantes pagamento]', e);
    return NextResponse.json({ error: 'Erro ao registrar pagamento.' }, { status: 500 });
  }
}

