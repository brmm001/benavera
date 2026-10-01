// src/lib/atendente-db.ts
// Funções de banco de dados para a área de atendentes Benavera

import { sql } from './benavera-db';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type ProspectClinicStatus = 'prospeccao' | 'em_negociacao' | 'vinculada' | 'arquivada';
export type CommissionStatus = 'pendente' | 'aprovada' | 'paga' | 'recusada' | 'estornada';
export type NoteType = 'nota' | 'contato' | 'agendamento' | 'proposta' | 'encerramento';
export type DistribuicaoResultado = 'distribuido' | 'sem_atendentes' | 'limite_atingido';

export interface ProspectClinic {
  id: string;
  cnpj: string;
  nome_fantasia: string;
  razao_social: string | null;
  responsavel: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  especialidade: string | null;
  status: ProspectClinicStatus;
  assigned_to: string;
  assigned_at: string;
  clinic_lead_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  transfer_log: TransferLogEntry[];
  // Joined
  atendente_name?: string;
}

export interface TransferLogEntry {
  de: string;
  para: string;
  de_name: string;
  para_name: string;
  admin_id: string;
  admin_name: string;
  motivo: string | null;
  data: string;
}

export interface Commission {
  id: string;
  prospect_clinic_id: string;
  atendente_id: string;
  atendente_name: string;
  evento: string;
  valor: number;
  status: CommissionStatus;
  justificativa: string | null;
  regra_id: string | null;
  gerada_por: string;
  aprovada_por: string | null;
  paga_por: string | null;
  gerada_at: string;
  aprovada_at: string | null;
  paga_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  clinica_nome?: string;
  clinica_cnpj?: string;
}

export interface CommissionRule {
  id: string;
  nome: string;
  evento: string;
  valor: number;
  ativa: boolean;
  created_by: string;
  created_at: string;
}

export interface AtendimentoNote {
  id: string;
  lead_id: string | null;
  prospect_clinic_id: string | null;
  atendente_id: string;
  tipo: NoteType;
  conteudo: string;
  proxima_data: string | null;
  created_at: string;
}

// ─── Normalização de CNPJ ──────────────────────────────────────────────────

export function normalizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function validateCnpj(cnpj: string): boolean {
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(digits[i]) * weights[i];
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const d1 = calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2;
}

// ─── Verificação de unicidade de CNPJ ────────────────────────────────────

export async function checkCnpjExists(cnpj: string): Promise<{
  exists: boolean;
  isOwnClinic?: boolean;
  status?: string;
}> {
  const normalized = normalizeCnpj(cnpj);
  const rows = await sql`
    SELECT id, assigned_to, status FROM prospect_clinics WHERE cnpj = ${normalized}
  `;
  if (rows.length === 0) return { exists: false };
  return { exists: true, status: String(rows[0].status) };
}

// ─── Prospect Clinics ─────────────────────────────────────────────────────

export async function getAtendenteClinicas(
  atendenteId: string,
  options?: { search?: string; status?: string }
): Promise<ProspectClinic[]> {
  const search = options?.search ? `%${options.search}%` : null;
  const status = options?.status && options.status !== 'all' ? options.status : null;

  let rows;
  if (status && search) {
    rows = await sql`
      SELECT pc.*, u.name as atendente_name
      FROM prospect_clinics pc
      LEFT JOIN users u ON u.id = pc.assigned_to
      WHERE pc.assigned_to = ${atendenteId}::uuid
        AND pc.status = ${status}
        AND (pc.nome_fantasia ILIKE ${search} OR pc.cnpj ILIKE ${search}
          OR pc.cidade ILIKE ${search} OR pc.responsavel ILIKE ${search})
      ORDER BY pc.updated_at DESC
    `;
  } else if (status) {
    rows = await sql`
      SELECT pc.*, u.name as atendente_name
      FROM prospect_clinics pc
      LEFT JOIN users u ON u.id = pc.assigned_to
      WHERE pc.assigned_to = ${atendenteId}::uuid AND pc.status = ${status}
      ORDER BY pc.updated_at DESC
    `;
  } else if (search) {
    rows = await sql`
      SELECT pc.*, u.name as atendente_name
      FROM prospect_clinics pc
      LEFT JOIN users u ON u.id = pc.assigned_to
      WHERE pc.assigned_to = ${atendenteId}::uuid
        AND (pc.nome_fantasia ILIKE ${search} OR pc.cnpj ILIKE ${search}
          OR pc.cidade ILIKE ${search} OR pc.responsavel ILIKE ${search})
      ORDER BY pc.updated_at DESC
    `;
  } else {
    rows = await sql`
      SELECT pc.*, u.name as atendente_name
      FROM prospect_clinics pc
      LEFT JOIN users u ON u.id = pc.assigned_to
      WHERE pc.assigned_to = ${atendenteId}::uuid
      ORDER BY pc.updated_at DESC
    `;
  }

  return rows.map(mapProspectClinic);
}

