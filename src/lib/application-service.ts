// lib/application-service.ts
// Serviço de solicitações de financiamento — regras de negócio e state machine

import { sql } from './benavera-db';
import type { ApplicationStatus, InternalDecision } from './benavera-db';
import type { SessionPayload } from './auth';

// ── State Machine ────────────────────────────────────────────────────────────
// Define transições válidas de status
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['PRE_ANALYSIS', 'CANCELLED'],
  PRE_ANALYSIS: ['PRE_ANALYSIS_APPROVED', 'PRE_ANALYSIS_REVIEW', 'PRE_ANALYSIS_DECLINED'],
  PRE_ANALYSIS_APPROVED: ['INTERNAL_REVIEW', 'READY_FOR_LENDERS'],
  PRE_ANALYSIS_REVIEW: ['INTERNAL_REVIEW', 'CANCELLED'],
  PRE_ANALYSIS_DECLINED: ['DECLINED'],
  AWAITING_PATIENT: ['SUBMITTED', 'CANCELLED'],
  AWAITING_CLINIC: ['AWAITING_DOCUMENTS', 'INTERNAL_REVIEW', 'CANCELLED'],
  AWAITING_DOCUMENTS: ['INTERNAL_REVIEW', 'CANCELLED'],
  INTERNAL_REVIEW: ['READY_FOR_LENDERS', 'AWAITING_CLINIC', 'AWAITING_DOCUMENTS', 'DECLINED', 'CANCELLED'],
  READY_FOR_LENDERS: ['SUBMITTED_TO_LENDER', 'DECLINED', 'CANCELLED'],
  SUBMITTED_TO_LENDER: ['LENDER_ANALYSIS', 'CANCELLED'],
  LENDER_ANALYSIS: ['PRE_APPROVED', 'OFFERS_AVAILABLE', 'DECLINED', 'INTERNAL_REVIEW'],
  PRE_APPROVED: ['OFFERS_AVAILABLE', 'DECLINED'],
  OFFERS_AVAILABLE: ['OFFER_SELECTED', 'EXPIRED', 'CANCELLED'],
  OFFER_SELECTED: ['CONTRACT_PENDING'],
  CONTRACT_PENDING: ['CONTRACT_SENT', 'CANCELLED'],
  CONTRACT_SENT: ['CONTRACT_SIGNED', 'CANCELLED'],
  CONTRACT_SIGNED: ['APPROVED'],
  APPROVED: ['PAYOUT_SCHEDULED'],
  PAYOUT_SCHEDULED: ['PAYOUT_COMPLETED'],
  PAYOUT_COMPLETED: ['TREATMENT_RELEASED'],
  TREATMENT_RELEASED: [],
  DECLINED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Gerar protocolo único ────────────────────────────────────────────────────
export function generateProtocol(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `BEN-${year}-${random}`;
}

