import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sqlInstance: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  const rawUrl = process.env.DATABASE_URL || '';
  const url = rawUrl.replace(/^["']|["']$/g, '').trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL não está configurada. Configure a variável de ambiente DATABASE_URL no painel da sua hospedagem (ex: Vercel Settings -> Environment Variables).'
    );
  }
  if (!_sqlInstance) {
    _sqlInstance = neon<false, false>(url);
  }
  return _sqlInstance;
}

export const sql: NeonQueryFunction<false, false> = ((...args: [any, ...any[]]) => {
  const client = getSql();
  return (client as any)(...args);
}) as NeonQueryFunction<false, false>;

// Tipos base
export type UserRole =
  | 'CLINIC_ADMIN'
  | 'CLINIC_ATTENDANT'
  | 'CLINIC_FINANCIAL'
  | 'BENAVERA_ANALYST'
  | 'BENAVERA_ADMIN'
  | 'BENAVERA_COMPLIANCE'
  | 'BENAVERA_COMERCIAL'
  | 'BENAVERA_FINANCEIRO'
  | 'BENAVERA_SUPORTE';

export type OnboardingStatus =
  | 'DRAFT'
  | 'PRE_REGISTERED'
  | 'INVITE_SENT'
  | 'INVITE_OPENED'
  | 'IN_PROGRESS'
  | 'PENDING_DOCUMENTS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'CONTRACT_PENDING'
  | 'CONTRACT_SIGNED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'SUSPENDED';

export type DocumentReviewStatus = 'PENDING' | 'VALIDATED' | 'CORRECTION_REQUESTED' | 'REJECTED';
export type ScanStatus = 'PENDING' | 'CLEAN' | 'THREAT_DETECTED' | 'ERROR';

export interface ClinicOnboarding {
  // ── Core (pré-cadastro) ─────────────────────────────────
  id: string;
  trade_name: string;
  legal_name: string | null;
  cnpj: string | null;
  contact_name: string;
  contact_cpf: string | null;
  phone: string;
  email: string;
  city: string;
  state: string;
  specialty: string | null;
  average_ticket: string | null;
  internal_notes: string | null;
  trade_name_confirmed: string | null;
  municipal_registration: string | null;
  state_registration: string | null;
  // ── Endereço ────────────────────────────────────────────
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  phone_secondary: string | null;
  email_admin: string | null;
  email_financial: string | null;
  website: string | null;
  // ── Responsável legal ───────────────────────────────────
  legal_rep_name: string | null;
  legal_rep_cpf: string | null;
  legal_rep_role: string | null;
  legal_rep_email: string | null;
  legal_rep_phone: string | null;
  legal_rep_has_powers: boolean | null;
  authorized_rep_name: string | null;
  authorized_rep_cpf: string | null;
  authorized_rep_role: string | null;
  // ── Responsável técnico ─────────────────────────────────
  tech_rep_name: string | null;
  tech_rep_cpf: string | null;
  tech_rep_council: string | null;
  tech_rep_council_number: string | null;
  tech_rep_council_state: string | null;
  cnes: string | null;
  sanitary_license_number: string | null;
  sanitary_license_expiry: string | null;
  operating_permit: string | null;
  // ── Dados bancários ─────────────────────────────────────
  bank_name: string | null;
  bank_code: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  bank_holder_name: string | null;
  bank_holder_document: string | null;
  bank_pix_key: string | null;
  bank_titularity_divergence: boolean;
  // ── Status ──────────────────────────────────────────────
  status: OnboardingStatus;
  progress_percent: number;
  assigned_to: string | null;
  created_by: string;
  clinic_id: string | null;
  // ── Timestamps ──────────────────────────────────────────
  created_at: string;
  updated_at: string;
  invite_sent_at: string | null;
  invite_opened_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  activated_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_message: string | null;
  privacy_policy_version: string | null;
  terms_version: string | null;
  // ── Joined ──────────────────────────────────────────────
  assigned_to_name?: string;
  created_by_name?: string;
  active_invite_expires_at?: string | null;
  // ── Index signature para acesso dinâmico ────────────────
  [key: string]: unknown;
}