export async function getClinicaById(id: string, atendenteId?: string): Promise<ProspectClinic | null> {
  let rows;
  if (atendenteId) {
    rows = await sql`
      SELECT pc.*, u.name as atendente_name
      FROM prospect_clinics pc
      LEFT JOIN users u ON u.id = pc.assigned_to
      WHERE pc.id = ${id} AND pc.assigned_to = ${atendenteId}::uuid
    `;
  } else {
    rows = await sql`
      SELECT pc.*, u.name as atendente_name
      FROM prospect_clinics pc
      LEFT JOIN users u ON u.id = pc.assigned_to
      WHERE pc.id = ${id}
    `;
  }
  if (!rows[0]) return null;
  return mapProspectClinic(rows[0]);
}

export async function createProspectClinica(data: {
  cnpj: string;
  nome_fantasia: string;
  razao_social?: string;
  responsavel?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  especialidade?: string;
  clinic_lead_id?: string;
  assigned_to: string;
  created_by: string;
}): Promise<{ success: boolean; clinic?: ProspectClinic; error?: string }> {
  const normalized = normalizeCnpj(data.cnpj);

  // Verificar unicidade com lock para prevenir duplicidade concorrente
  const existing = await sql`
    SELECT id, status FROM prospect_clinics WHERE cnpj = ${normalized}
  `;
  if (existing.length > 0) {
    return {
      success: false,
      error: 'Este CNPJ já está cadastrado no sistema. Para rever ou transferir o vínculo, contate o administrador.',
    };
  }

  const rows = await sql`
    INSERT INTO prospect_clinics (
      cnpj, nome_fantasia, razao_social, responsavel, telefone, email,
      cidade, estado, especialidade, clinic_lead_id,
      assigned_to, created_by
    ) VALUES (
      ${normalized}, ${data.nome_fantasia}, ${data.razao_social ?? null},
      ${data.responsavel ?? null}, ${data.telefone ?? null}, ${data.email ?? null},
      ${data.cidade ?? null}, ${data.estado ?? null}, ${data.especialidade ?? null},
      ${data.clinic_lead_id ?? null}, ${data.assigned_to}::uuid, ${data.created_by}::uuid
    )
    RETURNING *
  `;

  if (!rows[0]) return { success: false, error: 'Erro ao cadastrar clínica.' };

  // Vincular clinic_lead ao prospect
  if (data.clinic_lead_id) {
    await sql`
      UPDATE clinic_leads SET prospect_clinic_id = ${rows[0].id}
      WHERE id = ${data.clinic_lead_id}
    `;
  }

  return { success: true, clinic: mapProspectClinic(rows[0]) };
}

export async function updateProspectClinica(
  id: string,
  atendenteId: string,
  data: Partial<{
    nome_fantasia: string;
    razao_social: string;
    responsavel: string;
    telefone: string;
    email: string;
    cidade: string;
    estado: string;
    especialidade: string;
    status: ProspectClinicStatus;
  }>
): Promise<boolean> {
  // Só o atendente dono pode editar (admin usa rota própria)
  const result = await sql`
    UPDATE prospect_clinics SET
      nome_fantasia = COALESCE(${data.nome_fantasia ?? null}, nome_fantasia),
      razao_social = COALESCE(${data.razao_social ?? null}, razao_social),
      responsavel = COALESCE(${data.responsavel ?? null}, responsavel),
      telefone = COALESCE(${data.telefone ?? null}, telefone),
      email = COALESCE(${data.email ?? null}, email),
      cidade = COALESCE(${data.cidade ?? null}, cidade),
      estado = COALESCE(${data.estado ?? null}, estado),
      especialidade = COALESCE(${data.especialidade ?? null}, especialidade),
      status = COALESCE(${data.status ?? null}, status),
      updated_at = NOW()
    WHERE id = ${id} AND assigned_to = ${atendenteId}::uuid
    RETURNING id
  `;
  return result.length > 0;
}

