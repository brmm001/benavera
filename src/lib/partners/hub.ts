// src/lib/partners/hub.ts
// Orquestrador do Hub multi-financeiras (fan-out paralelo, autorização e webhooks)

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { SessionPayload } from '@/lib/auth';
import { canTransition, logEvent } from '@/lib/application-service';
import { sql, type ApplicationStatus } from '@/lib/benavera-db';
import { maskCpf } from './http';
import { getKonsigaSignatureLink, resolveClinicCnpj } from './konsiga';
import { getAdapter } from './registry';
import type { HubApplicant, PartnerStatus } from './types';

const DEFAULT_HUB_TIMEOUT_MS = 12000;

export interface PartnerQuoteSummaryItem {
  partnerId: string;
  partner: string;
  apiSlug: string;
  status: 'OFFERS' | 'REJECTED' | 'ERROR';
  ms: number;
  offers: number;
  motivo?: string;
}

const WebhookPayloadSchema = z
  .object({
    transactionId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
    orderId: z.string().max(120).optional(),
    action: z.string().min(1).max(120).optional(),
    step: z.string().max(80).optional(),
    message: z.string().max(500).optional(),
  })
  .passthrough();

export async function systemTransition(
  applicationId: string,
  to: ApplicationStatus,
  event: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const rows = await sql`SELECT status FROM applications WHERE id = ${applicationId}`;
  if (!rows[0]) return false;

  const currentStatus = rows[0].status as ApplicationStatus;
  if (currentStatus === to) return true;
  if (!canTransition(currentStatus, to)) return false;

  await sql`
    UPDATE applications
    SET
      status = ${to}::application_status,
      analysis_started_at = CASE
        WHEN ${to} = 'LENDER_ANALYSIS' AND analysis_started_at IS NULL THEN NOW()
        ELSE analysis_started_at
      END,
      proposal_generated_at = CASE
        WHEN ${to} = 'OFFERS_AVAILABLE' AND proposal_generated_at IS NULL THEN NOW()
        ELSE proposal_generated_at
      END,
      updated_at = NOW()
    WHERE id = ${applicationId}
  `;

  await logEvent({
    applicationId,
    actorType: 'SYSTEM',
    event,
    oldStatus: currentStatus,
    newStatus: to,
    metadata,
  });

  return true;
}

async function resolveValidUserId(candidateId: string): Promise<string | null> {
  if (!candidateId) return null;
  const rows = await sql`SELECT id FROM users WHERE id = ${candidateId} LIMIT 1`;
  return rows[0] ? String(rows[0].id) : null;
}

