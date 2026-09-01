#!/usr/bin/env node
/**
 * scripts/migrate.mjs
 * Aplica o schema ao banco Neon (PostgreSQL) configurado em DATABASE_URL.
 * Uso: node scripts/migrate.mjs
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carrega .env.local manualmente (Node 20+ suporta process.loadEnvFile, mas vamos ser compatíveis)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local não encontrado, usando variáveis já definidas */ }

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌  DATABASE_URL não definido. Verifique o .env.local.');
  process.exit(1);
}

const db = neon(url);

console.log('🚀  Aplicando schema ao Neon...');

try {
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
  console.log('  ✅  patient_leads');

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
  console.log('  ✅  clinic_leads');

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
  console.log('  ✅  lead_events');

  await db`CREATE INDEX IF NOT EXISTS idx_patient_leads_status   ON patient_leads(status)`;
  await db`CREATE INDEX IF NOT EXISTS idx_patient_leads_created  ON patient_leads(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_clinic_leads_status    ON clinic_leads(status_comercial)`;
  await db`CREATE INDEX IF NOT EXISTS idx_clinic_leads_created   ON clinic_leads(created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id    ON lead_events(lead_id)`;
  console.log('  ✅  índices');

  console.log('\n✅  Schema aplicado com sucesso!');
} catch (err) {
  console.error('❌  Erro ao aplicar schema:', err);
  process.exit(1);
}
