// ============================================================
// BENAVERA — TYPES & INTERFACES
// ============================================================

export type PatientLeadStatus = 'nova' | 'em_analise' | 'contatada' | 'convertida' | 'perdida';
export type ClinicLeadStatus = 'novo' | 'em_contato' | 'em_negociacao' | 'parceiro_ativo' | 'perdido';
export type LeadEventType =
  | 'lead_created'
  | 'status_changed'
  | 'contact_made'
  | 'note_added'
  | 'converted'
  | 'lost'
  | 'data_anonymized';

export interface PatientLead {
  id?: string;
  origem: string;
  tipoLead: 'patient';
  nome: string;
  telefone: string;
  email?: string;
  cidade: string;
  estado?: string;
  tratamento: string;
  valorTratamento?: number;
  entrada?: number;
  parcelaDesejada?: number;
  prazoDesejado?: string;
  clinicaIndicada?: string;
  consentimento: boolean;
  versaoTermos: string;
  status?: PatientLeadStatus;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage: string;
  referrer?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClinicLead {
  id?: string;
  origem: string;
  tipoLead: 'clinic';
  nome: string;
  nomeClinica: string;
  cargo?: string;
  whatsapp: string;
  email?: string;
  cidade: string;
  estado?: string;
  especialidade: string;
  numeroUnidades?: string;
  ticketMedio?: string;
  orcamentosMes?: string;
  maiorDesafio?: string;
  consentimento: boolean;
  versaoTermos: string;
  statusComercial?: ClinicLeadStatus;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage: string;
  referrer?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadHistoryEvent {
  id: string;
  leadId: string;
  leadType: 'patient' | 'clinic';
  eventType: LeadEventType;
  description?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface SimulationData {
  tratamento: string;
  temOrcamento: boolean;
  valorTratamento?: number;
  entrada?: number;
  parcelaDesejada?: number;
  cidade?: string;
  estado?: string;
}

export interface TrackingEvent {
  event:
    | 'simulation_started'
    | 'simulation_step_completed'
    | 'simulation_submitted'
    | 'clinic_form_started'
    | 'clinic_form_submitted'
    | 'calculator_used'
    | 'article_cta_clicked'
    | 'whatsapp_clicked'
    | (string & {});
  properties?: Record<string, string | number | boolean | undefined | null>;
}

export interface UTMParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  reviewer?: string;
  category: ArticleCategory;
  keywords: string[];
  canonical: string;
  image?: string;
  robots?: string;
  relatedArticles?: string[];
  sources?: ArticleSource[];
}

export interface ArticleSource {
  title: string;
  url: string;
  organization: string;
}

export type ArticleCategory =
  | 'tratamentos-e-custos'
  | 'formas-de-pagamento'
  | 'planejamento-financeiro'
  | 'para-clinicas';

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  'tratamentos-e-custos': 'Tratamentos e Custos',
  'formas-de-pagamento': 'Formas de Pagamento',
  'planejamento-financeiro': 'Planejamento Financeiro',
  'para-clinicas': 'Para Clínicas',
};

export interface WizardStep {
  id: number;
  title: string;
  completed: boolean;
}