export interface OnboardingDocument {
  id: string;
  onboarding_id: string;
  document_type: string;
  document_label: string;
  is_required: boolean;
  current_version: number;
  storage_key: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  scan_status: ScanStatus;
  review_status: DocumentReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  correction_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingAuditLog {
  id: string;
  onboarding_id: string | null;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PRE_ANALYSIS'
  | 'PRE_ANALYSIS_APPROVED'
  | 'PRE_ANALYSIS_REVIEW'
  | 'PRE_ANALYSIS_DECLINED'
  | 'AWAITING_PATIENT'
  | 'AWAITING_CLINIC'
  | 'AWAITING_DOCUMENTS'
  | 'INTERNAL_REVIEW'
  | 'READY_FOR_LENDERS'
  | 'SUBMITTED_TO_LENDER'
  | 'LENDER_ANALYSIS'
  | 'PRE_APPROVED'
  | 'OFFERS_AVAILABLE'
  | 'OFFER_SELECTED'
  | 'CONTRACT_PENDING'
  | 'CONTRACT_SENT'
  | 'CONTRACT_SIGNED'
  | 'APPROVED'
  | 'PAYOUT_SCHEDULED'
  | 'PAYOUT_COMPLETED'
  | 'TREATMENT_RELEASED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export type InternalDecision =
  | 'PENDING'
  | 'APPROVED_TO_PROCEED'
  | 'NEEDS_INFORMATION'
  | 'REJECTED'
  | 'CANCELLED';

export type LenderDecision =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'PRE_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export type PayoutStatus =
  | 'AWAITING_CONTRACT'
  | 'AWAITING_DISBURSEMENT'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'PAID'
  | 'DIVERGENCE'
  | 'CANCELLED';

export interface User {
  id: string;
  clinic_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Clinic {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  responsavel: string | null;
  cidade: string | null;
  estado: string | null;
  especialidade: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  nome: string;
  cpf: string;
  data_nascimento: string | null;
  celular: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  protocol: string;
  clinic_id: string;
  patient_id: string | null;
  created_by_user_id: string | null;
  assigned_analyst_id: string | null;
  categoria: string | null;
  procedimento: string | null;
  valor_tratamento: number;
  entrada: number;
  valor_financiado: number;
  status: ApplicationStatus;
  internal_decision: InternalDecision;
  lender_decision: LenderDecision;
  internal_decision_note: string | null;
  decline_reason: string | null;
  cancel_reason: string | null;
  contract_url: string | null;
  contract_status: string | null;
  contract_signed_at: string | null;
  created_at: string;
  submitted_at: string | null;
  pre_analysis_started_at: string | null;
  pre_analysis_completed_at: string | null;
  proposal_generated_at: string | null;
  updated_at: string;
  // Joined fields
  patient_nome?: string;
  patient_cpf?: string;
  patient_celular?: string;
  clinic_nome?: string;
  analyst_name?: string;
  creator_name?: string;
}

export interface Proposal {
  id: string;
  application_id: string;
  partner_id: string;
  valor_financiado: number;
  entrada: number;
  parcelas: number;
  valor_parcela: number;
  taxa_mensal: number | null;
  cet_anual: number | null;
  valor_total: number | null;
  validade: string | null;
  url_externa: string | null;
  observacoes: string | null;
  ativa: boolean;
  selecionada: boolean;
  selecionada_at: string | null;
  created_at: string;
  partner_nome?: string;
}

export interface FinancialPartner {
  id: string;
  nome: string;
  nome_legal: string | null;
  cnpj: string | null;
  ativo: boolean;
  prioridade: number;
  ticket_minimo: number;
  ticket_maximo: number;
  prazo_maximo: number;
  comissao_benavera_percent: number;
  modo: string;
  integration_active: boolean;
  created_at: string;
}

export interface EventLog {
  id: string;
  application_id: string;
  actor_id: string | null;
  actor_type: string | null;
  actor_name: string | null;
  event: string;
  old_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  application_id: string;
  clinic_id: string;
  partner_id: string | null;
  valor_tratamento: number | null;
  valor_financiado: number | null;
  taxa_benavera: number | null;
  comissao_parceiro: number | null;
  valor_liquido_clinica: number | null;
  status: PayoutStatus;
  data_prevista: string | null;
  data_paga: string | null;
  notas: string | null;
  created_at: string;
  // Joined
  protocol?: string;
  patient_nome?: string;
  clinic_nome?: string;
  partner_nome?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  clinic_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  link: string | null;
  created_at: string;
}
