// src/lib/representantes-db.ts
// Sistema de Representantes de Vendas: cadastro, vínculo com clínicas, motor de comissões e métricas.
//
// Regras:
//  - Comissão = % sobre o VALOR FINANCIADO de cada repasse (payout) das clínicas vinculadas.
//  - Só gera comissão para repasses criados dentro do período do vínculo (periodo_meses; NULL = vitalício).
//  - Status: PREVISTA (repasse ainda não concluído) → A_RECEBER (repasse PAID) → PAGA (baixa manual do admin).
//  - O percentual/período são "congelados" no vínculo: mudar o padrão do representante não altera vínculos existentes.
//  - Preparado para MENSALIDADE (tipo 'MENSALIDADE' + mensalidade_percent) — geração será implementada depois.

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { sql } from './benavera-db';
import { getSession, type SessionPayload } from './auth';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ComissaoStatus = 'PREVISTA' | 'A_RECEBER' | 'PAGA' | 'CANCELADA';
export type ComissaoTipo = 'FINANCIAMENTO' | 'MENSALIDADE' | 'BONUS';

export interface Representante {
  id: string;
  user_id: string | null;
  nome: string;
  email: string;
  documento: string | null;
  telefone: string | null;
  chave_pix: string | null;
  tipo_pix: string | null;
  codigo_indicacao: string;
  comissao_percent: number;
  periodo_meses: number | null;
  mensalidade_percent: number;
  bonus_ativacao: number;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
}

function mapRep(r: Record<string, unknown>): Representante {
  return {
    id: String(r.id),
    user_id: r.user_id ? String(r.user_id) : null,
    nome: String(r.nome),
    email: String(r.email),
    documento: (r.documento as string) ?? null,
    telefone: (r.telefone as string) ?? null,
    chave_pix: (r.chave_pix as string) ?? null,
    tipo_pix: (r.tipo_pix as string) ?? null,
    codigo_indicacao: String(r.codigo_indicacao),
    comissao_percent: Number(r.comissao_percent),
    periodo_meses: r.periodo_meses === null || r.periodo_meses === undefined ? null : Number(r.periodo_meses),
    mensalidade_percent: Number(r.mensalidade_percent ?? 0),
    bonus_ativacao: Number(r.bonus_ativacao ?? 0),
    ativo: Boolean(r.ativo),
    observacoes: (r.observacoes as string) ?? null,
    created_at: String(r.created_at),
  };
}

// ─── Código de indicação ──────────────────────────────────────────────────────

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos

