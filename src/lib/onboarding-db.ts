// lib/onboarding-db.ts
// Serviço de banco de dados para o módulo de credenciamento de clínicas

import { sql } from './benavera-db';
import type { ClinicOnboarding, OnboardingStatus, OnboardingDocument, DocumentReviewStatus } from './benavera-db';
import { logAuditEvent } from './onboarding-audit';

// ── Campos críticos que geram registro de auditoria de alteração ──────────────
const CRITICAL_FIELDS = new Set([
  'cnpj', 'contact_cpf', 'legal_name', 'legal_rep_cpf',
  'bank_account', 'bank_agency', 'bank_holder_document',
  'bank_code', 'bank_account_type', 'bank_pix_key',
]);

// ── Tipos de documentos obrigatórios ─────────────────────────────────────────
export const REQUIRED_DOCUMENTS = [
  { type: 'contrato_social', label: 'Contrato Social / Ato Constitutivo', required: true },
  { type: 'doc_representante', label: 'Documento do Representante Legal (CNH ou RG)', required: true },
  { type: 'doc_resp_tecnico', label: 'Documento / Registro do Responsável Técnico', required: true },
  { type: 'comprovante_bancario', label: 'Comprovante de Titularidade Bancária', required: true },
  { type: 'licenca_sanitaria', label: 'Licença ou Alvará Sanitário', required: false },
  { type: 'alvara_funcionamento', label: 'Alvará de Funcionamento', required: false },
  { type: 'procuracao', label: 'Procuração (quando representante não tem poderes)', required: false },
  { type: 'outros', label: 'Outros Documentos', required: false },
];

// ── Máquina de estados ────────────────────────────────────────────────────────
const VALID_STATUS_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  DRAFT: ['PRE_REGISTERED'],
  PRE_REGISTERED: ['INVITE_SENT', 'IN_PROGRESS', 'SUBMITTED', 'REVOKED'],
  INVITE_SENT: ['INVITE_OPENED', 'IN_PROGRESS', 'SUBMITTED', 'REVOKED', 'EXPIRED'],
  INVITE_OPENED: ['IN_PROGRESS', 'SUBMITTED', 'REVOKED'],
  IN_PROGRESS: ['PENDING_DOCUMENTS', 'SUBMITTED', 'REVOKED'],
  PENDING_DOCUMENTS: ['IN_PROGRESS', 'SUBMITTED', 'REVOKED'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'],
  CORRECTION_REQUIRED: ['UNDER_REVIEW', 'SUBMITTED', 'REVOKED'],
  APPROVED: ['CONTRACT_PENDING', 'ACTIVE'],
  CONTRACT_PENDING: ['CONTRACT_SIGNED'],
  CONTRACT_SIGNED: ['ACTIVE'],
  ACTIVE: ['SUSPENDED'],
  REJECTED: [],
  EXPIRED: [],
  REVOKED: [],
  SUSPENDED: ['ACTIVE'],
};

