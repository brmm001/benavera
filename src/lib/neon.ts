import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

export function getNeonClient(): NeonQueryFunction<false, false> | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const cleanUrl = url.replace(/^["']|["']$/g, '').trim();
  if (!cleanUrl) return null;
  if (!sql) {
    try {
      sql = neon(cleanUrl);
    } catch (e) {
      console.error('[neon] Failed to initialize client:', e);
      return null;
    }
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

  // ── Blog Articles ─────────────────────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS blog_articles (
      id           TEXT PRIMARY KEY,
      slug         TEXT UNIQUE NOT NULL,
      title        TEXT NOT NULL,
      seo_title    TEXT,
      description  TEXT NOT NULL,
      content      TEXT NOT NULL DEFAULT '',
      author       TEXT NOT NULL DEFAULT 'Equipe Benavera',
      reviewer     TEXT,
      category     TEXT NOT NULL DEFAULT 'tratamentos-e-custos',
      keywords     TEXT[] NOT NULL DEFAULT '{}',
      related_articles TEXT[] DEFAULT '{}',
      sources      JSONB DEFAULT '[]',
      status       TEXT NOT NULL DEFAULT 'draft',
      published_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_blog_articles_slug    ON blog_articles(slug)`;
  await db`CREATE INDEX IF NOT EXISTS idx_blog_articles_status  ON blog_articles(status)`;
  await db`CREATE INDEX IF NOT EXISTS idx_blog_articles_cat     ON blog_articles(category)`;
  await db`CREATE INDEX IF NOT EXISTS idx_blog_articles_pub     ON blog_articles(published_at DESC NULLS LAST)`;

  // ── Sistema multi-tenant — Clínicas Parceiras ────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS clinics (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cnpj TEXT,
      especialidade TEXT NOT NULL,
      cidade TEXT NOT NULL,
      estado TEXT,
      telefone TEXT,
      email TEXT,
      website TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      plano TEXT NOT NULL DEFAULT 'basico',
      logo_url TEXT,
      descricao TEXT,
      numero_unidades INTEGER DEFAULT 1,
      ticket_medio_centavos INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS clinic_users (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'membro',
      avatar_url TEXT,
      ultimo_acesso TIMESTAMPTZ,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // ── Propostas para pacientes ──────────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      created_by TEXT REFERENCES clinic_users(id),
      paciente_nome TEXT NOT NULL,
      paciente_telefone TEXT NOT NULL,
      paciente_email TEXT,
      tratamento TEXT NOT NULL,
      descricao_tratamento TEXT,
      valor_total_centavos INTEGER NOT NULL,
      entrada_centavos INTEGER DEFAULT 0,
      opcoes_parcelamento JSONB DEFAULT '[]',
      observacoes TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      visualizada_em TIMESTAMPTZ,
      aceita_em TIMESTAMPTZ,
      expirada_em TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // ── CRM ──────────────────────────────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS crm_opportunities (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      proposal_id TEXT REFERENCES proposals(id),
      patient_lead_id TEXT REFERENCES patient_leads(id),
      paciente_nome TEXT NOT NULL,
      paciente_telefone TEXT NOT NULL,
      tratamento TEXT NOT NULL,
      valor_centavos INTEGER DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'prospecto',
      responsavel_id TEXT REFERENCES clinic_users(id),
      proxima_acao TEXT,
      proxima_acao_em TIMESTAMPTZ,
      fechado_ganhou_em TIMESTAMPTZ,
      fechado_perdeu_em TIMESTAMPTZ,
      motivo_perda TEXT,
      notas TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id TEXT PRIMARY KEY,
      opportunity_id TEXT NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      realizada_por TEXT REFERENCES clinic_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // ── Repasses ─────────────────────────────────────────────────────────────
  await db`
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      proposal_id TEXT REFERENCES proposals(id),
      opportunity_id TEXT REFERENCES crm_opportunities(id),
      descricao TEXT NOT NULL,
      valor_bruto_centavos INTEGER NOT NULL,
      taxa_benavera_centavos INTEGER DEFAULT 0,
      valor_liquido_centavos INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'previsto',
      previsto_para TIMESTAMPTZ,
      pago_em TIMESTAMPTZ,
      comprovante_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Índices do sistema multi-tenant
  await db`CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic       ON clinic_users(clinic_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_clinic_users_email        ON clinic_users(email)`;
  await db`CREATE INDEX IF NOT EXISTS idx_proposals_clinic          ON proposals(clinic_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_proposals_token           ON proposals(token)`;
  await db`CREATE INDEX IF NOT EXISTS idx_proposals_status          ON proposals(status)`;
  await db`CREATE INDEX IF NOT EXISTS idx_crm_opportunities_clinic  ON crm_opportunities(clinic_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_crm_opportunities_stage   ON crm_opportunities(stage)`;
  await db`CREATE INDEX IF NOT EXISTS idx_crm_activities_opp       ON crm_activities(opportunity_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_transfers_clinic          ON transfers(clinic_id)`;
  await db`CREATE INDEX IF NOT EXISTS idx_transfers_status          ON transfers(status)`;
}