function randomCode(len = 8): string {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function normalizeCodigo(code: string): string {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

export async function getRepresentanteByCodigo(code: string): Promise<Representante | null> {
  const c = normalizeCodigo(code);
  if (c.length < 6) return null;
  const rows = await sql`SELECT * FROM representantes WHERE codigo_indicacao = ${c} AND ativo = TRUE LIMIT 1`;
  return rows[0] ? mapRep(rows[0]) : null;
}

// ─── Sessão do representante ──────────────────────────────────────────────────

export async function getRepresentanteSession(): Promise<{ session: SessionPayload; rep: Representante } | null> {
  const session = await getSession();
  if (!session || session.role !== 'REPRESENTANTE') return null;
  const rows = await sql`SELECT * FROM representantes WHERE user_id = ${session.userId} AND ativo = TRUE LIMIT 1`;
  if (!rows[0]) return null;
  return { session, rep: mapRep(rows[0]) };
}

// ─── CRUD (admin) ─────────────────────────────────────────────────────────────

export interface RepresentanteInput {
  nome: string;
  email: string;
  documento?: string | null;
  telefone?: string | null;
  chave_pix?: string | null;
  tipo_pix?: string | null;
  comissao_percent?: number;
  periodo_meses?: number | null;
  mensalidade_percent?: number;
  bonus_ativacao?: number;
  observacoes?: string | null;
}

function clampPercent(n: unknown, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(100, Math.max(0, Math.round(v * 1000) / 1000));
}

function cleanPeriodo(n: unknown): number | null {
  if (n === null || n === undefined || n === '') return null;
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.min(v, 600);
}

export function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}

export async function createRepresentante(
  input: RepresentanteInput
): Promise<{ success: boolean; representante?: Representante; senhaTemporaria?: string; error?: string }> {
  const email = input.email.trim().toLowerCase();
  const nome = input.nome.trim();
  if (!nome || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { success: false, error: 'Nome e e-mail válidos são obrigatórios.' };
  }

  const exists = await sql`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`;
  if (exists.length > 0) return { success: false, error: 'Já existe um usuário com este e-mail.' };

  const senhaTemporaria = generateTempPassword();
  const hash = await bcrypt.hash(senhaTemporaria, 12);

  const userRows = await sql`
    INSERT INTO users (clinic_id, name, email, password_hash, role, ativo)
    VALUES (NULL, ${nome}, ${email}, ${hash}, 'REPRESENTANTE', TRUE)
    RETURNING id
  `;
  const userId = String(userRows[0].id);

  for (let attempt = 0; attempt < 5; attempt++) {
    const codigo = randomCode();
    try {
      const rows = await sql`
        INSERT INTO representantes
          (user_id, nome, email, documento, telefone, chave_pix, tipo_pix, codigo_indicacao,
           comissao_percent, periodo_meses, mensalidade_percent, bonus_ativacao, observacoes)
        VALUES
          (${userId}, ${nome}, ${email}, ${input.documento ?? null}, ${input.telefone ?? null},
           ${input.chave_pix ?? null}, ${input.tipo_pix ?? null}, ${codigo},
           ${clampPercent(input.comissao_percent, 1)}, ${cleanPeriodo(input.periodo_meses)},
           ${clampPercent(input.mensalidade_percent, 0)}, ${Math.max(0, Number(input.bonus_ativacao) || 0)},
           ${input.observacoes ?? null})
        RETURNING *
      `;
      return { success: true, representante: mapRep(rows[0]), senhaTemporaria };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (!/codigo_indicacao/.test(msg)) {
        await sql`DELETE FROM users WHERE id = ${userId}`;
        throw e;
      }
    }
  }
  await sql`DELETE FROM users WHERE id = ${userId}`;
  return { success: false, error: 'Não foi possível gerar um código de indicação único.' };
}

export async function updateRepresentante(id: string, input: Partial<RepresentanteInput> & { ativo?: boolean }): Promise<Representante | null> {
  const cur = await sql`SELECT * FROM representantes WHERE id = ${id} LIMIT 1`;
  if (!cur[0]) return null;
  const c = mapRep(cur[0]);

  const next = {
    nome: input.nome?.trim() || c.nome,
    documento: input.documento !== undefined ? input.documento : c.documento,
    telefone: input.telefone !== undefined ? input.telefone : c.telefone,
    chave_pix: input.chave_pix !== undefined ? input.chave_pix : c.chave_pix,
    tipo_pix: input.tipo_pix !== undefined ? input.tipo_pix : c.tipo_pix,
    comissao_percent: input.comissao_percent !== undefined ? clampPercent(input.comissao_percent, c.comissao_percent) : c.comissao_percent,
    periodo_meses: input.periodo_meses !== undefined ? cleanPeriodo(input.periodo_meses) : c.periodo_meses,
    mensalidade_percent: input.mensalidade_percent !== undefined ? clampPercent(input.mensalidade_percent, c.mensalidade_percent) : c.mensalidade_percent,
    bonus_ativacao: input.bonus_ativacao !== undefined ? Math.max(0, Number(input.bonus_ativacao) || 0) : c.bonus_ativacao,
    observacoes: input.observacoes !== undefined ? input.observacoes : c.observacoes,
    ativo: input.ativo !== undefined ? Boolean(input.ativo) : c.ativo,
  };

  const rows = await sql`
    UPDATE representantes SET
      nome = ${next.nome}, documento = ${next.documento}, telefone = ${next.telefone},
      chave_pix = ${next.chave_pix}, tipo_pix = ${next.tipo_pix},
      comissao_percent = ${next.comissao_percent}, periodo_meses = ${next.periodo_meses},
      mensalidade_percent = ${next.mensalidade_percent}, bonus_ativacao = ${next.bonus_ativacao},
      observacoes = ${next.observacoes}, ativo = ${next.ativo}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  // Mantém o usuário de login sincronizado (desativar representante bloqueia o acesso)
  if (c.user_id) {
    await sql`UPDATE users SET name = ${next.nome}, ativo = ${next.ativo}, updated_at = NOW() WHERE id = ${c.user_id}`;
  }
  return rows[0] ? mapRep(rows[0]) : null;
}

export async function resetRepresentantePassword(id: string): Promise<string | null> {
  const rows = await sql`SELECT user_id FROM representantes WHERE id = ${id} LIMIT 1`;
  if (!rows[0]?.user_id) return null;
  const senha = generateTempPassword();
  const hash = await bcrypt.hash(senha, 12);
  await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${rows[0].user_id}`;
  return senha;
}

// ─── Vínculos (clínica ↔ representante) ───────────────────────────────────────

export async function vincularClinica(params: {
  representanteId: string;
  clinicId: string;
  origem: 'ADMIN' | 'CODIGO';
  porQuem: string;
  motivo?: string | null;
  comissaoPercent?: number;
  periodoMeses?: number | null | undefined;
}): Promise<{ success: boolean; error?: string; vinculoId?: string }> {
  const repRows = await sql`SELECT * FROM representantes WHERE id = ${params.representanteId} LIMIT 1`;
  if (!repRows[0]) return { success: false, error: 'Representante não encontrado.' };
  const rep = mapRep(repRows[0]);

  const clinic = await sql`SELECT id FROM clinics WHERE id = ${params.clinicId} LIMIT 1`;
  if (!clinic[0]) return { success: false, error: 'Clínica não encontrada.' };

  const percent = params.comissaoPercent !== undefined ? clampPercent(params.comissaoPercent, rep.comissao_percent) : rep.comissao_percent;
  const periodo = params.periodoMeses !== undefined ? cleanPeriodo(params.periodoMeses) : rep.periodo_meses;

  // Encerra o vínculo ativo anterior (se houver)
  await sql`
    UPDATE representante_vinculos SET ativo = FALSE, fim = LEAST(COALESCE(fim, NOW()), NOW())
    WHERE clinic_id = ${params.clinicId} AND ativo = TRUE
  `;

  const rows = await sql`
    INSERT INTO representante_vinculos
      (representante_id, clinic_id, comissao_percent, periodo_meses, mensalidade_percent, bonus_ativacao,
       inicio, fim, ativo, origem, motivo, criado_por)
    VALUES
      (${rep.id}, ${params.clinicId}, ${percent}, ${periodo}, ${rep.mensalidade_percent}, ${rep.bonus_ativacao},
       NOW(),
       CASE WHEN ${periodo}::int IS NULL THEN NULL ELSE NOW() + (${periodo}::int * INTERVAL '1 month') END,
       TRUE, ${params.origem}, ${params.motivo ?? null}, ${params.porQuem})
    RETURNING id
  `;
  await syncComissoes(rep.id);
  return { success: true, vinculoId: String(rows[0].id) };
}

export async function desvincularClinica(clinicId: string): Promise<void> {
  await sql`
    UPDATE representante_vinculos SET ativo = FALSE, fim = LEAST(COALESCE(fim, NOW()), NOW())
    WHERE clinic_id = ${clinicId} AND ativo = TRUE
  `;
}

export async function getVinculoAtivoDaClinica(clinicId: string) {
  const rows = await sql`
    SELECT v.*, r.nome AS representante_nome, r.codigo_indicacao
    FROM representante_vinculos v JOIN representantes r ON r.id = v.representante_id
    WHERE v.clinic_id = ${clinicId} AND v.ativo = TRUE LIMIT 1
  `;
  return rows[0] ?? null;
}

// ─── Motor de comissões (idempotente) ─────────────────────────────────────────
// Recalcula a partir dos repasses (payouts). Pode ser chamado a qualquer momento.
// Comissões já PAGAS nunca são alteradas.

export async function syncComissoes(representanteId?: string | null): Promise<void> {
  const repId = representanteId ?? null;

  await sql`
    INSERT INTO representante_comissoes
      (representante_id, vinculo_id, clinic_id, tipo, ref, payout_id, application_id,
       base_valor, percent, valor, status, competencia, liberada_em)
    SELECT v.representante_id, v.id, v.clinic_id, 'FINANCIAMENTO', p.id::text, p.id, p.application_id,
           COALESCE(p.valor_financiado, 0), v.comissao_percent,
           ROUND(COALESCE(p.valor_financiado, 0) * v.comissao_percent / 100, 2),
           CASE WHEN p.status::text = 'PAID' THEN 'A_RECEBER'
                WHEN p.status::text = 'CANCELLED' THEN 'CANCELADA'
                ELSE 'PREVISTA' END,
           COALESCE(p.data_paga, p.data_prevista, p.created_at::date),
           CASE WHEN p.status::text = 'PAID' THEN COALESCE(p.data_paga::timestamptz, NOW()) END
    FROM representante_vinculos v
    JOIN payouts p ON p.clinic_id = v.clinic_id
                  AND p.created_at >= v.inicio
                  AND (v.fim IS NULL OR p.created_at <= v.fim)
    WHERE (${repId}::uuid IS NULL OR v.representante_id = ${repId}::uuid)
    ON CONFLICT (vinculo_id, tipo, ref) DO UPDATE SET
      base_valor = EXCLUDED.base_valor,
      valor = EXCLUDED.valor,
      status = EXCLUDED.status,
      competencia = EXCLUDED.competencia,
      liberada_em = COALESCE(representante_comissoes.liberada_em, EXCLUDED.liberada_em),
      updated_at = NOW()
    WHERE representante_comissoes.status <> 'PAGA'
      AND (representante_comissoes.status, representante_comissoes.valor, representante_comissoes.base_valor)
          IS DISTINCT FROM (EXCLUDED.status, EXCLUDED.valor, EXCLUDED.base_valor)
  `;

  // Bônus de ativação (único por vínculo): previsto até a clínica estar ativa
  await sql`
    INSERT INTO representante_comissoes
      (representante_id, vinculo_id, clinic_id, tipo, ref, base_valor, percent, valor, status, competencia, liberada_em)
    SELECT v.representante_id, v.id, v.clinic_id, 'BONUS', 'ATIVACAO', 0, 0, v.bonus_ativacao,
           CASE WHEN c.ativo THEN 'A_RECEBER' ELSE 'PREVISTA' END,
           CURRENT_DATE, CASE WHEN c.ativo THEN NOW() END
    FROM representante_vinculos v JOIN clinics c ON c.id = v.clinic_id
    WHERE v.bonus_ativacao > 0
      AND (${repId}::uuid IS NULL OR v.representante_id = ${repId}::uuid)
    ON CONFLICT (vinculo_id, tipo, ref) DO UPDATE SET
      status = EXCLUDED.status,
      liberada_em = COALESCE(representante_comissoes.liberada_em, EXCLUDED.liberada_em),
      updated_at = NOW()
    WHERE representante_comissoes.status IN ('PREVISTA', 'A_RECEBER')
      AND representante_comissoes.status <> EXCLUDED.status
  `;
}

// ─── Pagamentos (controle manual) ─────────────────────────────────────────────

export async function registrarPagamento(params: {
  representanteId: string;
  comissaoIds?: string[]; // se omitido, paga todas as A_RECEBER
  observacao?: string | null;
  comprovanteUrl?: string | null;
  pagoEm?: string | null;
  pagoPor: string;
}): Promise<{ success: boolean; total?: number; pagamentoId?: string; error?: string }> {
  await syncComissoes(params.representanteId);

  const ids = params.comissaoIds && params.comissaoIds.length > 0 ? params.comissaoIds : null;
  const rows = await sql`
    SELECT id, valor FROM representante_comissoes
    WHERE representante_id = ${params.representanteId} AND status = 'A_RECEBER'
      AND (${ids}::uuid[] IS NULL OR id = ANY(${ids}::uuid[]))
  `;
  if (rows.length === 0) return { success: false, error: 'Nenhuma comissão a receber para pagar.' };

  const total = rows.reduce((s, r) => s + Number(r.valor), 0);
  const pg = await sql`
    INSERT INTO representante_pagamentos (representante_id, total, observacao, comprovante_url, pago_em, pago_por)
    VALUES (${params.representanteId}, ${total}, ${params.observacao ?? null}, ${params.comprovanteUrl ?? null},
            COALESCE(${params.pagoEm ?? null}::date, CURRENT_DATE), ${params.pagoPor})
    RETURNING id
  `;
  const pagamentoId = String(pg[0].id);
  const paidIds = rows.map(r => String(r.id));
  await sql`
    UPDATE representante_comissoes SET status = 'PAGA', pagamento_id = ${pagamentoId}, updated_at = NOW()
    WHERE id = ANY(${paidIds}::uuid[]) AND status = 'A_RECEBER'
  `;
  return { success: true, total, pagamentoId };
}

// ─── Listagens (admin) ────────────────────────────────────────────────────────

export interface RepresentanteResumo extends Representante {
  clinicas_ativas: number;
  total_previsto: number;
  total_a_receber: number;
  total_pago: number;
}

export async function listRepresentantes(): Promise<RepresentanteResumo[]> {
  await syncComissoes(null);
  const rows = await sql`
    SELECT r.*,
      (SELECT COUNT(*) FROM representante_vinculos v WHERE v.representante_id = r.id AND v.ativo) AS clinicas_ativas,
      COALESCE((SELECT SUM(valor) FROM representante_comissoes c WHERE c.representante_id = r.id AND c.status = 'PREVISTA'), 0) AS total_previsto,
      COALESCE((SELECT SUM(valor) FROM representante_comissoes c WHERE c.representante_id = r.id AND c.status = 'A_RECEBER'), 0) AS total_a_receber,
      COALESCE((SELECT SUM(valor) FROM representante_comissoes c WHERE c.representante_id = r.id AND c.status = 'PAGA'), 0) AS total_pago
    FROM representantes r
    ORDER BY r.created_at DESC
  `;
  return rows.map(r => ({
    ...mapRep(r),
    clinicas_ativas: Number(r.clinicas_ativas),
    total_previsto: Number(r.total_previsto),
    total_a_receber: Number(r.total_a_receber),
    total_pago: Number(r.total_pago),
  }));
}

export async function getRepresentanteById(id: string): Promise<Representante | null> {
  const rows = await sql`SELECT * FROM representantes WHERE id = ${id} LIMIT 1`;
  return rows[0] ? mapRep(rows[0]) : null;
}

export async function listPagamentos(representanteId: string) {
  const rows = await sql`
    SELECT id, total, observacao, comprovante_url, pago_em, pago_por, created_at
    FROM representante_pagamentos WHERE representante_id = ${representanteId}
    ORDER BY pago_em DESC, created_at DESC
  `;
  return rows.map(r => ({
    id: String(r.id),
    total: Number(r.total),
    observacao: (r.observacao as string) ?? null,
    comprovante_url: (r.comprovante_url as string) ?? null,
    pago_em: String(r.pago_em),
    pago_por: (r.pago_por as string) ?? null,
  }));
}

export async function listComissoes(representanteId: string, status?: string | null) {
  const st = status && status !== 'all' ? status : null;
  const rows = await sql`
    SELECT c.id, c.tipo, c.status, c.base_valor, c.percent, c.valor, c.competencia, c.liberada_em,
           c.clinic_id, cl.nome_fantasia AS clinica, c.pagamento_id
    FROM representante_comissoes c JOIN clinics cl ON cl.id = c.clinic_id
    WHERE c.representante_id = ${representanteId} AND (${st}::text IS NULL OR c.status = ${st})
    ORDER BY c.competencia DESC NULLS LAST, c.created_at DESC
    LIMIT 1000
  `;
  return rows.map(r => ({
    id: String(r.id),
    tipo: String(r.tipo) as ComissaoTipo,
    status: String(r.status) as ComissaoStatus,
    base_valor: Number(r.base_valor),
    percent: Number(r.percent),
    valor: Number(r.valor),
    competencia: r.competencia ? String(r.competencia) : null,
    liberada_em: r.liberada_em ? String(r.liberada_em) : null,
    clinic_id: String(r.clinic_id),
    clinica: String(r.clinica),
    pagamento_id: r.pagamento_id ? String(r.pagamento_id) : null,
  }));
}

export async function listClinicasDoRepresentante(representanteId: string) {
  const rows = await sql`
    SELECT v.id AS vinculo_id, v.clinic_id, v.comissao_percent, v.periodo_meses, v.inicio, v.fim, v.ativo AS vinculo_ativo,
           v.origem, c.nome_fantasia, c.razao_social, c.cidade, c.estado, c.ativo AS clinica_ativa, c.created_at AS clinica_criada_em
    FROM representante_vinculos v JOIN clinics c ON c.id = v.clinic_id
    WHERE v.representante_id = ${representanteId}
    ORDER BY v.ativo DESC, v.inicio DESC
  `;
  return rows.map(r => ({
    vinculo_id: String(r.vinculo_id),
    clinic_id: String(r.clinic_id),
    nome: String(r.nome_fantasia || r.razao_social),
    cidade: (r.cidade as string) ?? null,
    estado: (r.estado as string) ?? null,
    clinica_ativa: Boolean(r.clinica_ativa),
    comissao_percent: Number(r.comissao_percent),
    periodo_meses: r.periodo_meses === null ? null : Number(r.periodo_meses),
    inicio: String(r.inicio),
    fim: r.fim ? String(r.fim) : null,
    vinculo_ativo: Boolean(r.vinculo_ativo),
    origem: String(r.origem),
  }));
}

// ─── Dashboard de performance ─────────────────────────────────────────────────

const APROVADAS = new Set([
  'PRE_APPROVED', 'OFFERS_AVAILABLE', 'OFFER_SELECTED', 'CONTRACT_PENDING', 'CONTRACT_SENT',
  'CONTRACT_SIGNED', 'APPROVED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED',
]);
const CONTRATADAS = new Set(['CONTRACT_SIGNED', 'APPROVED', 'PAYOUT_SCHEDULED', 'PAYOUT_COMPLETED', 'TREATMENT_RELEASED']);
const LIBERADAS = new Set(['PAYOUT_COMPLETED', 'TREATMENT_RELEASED']);
const RECUSADAS = new Set(['DECLINED', 'PRE_ANALYSIS_DECLINED']);
const CANCELADAS = new Set(['CANCELLED', 'EXPIRED']);

export type Periodo = '30d' | '90d' | '12m' | 'all';

export interface DashboardData {
  periodo: Periodo;
  kpis: {
    clinicasTotal: number;
    clinicasAtivas: number;
    clinicasEmCredenciamento: number;
    clinicasInativasHa30d: number;
    propostas: number;
    aprovadas: number;
    contratadas: number;
    liberadas: number;
    recusadas: number;
    taxaAprovacao: number;
    taxaConversao: number;
    volumeSolicitado: number;
    volumeLiberado: number;
    ticketMedio: number;
    comissaoPrevista: number;
    comissaoAReceber: number;
    comissaoPaga: number;
    comissaoTotal: number;
    comissaoMesAtual: number;
  };
  serieMensal: { mes: string; label: string; propostas: number; volume: number; comissao: number; comissaoPaga: number }[];
  funil: { etapa: string; valor: number }[];
  statusDistribuicao: { nome: string; valor: number }[];
  porProcedimento: { nome: string; propostas: number; volume: number }[];
  ranking: {
    clinicId: string; nome: string; cidade: string | null; estado: string | null;
    ativa: boolean; propostas: number; aprovadas: number; volume: number;
    comissao: number; ultimaAtividade: string | null; diasSemAtividade: number | null;
    percent: number; periodoMeses: number | null; fimVinculo: string | null; vinculoAtivo: boolean;
  }[];
  ultimasComissoes: Awaited<ReturnType<typeof listComissoes>>;
  pagamentos: Awaited<ReturnType<typeof listPagamentos>>;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function sinceFor(periodo: Periodo): Date | null {
  const d = new Date();
  if (periodo === '30d') { d.setDate(d.getDate() - 30); return d; }
  if (periodo === '90d') { d.setDate(d.getDate() - 90); return d; }
  if (periodo === '12m') { d.setMonth(d.getMonth() - 12); return d; }
  return null;
}

export async function getDashboard(representanteId: string, periodo: Periodo = '12m'): Promise<DashboardData> {
  await syncComissoes(representanteId);
  const since = sinceFor(periodo);

  const [clinicasRows, comissoes, pagamentos] = await Promise.all([
    sql`
      SELECT v.clinic_id, v.comissao_percent, v.periodo_meses, v.fim, v.ativo AS vinculo_ativo,
             c.nome_fantasia, c.razao_social, c.cidade, c.estado, c.ativo AS clinica_ativa, c.email,
             (SELECT o.status::text FROM clinic_onboardings o WHERE o.clinic_id = c.id ORDER BY o.created_at DESC LIMIT 1) AS onboarding_status
      FROM representante_vinculos v JOIN clinics c ON c.id = v.clinic_id
      WHERE v.representante_id = ${representanteId}
    `,
    listComissoes(representanteId),
    listPagamentos(representanteId),
  ]);

  const clinicIds = Array.from(new Set(clinicasRows.map(r => String(r.clinic_id))));
  const appRows = clinicIds.length === 0 ? [] : await sql`
    SELECT a.clinic_id, a.status::text AS status, a.categoria, a.procedimento, a.valor_financiado, a.created_at
    FROM applications a
    WHERE a.clinic_id = ANY(${clinicIds}::uuid[]) AND a.status::text <> 'DRAFT'
    ORDER BY a.created_at DESC
    LIMIT 20000
  `;

  const apps = appRows
    .map(a => ({
      clinicId: String(a.clinic_id),
      status: String(a.status),
      proc: String(a.categoria || a.procedimento || 'Outros'),
      valor: Number(a.valor_financiado || 0),
      at: new Date(String(a.created_at)),
    }))
    .filter(a => !since || a.at >= since);

  // KPIs de propostas
  let aprovadas = 0, contratadas = 0, liberadas = 0, recusadas = 0, volumeSolicitado = 0, volumeLiberado = 0;
  const statusCount = new Map<string, number>();
  const procMap = new Map<string, { propostas: number; volume: number }>();
  for (const a of apps) {
    volumeSolicitado += a.valor;
    if (APROVADAS.has(a.status)) aprovadas++;
    if (CONTRATADAS.has(a.status)) contratadas++;
    if (LIBERADAS.has(a.status)) { liberadas++; volumeLiberado += a.valor; }
    if (RECUSADAS.has(a.status)) recusadas++;
    const grupo = LIBERADAS.has(a.status) ? 'Liberadas'
      : CONTRATADAS.has(a.status) ? 'Contrato assinado'
      : APROVADAS.has(a.status) ? 'Aprovadas'
      : RECUSADAS.has(a.status) ? 'Recusadas'
      : CANCELADAS.has(a.status) ? 'Canceladas/expiradas'
      : 'Em análise';
    statusCount.set(grupo, (statusCount.get(grupo) ?? 0) + 1);
    const p = procMap.get(a.proc) ?? { propostas: 0, volume: 0 };
    p.propostas++; p.volume += a.valor;
    procMap.set(a.proc, p);
  }

  // Comissões (período filtra pela competência, exceto "tudo")
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const sum = (st: ComissaoStatus) => comissoes.filter(c => c.status === st).reduce((s, c) => s + c.valor, 0);
  const comissaoMesAtual = comissoes
    .filter(c => c.status !== 'CANCELADA' && c.competencia?.slice(0, 7) === mesAtual)
    .reduce((s, c) => s + c.valor, 0);

  // Série mensal (últimos 12 meses)
  const serie: DashboardData['serieMensal'] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    serie.push({ mes: key, label: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, propostas: 0, volume: 0, comissao: 0, comissaoPaga: 0 });
  }
  const serieIdx = new Map(serie.map((s, i) => [s.mes, i]));
  for (const a of appRows) {
    const d = new Date(String(a.created_at));
    const idx = serieIdx.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    if (idx !== undefined) { serie[idx].propostas++; serie[idx].volume += Number(a.valor_financiado || 0); }
  }
  for (const c of comissoes) {
    if (c.status === 'CANCELADA' || !c.competencia) continue;
    const idx = serieIdx.get(c.competencia.slice(0, 7));
    if (idx !== undefined) {
      serie[idx].comissao += c.valor;
      if (c.status === 'PAGA') serie[idx].comissaoPaga += c.valor;
    }
  }

  // Ranking de clínicas
  const comissaoPorClinica = new Map<string, number>();
  for (const c of comissoes) {
    if (c.status === 'CANCELADA') continue;
    comissaoPorClinica.set(c.clinic_id, (comissaoPorClinica.get(c.clinic_id) ?? 0) + c.valor);
  }
  const appsPorClinica = new Map<string, { propostas: number; aprovadas: number; volume: number; ultima: Date | null }>();
  for (const a of appRows) {
    const id = String(a.clinic_id);
    const at = new Date(String(a.created_at));
    const cur = appsPorClinica.get(id) ?? { propostas: 0, aprovadas: 0, volume: 0, ultima: null };
    const inPeriod = !since || at >= since;
    if (inPeriod) {
      cur.propostas++;
      cur.volume += Number(a.valor_financiado || 0);
      if (APROVADAS.has(String(a.status))) cur.aprovadas++;
    }
    if (!cur.ultima || at > cur.ultima) cur.ultima = at;
    appsPorClinica.set(id, cur);
  }

  const ranking: DashboardData['ranking'] = clinicasRows.map(r => {
    const id = String(r.clinic_id);
    const ag = appsPorClinica.get(id);
    const dias = ag?.ultima ? Math.floor((now.getTime() - ag.ultima.getTime()) / 86400000) : null;
    return {
      clinicId: id,
      nome: String(r.nome_fantasia || r.razao_social),
      cidade: (r.cidade as string) ?? null,
      estado: (r.estado as string) ?? null,
      ativa: Boolean(r.clinica_ativa),
      propostas: ag?.propostas ?? 0,
      aprovadas: ag?.aprovadas ?? 0,
      volume: ag?.volume ?? 0,
      comissao: comissaoPorClinica.get(id) ?? 0,
      ultimaAtividade: ag?.ultima ? ag.ultima.toISOString() : null,
      diasSemAtividade: dias,
      percent: Number(r.comissao_percent),
      periodoMeses: r.periodo_meses === null ? null : Number(r.periodo_meses),
      fimVinculo: r.fim ? String(r.fim) : null,
      vinculoAtivo: Boolean(r.vinculo_ativo),
    };
  }).sort((a, b) => b.comissao - a.comissao || b.volume - a.volume);

  const ativas = clinicasRows.filter(r => r.vinculo_ativo && r.clinica_ativa).length;
  const emCred = clinicasRows.filter(r => r.vinculo_ativo && !r.clinica_ativa).length;
  const inativas30 = ranking.filter(r => r.vinculoAtivo && r.ativa && (r.diasSemAtividade === null || r.diasSemAtividade > 30)).length;

  const decididas = aprovadas + recusadas;
  const propostas = apps.length;

  return {
    periodo,
    kpis: {
      clinicasTotal: clinicasRows.filter(r => r.vinculo_ativo).length,
      clinicasAtivas: ativas,
      clinicasEmCredenciamento: emCred,
      clinicasInativasHa30d: inativas30,
      propostas,
      aprovadas,
      contratadas,
      liberadas,
      recusadas,
      taxaAprovacao: decididas > 0 ? (aprovadas / decididas) * 100 : 0,
      taxaConversao: propostas > 0 ? (liberadas / propostas) * 100 : 0,
      volumeSolicitado,
      volumeLiberado,
      ticketMedio: propostas > 0 ? volumeSolicitado / propostas : 0,
      comissaoPrevista: sum('PREVISTA'),
      comissaoAReceber: sum('A_RECEBER'),
      comissaoPaga: sum('PAGA'),
      comissaoTotal: sum('PREVISTA') + sum('A_RECEBER') + sum('PAGA'),
      comissaoMesAtual,
    },
    serieMensal: serie,
    funil: [
      { etapa: 'Propostas', valor: propostas },
      { etapa: 'Aprovadas', valor: aprovadas },
      { etapa: 'Contrato assinado', valor: contratadas },
      { etapa: 'Liberadas', valor: liberadas },
    ],
    statusDistribuicao: Array.from(statusCount, ([nome, valor]) => ({ nome, valor })),
    porProcedimento: Array.from(procMap, ([nome, v]) => ({ nome, ...v })).sort((a, b) => b.volume - a.volume).slice(0, 8),
    ranking,
    ultimasComissoes: comissoes.slice(0, 15),
    pagamentos: pagamentos.slice(0, 20),
  };
}

export function parsePeriodo(v: string | null | undefined): Periodo {
  return v === '30d' || v === '90d' || v === 'all' ? v : '12m';
}

