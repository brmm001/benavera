import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

export function getNeonClient(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!sql) {
    sql = neon(url);
  }
  return sql;
}

/**
 * Cria automaticamente as tabelas no Neon/PostgreSQL caso não existam.
 */
export async function ensureNeonSchema(
  db: NeonQueryFunction<false, false>
): Promise<void> {
  await db`
    CREATE TABLE IF NOT EXISTS patient_leads (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      email TEXT,
      cidade TEXT NOT NULL,
      estado TEXT,
      categoria_tratamento TEXT NOT NULL,
      valor_tratamento NUMERIC,
      entrada NUMERIC DEFAULT 0,
      parcela_desejada NUMERIC,
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
      consentimento BOOLEAN NOT NULL DEFAULT TRUE,
      versao_termos TEXT NOT NULL DEFAULT 'v1.0',
      ip_origem TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
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
      consentimento BOOLEAN NOT NULL DEFAULT TRUE,
      versao_termos TEXT NOT NULL DEFAULT 'v1.0',
      ip_origem TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS lead_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      lead_tipo TEXT NOT NULL,
      tipo_evento TEXT NOT NULL,
      descricao TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_patient_leads_status   ON patient_leads(status)`;
  await db`CREATE INDEX IF NOT EXISTS idx_patient_leads_created  ON patient_leads(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_clinic_leads_status    ON clinic_leads(status_comercial)`;
  await db`CREATE INDEX IF NOT EXISTS idx_clinic_leads_created   ON clinic_leads(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id    ON lead_events(lead_id)`;
}
