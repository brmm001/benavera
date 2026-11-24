// src/lib/partners/konsiga.ts
// Conector REST da Konsiga (KonsigaPay / B2E — Manual v1.4) implementando PartnerAdapter
//
// Fluxo da Konsiga:
//   1. Autenticação: POST /api/access_token → Bearer token (~4h TTL)
//   2. quote:      POST /v1/simulacao/calcular-parcelas → parcelas + transacao
//   3. authorize:  POST /v1/proposta/enviar-proposta-inicial/{transacao} → status
//                  (Etapas seguintes — token SMS, proposta-completa, NF, link assinatura —
//                   possuem helpers dedicados exportados abaixo e acompanhamento via callback)
//   4. getStatus:  GET  /v1/proposta/get-status-proposta/{transacao}
//   5. cancel:     Não há endpoint de cancelamento documentado na v1.4
//
// Variáveis de ambiente necessárias:
//   KONSIGA_USERNAME          – Usuário fornecido pela Konsiga
//   KONSIGA_PASSWORD          – Senha fornecida pela Konsiga
//   KONSIGA_BASE_URL          – URL base da API (ex: https://integracao-api.konsigapay.com.br/v1)
//   KONSIGA_AUTH_URL          – URL do SSO (ex: https://auth-2.b2egroup.com.br/api/access_token)
//   KONSIGA_CNPJ_CONSOLIDADOR – CNPJ consolidador Benavera (opcional; obrigatório apenas quando a transação for vinculada a consolidador)
//   KONSIGA_WEBHOOK_USERNAME  – Usuário Basic Auth para validar callbacks recebidos
//   KONSIGA_WEBHOOK_PASSWORD  – Senha Basic Auth para validar callbacks recebidos
//   KONSIGA_TIMEOUT_MS        – Timeout em ms (default: 15000)

import { sql } from '@/lib/benavera-db';
import { PartnerHttpError, onlyDigits, partnerFetch } from './http';
import type {
  AuthorizeResult,
  HubApplicant,
  HubOffer,
  PartnerAdapter,
  PartnerStatus,
  QuoteResult,
} from './types';

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_QUOTED_OFFERS = 12;

// ─── Tipos da API Konsiga ───────────────────────────────────────────────────

interface KonsigaTokenResponse {
  AccessToken?: string;
  GeneratedAt?: string;
  ExpiringAt?: string;
  Sucesso?: boolean;
  Mensagem?: string;
  Erros?: string[];
}

interface KonsigaParcelaItem {
  prazo: number;
  valor: number;
}

interface KonsigaCalcResponse {
  sucesso: boolean;
  mensagem?: string;
  erros?: string[] | null;
  data?: {
    parcelas?: KonsigaParcelaItem[];
    taxaClienteAplicada?: number;
    taxaEfetivaAplicada?: number;
    transacao?: string;
    origemTaxaClienteAplicada?: string;
    origemTaxaEfetivaAplicada?: string;
  } | null;
}

interface KonsigaPropostaResponse {
  sucesso: boolean;
  mensagem?: string;
  erros?: string[] | null;
  data?: {
    transacao?: string;
    status?: string;
  } | null;
}

interface KonsigaStatusResponse {
  sucesso: boolean;
  mensagem?: string;
  erros?: string[] | null;
  data?: {
    status?: string;
  } | null;
}

interface KonsigaLinkResponse {
  sucesso: boolean;
  mensagem?: string;
  erros?: string[] | null;
  data?: {
    link?: string | null;
  } | null;
}

export interface KonsigaConfirmationTokenResponse {
  sucesso: boolean;
  mensagem?: string;
  erros?: string[] | null;
  data?: {
    tokenClienteEnviado?: boolean;
    tokenAvalistaEnviado?: boolean;
  } | null;
}

export interface KonsigaInvoiceResponse {
  sucesso: boolean;
  mensagem?: string;
  erros?: string[] | null;
  data?: {
    salvo?: boolean;
  } | null;
}

export interface KonsigaEndereco {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento?: string;
}

export interface KonsigaDadosComerciais {
  atividadeDesde: string; // MM/YYYY
  cidade: string;
  estado: string;
  idOcupacao: number;
  idProfissao?: number;
  nomeEmpresa?: string;
  rendaMensal: number;
  telefone?: string;
  documentoFrenteBase64?: string;
  documentoVersoBase64?: string;
}

export interface KonsigaPropostaCompletaPayload {
  cliente: {
    dadosComerciais: KonsigaDadosComerciais;
    documentoFrenteBase64: string;
    documentoVersoBase64: string;
    email: string;
    enderecoResidencial: KonsigaEndereco;
    telefoneResidencial?: string;
    tokenConfirmacao?: string;
  };
  avalista?: {
    dadosComerciais: KonsigaDadosComerciais;
    documentoFrenteBase64: string;
    documentoVersoBase64: string;
    email: string;
    enderecoResidencial: KonsigaEndereco;
    telefoneResidencial?: string;
    tokenConfirmacao?: string;
  };
}

export interface KonsigaConsolidadorPayload {
  cnpj: string;
  nomeFantasia: string;
  razaoSocial: string;
  endereco: KonsigaEndereco;
  telefoneFixo?: string;
  celular: string;
  email: string;
  responsavelTecnico: {
    nome: string;
    cpf: string;
    dataNascimento: string; // YYYY-MM-DD
    numeroDeRegistroConselho: string;
    ufDeRegistroConselho: string;
    nomeConselho: string;
  };
  representanteLegal: {
    nome: string;
    email: string;
    cpf: string;
    dataNascimento: string; // YYYY-MM-DD
  };
}