// Admin: transferir clínica preservando histórico
export async function transferClinica(
  clinicaId: string,
  novoAtendenteId: string,
  adminId: string,
  adminName: string,
  motivo: string | null
): Promise<{ success: boolean; error?: string }> {
  const rows = await sql`
    SELECT pc.*, u.name as atendente_de_name
    FROM prospect_clinics pc
    LEFT JOIN users u ON u.id = pc.assigned_to
    WHERE pc.id = ${clinicaId}
  `;
  if (!rows[0]) return { success: false, error: 'Clínica não encontrada.' };

  const novoAtendente = await sql`SELECT name FROM users WHERE id = ${novoAtendenteId}::uuid`;
  if (!novoAtendente[0]) return { success: false, error: 'Atendente destino não encontrado.' };

  const logEntry: TransferLogEntry = {
    de: String(rows[0].assigned_to),
    para: novoAtendenteId,
    de_name: String(rows[0].atendente_de_name || 'Desconhecido'),
    para_name: String(novoAtendente[0].name),
    admin_id: adminId,
    admin_name: adminName,
    motivo,
    data: new Date().toISOString(),
  };

  const existingLog = (typeof rows[0].transfer_log === 'string'
    ? JSON.parse(rows[0].transfer_log)
    : rows[0].transfer_log) as TransferLogEntry[];

  await sql`
    UPDATE prospect_clinics SET
      assigned_to = ${novoAtendenteId}::uuid,
      assigned_at = NOW(),
      transfer_log = ${JSON.stringify([...existingLog, logEntry])},
      updated_at = NOW()
    WHERE id = ${clinicaId}
  `;

  return { success: true };
}

// ─── Leads do Atendente ────────────────────────────────────────────────────

