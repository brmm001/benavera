/**
 * Benavera - Banco de dados do Simulador de Clinicas
 * Gerencia configuracoes administrativas e leads de simulacao.
 */

import { getNeonClient } from "@/lib/neon";
import { DEFAULT_CONFIG, type SimulatorConfig } from "@/lib/simulator-engine";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export async function ensureSimulatorSchema(): Promise<void> {
  const db = getNeonClient();
  if (!db) return;

  // Tabela de configuracoes do simulador
  await db`
    CREATE TABLE IF NOT EXISTS simulator_config (
      id          SERIAL PRIMARY KEY,
      chave       TEXT UNIQUE NOT NULL,
      valor       TEXT NOT NULL,
      tipo        TEXT NOT NULL DEFAULT 'number',
      descricao   TEXT,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by  TEXT DEFAULT 'system'
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_simulator_config_chave ON simulator_config(chave)`;

  // Tabela de leads do simulador (clinicas)
  await db`
    CREATE TABLE IF NOT EXISTS simulator_leads (
      id              TEXT PRIMARY KEY,
      valor_tratamento NUMERIC NOT NULL,
      parcelas        INTEGER NOT NULL,
      modalidade      TEXT NOT NULL,
      risco           TEXT NOT NULL,
      parcela_estimada NUMERIC,
      valor_liquido   NUMERIC,
      total_pago      NUMERIC,
      taxa_aplicada   NUMERIC,
      nome_clinica    TEXT,
      whatsapp        TEXT,
      email           TEXT,
      utm_source      TEXT,
      utm_medium      TEXT,
      utm_campaign    TEXT,
      origem          TEXT DEFAULT 'simulador_clinicas',
      ip_origem       TEXT,
      user_agent      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_simulator_leads_created ON simulator_leads(created_at DESC)`;

  // Historico de configuracoes
  await db`
    CREATE TABLE IF NOT EXISTS simulator_config_history (
      id          SERIAL PRIMARY KEY,
      chave       TEXT NOT NULL,
      valor_antigo TEXT,
      valor_novo  TEXT NOT NULL,
      changed_by  TEXT,
      changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Inserir configuracoes default se nao existirem
  await seedDefaultConfig(db);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED CONFIG INICIAL
// ─────────────────────────────────────────────────────────────────────────────

async function seedDefaultConfig(db: NonNullable<ReturnType<typeof getNeonClient>>) {
  const entries: Array<{ chave: string; valor: string; tipo: string; descricao: string }> = [
    { chave: "taxa_minima", valor: "3.5", tipo: "number", descricao: "Taxa minima Benavera (%)" },
    { chave: "taxa_padrao", valor: "3.5", tipo: "number", descricao: "Taxa padrao Benavera (%)" },
    { chave: "taxa_maxima", valor: "7.0", tipo: "number", descricao: "Taxa maxima Benavera (%)" },
    { chave: "taxa_sem_juros", valor: "8.0", tipo: "number", descricao: "Taxa parcelamento sem juros (%)" },
    { chave: "taxa_risco_financeira", valor: "1.5", tipo: "number", descricao: "Adicional risco instituicao financeira (%)" },
    { chave: "taxa_risco_clinica", valor: "0.0", tipo: "number", descricao: "Adicional risco clinica (%)" },
    { chave: "valor_minimo", valor: "500", tipo: "number", descricao: "Valor minimo financiado (R$)" },
    { chave: "valor_maximo", valor: "100000", tipo: "number", descricao: "Valor maximo financiado (R$)" },
    { chave: "juros_6x", valor: "1.49", tipo: "number", descricao: "Juros mensais 6 parcelas (%)" },
    { chave: "juros_12x", valor: "1.79", tipo: "number", descricao: "Juros mensais 12 parcelas (%)" },
    { chave: "juros_18x", valor: "1.99", tipo: "number", descricao: "Juros mensais 18 parcelas (%)" },
    { chave: "juros_24x", valor: "2.19", tipo: "number", descricao: "Juros mensais 24 parcelas (%)" },
    { chave: "juros_30x", valor: "2.39", tipo: "number", descricao: "Juros mensais 30 parcelas (%)" },
    { chave: "juros_36x", valor: "2.49", tipo: "number", descricao: "Juros mensais 36 parcelas (%)" },
    { chave: "juros_48x", valor: "2.69", tipo: "number", descricao: "Juros mensais 48 parcelas (%)" },
    { chave: "juros_60x", valor: "2.89", tipo: "number", descricao: "Juros mensais 60 parcelas (%)" },
    { chave: "juros_72x", valor: "2.99", tipo: "number", descricao: "Juros mensais 72 parcelas (%)" },
    { chave: "parcelas_ativas", valor: "6,12,18,24,30,36", tipo: "list", descricao: "Prazos ativos (separados por virgula)" },
    { chave: "prazo_recebimento", valor: "2", tipo: "number", descricao: "Prazo de recebimento da clinica (dias uteis)" },
    { chave: "custo_funding", valor: "1.2", tipo: "number", descricao: "Custo de funding (%)" },
    { chave: "custo_parceiro", valor: "0.5", tipo: "number", descricao: "Custo parceiro (%)" },
    { chave: "spread_benavera", valor: "1.8", tipo: "number", descricao: "Spread Benavera (%)" },
    { chave: "outros_custos", valor: "0.0", tipo: "number", descricao: "Outros custos (%)" },
  ];

  for (const entry of entries) {
    await db`
      INSERT INTO simulator_config (chave, valor, tipo, descricao)
      VALUES (${entry.chave}, ${entry.valor}, ${entry.tipo}, ${entry.descricao})
      ON CONFLICT (chave) DO NOTHING
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEITURA DE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

let schemaReady = false;

export async function getSimulatorConfig(): Promise<SimulatorConfig> {
  const db = getNeonClient();
  if (!db) return DEFAULT_CONFIG;

  if (!schemaReady) {
    await ensureSimulatorSchema();
    schemaReady = true;
  }

  const rows = await db`SELECT chave, valor, tipo FROM simulator_config`;

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.chave as string] = row.valor as string;
  }

  function num(key: string, def: number): number {
    const v = parseFloat(map[key] ?? "");
    return isNaN(v) ? def : v;
  }

  function list(key: string, def: number[]): number[] {
    const v = map[key];
    if (!v) return def;
    return v.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  }

  return {
    taxa_minima: num("taxa_minima", DEFAULT_CONFIG.taxa_minima),
    taxa_padrao: num("taxa_padrao", DEFAULT_CONFIG.taxa_padrao),
    taxa_maxima: num("taxa_maxima", DEFAULT_CONFIG.taxa_maxima),
    taxa_sem_juros: num("taxa_sem_juros", DEFAULT_CONFIG.taxa_sem_juros),
    taxa_risco_financeira: num("taxa_risco_financeira", DEFAULT_CONFIG.taxa_risco_financeira),
    taxa_risco_clinica: num("taxa_risco_clinica", DEFAULT_CONFIG.taxa_risco_clinica),
    valor_minimo: num("valor_minimo", DEFAULT_CONFIG.valor_minimo),
    valor_maximo: num("valor_maximo", DEFAULT_CONFIG.valor_maximo),
    juros_6x: num("juros_6x", DEFAULT_CONFIG.juros_6x),
    juros_12x: num("juros_12x", DEFAULT_CONFIG.juros_12x),
    juros_18x: num("juros_18x", DEFAULT_CONFIG.juros_18x),
    juros_24x: num("juros_24x", DEFAULT_CONFIG.juros_24x),
    juros_30x: num("juros_30x", DEFAULT_CONFIG.juros_30x),
    juros_36x: num("juros_36x", DEFAULT_CONFIG.juros_36x),
    juros_48x: num("juros_48x", DEFAULT_CONFIG.juros_48x),
    juros_60x: num("juros_60x", DEFAULT_CONFIG.juros_60x),
    juros_72x: num("juros_72x", DEFAULT_CONFIG.juros_72x),
    parcelas_ativas: list("parcelas_ativas", DEFAULT_CONFIG.parcelas_ativas),
    prazo_recebimento: num("prazo_recebimento", DEFAULT_CONFIG.prazo_recebimento),
    custo_funding: num("custo_funding", DEFAULT_CONFIG.custo_funding),
    custo_parceiro: num("custo_parceiro", DEFAULT_CONFIG.custo_parceiro),
    spread_benavera: num("spread_benavera", DEFAULT_CONFIG.spread_benavera),
    outros_custos: num("outros_custos", DEFAULT_CONFIG.outros_custos),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZACAO DE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export async function updateSimulatorConfig(
  updates: Record<string, string>,
  updatedBy = "admin",
): Promise<void> {
  const db = getNeonClient();
  if (!db) return;

  for (const [chave, valor] of Object.entries(updates)) {
    // Busca valor antigo para historico
    const oldRows = await db`SELECT valor FROM simulator_config WHERE chave = ${chave}`;
    const valorAntigo = oldRows[0]?.valor as string | undefined;

    await db`
      INSERT INTO simulator_config (chave, valor, updated_at, updated_by)
      VALUES (${chave}, ${valor}, NOW(), ${updatedBy})
      ON CONFLICT (chave) DO UPDATE
      SET valor = ${valor}, updated_at = NOW(), updated_by = ${updatedBy}
    `;

    // Registrar historico
    await db`
      INSERT INTO simulator_config_history (chave, valor_antigo, valor_novo, changed_by)
      VALUES (${chave}, ${valorAntigo ?? null}, ${valor}, ${updatedBy})
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS DO SIMULADOR
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulatorLeadData {
  valor_tratamento: number;
  parcelas: number;
  modalidade: string;
  risco: string;
  parcela_estimada?: number;
  valor_liquido?: number;
  total_pago?: number;
  taxa_aplicada?: number;
  nome_clinica?: string;
  whatsapp?: string;
  email?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ip_origem?: string;
  user_agent?: string;
}

export async function saveSimulatorLead(data: SimulatorLeadData): Promise<string> {
  const id = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const db = getNeonClient();

  if (!db) {
    // Fallback: apenas retorna o id sem persistir (desenvolvimento sem DB)
    console.log("[SimulatorLead] DB nao disponivel, lead nao persistido:", id);
    return id;
  }

  await db`
    INSERT INTO simulator_leads (
      id, valor_tratamento, parcelas, modalidade, risco,
      parcela_estimada, valor_liquido, total_pago, taxa_aplicada,
      nome_clinica, whatsapp, email,
      utm_source, utm_medium, utm_campaign,
      ip_origem, user_agent
    ) VALUES (
      ${id}, ${data.valor_tratamento}, ${data.parcelas}, ${data.modalidade}, ${data.risco},
      ${data.parcela_estimada ?? null}, ${data.valor_liquido ?? null},
      ${data.total_pago ?? null}, ${data.taxa_aplicada ?? null},
      ${data.nome_clinica ?? null}, ${data.whatsapp ?? null}, ${data.email ?? null},
      ${data.utm_source ?? null}, ${data.utm_medium ?? null}, ${data.utm_campaign ?? null},
      ${data.ip_origem ?? null}, ${data.user_agent ?? null}
    )
  `;

  return id;
}

export async function listSimulatorLeads(limit = 100) {
  const db = getNeonClient();
  if (!db) return [];

  const rows = await db`
    SELECT * FROM simulator_leads
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows;
}
