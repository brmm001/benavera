// PATCH: o representante atualiza apenas seus dados de contato/pagamento (nunca % ou período)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { getRepresentanteSession } from '@/lib/representantes-db';

const TIPOS_PIX = new Set(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']);

export async function PATCH(request: NextRequest) {
  const ctx = await getRepresentanteSession();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const telefone = typeof body.telefone === 'string' ? body.telefone.trim().slice(0, 30) : null;
    const documento = typeof body.documento === 'string' ? body.documento.replace(/\D/g, '').slice(0, 14) : null;
    const chavePix = typeof body.chave_pix === 'string' ? body.chave_pix.trim().slice(0, 200) : null;
    const tipoPix = typeof body.tipo_pix === 'string' && TIPOS_PIX.has(body.tipo_pix) ? body.tipo_pix : null;

    await sql`
      UPDATE representantes SET
        telefone = COALESCE(${telefone}, telefone),
        documento = COALESCE(${documento}, documento),
        chave_pix = COALESCE(${chavePix}, chave_pix),
        tipo_pix = COALESCE(${tipoPix}, tipo_pix),
        updated_at = NOW()
      WHERE id = ${ctx.rep.id}
    `;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[API Representante perfil]', e);
    return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 });
  }
}

