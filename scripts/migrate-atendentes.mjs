/**
 * Migration: Adiciona suporte à área de atendentes Benavera
 * 
 * Executa de forma incremental (IF NOT EXISTS / IF NOT EXISTS em colunas via DO $$)
 * Não remove dados existentes nem tabelas existentes.
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definida');

const sql = neon(url.replace(/^[\"']|[\"']$/g, '').trim());

console.log('🚀 Iniciando migração de atendentes...');

// 1) Estender tabela users com campos de atendente
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lead_limit') THEN
      ALTER TABLE users ADD COLUMN lead_limit INT NOT NULL DEFAULT 30;
    END IF;
  END $$
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='receiving_leads') THEN
      ALTER TABLE users ADD COLUMN receiving_leads BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
  END $$
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_assigned_at') THEN
      ALTER TABLE users ADD COLUMN last_assigned_at TIMESTAMPTZ;
    END IF;
  END $$
`;
console.log('✅ Tabela users estendida');

// 2) Estender clinic_leads com campos de atendimento
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinic_leads' AND column_name='assigned_at') THEN
      ALTER TABLE clinic_leads ADD COLUMN assigned_at TIMESTAMPTZ;
    END IF;
  END $$
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinic_leads' AND column_name='cnpj') THEN
      ALTER TABLE clinic_leads ADD COLUMN cnpj TEXT;
    END IF;
  END $$
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinic_leads' AND column_name='prospect_clinic_id') THEN
      ALTER TABLE clinic_leads ADD COLUMN prospect_clinic_id TEXT;
    END IF;
  END $$
`;
console.log('✅ Tabela clinic_leads estendida');

// 3) Estender patient_leads com campos de atendimento
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patient_leads' AND column_name='assigned_to') THEN
      ALTER TABLE patient_leads ADD COLUMN assigned_to UUID REFERENCES users(id);
    END IF;
  END $$
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patient_leads' AND column_name='assigned_at') THEN
      ALTER TABLE patient_leads ADD COLUMN assigned_at TIMESTAMPTZ;
    END IF;
  END $$
`;
console.log('✅ Tabela patient_leads estendida');

// 4) Tabela prospect_clinics (unicidade global de CNPJ)
await sql`
  CREATE TABLE IF NOT EXISTS prospect_clinics (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    cnpj        TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    razao_social TEXT,
    responsavel TEXT,
    telefone    TEXT,
    email       TEXT,
    cidade      TEXT,
    estado      TEXT,
    especialidade TEXT,
    status      TEXT NOT NULL DEFAULT 'prospeccao',
    assigned_to UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clinic_lead_id TEXT REFERENCES clinic_leads(id),
    created_by  UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    transfer_log JSONB NOT NULL DEFAULT '[]'
  )
`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_clinics_cnpj ON prospect_clinics(cnpj)`;
await sql`CREATE INDEX IF NOT EXISTS idx_prospect_clinics_assigned ON prospect_clinics(assigned_to)`;
await sql`CREATE INDEX IF NOT EXISTS idx_prospect_clinics_status ON prospect_clinics(status)`;
console.log('✅ Tabela prospect_clinics criada');

// 5) Tabela commission_rules (regras configuráveis)
await sql`
  CREATE TABLE IF NOT EXISTS commission_rules (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nome        TEXT NOT NULL,
    evento      TEXT NOT NULL,
    valor       NUMERIC(12,2) NOT NULL,
    ativa       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
console.log('✅ Tabela commission_rules criada');

// 6) Tabela commissions (registros por clínica+evento)
await sql`
  CREATE TABLE IF NOT EXISTS commissions (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    prospect_clinic_id  TEXT NOT NULL REFERENCES prospect_clinics(id),
    atendente_id        UUID NOT NULL REFERENCES users(id),
    atendente_name      TEXT NOT NULL,
    evento              TEXT NOT NULL,
    valor               NUMERIC(12,2) NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pendente',
    justificativa       TEXT,
    regra_id            TEXT REFERENCES commission_rules(id),
    gerada_por          UUID NOT NULL,
    aprovada_por        UUID,
    paga_por            UUID,
    gerada_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    aprovada_at         TIMESTAMPTZ,
    paga_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
// Unicidade: 1 comissão por clínica+evento (exceto estornadas)
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_clinic_evento ON commissions(prospect_clinic_id, evento) WHERE status != 'estornada'`;
await sql`CREATE INDEX IF NOT EXISTS idx_commissions_atendente ON commissions(atendente_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status)`;
console.log('✅ Tabela commissions criada');

// 7) Log de distribuição de leads
await sql`
  CREATE TABLE IF NOT EXISTS lead_distribution_log (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id     TEXT NOT NULL,
    lead_tipo   TEXT NOT NULL,
    atendente_id UUID,
    resultado   TEXT NOT NULL,
    motivo      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_dist_log_lead ON lead_distribution_log(lead_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_dist_log_atendente ON lead_distribution_log(atendente_id)`;
console.log('✅ Tabela lead_distribution_log criada');

// 8) Notas de atendimento
await sql`
  CREATE TABLE IF NOT EXISTS atendimento_notes (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lead_id             TEXT,
    prospect_clinic_id  TEXT REFERENCES prospect_clinics(id),
    atendente_id        UUID NOT NULL REFERENCES users(id),
    tipo                TEXT NOT NULL,
    conteudo            TEXT NOT NULL,
    proxima_data        DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_notes_lead ON atendimento_notes(lead_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_notes_clinic ON atendimento_notes(prospect_clinic_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_notes_atendente ON atendimento_notes(atendente_id)`;
console.log('✅ Tabela atendimento_notes criada');

// 9) Verificar se existem duplicidades de CNPJ em clinic_leads (informativo)
const dupes = await sql`
  SELECT cnpj, COUNT(*) as cnt FROM clinic_leads 
  WHERE cnpj IS NOT NULL AND cnpj != ''
  GROUP BY cnpj HAVING COUNT(*) > 1
`;
if (dupes.length > 0) {
  console.log('⚠️  CNPJs duplicados em clinic_leads (revisão admin necessária):', dupes);
} else {
  console.log('✅ Nenhuma duplicidade de CNPJ encontrada');
}

console.log('\n🎉 Migração concluída com sucesso!');
