// app/api/proposta/[token]/route.ts
// API pública — página do paciente

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { selectProposal } from '@/lib/application-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // Validar token
    const tokenRows = await sql`
      SELECT pt.*, a.id as app_id, a.protocol, a.categoria, a.procedimento,
             a.valor_tratamento, a.entrada, a.valor_financiado, a.status,
             p.nome as patient_nome, c.nome_fantasia as clinic_nome
      FROM proposal_tokens pt
      JOIN applications a ON a.id = pt.application_id
      JOIN patients p ON p.id = a.patient_id
      JOIN clinics c ON c.id = a.clinic_id
      WHERE pt.token = ${token} AND pt.revogado = false AND pt.expires_at > NOW()
    `;

    if (!tokenRows[0]) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }

    const tokenData = tokenRows[0];
    const applicationId = String(tokenData.app_id);

    // Buscar propostas disponíveis
    const proposals = await sql`
      SELECT pr.*, fp.nome as partner_nome
      FROM proposals pr
      LEFT JOIN financial_partners fp ON fp.id = pr.partner_id
      WHERE pr.application_id = ${applicationId} AND pr.ativa = true
      ORDER BY pr.valor_parcela ASC
    `;

    // Incrementar acessos
    await sql`UPDATE proposal_tokens SET acessos = acessos + 1 WHERE token = ${token}`;

    return NextResponse.json({
      patient_nome: String(tokenData.patient_nome),
      clinic_nome: String(tokenData.clinic_nome),
      protocol: String(tokenData.protocol),
      procedimento: String(tokenData.procedimento || ''),
      categoria: String(tokenData.categoria || ''),
      valor_tratamento: Number(tokenData.valor_tratamento),
      entrada: Number(tokenData.entrada),
      valor_financiado: Number(tokenData.valor_financiado),
      status: String(tokenData.status),
      expires_at: String(tokenData.expires_at),
      proposals: proposals.map(p => ({
        id: String(p.id),
        partner_nome: String(p.partner_nome || 'Parceiro'),
        valor_financiado: Number(p.valor_financiado),
        entrada: Number(p.entrada),
        parcelas: Number(p.parcelas),
        valor_parcela: Number(p.valor_parcela),
        taxa_mensal: p.taxa_mensal ? Number(p.taxa_mensal) : null,
        cet_anual: p.cet_anual ? Number(p.cet_anual) : null,
        valor_total: p.valor_total ? Number(p.valor_total) : null,
        validade: p.validade ? String(p.validade) : null,
        url_externa: p.url_externa ? String(p.url_externa) : null,
        selecionada: Boolean(p.selecionada),
      })),
    });
  } catch (err) {
    console.error('[Proposta Token GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar proposta.' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();
    const { proposalId } = body;

    if (!proposalId) {
      return NextResponse.json({ error: 'Proposta não especificada.' }, { status: 400 });
    }

    const result = await selectProposal(token, proposalId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Proposta selecionada com sucesso.' });
  } catch (err) {
    console.error('[Proposta Token POST]', err);
    return NextResponse.json({ error: 'Erro ao selecionar proposta.' }, { status: 500 });
  }
}
