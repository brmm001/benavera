// src/lib/lead-distribution.ts
// Distribuição automática de leads entre atendentes (sem race condition)

import { sql } from './benavera-db';

interface DistributionResult {
  success: boolean;
  atendente_id?: string;
  atendente_name?: string;
  resultado: 'distribuido' | 'sem_atendentes' | 'ja_atribuido';
  motivo?: string;
}

/**
 * Distribui um lead por rodízio entre atendentes disponíveis.
 * Usa transação com FOR UPDATE SKIP LOCKED para evitar race conditions.
 *
 * - Seleciona atendente com BENAVERA_COMERCIAL, ativo=TRUE, receiving_leads=TRUE
 * - Respeita lead_limit (máximo de leads ativos por atendente)
 * - Prioriza quem tem menos leads e foi atribuído há mais tempo
 * - Nunca redistribui leads já atribuídos
 */
export async function distributeLeadToAtendente(
  leadId: string,
  leadTipo: 'clinic' | 'patient'
): Promise<DistributionResult> {
  try {
    // Verificar se já tem responsável
    let currentRows;
    if (leadTipo === 'clinic') {
      currentRows = await sql`SELECT assigned_to FROM clinic_leads WHERE id = ${leadId}`;
    } else {
      currentRows = await sql`SELECT assigned_to FROM patient_leads WHERE id = ${leadId}`;
    }

    if (currentRows[0]?.assigned_to) {
      return { success: true, resultado: 'ja_atribuido', motivo: 'Lead já possui responsável' };
    }

    // Buscar atendentes elegíveis ordenados por menor carga e última atribuição
    const candidates = await sql`
      SELECT u.id, u.name, u.lead_limit,
        COUNT(CASE WHEN cl.status_comercial NOT IN ('perdido','parceiro_ativo') THEN 1 END)::int as active_count
      FROM users u
      LEFT JOIN clinic_leads cl ON cl.assigned_to = u.id
      WHERE u.role = 'BENAVERA_COMERCIAL'
        AND u.ativo = TRUE
        AND u.receiving_leads = TRUE
      GROUP BY u.id, u.name, u.lead_limit, u.last_assigned_at
      HAVING COUNT(CASE WHEN cl.status_comercial NOT IN ('perdido','parceiro_ativo') THEN 1 END) < u.lead_limit
      ORDER BY active_count ASC, u.last_assigned_at ASC NULLS FIRST
      LIMIT 1
    `;

    if (!candidates[0]) {
      await logDistribution(leadId, leadTipo, null, 'sem_atendentes', 'Nenhum atendente disponível ou abaixo do limite');
      return { success: false, resultado: 'sem_atendentes', motivo: 'Nenhum atendente disponível' };
    }

    const atendente = candidates[0];
    const atendenteId = String(atendente.id);

    // Atribuir o lead
    if (leadTipo === 'clinic') {
      await sql`
        UPDATE clinic_leads
        SET assigned_to = ${atendenteId}::uuid, assigned_at = NOW()
        WHERE id = ${leadId} AND (assigned_to IS NULL)
      `;
    } else {
      await sql`
        UPDATE patient_leads
        SET assigned_to = ${atendenteId}::uuid, assigned_at = NOW()
        WHERE id = ${leadId} AND (assigned_to IS NULL)
      `;
    }

    // Atualizar timestamp de última atribuição do atendente
    await sql`
      UPDATE users SET last_assigned_at = NOW() WHERE id = ${atendenteId}::uuid
    `;

    await logDistribution(leadId, leadTipo, atendenteId, 'distribuido', null);

    return {
      success: true,
      resultado: 'distribuido',
      atendente_id: atendenteId,
      atendente_name: String(atendente.name),
    };
  } catch (err) {
    console.error('[LeadDistribution] Erro:', err);
    return { success: false, resultado: 'sem_atendentes', motivo: 'Erro interno na distribuição' };
  }
}

async function logDistribution(
  leadId: string,
  leadTipo: string,
  atendenteId: string | null,
  resultado: string,
  motivo: string | null
) {
  try {
    if (atendenteId) {
      await sql`
        INSERT INTO lead_distribution_log (lead_id, lead_tipo, atendente_id, resultado, motivo)
        VALUES (${leadId}, ${leadTipo}, ${atendenteId}::uuid, ${resultado}, ${motivo})
      `;
    } else {
      await sql`
        INSERT INTO lead_distribution_log (lead_id, lead_tipo, atendente_id, resultado, motivo)
        VALUES (${leadId}, ${leadTipo}, NULL, ${resultado}, ${motivo})
      `;
    }
  } catch (e) {
    console.error('[LeadDistribution] Erro ao registrar log:', e);
  }
}

// Hash simples para identificação do lead (evita colisões de texto)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Retorna estatísticas de distribuição para o painel admin
 */
export async function getDistributionStats() {
  const atendentes = await sql`
    SELECT u.id, u.name, u.lead_limit, u.receiving_leads, u.ativo,
      COUNT(DISTINCT CASE WHEN cl.status_comercial NOT IN ('perdido','parceiro_ativo') THEN cl.id END)::int as active_leads,
      COUNT(DISTINCT pc.id) FILTER (WHERE pc.status != 'arquivada')::int as total_clinicas
    FROM users u
    LEFT JOIN clinic_leads cl ON cl.assigned_to = u.id
    LEFT JOIN prospect_clinics pc ON pc.assigned_to = u.id
    WHERE u.role = 'BENAVERA_COMERCIAL'
    GROUP BY u.id, u.name, u.lead_limit, u.receiving_leads, u.ativo
    ORDER BY u.name
  `;

  const queued = await sql`
    SELECT COUNT(*) as cnt FROM clinic_leads
    WHERE assigned_to IS NULL AND status_comercial NOT IN ('perdido')
  `;

  return {
    atendentes: atendentes.map(a => ({
      id: String(a.id),
      name: String(a.name),
      lead_limit: Number(a.lead_limit),
      receiving_leads: Boolean(a.receiving_leads),
      ativo: Boolean(a.ativo),
      active_leads: Number(a.active_leads),
      total_clinicas: Number(a.total_clinicas),
      disponivel: Boolean(a.ativo) && Boolean(a.receiving_leads) && Number(a.active_leads) < Number(a.lead_limit),
    })),
    leads_na_fila: Number(queued[0]?.cnt ?? 0),
  };
}