export async function quoteAllPartners(
  applicationId: string,
  actor: SessionPayload
): Promise<{
  success: boolean;
  error?: string;
  summary?: PartnerQuoteSummaryItem[];
  totalOffers?: number;
  finalStatus?: ApplicationStatus;
}> {
  // 1. Carregar solicitação + dados do paciente
  const appRows = await sql`
    SELECT
      a.*,
      p.nome AS patient_nome,
      p.cpf AS patient_cpf,
      p.email AS patient_email,
      p.celular AS patient_celular,
      p.cep AS patient_cep,
      p.logradouro AS patient_logradouro,
      p.numero AS patient_numero,
      p.complemento AS patient_complemento,
      p.bairro AS patient_bairro,
      p.cidade AS patient_cidade,
      p.estado AS patient_estado,
      p.data_nascimento AS patient_data_nascimento
    FROM applications a
    LEFT JOIN patients p ON p.id = a.patient_id
    WHERE a.id = ${applicationId}
    LIMIT 1
  `;

  const app = appRows[0];
  if (!app) {
    return { success: false, error: 'Solicitação não encontrada.' };
  }

  if (app.status !== 'READY_FOR_LENDERS') {
    return {
      success: false,
      error: `Solicitação precisa estar em READY_FOR_LENDERS (atual: ${app.status}).`,
    };
  }

  // Verificar consentimento LGPD
  const consentRows = await sql`
    SELECT id FROM consent_records WHERE application_id = ${applicationId} LIMIT 1
  `;
  if (!consentRows[0]) {
    return { success: false, error: 'Consentimento ausente.' };
  }

  const valorFinanciado = Number(app.valor_financiado ?? 0);
  const categoria = app.categoria ? String(app.categoria) : '';

  // 2. Selecionar parceiros elegíveis e com adapter configurado
  const partnerRows = await sql`
    SELECT id, nome, api_slug, ticket_minimo, ticket_maximo, categorias_permitidas, prioridade
    FROM financial_partners
    WHERE ativo = true
      AND integration_active = true
      AND api_slug IS NOT NULL
      AND ${valorFinanciado} >= COALESCE(ticket_minimo, 0)
      AND ${valorFinanciado} <= COALESCE(ticket_maximo, 999999999)
      AND (
        categorias_permitidas IS NULL
        OR cardinality(categorias_permitidas) = 0
        OR (${categoria} <> '' AND ${categoria} = ANY(categorias_permitidas))
      )
    ORDER BY prioridade ASC, nome ASC
  `;

  const eligible = partnerRows
    .map(row => ({
      id: String(row.id),
      nome: String(row.nome),
      apiSlug: String(row.api_slug),
      adapter: getAdapter(String(row.api_slug)),
    }))
    .filter(item => item.adapter !== null && item.adapter.isConfigured());

  if (eligible.length === 0) {
    return { success: false, error: 'Nenhuma financeira integrada ativa' };
  }

  // 3. Mover para SUBMITTED_TO_LENDER e criar attempts PENDING antes das chamadas
  await systemTransition(applicationId, 'SUBMITTED_TO_LENDER', 'HUB_FANOUT_STARTED', {
    partnersCount: eligible.length,
    partners: eligible.map(e => e.apiSlug),
    cpfMasked: maskCpf(app.patient_cpf ? String(app.patient_cpf) : null),
  });

  const applicant: HubApplicant = {
    applicationId: String(app.id),
    protocol: String(app.protocol),
    categoria,
    procedimento: String(app.procedimento || ''),
    valorTratamento: Number(app.valor_tratamento ?? 0),
    entrada: Number(app.entrada ?? 0),
    valorFinanciado,
    patient: {
      nome: String(app.patient_nome || ''),
      cpf: String(app.patient_cpf || ''),
      email: String(app.patient_email || ''),
      celular: String(app.patient_celular || ''),
      cep: String(app.patient_cep || ''),
      logradouro: String(app.patient_logradouro || ''),
      numero: String(app.patient_numero || ''),
      complemento: String(app.patient_complemento || ''),
      bairro: String(app.patient_bairro || ''),
      cidade: String(app.patient_cidade || ''),
      estado: String(app.patient_estado || ''),
      dataNascimento: app.patient_data_nascimento ? String(app.patient_data_nascimento) : null,
    },
  };

  const createdByUserId = await resolveValidUserId(actor.userId);

  const attemptMap = new Map<string, string>();
  for (const partner of eligible) {
    const attemptRows = await sql`
      INSERT INTO funding_attempts (application_id, partner_id, status, valor_solicitado, submitted_at)
      VALUES (${applicationId}, ${partner.id}, 'PENDING', ${valorFinanciado}, NOW())
      RETURNING id
    `;
    attemptMap.set(partner.id, String(attemptRows[0].id));
  }

  // 4. Fan-out simultâneo limitado pelo maior timeout configurado entre os parceiros
  const timeoutCandidates = [
    DEFAULT_HUB_TIMEOUT_MS,
    Number(process.env.PARCELEX_TIMEOUT_MS),
    Number(process.env.KONSIGA_TIMEOUT_MS || (eligible.some(e => e.apiSlug === 'konsiga') ? 15000 : 0)),
  ].filter(v => Number.isFinite(v) && v >= 1000 && v <= 60000);
  const hubTimeoutMs = Math.max(...timeoutCandidates);

  const hubController = new AbortController();
  const hubTimer = setTimeout(() => {
    hubController.abort(new Error(`Timeout global do hub após ${hubTimeoutMs}ms`));
  }, hubTimeoutMs);

  const runQuote = async (partner: (typeof eligible)[number]): Promise<PartnerQuoteSummaryItem> => {
    const attemptId = attemptMap.get(partner.id)!;
    const startedAt = Date.now();

    try {
      const quoteRes = await partner.adapter!.quote(applicant, hubController.signal);
      const ms = Date.now() - startedAt;

      const attemptStatus =
        quoteRes.status === 'OFFERS'
          ? 'PRE_APPROVED'
          : quoteRes.status === 'REJECTED'
            ? 'REJECTED'
            : 'ERROR';

      await sql`
        UPDATE funding_attempts
        SET
          status = ${attemptStatus},
          resposta = ${JSON.stringify(quoteRes.raw)}::jsonb,
          motivo = ${quoteRes.motivo || null},
          external_id = ${quoteRes.externalId || null},
          responded_at = NOW(),
          response_time_ms = ${ms},
          updated_at = NOW()
        WHERE id = ${attemptId}
      `;

      let insertedOffers = 0;
      if (quoteRes.status === 'OFFERS' && quoteRes.offers.length > 0) {
        for (const offer of quoteRes.offers) {
          const validadeAt = new Date(
            Date.now() + (offer.validadeHoras || 24) * 3600 * 1000
          ).toISOString();

          await sql`
            INSERT INTO proposals (
              application_id, partner_id, funding_attempt_id,
              valor_financiado, entrada, parcelas, valor_parcela,
              taxa_mensal, cet_anual, valor_total, validade,
              external_option_id, ativa, created_by
            ) VALUES (
              ${applicationId}, ${partner.id}, ${attemptId},
              ${offer.valorFinanciado}, ${offer.entrada}, ${offer.parcelas}, ${offer.valorParcela},
              ${offer.taxaMensal ?? null}, ${offer.cetAnual ?? null}, ${offer.valorTotal}, ${validadeAt},
              ${offer.externalOptionId}, true, ${createdByUserId}
            )
          `;
          insertedOffers++;
        }
      }

      return {
        partnerId: partner.id,
        partner: partner.nome,
        apiSlug: partner.apiSlug,
        status: quoteRes.status,
        ms,
        offers: insertedOffers,
        ...(quoteRes.motivo ? { motivo: quoteRes.motivo } : {}),
      };
    } catch (err) {
      const ms = Date.now() - startedAt;
      const errMsg = err instanceof Error ? err.message.slice(0, 200) : 'Erro desconhecido na consulta.';

      await sql`
        UPDATE funding_attempts
        SET
          status = 'ERROR',
          resposta = ${JSON.stringify({ error: errMsg })}::jsonb,
          motivo = ${errMsg},
          responded_at = NOW(),
          response_time_ms = ${ms},
          updated_at = NOW()
        WHERE id = ${attemptId}
      `;

      return {
        partnerId: partner.id,
        partner: partner.nome,
        apiSlug: partner.apiSlug,
        status: 'ERROR',
        ms,
        offers: 0,
        motivo: errMsg,
      };
    }
  };

  let settledResults: PromiseSettledResult<PartnerQuoteSummaryItem>[];
  try {
    settledResults = await Promise.allSettled(eligible.map(runQuote));
  } finally {
    clearTimeout(hubTimer);
  }

  const summary: PartnerQuoteSummaryItem[] = settledResults.map((res, idx) => {
    if (res.status === 'fulfilled') return res.value;
    const p = eligible[idx];
    return {
      partnerId: p.id,
      partner: p.nome,
      apiSlug: p.apiSlug,
      status: 'ERROR',
      ms: hubTimeoutMs,
      offers: 0,
      motivo: 'Falha inesperada na execução.',
    };
  });

  // 5. Agregar resultado e avançar na state machine
  const totalOffers = summary.reduce((acc, s) => acc + s.offers, 0);
  const allRejected = summary.length > 0 && summary.every(s => s.status === 'REJECTED');

  await systemTransition(applicationId, 'LENDER_ANALYSIS', 'HUB_QUOTES_AGGREGATING', {
    totalOffers,
    partnersQueried: summary.length,
  });

  let finalStatus: ApplicationStatus = 'LENDER_ANALYSIS';

  if (totalOffers >= 1) {
    const moved = await systemTransition(applicationId, 'OFFERS_AVAILABLE', 'OFFERS_GENERATED_BY_HUB', {
      totalOffers,
    });
    if (moved) {
      finalStatus = 'OFFERS_AVAILABLE';
      await sql`
        UPDATE applications
        SET
          proposal_generated_at = COALESCE(proposal_generated_at, NOW()),
          lender_decision = 'PRE_APPROVED'::lender_decision,
          updated_at = NOW()
        WHERE id = ${applicationId}
      `;
    }
  } else if (allRejected) {
    const moved = await systemTransition(applicationId, 'DECLINED', 'ALL_PARTNERS_DECLINED');
    if (moved) {
      finalStatus = 'DECLINED';
      await sql`
        UPDATE applications
        SET
          decline_reason = 'Nenhuma financeira aprovou',
          lender_decision = 'REJECTED'::lender_decision,
          updated_at = NOW()
        WHERE id = ${applicationId}
      `;
    }
  }

  // 6. Log resumido sem dados pessoais
  await logEvent({
    applicationId,
    actorType: 'USER',
    actorId: actor.userId,
    actorName: actor.name,
    event: 'PARTNER_HUB_QUOTED',
    newStatus: finalStatus,
    metadata: {
      summary: summary.map(s => ({
        partner: s.apiSlug,
        status: s.status,
        ms: s.ms,
        offers: s.offers,
      })),
    },
  });

  return {
    success: true,
    summary,
    totalOffers,
    finalStatus,
  };
}

