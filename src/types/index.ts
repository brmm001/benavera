// ============================================================
// BENAVERA — TYPES
// ============================================================

export interface PatientLead {
  origem: string;
  tipoLead: 'patient';
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  estado?: string;
  tratamento: string;
  valorTratamento?: number;
  entrada?: number;
  parcelaDesejada?: number;
  valorFinanciado?: number;
  aceitaMarketing: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage: string;
  referrer?: string;
  timestamp: string;
}

export interface ClinicLead {
  origem: string;
  tipoLead: 'clinic';
  nome: string;
  nomeClinica: string;
  cargo: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  especialidade: string;
  numeroUnidades?: string;
  ticketMedio: string;
  orcamentosMes: string;
  maiorDesafio: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage: string;
  referrer?: string;
  timestamp: string;
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
  event: string;
  properties?: Record<string, string | number | boolean | undefined>;
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