// ── Criar solicitação ────────────────────────────────────────────────────────
export async function createApplication(data: {
  clinicId: string;
  patientId: string;
  categoria: string;
  procedimento: string;
  valorTratamento: number;
  entrada: number;
  createdByUserId: string;
  consentIp?: string;
}): Promise<{ id: string; protocol: string }> {
  const protocol = generateProtocol();
  const valorFinanciado = Math.max(0, data.valorTratamento - data.entrada);

  // Garantir protocolo único
  let finalProtocol = protocol;
  let attempts = 0;
  while (attempts < 5) {
    const existing = await sql`SELECT id FROM applications WHERE protocol = ${finalProtocol}`;
    if (existing.length === 0) break;
    finalProtocol = generateProtocol();
    attempts++;
  }

  const now = new Date();
  const rows = await sql`
    INSERT INTO applications (
      protocol, clinic_id, patient_id, created_by_user_id,
      categoria, procedimento, valor_tratamento, entrada, valor_financiado,
      status, internal_decision, lender_decision,
      created_at, submitted_at, pre_analysis_started_at
    ) VALUES (
      ${finalProtocol}, ${data.clinicId}, ${data.patientId}, ${data.createdByUserId},
      ${data.categoria}, ${data.procedimento}, ${data.valorTratamento}, ${data.entrada}, ${valorFinanciado},
      'SUBMITTED', 'PENDING', 'NOT_SUBMITTED',
      ${now.toISOString()}, ${now.toISOString()}, ${now.toISOString()}
    )
    RETURNING id, protocol
  `;

  const app = rows[0];

  // Registrar consentimento
  await sql`
    INSERT INTO consent_records (application_id, patient_id, user_id, consent_version, ip_address)
    VALUES (${app.id}, ${data.patientId}, ${data.createdByUserId}, 'v1.0', ${data.consentIp || null})
  `;

  // Registrar evento
  await logEvent({
    applicationId: String(app.id),
    actorType: 'USER',
    actorId: data.createdByUserId,
    event: 'APPLICATION_CREATED',
    newStatus: 'SUBMITTED',
  });
  await logEvent({
    applicationId: String(app.id),
    actorType: 'SYSTEM',
    event: 'CONSENT_ACCEPTED',
  });

  // Iniciar pré-análise automaticamente (sandbox/simulado)
  await startPreAnalysis(String(app.id), data.clinicId, valorFinanciado, data.categoria);

  return { id: String(app.id), protocol: finalProtocol };
}

// ── Pré-análise simulada ─────────────────────────────────────────────────────
export async function startPreAnalysis(
  applicationId: string,
  clinicId: string,
  valorFinanciado: number,
  categoria: string
): Promise<void> {
  // Simular tempo de processamento (instantâneo no sandbox)
  await logEvent({
    applicationId,
    actorType: 'SYSTEM',
    event: 'PRE_ANALYSIS_STARTED',
    oldStatus: 'SUBMITTED',
    newStatus: 'PRE_ANALYSIS',
  });

  await sql`
    UPDATE applications
    SET status = 'PRE_ANALYSIS', pre_analysis_started_at = NOW()
    WHERE id = ${applicationId}
  `;

  // Regras básicas de elegibilidade (sandbox)
  const elegivel = valorFinanciado >= 500 && valorFinanciado <= 150000;

  const newStatus: ApplicationStatus = elegivel ? 'PRE_ANALYSIS_APPROVED' : 'PRE_ANALYSIS_DECLINED';

  await sql`
    UPDATE applications
    SET status = ${newStatus}::application_status, pre_analysis_completed_at = NOW()
    WHERE id = ${applicationId}
  `;

  await logEvent({
    applicationId,
    actorType: 'SYSTEM',
    event: 'PRE_ANALYSIS_COMPLETED',
    oldStatus: 'PRE_ANALYSIS',
    newStatus,
  });

  if (elegivel) {
    // Mover para revisão interna
    await sql`
      UPDATE applications SET status = 'INTERNAL_REVIEW' WHERE id = ${applicationId}
    `;
    await logEvent({
      applicationId,
      actorType: 'SYSTEM',
      event: 'MOVED_TO_INTERNAL_REVIEW',
      oldStatus: newStatus,
      newStatus: 'INTERNAL_REVIEW',
    });
  }
}