export async function authorizeProposal(
  applicationId: string,
  proposalId: string
): Promise<{
  redirectUrl: string | null;
  partnerSlug?: string | null;
  requiresCompletion?: boolean;
  error?: string;
}> {
  const rows = await sql`
    SELECT
      pr.id AS proposal_id,
      pr.selecionada,
      pr.external_option_id,
      pr.funding_attempt_id,
      fp.api_slug AS partner_api_slug,
      a.protocol
    FROM proposals pr
    JOIN applications a ON a.id = pr.application_id
    LEFT JOIN financial_partners fp ON fp.id = pr.partner_id
    WHERE pr.id = ${proposalId}
      AND pr.application_id = ${applicationId}
      AND pr.selecionada = true
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return { redirectUrl: null, partnerSlug: null };

  const slug = row.partner_api_slug ? String(row.partner_api_slug) : null;
  const externalOptionId = row.external_option_id ? String(row.external_option_id) : null;
  if (!slug || !externalOptionId) {
    // Fluxo manual existente — retorna null sem alterar nada
    return { redirectUrl: null, partnerSlug: slug };
  }

  const adapter = getAdapter(slug);
  if (!adapter || !adapter.isConfigured()) {
    return { redirectUrl: null, partnerSlug: slug };
  }

  try {
    const authRes = await adapter.authorize(externalOptionId, String(row.protocol));
    const initialExternalStatus =
      typeof authRes.raw?.status === 'string' && authRes.raw.status.trim()
        ? authRes.raw.status.trim()
        : 'AUTHORIZED';
    const initialStep =
      slug === 'konsiga'
        ? authRes.redirectUrl
          ? 'ASSINATURA_DISPONIVEL'
          : 'PROPOSTA_INICIAL_ENVIADA'
        : null;

    if (row.funding_attempt_id) {
      await sql`
        UPDATE funding_attempts
        SET
          external_transaction_id = ${authRes.externalTransactionId},
          external_status = ${initialExternalStatus},
          external_step = COALESCE(${initialStep}, external_step),
          updated_at = NOW()
        WHERE id = ${String(row.funding_attempt_id)}
      `;
    }

    await sql`
      UPDATE proposals
      SET url_externa = ${authRes.redirectUrl || null}
      WHERE id = ${proposalId}
    `;

    if (authRes.redirectUrl) {
      await sql`
        UPDATE applications
        SET
          contract_url = COALESCE(contract_url, ${authRes.redirectUrl}),
          contract_provider = COALESCE(contract_provider, ${slug === 'konsiga' ? 'Konsiga' : slug}),
          contract_id = COALESCE(contract_id, ${authRes.externalTransactionId}),
          updated_at = NOW()
        WHERE id = ${applicationId}
      `;
    }

    await systemTransition(applicationId, 'CONTRACT_PENDING', 'PARTNER_AUTHORIZED', {
      partner: slug,
      transactionId: authRes.externalTransactionId,
      externalStatus: initialExternalStatus,
    });

    return {
      redirectUrl: authRes.redirectUrl || null,
      partnerSlug: slug,
      requiresCompletion: slug === 'konsiga' && !authRes.redirectUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : 'Falha na autorização';
    await logEvent({
      applicationId,
      actorType: 'SYSTEM',
      event: 'PARTNER_AUTHORIZE_FAILED',
      metadata: {
        partner: slug,
        proposalId,
        error: message,
      },
    });
    return {
      redirectUrl: null,
      partnerSlug: slug,
      error: 'Não foi possível iniciar a etapa na financeira agora. Nossa equipe dará seguimento.',
    };
  }
}

async function handleRejectionOrFallback(
  applicationId: string,
  attemptId: string,
  partnerId: string,
  slug: string,
  normalized: Extract<PartnerStatus['normalized'], 'DENIED' | 'ABANDONED' | 'CANCELLED'>
): Promise<void> {
  const attemptStatus = normalized === 'DENIED' ? 'REJECTED' : normalized;

  await sql`
    UPDATE funding_attempts
    SET
      status = ${attemptStatus},
      responded_at = COALESCE(responded_at, NOW()),
      updated_at = NOW()
    WHERE id = ${attemptId}
  `;

  await sql`
    UPDATE proposals
    SET ativa = false, selecionada = false
    WHERE application_id = ${applicationId}
      AND (funding_attempt_id = ${attemptId} OR (partner_id = ${partnerId} AND selecionada = true))
  `;

  const otherActive = await sql`
    SELECT id
    FROM proposals
    WHERE application_id = ${applicationId}
      AND ativa = true
      AND (validade IS NULL OR validade > NOW())
    LIMIT 1
  `;

  if (otherActive[0]) {
    await sql`UPDATE proposals SET selecionada = false WHERE application_id = ${applicationId}`;
    await systemTransition(applicationId, 'OFFERS_AVAILABLE', `PARTNER_${normalized}_FALLBACK`, {
      partner: slug,
    });
    return;
  }

  if (normalized === 'DENIED') {
    await systemTransition(applicationId, 'DECLINED', 'PARTNER_DECLINED', { partner: slug });
    await sql`
      UPDATE applications
      SET
        lender_decision = 'REJECTED'::lender_decision,
        decline_reason = COALESCE(decline_reason, 'Reprovado na financeira parceira'),
        updated_at = NOW()
      WHERE id = ${applicationId}
    `;
  } else if (normalized === 'ABANDONED') {
    await systemTransition(applicationId, 'EXPIRED', 'PARTNER_ABANDONED', { partner: slug });
    await sql`
      UPDATE applications
      SET lender_decision = 'EXPIRED'::lender_decision, updated_at = NOW()
      WHERE id = ${applicationId}
    `;
  } else {
    await systemTransition(applicationId, 'CANCELLED', 'PARTNER_CANCELLED', { partner: slug });
    await sql`
      UPDATE applications
      SET cancel_reason = COALESCE(cancel_reason, 'Cancelado na financeira parceira'), updated_at = NOW()
      WHERE id = ${applicationId}
    `;
  }
}

function stripAccentsUpper(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

/**
 * Aplica um `PartnerStatus` confirmado pela API da financeira ao banco e à state machine.
 * Usado tanto pelo webhook quanto pela sincronização sob demanda.
 */
async function applyPartnerStatus(
  ctx: {
    applicationId: string;
    attemptId: string;
    partnerId: string;
    slug: string;
    txId: string;
  },
  statusInfo: PartnerStatus
): Promise<{ signingUrl: string | null; derivedStep: string | null }> {
  const { applicationId, attemptId, partnerId, slug, txId } = ctx;
  const externalUpper = stripAccentsUpper(statusInfo.externalStatus || '');

  let signingUrl: string | null = null;
  let derivedStep: string | null = statusInfo.step || null;

  // Para Konsiga: capturar automaticamente o link de assinatura quando liberado
  if (slug === 'konsiga') {
    const existingProp = await sql`
      SELECT id, url_externa
      FROM proposals
      WHERE application_id = ${applicationId}
        AND (funding_attempt_id = ${attemptId} OR (partner_id = ${partnerId} AND selecionada = true))
      ORDER BY selecionada DESC, created_at DESC
      LIMIT 1
    `;
    signingUrl = existingProp[0]?.url_externa ? String(existingProp[0].url_externa) : null;

    const shouldTryFetchLink =
      !signingUrl &&
      (externalUpper.includes('ASSINATURA') ||
        externalUpper.includes('CCB') ||
        externalUpper.includes('APROVADO') ||
        externalUpper.includes('RECIBO OU NF') ||
        externalUpper.includes('CREDITO'));

    if (shouldTryFetchLink) {
      try {
        const clinicCnpj = await resolveClinicCnpj(applicationId);
        if (clinicCnpj) {
          const fetched = await getKonsigaSignatureLink(txId, clinicCnpj);
          if (fetched) {
            signingUrl = fetched;
            if (existingProp[0]?.id) {
              await sql`
                UPDATE proposals
                SET url_externa = ${fetched}
                WHERE id = ${String(existingProp[0].id)}
              `;
            }
            await sql`
              UPDATE applications
              SET
                contract_url = ${fetched},
                contract_provider = COALESCE(contract_provider, 'Konsiga'),
                contract_id = COALESCE(contract_id, ${txId}),
                contract_status = CASE
                  WHEN contract_status = 'SIGNED' THEN contract_status
                  ELSE 'SENT'::contract_status
                END,
                updated_at = NOW()
              WHERE id = ${applicationId}
            `;
            await systemTransition(applicationId, 'CONTRACT_SENT', 'PARTNER_CONTRACT_LINK_READY', {
              partner: slug,
              transactionId: txId,
            });
          }
        }
      } catch (err) {
        console.warn(
          '[Hub Konsiga] Falha ao consultar link de assinatura:',
          err instanceof Error ? err.message : 'erro desconhecido'
        );
      }
    }

    if (externalUpper === 'CREDITO EFETUADO NA CONTA INFORMADA') {
      derivedStep = 'CREDITO_EFETUADO';
    } else if (externalUpper === 'AGUARDANDO ENVIO DE RECIBO OU NF') {
      derivedStep = 'AGUARDANDO_NF';
    } else if (externalUpper === 'AGUARDANDO ASSINATURA DO CONTRATO PELO PACIENTE' || signingUrl) {
      derivedStep = 'ASSINATURA_DISPONIVEL';
    } else if (externalUpper === 'AGUARDANDO ANALISE') {
      derivedStep = 'AGUARDANDO_ANALISE';
    }
  }

  await sql`
    UPDATE funding_attempts
    SET
      external_status = ${statusInfo.externalStatus},
      external_step = COALESCE(${derivedStep}, external_step),
      updated_at = NOW()
    WHERE id = ${attemptId}
  `;

  if (statusInfo.normalized === 'APPROVED') {
    await sql`
      UPDATE funding_attempts
      SET
        status = 'APPROVED',
        responded_at = COALESCE(responded_at, NOW()),
        updated_at = NOW()
      WHERE id = ${attemptId}
    `;

    // Garantir que saia de OFFER_SELECTED para CONTRACT_PENDING se ainda estiver lá
    await systemTransition(applicationId, 'CONTRACT_PENDING', 'PARTNER_CONTRACT_SYNC', {
      partner: slug,
    });

    const signedOk = await systemTransition(
      applicationId,
      'CONTRACT_SIGNED',
      'PARTNER_CONTRACT_SIGNED',
      { partner: slug, transactionId: txId }
    );
    if (signedOk) {
      await sql`
        UPDATE applications
        SET
          contract_signed_at = COALESCE(contract_signed_at, NOW()),
          contract_status = 'SIGNED',
          updated_at = NOW()
        WHERE id = ${applicationId}
      `;
    }

    const approvedOk = await systemTransition(applicationId, 'APPROVED', 'PARTNER_APPROVED', {
      partner: slug,
      transactionId: txId,
    });
    if (approvedOk) {
      await sql`
        UPDATE applications
        SET lender_decision = 'APPROVED'::lender_decision, updated_at = NOW()
        WHERE id = ${applicationId}
      `;
    }

    if (slug === 'konsiga' && externalUpper === 'CREDITO EFETUADO NA CONTA INFORMADA') {
      await logEvent({
        applicationId,
        actorType: 'SYSTEM',
        event: 'PARTNER_CREDIT_DISBURSED',
        metadata: { partner: slug, transactionId: txId, externalStatus: statusInfo.externalStatus },
      });
    }
  } else if (
    statusInfo.normalized === 'DENIED' ||
    statusInfo.normalized === 'ABANDONED' ||
    statusInfo.normalized === 'CANCELLED'
  ) {
    await handleRejectionOrFallback(
      applicationId,
      attemptId,
      partnerId,
      slug,
      statusInfo.normalized
    );
  } else {
    const evtName =
      slug === 'konsiga' && externalUpper === 'AGUARDANDO ENVIO DE RECIBO OU NF'
        ? 'PARTNER_AWAITING_INVOICE'
        : `PARTNER_STEP_${derivedStep || 'IN_PROGRESS'}`;
    await logEvent({
      applicationId,
      actorType: 'SYSTEM',
      event: evtName,
      metadata: {
        partner: slug,
        transactionId: txId,
        externalStatus: statusInfo.externalStatus,
        step: derivedStep,
        hasSigningUrl: Boolean(signingUrl),
      },
    });
  }

  return { signingUrl, derivedStep };
}

/**
 * Sincroniza sob demanda o status da financeira ativa (e captura o link de assinatura na Konsiga).
 */
export async function syncPartnerStatus(
  applicationId: string,
  partnerSlug?: string
): Promise<{
  success: boolean;
  error?: string;
  partner?: string;
  transactionId?: string;
  externalStatus?: string;
  externalStep?: string | null;
  normalized?: PartnerStatus['normalized'];
  signingUrl?: string | null;
  appStatus?: string;
}> {
  const rows = await sql`
    SELECT
      fa.id AS attempt_id,
      fa.application_id,
      fa.partner_id,
      fa.external_transaction_id,
      fa.external_id,
      fp.api_slug
    FROM funding_attempts fa
    JOIN financial_partners fp ON fp.id = fa.partner_id
    LEFT JOIN proposals pr
      ON pr.application_id = fa.application_id
     AND pr.funding_attempt_id = fa.id
     AND pr.selecionada = true
    WHERE fa.application_id = ${applicationId}
      AND fp.api_slug IS NOT NULL
      AND (${partnerSlug || null}::text IS NULL OR fp.api_slug = ${partnerSlug || null})
      AND (fa.external_transaction_id IS NOT NULL OR fa.external_id IS NOT NULL)
    ORDER BY
      (pr.id IS NOT NULL) DESC,
      (fa.external_transaction_id IS NOT NULL) DESC,
      fa.updated_at DESC NULLS LAST,
      fa.submitted_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return { success: false, error: 'Nenhuma transação de financeira integrada encontrada.' };
  }

  const slug = String(row.api_slug);
  const txId = String(row.external_transaction_id || row.external_id || '').trim();
  const adapter = getAdapter(slug);
  if (!adapter || !adapter.isConfigured()) {
    return { success: false, error: `Integração ${slug} não configurada no ambiente.` };
  }

  const statusInfo = await adapter.getStatus(txId);
  const { signingUrl, derivedStep } = await applyPartnerStatus(
    {
      applicationId: String(row.application_id),
      attemptId: String(row.attempt_id),
      partnerId: String(row.partner_id),
      slug,
      txId,
    },
    statusInfo
  );

  const appRows = await sql`SELECT status FROM applications WHERE id = ${applicationId} LIMIT 1`;

  return {
    success: true,
    partner: slug,
    transactionId: txId,
    externalStatus: statusInfo.externalStatus,
    externalStep: derivedStep,
    normalized: statusInfo.normalized,
    signingUrl,
    appStatus: appRows[0]?.status ? String(appRows[0].status) : undefined,
  };
}

