import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Carrega .env.local se existir
const envLocalPath = path.join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k && v.length) {
        process.env[k.trim()] = v.join('=').trim();
      }
    }
  });
}

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('====================================================');
console.log('BENAVERA — INICIALIZAÇÃO DE BANCO TURSO (libSQL)');
console.log('====================================================\n');

if (!url) {
  console.log('⚠️  TURSO_DATABASE_URL não configurada em .env.local.');
  console.log('👉 Adicione TURSO_DATABASE_URL e TURSO_AUTH_TOKEN para conectar à nuvem do Turso.');
  console.log('ℹ️  O projeto continuará utilizando o fallback local persistente em data/benavera_db.json.');
  process.exit(0);
}

const client = createClient({ url, authToken });

async function init() {
  console.log(`📡 Conectando ao Turso em: ${url}`);
  try {
    const migrationPath = path.join(process.cwd(), 'turso', 'migrations', '20260901000001_create_leads_and_events.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    await client.executeMultiple(sql);
    console.log('✅ Tabelas e índices criados com sucesso no Turso!');
  } catch (err) {
    console.error('❌ Erro ao executar migração no Turso:', err);
    process.exit(1);
  }
}

init();