export async function getAtendenteClinicLeads(
  atendenteId: string,
  options?: { search?: string; status?: string; limit?: number; offset?: number }
) {
  const search = options?.search ? `%${options.search}%` : null;
  const status = options?.status && options.status !== 'all' ? options.status : null;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let rows;
  if (status && search) {
    rows = await sql`
      SELECT * FROM clinic_leads
      WHERE assigned_to = ${atendenteId}::uuid
        AND status_comercial = ${status}
        AND (nome_responsavel ILIKE ${search} OR nome_clinica ILIKE ${search})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (status) {
    rows = await sql`
      SELECT * FROM clinic_leads
      WHERE assigned_to = ${atendenteId}::uuid AND status_comercial = ${status}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (search) {
    rows = await sql`
      SELECT * FROM clinic_leads
      WHERE assigned_to = ${atendenteId}::uuid
        AND (nome_responsavel ILIKE ${search} OR nome_clinica ILIKE ${search})
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    rows = await sql`
      SELECT * FROM clinic_leads
      WHERE assigned_to = ${atendenteId}::uuid
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }
  return rows;
}

export async function getAtendentePatientLeads(
  atendenteId: string,
  options?: { limit?: number; offset?: number }
) {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  return sql`
    SELECT * FROM patient_leads
    WHERE assigned_to = ${atendenteId}::uuid
    ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
  `;
}

// ─── Notas de Atendimento ──────────────────────────────────────────────────

export async function createNote(data: {
  lead_id?: string;
  prospect_clinic_id?: string;
  atendente_id: string;
  tipo: NoteType;
  conteudo: string;
  proxima_data?: string;
}): Promise<AtendimentoNote> {
  const rows = await sql`
    INSERT INTO atendimento_notes (lead_id, prospect_clinic_id, atendente_id, tipo, conteudo, proxima_data)
    VALUES (${data.lead_id ?? null}, ${data.prospect_clinic_id ?? null},
      ${data.atendente_id}::uuid, ${data.tipo}, ${data.conteudo},
      ${data.proxima_data ?? null})
    RETURNING *
  `;
  return mapNote(rows[0]);
}

export async function getNotes(
  atendenteId: string,
  filters: { lead_id?: string; prospect_clinic_id?: string }
): Promise<AtendimentoNote[]> {
  if (filters.prospect_clinic_id) {
    // Verificar que a clínica pertence ao atendente
    const rows = await sql`
      SELECT an.* FROM atendimento_notes an
      JOIN prospect_clinics pc ON pc.id = an.prospect_clinic_id
      WHERE an.prospect_clinic_id = ${filters.prospect_clinic_id}
        AND pc.assigned_to = ${atendenteId}::uuid
      ORDER BY an.created_at DESC
    `;
    return rows.map(mapNote);
  }
  if (filters.lead_id) {
    const rows = await sql`
      SELECT * FROM atendimento_notes
      WHERE lead_id = ${filters.lead_id} AND atendente_id = ${atendenteId}::uuid
      ORDER BY created_at DESC
    `;
    return rows.map(mapNote);
  }
  return [];
}

// ─── Comissões do Atendente ────────────────────────────────────────────────

export async function getAtendenteComissoes(atendenteId: string): Promise<Commission[]> {
  const rows = await sql`
    SELECT c.*, pc.nome_fantasia as clinica_nome, pc.cnpj as clinica_cnpj
    FROM commissions c
    JOIN prospect_clinics pc ON pc.id = c.prospect_clinic_id
    WHERE c.atendente_id = ${atendenteId}::uuid
    ORDER BY c.gerada_at DESC
  `;
  return rows.map(mapCommission);
}

// ─── Admin: Listagem de Atendentes ────────────────────────────────────────

export async function getAtendentes(options?: { search?: string; ativo?: boolean }) {
  const search = options?.search ? `%${options.search}%` : null;

  let rows;
  if (search) {
    rows = await sql`
      SELECT u.*,
        COUNT(DISTINCT CASE WHEN cl.status_comercial NOT IN ('perdido','parceiro_ativo') THEN cl.id END) as active_clinic_leads,
        COUNT(DISTINCT pc.id) as total_clinicas
      FROM users u
      LEFT JOIN clinic_leads cl ON cl.assigned_to = u.id
      LEFT JOIN prospect_clinics pc ON pc.assigned_to = u.id AND pc.status != 'arquivada'
      WHERE u.role = 'BENAVERA_COMERCIAL'
        AND (u.name ILIKE ${search} OR u.email ILIKE ${search})
      GROUP BY u.id
      ORDER BY u.name
    `;
  } else {
    rows = await sql`
      SELECT u.*,
        COUNT(DISTINCT CASE WHEN cl.status_comercial NOT IN ('perdido','parceiro_ativo') THEN cl.id END) as active_clinic_leads,
        COUNT(DISTINCT pc.id) as total_clinicas
      FROM users u
      LEFT JOIN clinic_leads cl ON cl.assigned_to = u.id
      LEFT JOIN prospect_clinics pc ON pc.assigned_to = u.id AND pc.status != 'arquivada'
      WHERE u.role = 'BENAVERA_COMERCIAL'
      GROUP BY u.id
      ORDER BY u.name
    `;
  }
  return rows;
}

export async function getAtendenteById(id: string) {
  const rows = await sql`
    SELECT u.*,
      COUNT(DISTINCT cl.id) FILTER (WHERE cl.status_comercial NOT IN ('perdido','parceiro_ativo')) as active_leads,
      COUNT(DISTINCT pc.id) FILTER (WHERE pc.status != 'arquivada') as total_clinicas
    FROM users u
    LEFT JOIN clinic_leads cl ON cl.assigned_to = u.id
    LEFT JOIN prospect_clinics pc ON pc.assigned_to = u.id
    WHERE u.id = ${id}::uuid
    GROUP BY u.id
  `;
  return rows[0] ?? null;
}

export async function updateAtendenteConfig(
  id: string,
  data: { lead_limit?: number; receiving_leads?: boolean; ativo?: boolean }
): Promise<boolean> {
  const result = await sql`
    UPDATE users SET
      lead_limit = COALESCE(${data.lead_limit ?? null}, lead_limit),
      receiving_leads = COALESCE(${data.receiving_leads ?? null}, receiving_leads),
      ativo = COALESCE(${data.ativo ?? null}, ativo),
      updated_at = NOW()
    WHERE id = ${id}::uuid AND role = 'BENAVERA_COMERCIAL'
    RETURNING id
  `;
  return result.length > 0;
}

// ─── Admin: Comissões ─────────────────────────────────────────────────────

export async function getAllComissoes(options?: {
  status?: string;
  atendente_id?: string;
}) {
  const statusFilter = options?.status && options.status !== 'all' ? options.status : null;
  const atendenteFilter = options?.atendente_id ?? null;

  let rows;
  if (statusFilter && atendenteFilter) {
    rows = await sql`
      SELECT c.*, pc.nome_fantasia as clinica_nome, pc.cnpj as clinica_cnpj
      FROM commissions c
      JOIN prospect_clinics pc ON pc.id = c.prospect_clinic_id
      WHERE c.status = ${statusFilter} AND c.atendente_id = ${atendenteFilter}::uuid
      ORDER BY c.gerada_at DESC
    `;
  } else if (statusFilter) {
    rows = await sql`
      SELECT c.*, pc.nome_fantasia as clinica_nome, pc.cnpj as clinica_cnpj
      FROM commissions c
      JOIN prospect_clinics pc ON pc.id = c.prospect_clinic_id
      WHERE c.status = ${statusFilter}
      ORDER BY c.gerada_at DESC
    `;
  } else if (atendenteFilter) {
    rows = await sql`
      SELECT c.*, pc.nome_fantasia as clinica_nome, pc.cnpj as clinica_cnpj
      FROM commissions c
      JOIN prospect_clinics pc ON pc.id = c.prospect_clinic_id
      WHERE c.atendente_id = ${atendenteFilter}::uuid
      ORDER BY c.gerada_at DESC
    `;
  } else {
    rows = await sql`
      SELECT c.*, pc.nome_fantasia as clinica_nome, pc.cnpj as clinica_cnpj
      FROM commissions c
      JOIN prospect_clinics pc ON pc.id = c.prospect_clinic_id
      ORDER BY c.gerada_at DESC
    `;
  }
  return rows.map(mapCommission);
}

export async function createComissao(data: {
  prospect_clinic_id: string;
  atendente_id: string;
  atendente_name: string;
  evento: string;
  valor: number;
  regra_id?: string;
  gerada_por: string;
}): Promise<{ success: boolean; commission?: Commission; error?: string }> {
  // Verificar duplicidade (1 comissão por clínica+evento, exceto estornadas)
  const existing = await sql`
    SELECT id FROM commissions
    WHERE prospect_clinic_id = ${data.prospect_clinic_id}
      AND evento = ${data.evento}
      AND status != 'estornada'
  `;
  if (existing.length > 0) {
    return { success: false, error: 'Já existe uma comissão ativa para este evento nesta clínica.' };
  }

  const rows = await sql`
    INSERT INTO commissions (
      prospect_clinic_id, atendente_id, atendente_name, evento,
      valor, regra_id, gerada_por
    ) VALUES (
      ${data.prospect_clinic_id}, ${data.atendente_id}::uuid, ${data.atendente_name},
      ${data.evento}, ${data.valor}, ${data.regra_id ?? null}, ${data.gerada_por}::uuid
    )
    RETURNING *
  `;
  return { success: true, commission: mapCommission(rows[0]) };
}

export async function updateComissaoStatus(
  id: string,
  status: CommissionStatus,
  operadorId: string,
  justificativa?: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await sql`
    UPDATE commissions SET
      status = ${status},
      justificativa = COALESCE(${justificativa ?? null}, justificativa),
      aprovada_por = CASE WHEN ${status} = 'aprovada' THEN ${operadorId}::uuid ELSE aprovada_por END,
      paga_por = CASE WHEN ${status} = 'paga' THEN ${operadorId}::uuid ELSE paga_por END,
      aprovada_at = CASE WHEN ${status} = 'aprovada' THEN NOW() ELSE aprovada_at END,
      paga_at = CASE WHEN ${status} = 'paga' THEN NOW() ELSE paga_at END,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  return result.length > 0;
}

export async function getCommissionRules(): Promise<CommissionRule[]> {
  const rows = await sql`SELECT * FROM commission_rules WHERE ativa = TRUE ORDER BY created_at DESC`;
  return rows.map(r => ({
    id: String(r.id),
    nome: String(r.nome),
    evento: String(r.evento),
    valor: Number(r.valor),
    ativa: Boolean(r.ativa),
    created_by: String(r.created_by),
    created_at: String(r.created_at),
  }));
}

export async function createCommissionRule(data: {
  nome: string;
  evento: string;
  valor: number;
  created_by: string;
}): Promise<CommissionRule> {
  const rows = await sql`
    INSERT INTO commission_rules (nome, evento, valor, created_by)
    VALUES (${data.nome}, ${data.evento}, ${data.valor}, ${data.created_by}::uuid)
    RETURNING *
  `;
  return {
    id: String(rows[0].id),
    nome: String(rows[0].nome),
    evento: String(rows[0].evento),
    valor: Number(rows[0].valor),
    ativa: Boolean(rows[0].ativa),
    created_by: String(rows[0].created_by),
    created_at: String(rows[0].created_at),
  };
}

// ─── Admin: Log de distribuição ────────────────────────────────────────────

export async function getDistribuicaoLog(options?: { limit?: number }) {
  const limit = options?.limit ?? 100;
  return sql`
    SELECT dl.*, u.name as atendente_name
    FROM lead_distribution_log dl
    LEFT JOIN users u ON u.id = dl.atendente_id
    ORDER BY dl.created_at DESC
    LIMIT ${limit}
  `;
}

// ─── Mappers ───────────────────────────────────────────────────────────────

function mapProspectClinic(row: Record<string, unknown>): ProspectClinic {
  return {
    id: String(row.id),
    cnpj: String(row.cnpj),
    nome_fantasia: String(row.nome_fantasia),
    razao_social: row.razao_social ? String(row.razao_social) : null,
    responsavel: row.responsavel ? String(row.responsavel) : null,
    telefone: row.telefone ? String(row.telefone) : null,
    email: row.email ? String(row.email) : null,
    cidade: row.cidade ? String(row.cidade) : null,
    estado: row.estado ? String(row.estado) : null,
    especialidade: row.especialidade ? String(row.especialidade) : null,
    status: row.status as ProspectClinicStatus,
    assigned_to: String(row.assigned_to),
    assigned_at: String(row.assigned_at),
    clinic_lead_id: row.clinic_lead_id ? String(row.clinic_lead_id) : null,
    created_by: String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    transfer_log: typeof row.transfer_log === 'string'
      ? JSON.parse(row.transfer_log)
      : (row.transfer_log as TransferLogEntry[] ?? []),
    atendente_name: row.atendente_name ? String(row.atendente_name) : undefined,
  };
}

function mapCommission(row: Record<string, unknown>): Commission {
  return {
    id: String(row.id),
    prospect_clinic_id: String(row.prospect_clinic_id),
    atendente_id: String(row.atendente_id),
    atendente_name: String(row.atendente_name),
    evento: String(row.evento),
    valor: Number(row.valor),
    status: row.status as CommissionStatus,
    justificativa: row.justificativa ? String(row.justificativa) : null,
    regra_id: row.regra_id ? String(row.regra_id) : null,
    gerada_por: String(row.gerada_por),
    aprovada_por: row.aprovada_por ? String(row.aprovada_por) : null,
    paga_por: row.paga_por ? String(row.paga_por) : null,
    gerada_at: String(row.gerada_at),
    aprovada_at: row.aprovada_at ? String(row.aprovada_at) : null,
    paga_at: row.paga_at ? String(row.paga_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    clinica_nome: row.clinica_nome ? String(row.clinica_nome) : undefined,
    clinica_cnpj: row.clinica_cnpj ? String(row.clinica_cnpj) : undefined,
  };
}

function mapNote(row: Record<string, unknown>): AtendimentoNote {
  return {
    id: String(row.id),
    lead_id: row.lead_id ? String(row.lead_id) : null,
    prospect_clinic_id: row.prospect_clinic_id ? String(row.prospect_clinic_id) : null,
    atendente_id: String(row.atendente_id),
    tipo: row.tipo as NoteType,
    conteudo: String(row.conteudo),
    proxima_data: row.proxima_data ? String(row.proxima_data) : null,
    created_at: String(row.created_at),
  };
}
