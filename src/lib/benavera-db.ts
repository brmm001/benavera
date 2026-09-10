// lib/benavera-db.ts
// Cliente Neon para o sistema de financiamento Benavera

import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DATABASE_URL || '';
const DATABASE_URL = rawUrl.replace(/^["']|["']$/g, '').trim();

export const sql = neon(
  DATABASE_URL || 'postgresql://placeholder:placeholder@ep-placeholder.us-east-1.aws.neon.tech/neondb?sslmode=require'
);

// Tipos base
export type UserRole =
  | 'CLINIC_ADMIN'
  | 'CLINIC_ATTENDANT'
  | 'CLINIC_FINANCIAL'
  | 'BENAVERA_ANALYST'
  | 'BENAVERA_ADMIN';

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