export async function handlePartnerWebhook(
  slug: string,
  rawBody: string
): Promise<{ ok: boolean; duplicate?: boolean }> {
  const dedupeKey = createHash('sha256').update(rawBody, 'utf8').digest('hex');

  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawBody);
  } catch {
    await sql`
      INSERT INTO partner_webhook_events (partner_slug, dedupe_key, action, error)
      VALUES (${slug}, ${dedupeKey}, 'INVALID_JSON', 'invalid json payload')
      ON CONFLICT (partner_slug, dedupe_key) DO NOTHING
    `;
    return { ok: true };
  }

  const parsed = WebhookPayloadSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    await sql`
      INSERT INTO partner_webhook_events (partner_slug, dedupe_key, action, error)
      VALUES (${slug}, ${dedupeKey}, 'INVALID_SCHEMA', 'invalid webhook payload')
      ON CONFLICT (partner_slug, dedupe_key) DO NOTHING
    `;
    return { ok: true };
  }

  const payload = parsed.data;
  const txId = payload.transactionId;
  const action = payload.action ? String(payload.action).toUpperCase() : null;

  // Sanitiza payload gravado para evitar armazenar dados desnecessários
  const safePayload = {
    transactionId: txId,
    orderId: payload.orderId || null,
    action,
    step: payload.step || null,
    message: payload.message ? payload.message.slice(0, 300) : null,
  };

  // 2. Idempotência por (partner_slug, dedupe_key)
  const inserted = await sql`
    INSERT INTO partner_webhook_events (
      partner_slug, dedupe_key, external_transaction_id, action, payload
    ) VALUES (
      ${slug}, ${dedupeKey}, ${txId}, ${action}, ${JSON.stringify(safePayload)}::jsonb
    )
    ON CONFLICT (partner_slug, dedupe_key) DO NOTHING
    RETURNING id
  `;

  if (!inserted[0]) {
    return { ok: true, duplicate: true };
  }

  const eventId = String(inserted[0].id);

  // 3. Buscar tentativa pelo transactionId + slug do parceiro
  const attemptRows = await sql`
    SELECT fa.id AS attempt_id, fa.application_id, fa.partner_id
    FROM funding_attempts fa
    JOIN financial_partners fp ON fp.id = fa.partner_id
    WHERE (fa.external_transaction_id = ${txId} OR fa.external_id = ${txId})
      AND fp.api_slug = ${slug}
    LIMIT 1
  `;

  if (!attemptRows[0]) {
    await sql`
      UPDATE partner_webhook_events
      SET error = 'unknown transaction', processed_at = NOW()
      WHERE id = ${eventId}
    `;
    return { ok: true };
  }

  const attemptId = String(attemptRows[0].attempt_id);
  const applicationId = String(attemptRows[0].application_id);
  const partnerId = String(attemptRows[0].partner_id);

  try {
    // 4. Notas fiscais (VALIDATED / REFUSED) — apenas auditoria
    if (action === 'VALIDATED' || action === 'REFUSED') {
      await logEvent({
        applicationId,
        actorType: 'SYSTEM',
        event: `PARTNER_INVOICE_${action}`,
        metadata: {
          partner: slug,
          transactionId: txId,
          ...(safePayload.message ? { message: safePayload.message } : {}),
        },
      });
      await sql`
        UPDATE partner_webhook_events SET processed_at = NOW() WHERE id = ${eventId}
      `;
      return { ok: true };
    }

    // 5. Nunca confiar apenas no body: consultar estado real na API do parceiro
    const adapter = getAdapter(slug);
    if (!adapter || !adapter.isConfigured()) {
      await sql`
        UPDATE partner_webhook_events
        SET error = 'adapter not configured', processed_at = NOW()
        WHERE id = ${eventId}
      `;
      return { ok: true };
    }

    const statusInfo = await adapter.getStatus(txId);
    await applyPartnerStatus(
      { applicationId, attemptId, partnerId, slug, txId },
      statusInfo
    );

    await sql`
      UPDATE partner_webhook_events SET processed_at = NOW() WHERE id = ${eventId}
    `;
    return { ok: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message.slice(0, 300) : 'Erro ao processar webhook';
    await sql`
      UPDATE partner_webhook_events SET error = ${errMsg} WHERE id = ${eventId}
    `;
    return { ok: true };
  }
}
