// POST vincula clínica ao representante (define % e período) · DELETE desvincula
import { NextRequest, NextResponse } from 'next/server';
import { requireRepAdmin, isUuid } from '@/lib/rep-guards';
import { vincularClinica, desvincularClinica } from '@/lib/representantes-db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRepAdmin();
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({}));
    if (!isUuid(body.clinicId)) return NextResponse.json({ error: 'Clínica inválida.' }, { status: 400 });

    const result = await vincularClinica({
      representanteId: id,
      clinicId: body.clinicId,
      origem: 'ADMIN',
      porQuem: `${g.session.name} (${g.session.userId})`,
      motivo: typeof body.motivo === 'string' ? body.motivo.slice(0, 500) : null,
      comissaoPercent: body.comissao_percent === '' || body.comissao_percent === undefined ? undefined : Number(body.comissao_percent),
      // undefined = usa o padrão do representante; null = vitalício
      periodoMeses: body.periodo_meses === undefined || body.periodo_meses === 'default' ? undefined : (body.periodo_meses === '' ? null : Number(body.periodo_meses)),
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API Admin Representantes vincular]', e);
    return NextResponse.json({ error: 'Erro ao vincular clínica.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const g = await requireRepAdmin();
  if (!g.ok) return g.response;
  const clinicId = request.nextUrl.searchParams.get('clinicId');
  if (!isUuid(clinicId)) return NextResponse.json({ error: 'Clínica inválida.' }, { status: 400 });
  try {
    await desvincularClinica(clinicId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API Admin Representantes desvincular]', e);
    return NextResponse.json({ error: 'Erro ao desvincular clínica.' }, { status: 500 });
  }
}