export interface KonsigaBankDetails {
  codigoBanco: number;
  agencia: string;
  digitoAgencia: string;
  tipoConta: 1 | 2;
  conta: number;
  DigitoConta: string;
}

// ─── Configuração e Cache de Token ──────────────────────────────────────────

interface KonsigaConfig {
  username: string;
  password: string;
  baseUrl: string;
  authEndpoint: string;
  cnpjConsolidador?: string;
  timeoutMs: number;
}

let cachedToken: { cacheKey: string; token: string; expiresAt: number } | null = null;

/** Limpa o cache de token em memória (útil para testes e rotação). */
export function clearKonsigaTokenCache(): void {
  cachedToken = null;
}

/**
 * Normaliza a URL do endpoint de autenticação da Konsiga.
 * Aceita tanto a URL completa (`.../api/access_token`) quanto a base (`.../api`).
 */
export function resolveKonsigaAuthEndpoint(rawAuthUrl: string): string | null {
  const cleaned = rawAuthUrl.trim().replace(/\/+$/, '');
  if (!cleaned) return null;

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  if (cleaned.toLowerCase().endsWith('/access_token')) {
    return cleaned;
  }
  return `${cleaned}/access_token`;
}

function getConfig(): KonsigaConfig | null {
  const username = (process.env.KONSIGA_USERNAME || '').trim();
  const password = (process.env.KONSIGA_PASSWORD || '').trim();
  const rawBase = (process.env.KONSIGA_BASE_URL || '').trim().replace(/\/+$/, '');
  const rawAuth = (process.env.KONSIGA_AUTH_URL || '').trim();
  const cnpjConsolidador = (process.env.KONSIGA_CNPJ_CONSOLIDADOR || '').trim() || undefined;

  if (!username || !password || !rawBase || !rawAuth) {
    return null;
  }

  try {
    const parsedBase = new URL(rawBase);
    if (parsedBase.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  const authEndpoint = resolveKonsigaAuthEndpoint(rawAuth);
  if (!authEndpoint) return null;

  const timeoutRaw = Number(process.env.KONSIGA_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw >= 1000 && timeoutRaw <= 60000
      ? timeoutRaw
      : DEFAULT_TIMEOUT_MS;

  return {
    username,
    password,
    baseUrl: rawBase,
    authEndpoint,
    cnpjConsolidador,
    timeoutMs,
  };
}

async function getAuthToken(
  cfg: KonsigaConfig,
  options: { signal?: AbortSignal; forceRefresh?: boolean } = {}
): Promise<string> {
  const cacheKey = `${cfg.authEndpoint}|${cfg.username}`;
  const now = Date.now();

  if (
    !options.forceRefresh &&
    cachedToken &&
    cachedToken.cacheKey === cacheKey &&
    cachedToken.expiresAt > now + 300_000
  ) {
    return cachedToken.token;
  }

  const data = await partnerFetch<KonsigaTokenResponse>(cfg.authEndpoint, {
    method: 'POST',
    body: {
      UserName: cfg.username,
      Password: cfg.password,
    },
    timeoutMs: cfg.timeoutMs,
    signal: options.signal,
    retryOnTransient: true,
  });

  if (!data.AccessToken) {
    const errMsg = data.Erros?.join('; ') || data.Mensagem || 'Falha na autenticação com a Konsiga';
    throw new PartnerHttpError(errMsg, 401);
  }

  // Token expira em ~4h; usar ExpiringAt quando válido, senão fallback conservador de 3h
  let expiresAt = now + 3 * 3600 * 1000;
  if (data.ExpiringAt) {
    const parsed = new Date(data.ExpiringAt).getTime();
    if (Number.isFinite(parsed) && parsed > now) {
      expiresAt = parsed;
    }
  }

  cachedToken = { cacheKey, token: data.AccessToken, expiresAt };
  return data.AccessToken;
}

function buildKonsigaHeaders(
  token: string,
  clinicCnpj?: string,
  consolidadorCnpj?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (clinicCnpj) {
    headers.CnpjClinica = clinicCnpj;
  }
  if (consolidadorCnpj) {
    headers.CnpjConsolidador = consolidadorCnpj;
  }
  return headers;
}

/**
 * Executa requisição autenticada na API Konsiga com renovação automática única em caso de HTTP 401.
 */
async function konsigaRequest<T>(
  cfg: KonsigaConfig,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    clinicCnpj?: string;
    includeConsolidatorHeader?: boolean;
    signal?: AbortSignal;
    retryOnTransient?: boolean;
  } = {}
): Promise<T> {
  const url = `${cfg.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const consolidador =
    options.includeConsolidatorHeader === false ? undefined : cfg.cnpjConsolidador;

  const execWithToken = async (token: string) =>
    partnerFetch<T>(url, {
      method: options.method ?? 'POST',
      body: options.body,
      headers: buildKonsigaHeaders(token, options.clinicCnpj, consolidador),
      timeoutMs: cfg.timeoutMs,
      signal: options.signal,
      retryOnTransient: options.retryOnTransient ?? false,
    });

  const token = await getAuthToken(cfg, { signal: options.signal });
  try {
    return await execWithToken(token);
  } catch (err) {
    if (err instanceof PartnerHttpError && err.status === 401 && !options.signal?.aborted) {
      clearKonsigaTokenCache();
      const freshToken = await getAuthToken(cfg, { signal: options.signal, forceRefresh: true });
      return execWithToken(freshToken);
    }
    throw err;
  }
}

// ─── Helpers puros (exportados para testes) ─────────────────────────────────

export function computeFirstDueDate(baseDate: Date = new Date()): string {
  // Konsiga exige entre 30 e 60 dias. Usamos 45 dias por segurança.
  const d = new Date(baseDate.getTime());
  d.setUTCDate(d.getUTCDate() + 45);
  return d.toISOString().split('T')[0];
}

export function formatDateOnly(value: unknown, fallback: string = '1990-01-01'): string {
  if (!value) return fallback;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().split('T')[0];
}

export function resolveCouncilName(council: string | null | undefined): string {
  const raw = (council || '').trim();
  if (!raw) return 'Conselho Regional de Odontologia';

  const key = raw.toUpperCase();
  const map: Record<string, string> = {
    CRO: 'Conselho Regional de Odontologia',
    CRM: 'Conselho Regional de Medicina',
    CRBM: 'Conselho Regional de Biomedicina',
    COREN: 'Conselho Regional de Enfermagem',
    CRF: 'Conselho Regional de Farmácia',
    CREFITO: 'Conselho Regional de Fisioterapia e Terapia Ocupacional',
    CRP: 'Conselho Regional de Psicologia',
    CRN: 'Conselho Regional de Nutrição',
  };

  return map[key] || raw;
}

export function parseBankDetails(input: {
  bankCode?: string | null;
  agency?: string | null;
  account?: string | null;
  accountType?: string | null;
}): KonsigaBankDetails {
  const codeDigits = onlyDigits(input.bankCode);
  const codigoBanco = codeDigits ? Number.parseInt(codeDigits, 10) : 0;

  // Agência: aceita "0034-5", "0034 5" ou "0034"
  const rawAgency = (input.agency || '').trim();
  let agencia = '0000';
  let digitoAgencia = '0';
  if (rawAgency) {
    const parts = rawAgency.split(/[-/\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      agencia = onlyDigits(parts[0]) || '0000';
      digitoAgencia = parts[1].trim().slice(0, 2) || '0';
    } else {
      const digits = onlyDigits(rawAgency);
      agencia = digits || '0000';
      digitoAgencia = '0';
    }
  }

  // Conta: aceita "123456-7" ou "1234567" (se sem separador e >= 2 dígitos, último é DV)
  const rawAccount = (input.account || '').trim();
  let conta = 0;
  let DigitoConta = '0';
  if (rawAccount) {
    const parts = rawAccount.split(/[-/\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const mainDigits = onlyDigits(parts[0]);
      conta = mainDigits ? Number.parseInt(mainDigits, 10) : 0;
      DigitoConta = parts[1].trim().slice(0, 2) || '0';
    } else {
      const digits = onlyDigits(rawAccount);
      if (digits.length >= 2) {
        conta = Number.parseInt(digits.slice(0, -1), 10) || 0;
        DigitoConta = digits.slice(-1);
      } else if (digits.length === 1) {
        conta = Number.parseInt(digits, 10) || 0;
        DigitoConta = '0';
      }
    }
  }

  const tipoConta: 1 | 2 = /poup/i.test(input.accountType || '') ? 2 : 1;

  return {
    codigoBanco: Number.isFinite(codigoBanco) ? codigoBanco : 0,
    agencia,
    digitoAgencia,
    tipoConta,
    conta: Number.isFinite(conta) ? conta : 0,
    DigitoConta,
  };
}

function stripDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza todos os status documentados na seção 3.6 do manual Konsiga v1.4.
 */
export function normalizeKonsigaStatus(status: string): PartnerStatus['normalized'] {
  const upper = stripDiacritics(status).toUpperCase().trim();

  if (
    upper === 'APROVADO' ||
    upper === 'APROVADO COM AVALISTA' ||
    upper === 'CREDITO EFETUADO NA CONTA INFORMADA'
  ) {
    return 'APPROVED';
  }

  if (upper.startsWith('RECUSADO')) {
    return 'DENIED';
  }

  if (upper === 'CANCELADA VIA SISTEMA KONSIGAPAY' || upper === 'CANCELADO') {
    return 'CANCELLED';
  }

  if (upper === 'PROPOSTA EXPIRADA') {
    return 'ABANDONED';
  }

  return 'IN_PROGRESS';
}

const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024; // 6 MB decodificado

/**
 * Remove prefixo `data:<mime>;base64,` se presente, limpa espaços e valida Base64 e tamanho máximo.
 */
export function normalizeBase64Document(
  raw: string,
  maxBytes: number = MAX_DOCUMENT_BYTES
): { ok: true; base64: string; bytes: number } | { ok: false; error: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Arquivo vazio.' };
  }

  let payload = trimmed;
  const dataUrlMatch = trimmed.match(/^data:([^;]+);base64,([\s\S]+)$/i);
  if (dataUrlMatch) {
    const mime = dataUrlMatch[1].toLowerCase().trim();
    const allowedMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);
    if (!allowedMimes.has(mime)) {
      return { ok: false, error: 'Formato não suportado. Envie JPG, PNG ou PDF.' };
    }
    payload = dataUrlMatch[2];
  }

  const cleaned = payload.replace(/\s+/g, '');
  if (!cleaned || cleaned.length % 4 === 1 || !/^[A-Za-z0-9+/]+=*$/.test(cleaned)) {
    return { ok: false, error: 'Conteúdo Base64 inválido.' };
  }

  const bytes = Buffer.from(cleaned, 'base64').byteLength;
  if (bytes === 0) {
    return { ok: false, error: 'Arquivo inválido ou vazio.' };
  }
  if (bytes > maxBytes) {
    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    return { ok: false, error: `Arquivo excede o limite de ${maxMb} MB.` };
  }

  return { ok: true, base64: cleaned, bytes };
}

function validateApplicantForKonsiga(applicant: HubApplicant): string[] {
  const missing: string[] = [];
  const p = applicant.patient;
  if (!Number.isFinite(applicant.valorFinanciado) || applicant.valorFinanciado <= 0) {
    missing.push('valorFinanciado');
  }
  if (onlyDigits(p.cpf).length !== 11) missing.push('cpf');
  if (onlyDigits(p.celular).length < 10) missing.push('celular');
  if (!p.dataNascimento) missing.push('dataNascimento');
  if (!p.nome?.trim()) missing.push('nome');
  return missing;
}

function sanitizeCalcResponse(data: KonsigaCalcResponse): Record<string, unknown> {
  return {
    sucesso: data.sucesso,
    mensagem: data.mensagem || null,
    transacao: data.data?.transacao || null,
    parcelasCount: data.data?.parcelas?.length || 0,
    taxaCliente: data.data?.taxaClienteAplicada ?? null,
    taxaEfetiva: data.data?.taxaEfetivaAplicada ?? null,
    origemTaxaCliente: data.data?.origemTaxaClienteAplicada || null,
    origemTaxaEfetiva: data.data?.origemTaxaEfetivaAplicada || null,
    parcelasSummary: (data.data?.parcelas || []).map((p) => ({
      prazo: p.prazo,
      valor: p.valor,
    })),
  };
}

// ─── Adapter principal (PartnerAdapter) ─────────────────────────────────────

export const konsigaAdapter: PartnerAdapter = {
  slug: 'konsiga',

  isConfigured(): boolean {
    return getConfig() !== null;
  },

  async quote(applicant: HubApplicant, signal: AbortSignal): Promise<QuoteResult> {
    const cfg = getConfig();
    if (!cfg) {
      return {
        status: 'ERROR',
        offers: [],
        motivo: 'Integração Konsiga não configurada no ambiente.',
        raw: { error: 'NOT_CONFIGURED' },
      };
    }

    const missing = validateApplicantForKonsiga(applicant);
    if (missing.length > 0) {
      return {
        status: 'ERROR',
        offers: [],
        motivo: `Dados do paciente incompletos para Konsiga: ${missing.join(', ')}`,
        raw: { missingFields: missing },
      };
    }

    const clinicCnpj = await resolveClinicCnpj(applicant.applicationId);
    if (!clinicCnpj) {
      return {
        status: 'ERROR',
        offers: [],
        motivo: 'CNPJ da clínica não encontrado para a solicitação.',
        raw: { error: 'CLINIC_CNPJ_NOT_FOUND' },
      };
    }

    try {
      const payload = {
        IdProduto: 1, // Financiamento CDC (Tabela Produtos, seção 6)
        ValorSolicitado: applicant.valorFinanciado,
        DataPrimeiroVencimento: computeFirstDueDate(),
        PossuiAvalista: false,
      };

      const data = await konsigaRequest<KonsigaCalcResponse>(cfg, '/simulacao/calcular-parcelas', {
        method: 'POST',
        body: payload,
        clinicCnpj,
        signal,
        retryOnTransient: true,
      });

      const parcelas = Array.isArray(data.data?.parcelas) ? data.data.parcelas : [];
      if (!data.sucesso || parcelas.length === 0) {
        const errMsg = data.erros?.join('; ') || data.mensagem || 'Sem parcelas disponíveis';
        return {
          status: 'REJECTED',
          offers: [],
          motivo: errMsg,
          raw: sanitizeCalcResponse(data),
        };
      }

      const transacao = (data.data?.transacao || '').trim();
      if (!transacao) {
        return {
          status: 'ERROR',
          offers: [],
          motivo: 'Konsiga não retornou identificador da transação na simulação.',
          raw: sanitizeCalcResponse(data),
        };
      }

      // Konsiga retorna taxaClienteAplicada em % a.m. (ex: 2.99).
      // A tabela proposals.taxa_mensal usa NUMERIC(8,6) em formato decimal (ex: 0.0299 = 2,99% a.m.).
      const rawRate = data.data?.taxaClienteAplicada;
      const taxaMensal =
        typeof rawRate === 'number' && Number.isFinite(rawRate) && rawRate >= 0
          ? Number(((rawRate > 1 ? rawRate / 100 : rawRate)).toFixed(6))
          : undefined;

      const offers: HubOffer[] = parcelas
        .filter(
          (p) =>
            Number.isFinite(p.prazo) &&
            p.prazo >= 1 &&
            Number.isFinite(p.valor) &&
            p.valor > 0
        )
        .sort((a, b) => a.prazo - b.prazo)
        .slice(0, MAX_QUOTED_OFFERS)
        .map((p) => ({
          externalOptionId: `${transacao}:${p.prazo}`,
          parcelas: p.prazo,
          valorParcela: Math.round(p.valor * 100) / 100,
          entrada: 0,
          valorFinanciado: applicant.valorFinanciado,
          valorTotal: Math.round(p.valor * p.prazo * 100) / 100,
          taxaMensal,
          validadeHoras: 24, // Seção 3.1: simulação expira em 24 horas
        }));

      if (offers.length === 0) {
        return {
          status: 'REJECTED',
          externalId: transacao,
          offers: [],
          motivo: 'Nenhuma parcela válida retornada pela Konsiga.',
          raw: sanitizeCalcResponse(data),
        };
      }

      return {
        status: 'OFFERS',
        externalId: transacao,
        offers,
        raw: sanitizeCalcResponse(data),
      };
    } catch (err) {
      const httpErr = err instanceof PartnerHttpError ? err : null;
      return {
        status: 'ERROR',
        offers: [],
        motivo: httpErr ? httpErr.message : 'Erro ao consultar Konsiga.',
        raw: {
          httpStatus: httpErr?.status ?? 500,
          errorCode: httpErr?.errorCode ?? null,
        },
      };
    }
  },

  async authorize(externalOptionId: string, orderId: string): Promise<AuthorizeResult> {
    const cfg = getConfig();
    if (!cfg) {
      throw new PartnerHttpError('Integração Konsiga não configurada no ambiente.', 500);
    }

    // externalOptionId formato: "transacao:prazo"
    const separatorIdx = externalOptionId.lastIndexOf(':');
    const transacao = separatorIdx > 0 ? externalOptionId.slice(0, separatorIdx).trim() : '';
    const prazoStr = separatorIdx > 0 ? externalOptionId.slice(separatorIdx + 1).trim() : '';

    if (!transacao || !prazoStr) {
      throw new PartnerHttpError('ID de opção Konsiga inválido (esperado transacao:prazo).', 400);
    }
    const qtdeParcelas = Number.parseInt(prazoStr, 10);
    if (!Number.isFinite(qtdeParcelas) || qtdeParcelas < 1) {
      throw new PartnerHttpError('Número de parcelas Konsiga inválido.', 400);
    }

    const appData = await resolveApplicationData(orderId);
    if (!appData) {
      throw new PartnerHttpError('Dados da solicitação não encontrados para autorização.', 404);
    }

    const bank = parseBankDetails({
      bankCode: appData.clinicBankCode,
      agency: appData.clinicBankAgency,
      account: appData.clinicBankAccount,
      accountType: appData.clinicBankAccountType,
    });

    const clinicPhone = onlyDigits(appData.clinicWhatsapp || appData.clinicTelefone);
    const clinicFixo = onlyDigits(appData.clinicTelefone);
    const clinicUf = (appData.clinicEstado || 'SP').trim().toUpperCase().slice(0, 2);

    const propostaBody = {
      qtdeParcelas,
      cliente: {
        cpf: onlyDigits(appData.patientCpf),
        celular: onlyDigits(appData.patientCelular),
        dataNascimento: appData.patientDataNascimento,
        nome: appData.patientNome.trim(),
        rendaMensal:
          appData.patientRendaMensal && appData.patientRendaMensal > 0
            ? appData.patientRendaMensal
            : 3000,
      },
      clinica: {
        nomeFantasia: appData.clinicNomeFantasia.trim(),
        razaoSocial: (appData.clinicRazaoSocial || appData.clinicNomeFantasia).trim(),
        endereco: {
          logradouro: appData.clinicLogradouro.trim() || 'Não informado',
          numero: appData.clinicNumero.trim() || 'S/N',
          bairro: appData.clinicBairro.trim() || 'Centro',
          cidade: appData.clinicCidade.trim() || 'São Paulo',
          estado: clinicUf,
          cep: onlyDigits(appData.clinicCep).slice(0, 8) || '00000000',
          complemento: appData.clinicComplemento.trim(),
        },
        ...(clinicFixo ? { telefoneFixo: clinicFixo } : {}),
        celular: clinicPhone,
        email: appData.clinicEmail.trim(),
        responsavelTecnico: {
          nome: (appData.techRepName || appData.clinicResponsavel || appData.clinicNomeFantasia).trim(),
          cpf: onlyDigits(appData.techRepCpf || appData.legalRepCpf || appData.clinicCpfResponsavel) || '00000000000',
          dataNascimento: appData.techRepBirthDate || '1990-01-01',
          numeroDeRegistroConselho: (appData.techRepCouncilNumber || '00000').trim(),
          ufDeRegistroConselho: (appData.techRepCouncilState || clinicUf).trim().toUpperCase().slice(0, 2),
          nomeConselho: resolveCouncilName(appData.techRepCouncil),
        },
        representanteLegal: {
          nome: (appData.legalRepName || appData.clinicResponsavel || appData.clinicNomeFantasia).trim(),
          email: (appData.legalRepEmail || appData.clinicEmail).trim(),
          cpf: onlyDigits(appData.legalRepCpf || appData.clinicCpfResponsavel) || '00000000000',
          dataNascimento: appData.legalRepBirthDate || '1990-01-01',
        },
        dadosBancarios: bank,
      },
    };

    const data = await konsigaRequest<KonsigaPropostaResponse>(
      cfg,
      `/proposta/enviar-proposta-inicial/${encodeURIComponent(transacao)}`,
      {
        method: 'POST',
        body: propostaBody,
        clinicCnpj: appData.clinicCnpj,
        retryOnTransient: false,
      }
    );

    if (!data.sucesso) {
      const errMsg = data.erros?.join('; ') || data.mensagem || 'Proposta inicial recusada pela Konsiga';
      throw new PartnerHttpError(errMsg, 422);
    }

    const statusText = (data.data?.status || '').trim();
    const normalizedInitial = normalizeKonsigaStatus(statusText);
    if (normalizedInitial === 'DENIED') {
      throw new PartnerHttpError(
        `Proposta inicial recusada pela Konsiga (${statusText}).`,
        422
      );
    }

    // Buscar link de assinatura (pode retornar null enquanto pendente proposta completa)
    let redirectUrl: string | undefined;
    try {
      const link = await getKonsigaSignatureLink(transacao, appData.clinicCnpj);
      if (link) redirectUrl = link;
    } catch {
      // Link pode não estar disponível nesta etapa — seguir sem abortar autorização
    }

    return {
      externalTransactionId: data.data?.transacao || transacao,
      redirectUrl,
      raw: {
        transacao: data.data?.transacao || transacao,
        status: statusText || null,
        qtdeParcelas,
        hasRedirectUrl: Boolean(redirectUrl),
      },
    };
  },

  async getStatus(externalTransactionId: string): Promise<PartnerStatus> {
    const cfg = getConfig();
    if (!cfg) {
      throw new PartnerHttpError('Integração Konsiga não configurada no ambiente.', 500);
    }

    const clinicCnpj =
      (await resolveClinicCnpjByTransaction(externalTransactionId)) || cfg.cnpjConsolidador;
    if (!clinicCnpj) {
      throw new PartnerHttpError(
        'CNPJ da clínica não encontrado para consultar status na Konsiga.',
        400
      );
    }

    const data = await konsigaRequest<KonsigaStatusResponse>(
      cfg,
      `/proposta/get-status-proposta/${encodeURIComponent(externalTransactionId)}`,
      {
        method: 'GET',
        clinicCnpj,
        retryOnTransient: true,
      }
    );

    const statusText = (data.data?.status || 'DESCONHECIDO').trim();
    const normalized = normalizeKonsigaStatus(statusText);

    return {
      normalized,
      externalStatus: statusText,
      step: undefined,
      raw: {
        status: statusText,
        sucesso: data.sucesso,
        mensagem: data.mensagem || null,
      },
    };
  },

  async cancel(externalTransactionId: string): Promise<void> {
    // A Konsiga v1.4 não possui endpoint de cancelamento documentado.
    // O cancelamento ocorre pelo painel KonsigaPay e notifica via callback.
    console.warn(`[Konsiga] Cancelamento não suportado via API para transação ${externalTransactionId}`);
  },
};

// ─── Helpers das etapas complementares da Konsiga (Seções 3.3, 3.4, 3.5, 3.7, 3.8, 3.9) ─

/** Seção 3.3: Envia token de confirmação via SMS ao cliente/avalista. */
export async function sendKonsigaConfirmationToken(
  transacao: string,
  clinicCnpj: string
): Promise<KonsigaConfirmationTokenResponse> {
  const cfg = getConfig();
  if (!cfg) throw new PartnerHttpError('Integração Konsiga não configurada no ambiente.', 500);

  return konsigaRequest<KonsigaConfirmationTokenResponse>(
    cfg,
    `/proposta/enviar-token-confirmacao/${encodeURIComponent(transacao)}`,
    {
      method: 'POST',
      clinicCnpj,
      retryOnTransient: false,
    }
  );
}

/** Seção 3.4: Envia dados complementares + documentos Base64 + token SMS. */
export async function sendKonsigaCompleteProposal(
  transacao: string,
  clinicCnpj: string,
  payload: KonsigaPropostaCompletaPayload
): Promise<KonsigaPropostaResponse> {
  const cfg = getConfig();
  if (!cfg) throw new PartnerHttpError('Integração Konsiga não configurada no ambiente.', 500);

  return konsigaRequest<KonsigaPropostaResponse>(
    cfg,
    `/proposta/enviar-proposta-completa/${encodeURIComponent(transacao)}`,
    {
      method: 'POST',
      body: payload,
      clinicCnpj,
      retryOnTransient: false,
    }
  );
}

/** Seção 3.5: Envia Nota Fiscal (jpeg, png ou pdf em Base64). */
export async function uploadKonsigaInvoice(
  transacao: string,
  clinicCnpj: string,
  nfBase64: string
): Promise<KonsigaInvoiceResponse> {
  const cfg = getConfig();
  if (!cfg) throw new PartnerHttpError('Integração Konsiga não configurada no ambiente.', 500);

  return konsigaRequest<KonsigaInvoiceResponse>(
    cfg,
    `/proposta/salvar-nota-fiscal/${encodeURIComponent(transacao)}`,
    {
      method: 'POST',
      body: { NFBase64: nfBase64 },
      clinicCnpj,
      retryOnTransient: false,
    }
  );
}

/** Valida que uma URL externa de redirecionamento/assinatura usa HTTPS válido (bloqueia javascript:, data:, http:). */
export function sanitizeHttpsRedirectUrl(rawUrl: string | null | undefined): string | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Seção 3.7: Recupera o link de assinatura digital do contrato (validado como HTTPS). */
export async function getKonsigaSignatureLink(
  transacao: string,
  clinicCnpj: string
): Promise<string | null> {
  const cfg = getConfig();
  if (!cfg) throw new PartnerHttpError('Integração Konsiga não configurada no ambiente.', 500);

  const linkData = await konsigaRequest<KonsigaLinkResponse>(
    cfg,
    `/proposta/get-link_assinatura/${encodeURIComponent(transacao)}`,
    {
      method: 'GET',
      clinicCnpj,
      retryOnTransient: true,
    }
  );

  if (!linkData.sucesso) return null;
  return sanitizeHttpsRedirectUrl(linkData.data?.link);
}

/** Seção 3.8 / 3.9: Cadastra ou atualiza clínica consolidadora na Konsiga. */
export async function upsertKonsigaConsolidator(
  payload: KonsigaConsolidadorPayload,
  mode: 'create' | 'update' = 'create'
): Promise<{ sucesso: boolean; mensagem?: string; erros?: string[] | null; data?: string }> {
  const cfg = getConfig();
  if (!cfg) throw new PartnerHttpError('Integração Konsiga não configurada no ambiente.', 500);

  const path = mode === 'update' ? '/consolidador/atualizar' : '/consolidador';
  return konsigaRequest(cfg, path, {
    method: 'POST',
    body: payload,
    includeConsolidatorHeader: false,
    retryOnTransient: false,
  });
}

// ─── Helpers de banco ───────────────────────────────────────────────────────

export async function resolveClinicCnpj(applicationId: string): Promise<string | null> {
  const rows = await sql`
    SELECT c.cnpj
    FROM applications a
    JOIN clinics c ON c.id = a.clinic_id
    WHERE a.id = ${applicationId}
    LIMIT 1
  `;
  return rows[0]?.cnpj ? String(rows[0].cnpj).trim() : null;
}

export async function resolveClinicCnpjByTransaction(transactionId: string): Promise<string | null> {
  const rows = await sql`
    SELECT c.cnpj
    FROM funding_attempts fa
    JOIN applications a ON a.id = fa.application_id
    JOIN clinics c ON c.id = a.clinic_id
    WHERE fa.external_transaction_id = ${transactionId}
       OR fa.external_id = ${transactionId}
    LIMIT 1
  `;
  return rows[0]?.cnpj ? String(rows[0].cnpj).trim() : null;
}

export interface KonsigaAttemptContext {
  attemptId: string;
  applicationId: string;
  partnerId: string;
  clinicCnpj: string;
  transactionId: string;
  externalStatus: string | null;
  externalStep: string | null;
  proposalId: string | null;
  signingUrl: string | null;
}

/** Localiza a tentativa ativa da Konsiga vinculada a uma solicitação. */
export async function resolveKonsigaAttemptByApplication(
  applicationId: string
): Promise<KonsigaAttemptContext | null> {
  const rows = await sql`
    SELECT
      fa.id AS attempt_id,
      fa.application_id,
      fa.partner_id,
      fa.external_transaction_id,
      fa.external_id,
      fa.external_status,
      fa.external_step,
      c.cnpj AS clinic_cnpj,
      pr.id AS proposal_id,
      pr.url_externa AS signing_url
    FROM funding_attempts fa
    JOIN financial_partners fp ON fp.id = fa.partner_id
    JOIN applications a ON a.id = fa.application_id
    JOIN clinics c ON c.id = a.clinic_id
    LEFT JOIN proposals pr
      ON pr.application_id = fa.application_id
     AND pr.funding_attempt_id = fa.id
     AND pr.selecionada = true
    WHERE fa.application_id = ${applicationId}
      AND fp.api_slug = 'konsiga'
    ORDER BY
      (pr.id IS NOT NULL) DESC,
      (fa.external_transaction_id IS NOT NULL) DESC,
      fa.updated_at DESC NULLS LAST,
      fa.submitted_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  const transactionId = String(row.external_transaction_id || row.external_id || '').trim();
  const clinicCnpj = String(row.clinic_cnpj || '').trim();
  if (!transactionId || !clinicCnpj) return null;

  return {
    attemptId: String(row.attempt_id),
    applicationId: String(row.application_id),
    partnerId: String(row.partner_id),
    clinicCnpj,
    transactionId,
    externalStatus: row.external_status ? String(row.external_status) : null,
    externalStep: row.external_step ? String(row.external_step) : null,
    proposalId: row.proposal_id ? String(row.proposal_id) : null,
    signingUrl: row.signing_url ? String(row.signing_url) : null,
  };
}

interface ApplicationDataForKonsiga {
  patientCpf: string;
  patientNome: string;
  patientCelular: string;
  patientDataNascimento: string;
  patientRendaMensal: number | null;
  clinicCnpj: string;
  clinicNomeFantasia: string;
  clinicRazaoSocial: string;
  clinicTelefone: string;
  clinicWhatsapp: string;
  clinicEmail: string;
  clinicResponsavel: string;
  clinicCpfResponsavel: string;
  clinicLogradouro: string;
  clinicNumero: string;
  clinicBairro: string;
  clinicCidade: string;
  clinicEstado: string;
  clinicCep: string;
  clinicComplemento: string;
  clinicBankCode: string;
  clinicBankAgency: string;
  clinicBankAccount: string;
  clinicBankAccountType: string;
  techRepName: string;
  techRepCpf: string;
  techRepBirthDate: string;
  techRepCouncil: string;
  techRepCouncilNumber: string;
  techRepCouncilState: string;
  legalRepName: string;
  legalRepCpf: string;
  legalRepBirthDate: string;
  legalRepEmail: string;
}

/** Busca dados completos do paciente, clínica e credenciamento (onboarding) para proposta-inicial. */
async function resolveApplicationData(protocol: string): Promise<ApplicationDataForKonsiga | null> {
  const rows = await sql`
    SELECT
      p.cpf,
      p.nome AS p_nome,
      p.celular AS p_celular,
      p.data_nascimento AS p_data_nascimento,
      p.renda_mensal AS p_renda_mensal,
      c.cnpj,
      c.nome_fantasia,
      c.razao_social,
      c.telefone AS c_telefone,
      c.whatsapp AS c_whatsapp,
      c.email AS c_email,
      c.responsavel AS c_responsavel,
      c.cpf_responsavel AS c_cpf_responsavel,
      c.logradouro AS c_logradouro,
      c.numero AS c_numero,
      c.complemento AS c_complemento,
      c.bairro AS c_bairro,
      c.cidade AS c_cidade,
      c.estado AS c_estado,
      c.cep AS c_cep,
      c.banco AS c_banco,
      c.agencia AS c_agencia,
      c.conta AS c_conta,
      ob.address_street AS ob_logradouro,
      ob.address_number AS ob_numero,
      ob.address_complement AS ob_complemento,
      ob.address_neighborhood AS ob_bairro,
      ob.address_city AS ob_cidade,
      ob.address_state AS ob_estado,
      ob.address_cep AS ob_cep,
      ob.bank_code AS ob_bank_code,
      ob.bank_agency AS ob_bank_agency,
      ob.bank_account AS ob_bank_account,
      ob.bank_account_type AS ob_bank_account_type,
      ob.tech_rep_name AS ob_tech_name,
      ob.tech_rep_cpf AS ob_tech_cpf,
      ob.tech_rep_birth_date AS ob_tech_birth_date,
      ob.tech_rep_council AS ob_tech_council,
      ob.tech_rep_council_number AS ob_tech_council_number,
      ob.tech_rep_council_state AS ob_tech_council_state,
      ob.legal_rep_name AS ob_legal_name,
      ob.legal_rep_cpf AS ob_legal_cpf,
      ob.legal_rep_birth_date AS ob_legal_birth_date,
      ob.legal_rep_email AS ob_legal_email
    FROM applications a
    JOIN patients p ON p.id = a.patient_id
    JOIN clinics c ON c.id = a.clinic_id
    LEFT JOIN LATERAL (
      SELECT *
      FROM clinic_onboardings co
      WHERE co.clinic_id = c.id
      ORDER BY co.created_at DESC
      LIMIT 1
    ) ob ON true
    WHERE a.protocol = ${protocol}
    LIMIT 1
  `;

  const r = rows[0];
  if (!r || !r.cnpj) return null;

  const renda = r.p_renda_mensal !== null && r.p_renda_mensal !== undefined
    ? Number(r.p_renda_mensal)
    : null;

  return {
    patientCpf: String(r.cpf || ''),
    patientNome: String(r.p_nome || ''),
    patientCelular: String(r.p_celular || ''),
    patientDataNascimento: formatDateOnly(r.p_data_nascimento, '1990-01-01'),
    patientRendaMensal: renda !== null && Number.isFinite(renda) ? renda : null,
    clinicCnpj: String(r.cnpj),
    clinicNomeFantasia: String(r.nome_fantasia || ''),
    clinicRazaoSocial: String(r.razao_social || ''),
    clinicTelefone: String(r.c_telefone || ''),
    clinicWhatsapp: String(r.c_whatsapp || ''),
    clinicEmail: String(r.c_email || ''),
    clinicResponsavel: String(r.c_responsavel || ''),
    clinicCpfResponsavel: String(r.c_cpf_responsavel || ''),
    clinicLogradouro: String(r.c_logradouro || r.ob_logradouro || ''),
    clinicNumero: String(r.c_numero || r.ob_numero || ''),
    clinicComplemento: String(r.c_complemento || r.ob_complemento || ''),
    clinicBairro: String(r.c_bairro || r.ob_bairro || ''),
    clinicCidade: String(r.c_cidade || r.ob_cidade || ''),
    clinicEstado: String(r.c_estado || r.ob_estado || ''),
    clinicCep: String(r.c_cep || r.ob_cep || ''),
    clinicBankCode: String(r.ob_bank_code || r.c_banco || ''),
    clinicBankAgency: String(r.c_agencia || r.ob_bank_agency || ''),
    clinicBankAccount: String(r.c_conta || r.ob_bank_account || ''),
    clinicBankAccountType: String(r.ob_bank_account_type || ''),
    techRepName: String(r.ob_tech_name || ''),
    techRepCpf: String(r.ob_tech_cpf || ''),
    techRepBirthDate: formatDateOnly(r.ob_tech_birth_date, '1990-01-01'),
    techRepCouncil: String(r.ob_tech_council || ''),
    techRepCouncilNumber: String(r.ob_tech_council_number || ''),
    techRepCouncilState: String(r.ob_tech_council_state || ''),
    legalRepName: String(r.ob_legal_name || ''),
    legalRepCpf: String(r.ob_legal_cpf || ''),
    legalRepBirthDate: formatDateOnly(r.ob_legal_birth_date, '1990-01-01'),
    legalRepEmail: String(r.ob_legal_email || ''),
  };
}