export function canTransitionOnboarding(from: OnboardingStatus, to: OnboardingStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Criar pré-cadastro ─────────────────────────────────────────────────────────
export async function createOnboarding(params: {
  tradeName: string;
  legalName?: string;
  cnpj?: string;
  contactName: string;
  contactCpf?: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  specialty?: string;
  averageTicket?: string;
  internalNotes?: string;
  createdBy: string;
  assignedTo?: string;
}): Promise<{ id: string }> {
  const rows = await sql`
    INSERT INTO clinic_onboardings (
      trade_name, legal_name, cnpj, contact_name, contact_cpf,
      phone, email, city, state, specialty, average_ticket,
      internal_notes, created_by, assigned_to, status
    ) VALUES (
      ${params.tradeName}, ${params.legalName || null}, ${params.cnpj || null},
      ${params.contactName}, ${params.contactCpf || null},
      ${params.phone}, ${params.email.toLowerCase().trim()},
      ${params.city}, ${params.state}, ${params.specialty || null},
      ${params.averageTicket || null}, ${params.internalNotes || null},
      ${params.createdBy}, ${params.assignedTo || null}, 'PRE_REGISTERED'
    )
    RETURNING id
  `;

  const id = String(rows[0].id);

  await logAuditEvent({
    onboardingId: id,
    actorType: 'admin',
    actorId: params.createdBy,
    action: 'onboarding_created',
    entityType: 'onboarding',
    entityId: id,
    metadata: { trade_name: params.tradeName, city: params.city, state: params.state },
  });

  // Criar slots de documentos obrigatórios
  for (const doc of REQUIRED_DOCUMENTS) {
    await sql`
      INSERT INTO onboarding_documents (onboarding_id, document_type, document_label, is_required)
      VALUES (${id}, ${doc.type}, ${doc.label}, ${doc.required})
    `;
  }

  return { id };
}

// ── Buscar onboarding por ID ──────────────────────────────────────────────────
export async function getOnboardingById(id: string): Promise<ClinicOnboarding | null> {
  const rows = await sql`
    SELECT o.*,
           u1.name as assigned_to_name,
           u2.name as created_by_name,
           (
             SELECT expires_at FROM onboarding_invites
             WHERE onboarding_id = o.id AND revoked_at IS NULL AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1
           ) as active_invite_expires_at
    FROM clinic_onboardings o
    LEFT JOIN users u1 ON u1.id = o.assigned_to
    LEFT JOIN users u2 ON u2.id = o.created_by
    WHERE o.id = ${id}
    LIMIT 1
  `;

  if (!rows[0]) return null;
  return mapOnboardingRow(rows[0]);
}

// ── Listar onboardings com filtros ───────────────────────────────────────────
export async function getOnboardings(options?: {
  status?: OnboardingStatus | 'all';
  search?: string;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ClinicOnboarding[]; total: number }> {
  const status = options?.status && options.status !== 'all' ? options.status : null;
  const search = options?.search ? `%${options.search}%` : null;
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let rows;
  let countRows;

  if (status && search) {
    rows = await sql`
      SELECT o.*,
             u1.name as assigned_to_name,
             u2.name as created_by_name
      FROM clinic_onboardings o
      LEFT JOIN users u1 ON u1.id = o.assigned_to
      LEFT JOIN users u2 ON u2.id = o.created_by
      WHERE o.status = ${status}
        AND (o.trade_name ILIKE ${search} OR o.cnpj ILIKE ${search}
          OR o.contact_name ILIKE ${search} OR o.email ILIKE ${search}
          OR o.phone ILIKE ${search})
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`
      SELECT COUNT(*) as total FROM clinic_onboardings o
      WHERE o.status = ${status}
        AND (o.trade_name ILIKE ${search} OR o.cnpj ILIKE ${search}
          OR o.contact_name ILIKE ${search} OR o.email ILIKE ${search}
          OR o.phone ILIKE ${search})
    `;
  } else if (status) {
    rows = await sql`
      SELECT o.*, u1.name as assigned_to_name, u2.name as created_by_name
      FROM clinic_onboardings o
      LEFT JOIN users u1 ON u1.id = o.assigned_to
      LEFT JOIN users u2 ON u2.id = o.created_by
      WHERE o.status = ${status}
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`SELECT COUNT(*) as total FROM clinic_onboardings WHERE status = ${status}`;
  } else if (search) {
    rows = await sql`
      SELECT o.*, u1.name as assigned_to_name, u2.name as created_by_name
      FROM clinic_onboardings o
      LEFT JOIN users u1 ON u1.id = o.assigned_to
      LEFT JOIN users u2 ON u2.id = o.created_by
      WHERE o.trade_name ILIKE ${search} OR o.cnpj ILIKE ${search}
        OR o.contact_name ILIKE ${search} OR o.email ILIKE ${search}
        OR o.phone ILIKE ${search}
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`
      SELECT COUNT(*) as total FROM clinic_onboardings
      WHERE trade_name ILIKE ${search} OR cnpj ILIKE ${search}
        OR contact_name ILIKE ${search} OR email ILIKE ${search}
        OR phone ILIKE ${search}
    `;
  } else {
    rows = await sql`
      SELECT o.*, u1.name as assigned_to_name, u2.name as created_by_name
      FROM clinic_onboardings o
      LEFT JOIN users u1 ON u1.id = o.assigned_to
      LEFT JOIN users u2 ON u2.id = o.created_by
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    countRows = await sql`SELECT COUNT(*) as total FROM clinic_onboardings`;
  }

  return {
    items: rows.map(mapOnboardingRow),
    total: Number(countRows[0]?.total || 0),
  };
}

// ── Atualizar status ─────────────────────────────────────────────────────────
export async function updateOnboardingStatus(params: {
  id: string;
  newStatus: OnboardingStatus;
  actorId: string;
  actorName: string;
  actorRole: string;
  reason?: string;
  message?: string;
  ip?: string;
}): Promise<{ success: boolean; error?: string }> {
  const current = await getOnboardingById(params.id);
  if (!current) return { success: false, error: 'Credenciamento não encontrado.' };

  if (!canTransitionOnboarding(current.status, params.newStatus)) {
    return {
      success: false,
      error: `Transição inválida: ${current.status} → ${params.newStatus}`,
    };
  }

  if (params.newStatus === 'INVITE_SENT') {
    await sql`
      UPDATE clinic_onboardings
      SET status = ${params.newStatus},
          invite_sent_at = NOW(),
          rejection_reason = ${params.reason || null},
          rejection_message = ${params.message || null},
          updated_at = NOW()
      WHERE id = ${params.id}
    `;
  } else if (params.newStatus === 'SUBMITTED') {
    await sql`
      UPDATE clinic_onboardings
      SET status = ${params.newStatus},
          submitted_at = NOW(),
          rejection_reason = ${params.reason || null},
          rejection_message = ${params.message || null},
          updated_at = NOW()
      WHERE id = ${params.id}
    `;
  } else if (params.newStatus === 'APPROVED') {
    await sql`
      UPDATE clinic_onboardings
      SET status = ${params.newStatus},
          approved_at = NOW(),
          rejection_reason = ${params.reason || null},
          rejection_message = ${params.message || null},
          updated_at = NOW()
      WHERE id = ${params.id}
    `;
  } else if (params.newStatus === 'ACTIVE') {
    await sql`
      UPDATE clinic_onboardings
      SET status = ${params.newStatus},
          activated_at = NOW(),
          rejection_reason = ${params.reason || null},
          rejection_message = ${params.message || null},
          updated_at = NOW()
      WHERE id = ${params.id}
    `;
  } else if (params.newStatus === 'REJECTED') {
    await sql`
      UPDATE clinic_onboardings
      SET status = ${params.newStatus},
          rejected_at = NOW(),
          rejection_reason = ${params.reason || null},
          rejection_message = ${params.message || null},
          updated_at = NOW()
      WHERE id = ${params.id}
    `;
  } else {
    await sql`
      UPDATE clinic_onboardings
      SET status = ${params.newStatus},
          rejection_reason = ${params.reason || null},
          rejection_message = ${params.message || null},
          updated_at = NOW()
      WHERE id = ${params.id}
    `;
  }

  await logAuditEvent({
    onboardingId: params.id,
    actorType: 'admin',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: 'onboarding_status_changed',
    entityType: 'onboarding',
    entityId: params.id,
    ip: params.ip,
    metadata: {
      old_status: current.status,
      new_status: params.newStatus,
      reason: params.reason,
    },
  });

  return { success: true };
}

// ── Atualizar dados (com rastreamento de campos críticos) ─────────────────────
export async function updateOnboardingData(params: {
  id: string;
  data: Record<string, unknown>;
  sessionToken?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  // Buscar valores atuais para comparação de campos críticos
  const current = await getOnboardingById(params.id);
  if (!current) throw new Error('Credenciamento não encontrado.');

  // Registrar alterações em campos críticos
  for (const [field, newValue] of Object.entries(params.data)) {
    if (CRITICAL_FIELDS.has(field) && newValue !== undefined) {
      const oldValue = current[field];
      if (oldValue !== newValue && newValue !== null && newValue !== '') {
        await sql`
          INSERT INTO onboarding_field_changes (
            onboarding_id, field_name, old_value, new_value,
            changed_by_ip, changed_by_ua, session_token, requires_review
          ) VALUES (
            ${params.id}, ${field},
            ${oldValue ? String(oldValue) : null},
            ${String(newValue)},
            ${params.ip || null}, ${params.userAgent || null},
            ${params.sessionToken || null}, TRUE
          )
        `;

        await logAuditEvent({
          onboardingId: params.id,
          actorType: 'clinic',
          action: 'field_changed_critical',
          entityType: 'onboarding',
          entityId: params.id,
          ip: params.ip,
          userAgent: params.userAgent,
          metadata: {
            field,
            // Mascaramos os valores no log de auditoria
            old_value_masked: oldValue ? '***' : null,
            new_value_masked: '***',
          },
        });
      }
    }
  }

  // Construir SET dinamicamente (apenas campos permitidos)
  const allowedFields = [
    'legal_name', 'trade_name_confirmed', 'cnpj', 'address_cep', 'address_street',
    'address_number', 'address_complement', 'address_neighborhood', 'address_city',
    'address_state', 'phone_secondary', 'email_admin', 'email_financial', 'website',
    'municipal_registration', 'state_registration',
    'legal_rep_name', 'legal_rep_cpf', 'legal_rep_role', 'legal_rep_email', 'legal_rep_phone',
    'legal_rep_has_powers', 'authorized_rep_name', 'authorized_rep_cpf', 'authorized_rep_role',
    'tech_rep_name', 'tech_rep_cpf', 'tech_rep_council', 'tech_rep_council_number',
    'tech_rep_council_state', 'cnes', 'sanitary_license_number', 'sanitary_license_expiry',
    'operating_permit',
    'bank_name', 'bank_code', 'bank_agency', 'bank_account', 'bank_account_type',
    'bank_holder_name', 'bank_holder_document', 'bank_pix_key',
    'contact_name', 'contact_cpf', 'phone', 'email', 'city', 'state',
    'specialty', 'average_ticket', 'progress_percent',
    'privacy_policy_version', 'terms_version',
  ];

  const updates = Object.entries(params.data).filter(([key]) => allowedFields.includes(key));
  if (updates.length === 0) return;

  // Verificar divergência bancária
  const hasNewBankData = updates.some(([k]) => k.startsWith('bank_'));
  if (hasNewBankData) {
    const bankHolder = updates.find(([k]) => k === 'bank_holder_document')?.[1];
    const cnpj = updates.find(([k]) => k === 'cnpj')?.[1] || current.cnpj;
    if (bankHolder && cnpj && String(bankHolder).replace(/\D/g, '') !== String(cnpj).replace(/\D/g, '')) {
      await sql`
        UPDATE clinic_onboardings SET bank_titularity_divergence = TRUE WHERE id = ${params.id}
      `;
    }
  }

  // UPDATE com campos dinâmicos (field é restrito à lista allowedFields)
  for (const [field, value] of updates) {
    await (sql as any)(
      `UPDATE clinic_onboardings SET ${field} = $1, updated_at = NOW() WHERE id = $2`,
      [value as string | null, params.id]
    );
  }
}

// ── Buscar onboarding por token (para a clínica) ─────────────────────────────
export async function getOnboardingByToken(
  onboardingId: string
): Promise<Partial<ClinicOnboarding> | null> {
  const rows = await sql`
    SELECT
      id, trade_name, legal_name, cnpj, contact_name, contact_cpf,
      phone, email, city, state, specialty, average_ticket,
      trade_name_confirmed, address_cep, address_street, address_number,
      address_complement, address_neighborhood, address_city, address_state,
      phone_secondary, email_admin, email_financial, website,
      municipal_registration, state_registration,
      legal_rep_name, legal_rep_cpf, legal_rep_role, legal_rep_email,
      legal_rep_phone, legal_rep_has_powers, authorized_rep_name,
      authorized_rep_cpf, authorized_rep_role,
      tech_rep_name, tech_rep_cpf, tech_rep_council, tech_rep_council_number,
      tech_rep_council_state, cnes, sanitary_license_number,
      sanitary_license_expiry, operating_permit,
      bank_name, bank_code, bank_agency, bank_account, bank_account_type,
      bank_holder_name, bank_holder_document, bank_pix_key,
      status, progress_percent, submitted_at,
      privacy_policy_version, terms_version
    FROM clinic_onboardings
    WHERE id = ${onboardingId}
    LIMIT 1
  `;

  if (!rows[0]) return null;
  return mapOnboardingRow(rows[0]);
}

// ── Documentos ────────────────────────────────────────────────────────────────
export async function getOnboardingDocuments(onboardingId: string): Promise<OnboardingDocument[]> {
  const rows = await sql`
    SELECT d.*, u.name as reviewer_name
    FROM onboarding_documents d
    LEFT JOIN users u ON u.id = d.reviewed_by
    WHERE d.onboarding_id = ${onboardingId}
    ORDER BY d.is_required DESC, d.document_type ASC
  `;

  return rows.map(r => ({
    id: String(r.id),
    onboarding_id: String(r.onboarding_id),
    document_type: String(r.document_type),
    document_label: String(r.document_label),
    is_required: Boolean(r.is_required),
    current_version: Number(r.current_version),
    storage_key: r.storage_key ? String(r.storage_key) : null,
    original_filename: r.original_filename ? String(r.original_filename) : null,
    mime_type: r.mime_type ? String(r.mime_type) : null,
    size_bytes: r.size_bytes ? Number(r.size_bytes) : null,
    sha256: r.sha256 ? String(r.sha256) : null,
    scan_status: (r.scan_status as 'PENDING' | 'CLEAN' | 'THREAT_DETECTED' | 'ERROR') || 'PENDING',
    review_status: (r.review_status as DocumentReviewStatus) || 'PENDING',
    reviewed_by: r.reviewed_by ? String(r.reviewed_by) : null,
    reviewed_at: r.reviewed_at ? String(r.reviewed_at) : null,
    review_note: r.review_note ? String(r.review_note) : null,
    correction_message: r.correction_message ? String(r.correction_message) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }));
}

// ── Salvar documento (ou nova versão) ────────────────────────────────────────
export async function saveDocument(params: {
  documentId: string;
  onboardingId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  // Buscar versão atual
  const docRows = await sql`
    SELECT current_version FROM onboarding_documents WHERE id = ${params.documentId}
  `;
  if (!docRows[0]) throw new Error('Documento não encontrado.');

  const newVersion = Number(docRows[0].current_version) + 1;

  // Salvar versão anterior
  const prevRows = await sql`
    SELECT storage_key, original_filename, mime_type, size_bytes, sha256
    FROM onboarding_documents WHERE id = ${params.documentId}
  `;

  if (prevRows[0]?.storage_key) {
    await sql`
      INSERT INTO onboarding_document_versions (
        document_id, version, storage_key, original_filename,
        mime_type, size_bytes, sha256, superseded_at, uploaded_by_ip, uploaded_by_ua
      )
      SELECT ${params.documentId}, ${Number(docRows[0].current_version)},
             storage_key, original_filename, mime_type, size_bytes, sha256,
             NOW(), ${params.ip || null}, ${params.userAgent || null}
      FROM onboarding_documents
      WHERE id = ${params.documentId}
    `;
  }

  // Atualizar documento principal
  await sql`
    UPDATE onboarding_documents
    SET
      current_version = ${newVersion},
      storage_key = ${params.storageKey},
      original_filename = ${params.originalFilename},
      mime_type = ${params.mimeType},
      size_bytes = ${params.sizeBytes},
      sha256 = ${params.sha256},
      scan_status = 'PENDING',
      review_status = 'PENDING',
      reviewed_by = NULL,
      reviewed_at = NULL,
      review_note = NULL,
      correction_message = NULL,
      updated_at = NOW()
    WHERE id = ${params.documentId}
  `;

  const isReplace = newVersion > 2;
  await logAuditEvent({
    onboardingId: params.onboardingId,
    actorType: 'clinic',
    action: isReplace ? 'document_replaced' : 'document_uploaded',
    entityType: 'document',
    entityId: params.documentId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: {
      original_filename: params.originalFilename,
      size_bytes: params.sizeBytes,
      version: newVersion,
    },
  });
}

// ── Revisar documento (admin) ─────────────────────────────────────────────────
export async function reviewDocument(params: {
  documentId: string;
  onboardingId: string;
  reviewStatus: DocumentReviewStatus;
  reviewNote?: string;
  correctionMessage?: string;
  reviewedBy: string;
  reviewerName: string;
  reviewerRole: string;
  ip?: string;
}): Promise<void> {
  await sql`
    UPDATE onboarding_documents
    SET
      review_status = ${params.reviewStatus},
      review_note = ${params.reviewNote || null},
      correction_message = ${params.correctionMessage || null},
      reviewed_by = ${params.reviewedBy},
      reviewed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${params.documentId}
  `;

  const action =
    params.reviewStatus === 'VALIDATED' ? 'document_validated' :
    params.reviewStatus === 'CORRECTION_REQUESTED' ? 'document_correction_requested' :
    'document_rejected';

  await logAuditEvent({
    onboardingId: params.onboardingId,
    actorType: 'admin',
    actorId: params.reviewedBy,
    actorName: params.reviewerName,
    actorRole: params.reviewerRole,
    action,
    entityType: 'document',
    entityId: params.documentId,
    ip: params.ip,
    metadata: { review_status: params.reviewStatus },
  });
}

// ── Calcular progresso ────────────────────────────────────────────────────────
export async function calculateProgress(onboardingId: string): Promise<number> {
  const data = await getOnboardingById(onboardingId);
  if (!data) return 0;

  let score = 0;
  let total = 0;

  const check = (value: unknown) => {
    total++;
    if (value !== null && value !== undefined && value !== '') score++;
  };

  // Etapa 1: Dados da clínica
  check(data.trade_name); check(data.cnpj); check(data.legal_name);
  check(data.city); check(data.state); check(data.email);
  check(data.address_street); check(data.address_cep);

  // Etapa 2: Responsável
  check(data.legal_rep_name); check(data.legal_rep_cpf);
  check(data.legal_rep_role); check(data.legal_rep_email);

  // Etapa 3: Responsável técnico
  check(data.tech_rep_name); check(data.tech_rep_council);
  check(data.tech_rep_council_number);

  // Etapa 4: Bancário
  check(data.bank_name); check(data.bank_agency);
  check(data.bank_account); check(data.bank_holder_name);

  const percent = Math.round((score / total) * 100);

  await sql`
    UPDATE clinic_onboardings SET progress_percent = ${percent}, updated_at = NOW()
    WHERE id = ${onboardingId}
  `;

  return percent;
}

// ── Verificar se pode aprovar ─────────────────────────────────────────────────
export async function canApproveOnboarding(onboardingId: string): Promise<{
  canApprove: boolean;
  pendingItems: string[];
}> {
  const docs = await getOnboardingDocuments(onboardingId);
  const pendingItems: string[] = [];

  for (const doc of docs) {
    if (doc.is_required) {
      if (!doc.storage_key) {
        pendingItems.push(`Documento obrigatório pendente de envio: ${doc.document_label}`);
      }
    }
  }

  return { canApprove: pendingItems.length === 0, pendingItems };
}

// ── Registrar aceite de declaração ───────────────────────────────────────────
export async function recordAcceptance(params: {
  onboardingId: string;
  acceptanceType: string;
  documentVersion: string;
  ip?: string;
  userAgent?: string;
  sessionToken?: string;
}): Promise<void> {
  await sql`
    INSERT INTO onboarding_acceptances (
      onboarding_id, acceptance_type, document_version,
      ip, user_agent, session_token
    ) VALUES (
      ${params.onboardingId}, ${params.acceptanceType}, ${params.documentVersion},
      ${params.ip || null}, ${params.userAgent || null}, ${params.sessionToken || null}
    )
    ON CONFLICT (onboarding_id, acceptance_type)
    DO UPDATE SET
      document_version = EXCLUDED.document_version,
      accepted_at = NOW(),
      ip = EXCLUDED.ip,
      user_agent = EXCLUDED.user_agent
  `;
}

// ── Mapper ────────────────────────────────────────────────────────────────────
function mapOnboardingRow(r: Record<string, unknown>): ClinicOnboarding {
  return {
    id: String(r.id),
    trade_name: String(r.trade_name),
    legal_name: r.legal_name ? String(r.legal_name) : null,
    cnpj: r.cnpj ? String(r.cnpj) : null,
    contact_name: String(r.contact_name),
    contact_cpf: r.contact_cpf ? String(r.contact_cpf) : null,
    phone: String(r.phone),
    email: String(r.email),
    city: String(r.city),
    state: String(r.state),
    specialty: r.specialty ? String(r.specialty) : null,
    average_ticket: r.average_ticket ? String(r.average_ticket) : null,
    internal_notes: r.internal_notes ? String(r.internal_notes) : null,
    status: (r.status as OnboardingStatus) || 'DRAFT',
    progress_percent: Number(r.progress_percent || 0),
    assigned_to: r.assigned_to ? String(r.assigned_to) : null,
    created_by: String(r.created_by),
    clinic_id: r.clinic_id ? String(r.clinic_id) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    invite_sent_at: r.invite_sent_at ? String(r.invite_sent_at) : null,
    submitted_at: r.submitted_at ? String(r.submitted_at) : null,
    approved_at: r.approved_at ? String(r.approved_at) : null,
    activated_at: r.activated_at ? String(r.activated_at) : null,
    rejected_at: r.rejected_at ? String(r.rejected_at) : null,
    rejection_reason: r.rejection_reason ? String(r.rejection_reason) : null,
    assigned_to_name: r.assigned_to_name ? String(r.assigned_to_name) : undefined,
    created_by_name: r.created_by_name ? String(r.created_by_name) : undefined,
    active_invite_expires_at: r.active_invite_expires_at ? String(r.active_invite_expires_at) : null,
    bank_titularity_divergence: Boolean(r.bank_titularity_divergence),
    legal_rep_has_powers: r.legal_rep_has_powers !== null && r.legal_rep_has_powers !== undefined
      ? Boolean(r.legal_rep_has_powers) : null,
  } as ClinicOnboarding & Record<string, unknown>;
}