// ── Transição de status ──────────────────────────────────────────────────────
export async function transitionStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  actor: SessionPayload,
  options?: {
    note?: string;
    declineReason?: string;
    cancelReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const rows = await sql`SELECT status FROM applications WHERE id = ${applicationId}`;
  if (!rows[0]) return { success: false, error: 'Solicitação não encontrada.' };

  const currentStatus = rows[0].status as ApplicationStatus;

  if (!canTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Transição inválida: ${currentStatus} → ${newStatus}`,
    };
  }

  const updateFields: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (options?.declineReason) updateFields.decline_reason = options.declineReason;
  if (options?.cancelReason) updateFields.cancel_reason = options.cancelReason;

  // Timestamps de SLA
  if (newStatus === 'LENDER_ANALYSIS') updateFields.analysis_started_at = new Date().toISOString();
  if (newStatus === 'OFFERS_AVAILABLE') updateFields.proposal_generated_at = new Date().toISOString();
  if (newStatus === 'CONTRACT_SIGNED') updateFields.contract_signed_at = new Date().toISOString();

  await sql`
    UPDATE applications
    SET status = ${newStatus}::application_status, updated_at = NOW()
    WHERE id = ${applicationId}
  `;

  if (options?.declineReason) {
    await sql`UPDATE applications SET decline_reason = ${options.declineReason} WHERE id = ${applicationId}`;
  }
  if (options?.cancelReason) {
    await sql`UPDATE applications SET cancel_reason = ${options.cancelReason} WHERE id = ${applicationId}`;
  }

  await logEvent({
    applicationId,
    actorType: 'USER',
    actorId: actor.userId,
    actorName: actor.name,
    event: `STATUS_CHANGED_TO_${newStatus}`,
    oldStatus: currentStatus,
    newStatus,
    metadata: options?.note ? { note: options.note } : undefined,
  });

  return { success: true };
}

// ── Decisão interna Benavera ─────────────────────────────────────────────────
export async function setInternalDecision(
  applicationId: string,
  decision: InternalDecision,
  actor: SessionPayload,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  await sql`
    UPDATE applications
    SET
      internal_decision = ${decision}::internal_decision,
      internal_decision_note = ${note || null},
      internal_decision_at = NOW(),
      internal_decision_by = ${actor.userId}
    WHERE id = ${applicationId}
  `;

  await logEvent({
    applicationId,
    actorType: 'USER',
    actorId: actor.userId,
    actorName: actor.name,
    event: 'INTERNAL_DECISION',
    metadata: { decision, note },
  });

  // Se aprovado para continuar, mover para ready
  if (decision === 'APPROVED_TO_PROCEED') {
    await sql`
      UPDATE applications SET status = 'READY_FOR_LENDERS'
      WHERE id = ${applicationId} AND status IN ('INTERNAL_REVIEW', 'PRE_ANALYSIS_APPROVED')
    `;
    await logEvent({
      applicationId,
      actorType: 'SYSTEM',
      event: 'MOVED_TO_READY_FOR_LENDERS',
      newStatus: 'READY_FOR_LENDERS',
    });
  }

  return { success: true };
}

// ── Encaminhar para parceiro ─────────────────────────────────────────────────
export async function submitToPartner(
  applicationId: string,
  partnerId: string,
  actor: SessionPayload
): Promise<{ success: boolean; attemptId?: string; error?: string }> {
  const appRows = await sql`SELECT * FROM applications WHERE id = ${applicationId}`;
  const app = appRows[0];
  if (!app) return { success: false, error: 'Solicitação não encontrada.' };

  // Criar tentativa
  const attemptRows = await sql`
    INSERT INTO funding_attempts (application_id, partner_id, status, valor_solicitado, submitted_at)
    VALUES (${applicationId}, ${partnerId}, 'PENDING', ${app.valor_financiado}, NOW())
    RETURNING id
  `;
  const attemptId = String(attemptRows[0].id);

  // Atualizar status da solicitação
  await sql`
    UPDATE applications SET status = 'SUBMITTED_TO_LENDER', updated_at = NOW()
    WHERE id = ${applicationId}
  `;

  await logEvent({
    applicationId,
    actorType: 'USER',
    actorId: actor.userId,
    actorName: actor.name,
    event: 'PARTNER_SUBMITTED',
    newStatus: 'SUBMITTED_TO_LENDER',
    metadata: { partnerId, attemptId },
  });

  return { success: true, attemptId };
}

// ── Registrar resposta do parceiro ───────────────────────────────────────────
export async function recordPartnerResponse(
  attemptId: string,
  applicationId: string,
  result: {
    status: 'PRE_APPROVED' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'NEEDS_DOCS';
    limiteAprovado?: number;
    prazo?: number;
    taxa?: number;
    cet?: number;
    parcelas?: number;
    valorParcela?: number;
    validade?: string;
    motivo?: string;
    observacao?: string;
  },
  actor: SessionPayload
): Promise<{ success: boolean; error?: string }> {
  const respondedAt = new Date();

  await sql`
    UPDATE funding_attempts
    SET status = ${result.status}, motivo = ${result.motivo || null},
        resposta = ${JSON.stringify(result)}, responded_at = ${respondedAt.toISOString()}
    WHERE id = ${attemptId}
  `;

  // Atualizar status da solicitação
  let newAppStatus: ApplicationStatus = 'LENDER_ANALYSIS';
  if (result.status === 'PRE_APPROVED' || result.status === 'APPROVED') {
    newAppStatus = 'OFFERS_AVAILABLE';
  } else if (result.status === 'REJECTED') {
    newAppStatus = 'DECLINED';
  }

  await sql`
    UPDATE applications
    SET status = ${newAppStatus}::application_status,
        lender_decision = ${result.status === 'APPROVED' ? 'APPROVED' : result.status === 'PRE_APPROVED' ? 'PRE_APPROVED' : result.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}::lender_decision,
        updated_at = NOW()
    WHERE id = ${applicationId}
  `;

  await logEvent({
    applicationId,
    actorType: 'USER',
    actorId: actor.userId,
    actorName: actor.name,
    event: 'PARTNER_RESPONSE_RECEIVED',
    newStatus: newAppStatus,
    metadata: { result, attemptId },
  });

  return { success: true };
}

// ── Criar proposta manualmente ───────────────────────────────────────────────
export async function createProposal(data: {
  applicationId: string;
  partnerId: string;
  valorFinanciado: number;
  entrada: number;
  parcelas: number;
  valorParcela: number;
  taxaMensal?: number;
  cetAnual?: number;
  valorTotal?: number;
  validade?: string;
  urlExterna?: string;
  observacoes?: string;
  createdBy: string;
}): Promise<{ id: string }> {
  const rows = await sql`
    INSERT INTO proposals (
      application_id, partner_id, valor_financiado, entrada, parcelas, valor_parcela,
      taxa_mensal, cet_anual, valor_total, validade, url_externa, observacoes, created_by
    ) VALUES (
      ${data.applicationId}, ${data.partnerId}, ${data.valorFinanciado}, ${data.entrada},
      ${data.parcelas}, ${data.valorParcela}, ${data.taxaMensal || null}, ${data.cetAnual || null},
      ${data.valorTotal || null}, ${data.validade || null}, ${data.urlExterna || null},
      ${data.observacoes || null}, ${data.createdBy}
    )
    RETURNING id
  `;

  // Atualizar status para OFFERS_AVAILABLE
  await sql`
    UPDATE applications
    SET status = 'OFFERS_AVAILABLE', proposal_generated_at = NOW(), updated_at = NOW()
    WHERE id = ${data.applicationId}
  `;

  await logEvent({
    applicationId: data.applicationId,
    actorType: 'USER',
    actorId: data.createdBy,
    event: 'OFFER_GENERATED',
    newStatus: 'OFFERS_AVAILABLE',
    metadata: { proposalId: String(rows[0].id) },
  });

  return { id: String(rows[0].id) };
}

// ── Gerar token de proposta para paciente ────────────────────────────────────
export async function generateProposalToken(
  applicationId: string,
  createdBy: string
): Promise<string> {
  const { randomBytes } = await import('crypto');
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  // Revogar tokens anteriores
  await sql`
    UPDATE proposal_tokens SET revogado = true WHERE application_id = ${applicationId}
  `;

  await sql`
    INSERT INTO proposal_tokens (token, application_id, created_by, expires_at)
    VALUES (${token}, ${applicationId}, ${createdBy}, ${expiresAt.toISOString()})
  `;

  return token;
}

// ── Selecionar proposta (paciente) ───────────────────────────────────────────
export async function selectProposal(
  token: string,
  proposalId: string
): Promise<{ success: boolean; error?: string }> {
  // Validar token
  const tokenRows = await sql`
    SELECT * FROM proposal_tokens
    WHERE token = ${token} AND revogado = false AND expires_at > NOW()
  `;
  if (!tokenRows[0]) return { success: false, error: 'Link inválido ou expirado.' };

  const applicationId = String(tokenRows[0].application_id);

  // Desmarcar propostas anteriores
  await sql`UPDATE proposals SET selecionada = false WHERE application_id = ${applicationId}`;

  // Marcar proposta selecionada
  await sql`
    UPDATE proposals SET selecionada = true, selecionada_at = NOW()
    WHERE id = ${proposalId} AND application_id = ${applicationId}
  `;

  // Avançar status
  await sql`
    UPDATE applications SET status = 'OFFER_SELECTED', updated_at = NOW()
    WHERE id = ${applicationId}
  `;

  // Incrementar acesso
  await sql`UPDATE proposal_tokens SET acessos = acessos + 1 WHERE token = ${token}`;

  await logEvent({
    applicationId,
    actorType: 'PATIENT',
    event: 'OFFER_SELECTED',
    newStatus: 'OFFER_SELECTED',
    metadata: { proposalId, token: token.substring(0, 8) + '...' },
  });

  return { success: true };
}

// ── Log de evento de auditoria ───────────────────────────────────────────────
export async function logEvent(data: {
  applicationId: string;
  actorType: 'USER' | 'SYSTEM' | 'PATIENT';
  actorId?: string;
  actorName?: string;
  event: string;
  oldStatus?: string;
  newStatus?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO event_logs (
        application_id, actor_id, actor_type, actor_name,
        event, old_status, new_status, metadata, ip_address
      ) VALUES (
        ${data.applicationId}, ${data.actorId || null}, ${data.actorType},
        ${data.actorName || null}, ${data.event}, ${data.oldStatus || null},
        ${data.newStatus || null}, ${data.metadata ? JSON.stringify(data.metadata) : null},
        ${data.ip || null}
      )
    `;
  } catch (err) {
    // Logs nunca devem quebrar o fluxo principal
    console.error('[EventLog] Erro ao registrar evento:', err);
  }
}

