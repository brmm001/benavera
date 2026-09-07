import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getNeonClient();
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 500 });

  try {
    const rows = await db`
      SELECT 
        p.id, p.token, p.paciente_nome, p.paciente_telefone,
        p.tratamento, p.descricao_tratamento,
        p.valor_total_centavos, p.entrada_centavos,
        p.opcoes_parcelamento, p.status, p.expires_at,
        c.nome as clinic_nome, c.especialidade as clinic_especialidade
      FROM proposals p
      JOIN clinics c ON p.clinic_id = c.id
      WHERE p.token = ${token}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    // Registra visualização
    await db`
      UPDATE proposals
      SET visualizada_em = COALESCE(visualizada_em, NOW())
      WHERE token = ${token}
    `;

    return NextResponse.json({ proposta: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = getNeonClient();
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 500 });

  try {
    const body = await req.json();
    const { prazoEscolhido } = body;

    const rows = await db`
      SELECT id, clinic_id, valor_total_centavos, entrada_centavos, paciente_nome, tratamento
      FROM proposals
      WHERE token = ${token}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
    }

    const prop = rows[0];

    // Atualiza status da proposta
    await db`
      UPDATE proposals
      SET status = 'aceita', aceita_em = NOW()
      WHERE token = ${token}
    `;

    // Atualiza oportunidade no CRM
    await db`
      UPDATE crm_opportunities
      SET stage = 'fechado_ganhou', fechado_ganhou_em = NOW(), updated_at = NOW()
      WHERE proposal_id = ${prop.id}
    `;

    // Cria registro de repasse previsto
    const transferId = 'trf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const valorBruto = prop.valor_total_centavos - (prop.entrada_centavos || 0);
    const taxaBenavera = Math.round(valorBruto * 0.05); // 5% de taxa operacional Benavera
    const valorLiquido = valorBruto - taxaBenavera;
    const previstoPara = new Date(Date.now() + 24 * 60 * 60 * 1000); // D+1

    await db`
      INSERT INTO transfers (
        id, clinic_id, proposal_id, descricao,
        valor_bruto_centavos, taxa_benavera_centavos, valor_liquido_centavos,
        status, previsto_para
      ) VALUES (
        ${transferId}, ${prop.clinic_id}, ${prop.id},
        ${'Tratamento ' + prop.tratamento + ' (' + prop.paciente_nome + ')'},
        ${valorBruto}, ${taxaBenavera}, ${valorLiquido},
        'previsto', ${previstoPara.toISOString()}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
