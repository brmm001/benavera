// src/lib/partners/types.ts
// Interface genérica do Hub multi-financeiras da Benavera

export interface HubApplicant {
  applicationId: string;
  protocol: string;
  categoria: string;
  procedimento: string;
  valorTratamento: number;
  entrada: number;
  valorFinanciado: number;
  patient: {
    nome: string;
    cpf: string;
    email: string;
    celular: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    dataNascimento: string | null;
  };
}

export interface HubOffer {
  externalOptionId: string;
  parcelas: number;
  valorParcela: number;
  entrada: number;
  valorFinanciado: number;
  valorTotal: number;
  taxaMensal?: number;
  cetAnual?: number;
  validadeHoras?: number;
}

export type QuoteResult = {
  status: 'OFFERS' | 'REJECTED' | 'ERROR';
  externalId?: string;
  offers: HubOffer[];
  motivo?: string;
  raw: Record<string, unknown>;
};

export interface AuthorizeResult {
  externalTransactionId: string;
  redirectUrl?: string;
  raw: Record<string, unknown>;
}

export interface PartnerStatus {
  normalized: 'IN_PROGRESS' | 'APPROVED' | 'DENIED' | 'ABANDONED' | 'CANCELLED';
  externalStatus: string;
  step?: string;
  raw: Record<string, unknown>;
}

export interface PartnerAdapter {
  slug: string;
  isConfigured(): boolean;
  quote(applicant: HubApplicant, signal: AbortSignal): Promise<QuoteResult>;
  authorize(externalOptionId: string, orderId: string): Promise<AuthorizeResult>;
  getStatus(externalTransactionId: string): Promise<PartnerStatus>;
  cancel(externalTransactionId: string): Promise<void>;
}
