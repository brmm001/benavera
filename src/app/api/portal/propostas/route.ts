import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon';
import { getPortalSession } from '@/lib/portal-auth';

function generateToken() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function GET() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const db = getNeonClient();
  if (!db) {
    return NextResponse.json({ propostas: [] });
  }

  try {
    const propostas = await db`
      SELECT *
      FROM proposals
      WHERE clinic_id = ${session.clinicId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ propostas });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const db = getNeonClient();
  if (!db) {
    return NextResponse.json({ error: 'Banco de dados indisponível' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      pacienteNome,
      pacienteTelefone,
      pacienteEmail,
      tratamento,
      descricaoTratamento,
      valorTotalCentavos,
      entradaCentavos,
      opcoesParcelamento,
      observacoes,
    } = body;

    if (!pacienteNome || !pacienteTelefone || !tratamento || !valorTotalCentavos) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const proposalId = 'prop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    await db`
      INSERT INTO proposals (
        id, token, clinic_id, created_by,
        paciente_nome, paciente_telefone, paciente_email,
        tratamento, descricao_tratamento,
        valor_total_centavos, entrada_centavos, opcoes_parcelamento,
        observacoes, status, expires_at
      ) VALUES (
        ${proposalId}, ${token}, ${session.clinicId}, ${session.userId},
        ${pacienteNome}, ${pacienteTelefone}, ${pacienteEmail || null},
        ${tratamento}, ${descricaoTratamento || null},
        ${valorTotalCentavos}, ${entradaCentavos || 0}, ${JSON.stringify(opcoesParcelamento || [])},
        ${observacoes || null}, 'pendente', ${expiresAt.toISOString()}
      )
    `;

    // Também cria ou atualiza oportunidade no CRM da clínica
    const oppId = 'opp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await db`
      INSERT INTO crm_opportunities (
        id, clinic_id, proposal_id, paciente_nome, paciente_telefone,
        tratamento, valor_centavos, stage
      ) VALUES (
        ${oppId}, ${session.clinicId}, ${proposalId},
        ${pacienteNome}, ${pacienteTelefone},
        ${tratamento}, ${valorTotalCentavos}, 'proposta_enviada'
      )
    `;

    return NextResponse.json({
      success: true,
      proposta: {
        id: proposalId,
        token,
        pacienteNome,
        tratamento,
        valorTotalCentavos,
      }
    });
  } catch (error: any) {
    console.error('Erro ao criar proposta:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar proposta' }, { status: 500 });
  }
}
