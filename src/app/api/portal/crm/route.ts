import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon';
import { getPortalSession } from '@/lib/portal-auth';

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = getNeonClient();
  if (!db) return NextResponse.json({ opportunities: [] });

  try {
    const opportunities = await db`
      SELECT *
      FROM crm_opportunities
      WHERE clinic_id = ${session.clinicId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ opportunities });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = getNeonClient();
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 500 });

  try {
    const body = await req.json();
    const { pacienteNome, pacienteTelefone, tratamento, valorCentavos, stage } = body;
    const oppId = 'opp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    await db`
      INSERT INTO crm_opportunities (
        id, clinic_id, paciente_nome, paciente_telefone,
        tratamento, valor_centavos, stage
      ) VALUES (
        ${oppId}, ${session.clinicId}, ${pacienteNome}, ${pacienteTelefone},
        ${tratamento}, ${valorCentavos || 0}, ${stage || 'prospecto'}
      )
    `;

    return NextResponse.json({ success: true, id: oppId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
