import { createClient, type Client } from '@libsql/client';

let tursoClient: Client | null = null;
let initialized = false;

export function getTursoClient(): Client | null {
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    return null;
  }

  if (!tursoClient) {
    tursoClient = createClient({
      url,
      authToken,
    });
  }

  return tursoClient;
}

/**
 * Cria automaticamente as tabelas no Turso caso não existam.
 */
export async function ensureTursoSchema(client: Client): Promise<void> {
  if (initialized) return;

  try {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS patient_leads (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        telefone TEXT NOT NULL,
        email TEXT,
        cidade TEXT NOT NULL,
        estado TEXT,
        categoria_tratamento TEXT NOT NULL,
        valor_tratamento REAL,
        entrada REAL DEFAULT 0,
        parcela_desejada REAL,
        prazo_desejado TEXT,
        clinica_indicada TEXT,
        origem_lead TEXT DEFAULT 'site_simulador',
        pagina_origem TEXT NOT NULL,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        utm_term TEXT,
        status TEXT NOT NULL DEFAULT 'nova',
        consentimento INTEGER NOT NULL DEFAULT 1,
        versao_termos TEXT NOT NULL DEFAULT 'v1.0',
        ip_origem TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );

      CREATE TABLE IF NOT EXISTS clinic_leads (
        id TEXT PRIMARY KEY,
        nome_responsavel TEXT NOT NULL,
        nome_clinica TEXT NOT NULL,
        cargo TEXT,
        whatsapp TEXT NOT NULL,
        email TEXT,
        cidade TEXT NOT NULL,
        estado TEXT,
        especialidade_principal TEXT NOT NULL,
        numero_unidades TEXT,
        ticket_medio TEXT,
        orcamentos_mensais TEXT,
        principal_dificuldade TEXT,
        origem_lead TEXT DEFAULT 'site_clinicas',
        pagina_origem TEXT NOT NULL,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        utm_term TEXT,
        status_comercial TEXT NOT NULL DEFAULT 'novo',
        consentimento INTEGER NOT NULL DEFAULT 1,
        versao_termos TEXT NOT NULL DEFAULT 'v1.0',
        ip_origem TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
        updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );

      CREATE TABLE IF NOT EXISTS lead_events (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        lead_tipo TEXT NOT NULL,
        tipo_evento TEXT NOT NULL,
        descricao TEXT,
        payload TEXT,
        created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      );

      CREATE INDEX IF NOT EXISTS idx_patient_leads_status ON patient_leads(status);
      CREATE INDEX IF NOT EXISTS idx_patient_leads_created ON patient_leads(created_at);
      CREATE INDEX IF NOT EXISTS idx_clinic_leads_status ON clinic_leads(status_comercial);
      CREATE INDEX IF NOT EXISTS idx_clinic_leads_created ON clinic_leads(created_at);
      CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
    `);
    initialized = true;
  } catch (error) {
    console.error('[Turso Schema] Erro ao inicializar tabelas:', error);
  }
}
