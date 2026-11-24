// app/api/proposta/[token]/route.ts
// API pública — página do paciente

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { selectProposal } from '@/lib/application-service';
import { authorizeProposal } from '@/lib/partners/hub';
import { resolveKonsigaAttemptByApplication } from '@/lib/partners/konsiga';
import { onlyDigits } from '@/lib/partners/http';

function maskPhone(phone: string | null | undefined): string {
  const digits = onlyDigits(phone);
  if (digits.length < 4) return '****';
  return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
}

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
             a.contract_url,
             p.nome as patient_nome, p.email as patient_email, p.celular as patient_celular,
             p.cep as patient_cep, p.logradouro as patient_logradouro, p.numero as patient_numero,
             p.complemento as patient_complemento, p.bairro as patient_bairro,
             p.cidade as patient_cidade, p.estado as patient_estado, p.renda_mensal as patient_renda,
             c.nome_fantasia as clinic_nome
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
      SELECT pr.*, fp.nome as partner_nome, fp.api_slug as partner_api_slug
      FROM proposals pr
      LEFT JOIN financial_partners fp ON fp.id = pr.partner_id
      WHERE pr.application_id = ${applicationId} AND pr.ativa = true
      ORDER BY pr.valor_parcela ASC
    `;

    const selected = proposals.find(p => Boolean(p.selecionada));
    const selectedPartnerSlug = selected?.partner_api_slug ? String(selected.partner_api_slug) : null;

    let konsigaState: {
      transactionId: string;
      externalStatus: string | null;
      externalStep: string | null;
      signingUrl: string | null;
      smsSent: boolean;
      completed: boolean;
    } | null = null;

    if (selectedPartnerSlug === 'konsiga') {
      const ctx = await resolveKonsigaAttemptByApplication(applicationId);
      if (ctx) {
        const step = (ctx.externalStep || '').toUpperCase();
        const extStatus = (ctx.externalStatus || '').toUpperCase();
        const signingUrl = ctx.signingUrl || (tokenData.contract_url ? String(tokenData.contract_url) : null);
        const completedSteps = new Set([
          'PROPOSTA_COMPLETA_ENVIADA',
          'AGUARDANDO_ANALISE',
          'ASSINATURA_DISPONIVEL',
          'AGUARDANDO_NF',
          'NF_ENVIADA',
          'CREDITO_EFETUADO',
        ]);
        const completed =
          completedSteps.has(step) ||
          Boolean(signingUrl) ||
          (extStatus !== '' && extStatus !== 'PROSSEGUIR CADASTRO' && extStatus !== 'AUTHORIZED');

        konsigaState = {
          transactionId: ctx.transactionId,
          externalStatus: ctx.externalStatus,
          externalStep: ctx.externalStep,
          signingUrl,
          smsSent: step === 'TOKEN_SMS_ENVIADO' || completed,
          completed,
        };
      }
    }

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
      selected_partner_slug: selectedPartnerSlug,
      konsiga: konsigaState,
      patient_prefill:
        selectedPartnerSlug === 'konsiga'
          ? {
              email: tokenData.patient_email ? String(tokenData.patient_email) : '',
              celularMasked: maskPhone(tokenData.patient_celular ? String(tokenData.patient_celular) : ''),
              cep: tokenData.patient_cep ? String(tokenData.patient_cep) : '',
              logradouro: tokenData.patient_logradouro ? String(tokenData.patient_logradouro) : '',
              numero: tokenData.patient_numero ? String(tokenData.patient_numero) : '',
              complemento: tokenData.patient_complemento ? String(tokenData.patient_complemento) : '',
              bairro: tokenData.patient_bairro ? String(tokenData.patient_bairro) : '',
              cidade: tokenData.patient_cidade ? String(tokenData.patient_cidade) : '',
              estado: tokenData.patient_estado ? String(tokenData.patient_estado) : '',
              rendaMensal: tokenData.patient_renda ? Number(tokenData.patient_renda) : null,
            }
          : null,
      proposals: proposals.map(p => ({
        id: String(p.id),
        partner_nome: String(p.partner_nome || 'Parceiro'),
        partner_api_slug: p.partner_api_slug ? String(p.partner_api_slug) : null,
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

    const authResult = result.applicationId
      ? await authorizeProposal(result.applicationId, proposalId)
      : { redirectUrl: null, partnerSlug: null, requiresCompletion: false };

    return NextResponse.json({
      success: true,
      message: 'Proposta selecionada com sucesso.',
      redirectUrl: authResult.redirectUrl,
      partnerSlug: authResult.partnerSlug || null,
      requiresCompletion: Boolean(authResult.requiresCompletion),
      ...(authResult.error ? { authorizeError: authResult.error } : {}),
    });
  } catch (err) {
    console.error('[Proposta Token POST]', err);
    return NextResponse.json({ error: 'Erro ao selecionar proposta.' }, { status: 500 });
  }
}