// ── Notificações ─────────────────────────────────────────────────────────────
export async function createNotification(data: {
  userId: string;
  clinicId?: string;
  tipo: string;
  titulo: string;
  mensagem?: string;
  link?: string;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO notifications (user_id, clinic_id, tipo, titulo, mensagem, link)
      VALUES (${data.userId}, ${data.clinicId || null}, ${data.tipo}, ${data.titulo}, ${data.mensagem || null}, ${data.link || null})
    `;
  } catch (err) {
    console.error('[Notification] Erro:', err);
  }
}

// ── Calcular taxas Benavera ───────────────────────────────────────────────────
export async function calculateFees(clinicId: string, valorFinanciado: number, partnerId?: string) {
  const feeRows = await sql`SELECT * FROM fee_configs WHERE clinic_id = ${clinicId}`;
  const feeConfig = feeRows[0];
  const feePercent = feeConfig?.clinic_transaction_fee_percent
    ? Number(feeConfig.clinic_transaction_fee_percent)
    : 0.0249;

  let partnerCommissionPercent = 0.02;
  if (partnerId) {
    const partnerRows = await sql`SELECT comissao_benavera_percent FROM financial_partners WHERE id = ${partnerId}`;
    if (partnerRows[0]) partnerCommissionPercent = Number(partnerRows[0].comissao_benavera_percent);
  }

  const clinicFee = valorFinanciado * feePercent;
  const partnerCommission = valorFinanciado * partnerCommissionPercent;
  const totalBenaveraRevenue = clinicFee + partnerCommission;
  const effectiveTakeRate = valorFinanciado > 0 ? totalBenaveraRevenue / valorFinanciado : 0;
  const valorLiquidoClinica = valorFinanciado - clinicFee;

  return {
    clinicFee: Math.round(clinicFee * 100) / 100,
    partnerCommission: Math.round(partnerCommission * 100) / 100,
    totalBenaveraRevenue: Math.round(totalBenaveraRevenue * 100) / 100,
    effectiveTakeRate: Math.round(effectiveTakeRate * 10000) / 10000,
    valorLiquidoClinica: Math.round(valorLiquidoClinica * 100) / 100,
    feePercent,
    partnerCommissionPercent,
  };
}
