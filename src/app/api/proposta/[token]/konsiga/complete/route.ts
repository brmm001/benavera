// src/app/api/proposta/[token]/konsiga/complete/route.ts
// Envia a Proposta Completa para a Konsiga (Manual v1.4 — Seção 3.4) com dados complementares e documentos Base64

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logEvent } from '@/lib/application-service';
import { sql } from '@/lib/benavera-db';
import { PartnerHttpError, onlyDigits } from '@/lib/partners/http';
import { syncPartnerStatus } from '@/lib/partners/hub';
import {
  normalizeBase64Document,
  resolveKonsigaAttemptByApplication,
  sendKonsigaCompleteProposal,
} from '@/lib/partners/konsiga';
import {
  VALID_KONSIGA_OCUPACAO_IDS,
  VALID_KONSIGA_PROFISSAO_IDS,
} from '@/lib/partners/konsiga-catalogs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 18 * 1024 * 1024; // 18 MB (2 docs Base64 + JSON)
const COMPLETED_STEPS = new Set([
  'PROPOSTA_COMPLETA_ENVIADA',
  'AGUARDANDO_ANALISE',
  'ASSINATURA_DISPONIVEL',
  'AGUARDANDO_NF',
  'NF_ENVIADA',
  'CREDITO_EFETUADO',
]);

const CompleteProposalSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  telefoneResidencial: z.string().trim().max(20).optional().default(''),
  tokenConfirmacao: z.string().trim().max(20).optional().default(''),
  enderecoResidencial: z.object({
    cep: z.string().trim().min(8, 'CEP inválido.').max(12),
    logradouro: z.string().trim().min(2, 'Logradouro obrigatório.').max(200),
    numero: z.string().trim().min(1, 'Número obrigatório.').max(30),
    bairro: z.string().trim().min(2, 'Bairro obrigatório.').max(120),
    cidade: z.string().trim().min(2, 'Cidade obrigatória.').max(120),
    estado: z.string().trim().length(2, 'UF deve ter 2 letras.'),
    complemento: z.string().trim().max(120).optional().default(''),
  }),
  dadosComerciais: z.object({
    atividadeDesde: z
      .string()
      .trim()
      .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Informe o início da atividade no formato MM/AAAA.'),
    cidade: z.string().trim().min(2, 'Cidade comercial obrigatória.').max(120),
    estado: z.string().trim().length(2, 'UF comercial deve ter 2 letras.'),
    idOcupacao: z.coerce.number().int().refine(id => VALID_KONSIGA_OCUPACAO_IDS.has(id), {
      message: 'Ocupação inválida.',
    }),
    idProfissao: z.coerce
      .number()
      .int()
      .refine(id => VALID_KONSIGA_PROFISSAO_IDS.has(id), { message: 'Profissão inválida.' })
      .optional(),
    nomeEmpresa: z.string().trim().max(160).optional().default(''),
    rendaMensal: z.coerce.number().positive('Informe uma renda mensal válida.').max(10_000_000),
    telefone: z.string().trim().max(20).optional().default(''),
  }),
  documentoFrenteBase64: z.string().min(16, 'Envie a foto/PDF da frente do documento.'),
  documentoVersoBase64: z.string().min(16, 'Envie a foto/PDF do verso do documento.'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader) {
      const len = Number(contentLengthHeader);
      if (Number.isFinite(len) && len > MAX_REQUEST_BYTES) {
        return NextResponse.json({ error: 'Arquivos muito grandes. Reduza o tamanho e tente novamente.' }, { status: 413 });
      }
    }

    const tokenRows = await sql`
      SELECT pt.application_id, a.patient_id
      FROM proposal_tokens pt
      JOIN applications a ON a.id = pt.application_id
      WHERE pt.token = ${token}
        AND pt.revogado = false
        AND pt.expires_at > NOW()
      LIMIT 1
    `;
    if (!tokenRows[0]) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }

    const applicationId = String(tokenRows[0].application_id);
    const patientId = String(tokenRows[0].patient_id);

    const ctx = await resolveKonsigaAttemptByApplication(applicationId);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Nenhuma proposta Konsiga ativa encontrada para esta solicitação.' },
        { status: 400 }
      );
    }

    if (COMPLETED_STEPS.has((ctx.externalStep || '').toUpperCase())) {
      return NextResponse.json(
        { error: 'Sua documentação já foi enviada para a Konsiga.' },
        { status: 409 }
      );
    }

    const body = await request.json();
    const parsed = CompleteProposalSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || 'Dados inválidos. Revise o formulário.' },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const cepDigits = onlyDigits(input.enderecoResidencial.cep);
    if (cepDigits.length !== 8) {
      return NextResponse.json({ error: 'CEP deve conter 8 dígitos.' }, { status: 400 });
    }

    const frontDoc = normalizeBase64Document(input.documentoFrenteBase64);
    if (!frontDoc.ok) {
      return NextResponse.json({ error: `Documento (frente): ${frontDoc.error}` }, { status: 400 });
    }
    const backDoc = normalizeBase64Document(input.documentoVersoBase64);
    if (!backDoc.ok) {
      return NextResponse.json({ error: `Documento (verso): ${backDoc.error}` }, { status: 400 });
    }

    const telComercial = onlyDigits(input.dadosComerciais.telefone);
    const telResidencial = onlyDigits(input.telefoneResidencial);

    const payload = {
      cliente: {
        email: input.email,
        enderecoResidencial: {
          logradouro: input.enderecoResidencial.logradouro,
          numero: input.enderecoResidencial.numero,
          bairro: input.enderecoResidencial.bairro,
          cidade: input.enderecoResidencial.cidade,
          estado: input.enderecoResidencial.estado.toUpperCase(),
          cep: `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`,
          complemento: input.enderecoResidencial.complemento || '',
        },
        ...(telResidencial ? { telefoneResidencial: telResidencial } : {}),
        ...(input.tokenConfirmacao ? { tokenConfirmacao: input.tokenConfirmacao } : {}),
        documentoFrenteBase64: frontDoc.base64,
        documentoVersoBase64: backDoc.base64,
        dadosComerciais: {
          atividadeDesde: input.dadosComerciais.atividadeDesde,
          cidade: input.dadosComerciais.cidade,
          estado: input.dadosComerciais.estado.toUpperCase(),
          idOcupacao: input.dadosComerciais.idOcupacao,
          ...(input.dadosComerciais.idProfissao
            ? { idProfissao: input.dadosComerciais.idProfissao }
            : {}),
          ...(input.dadosComerciais.nomeEmpresa
            ? { nomeEmpresa: input.dadosComerciais.nomeEmpresa }
            : {}),
          rendaMensal: input.dadosComerciais.rendaMensal,
          ...(telComercial ? { telefone: telComercial } : {}),
        },
      },
    };

    const res = await sendKonsigaCompleteProposal(ctx.transactionId, ctx.clinicCnpj, payload);
    if (!res.sucesso) {
      const errMsg =
        res.erros?.join('; ') || res.mensagem || 'A Konsiga recusou os dados complementares.';
      return NextResponse.json({ error: errMsg }, { status: 422 });
    }

    // Sincronizar endereço/renda/e-mail confirmados no cadastro do paciente
    await sql`
      UPDATE patients
      SET
        email = ${input.email},
        renda_mensal = ${input.dadosComerciais.rendaMensal},
        cep = ${cepDigits},
        logradouro = ${input.enderecoResidencial.logradouro},
        numero = ${input.enderecoResidencial.numero},
        complemento = ${input.enderecoResidencial.complemento || null},
        bairro = ${input.enderecoResidencial.bairro},
        cidade = ${input.enderecoResidencial.cidade},
        estado = ${input.enderecoResidencial.estado.toUpperCase()},
        updated_at = NOW()
      WHERE id = ${patientId}
    `;

    await sql`
      UPDATE funding_attempts
      SET
        external_status = 'AGUARDANDO ANÁLISE',
        external_step = 'PROPOSTA_COMPLETA_ENVIADA',
        updated_at = NOW()
      WHERE id = ${ctx.attemptId}
    `;

    await logEvent({
      applicationId,
      actorType: 'PATIENT',
      event: 'KONSIGA_COMPLETE_PROPOSAL_SENT',
      metadata: {
        partner: 'konsiga',
        transactionId: ctx.transactionId,
        hasSmsToken: Boolean(input.tokenConfirmacao),
        idOcupacao: input.dadosComerciais.idOcupacao,
        idProfissao: input.dadosComerciais.idProfissao ?? null,
      },
    });

    // Tentar sincronizar imediatamente caso a Konsiga já tenha liberado link/status
    let signingUrl: string | null = null;
    let externalStatus = 'AGUARDANDO ANÁLISE';
    try {
      const synced = await syncPartnerStatus(applicationId, 'konsiga');
      if (synced.success) {
        signingUrl = synced.signingUrl || null;
        if (synced.externalStatus) externalStatus = synced.externalStatus;
      }
    } catch {
      // Não falhar se a consulta imediata demorar; o webhook ou botão de atualizar sincroniza
    }

    return NextResponse.json(
      {
        success: true,
        externalStatus,
        signingUrl,
        message: signingUrl
          ? 'Documentação enviada! Seu contrato já está disponível para assinatura.'
          : 'Documentação enviada com sucesso! Sua proposta está em análise pela Konsiga.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[Proposta Konsiga Complete]', err instanceof Error ? err.message : 'erro');
    const safeMsg =
      err instanceof PartnerHttpError && err.status >= 400 && err.status < 500
        ? err.message
        : 'Não foi possível enviar a documentação agora. Tente novamente em instantes.';
    return NextResponse.json(
      { error: safeMsg },
      { status: err instanceof PartnerHttpError && err.status < 500 ? err.status : 500 }
    );
  }
}
