// scripts/migrate-credenciamento.mjs
// Executa a migration do módulo de credenciamento de clínicas

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🚀 Executando migration de credenciamento...\n');

  let sql;

  // Tentar importar o cliente de banco
  try {
    const dbModule = await import('../src/lib/benavera-db.js').catch(() =>
      import('../src/lib/neon.js')
    );
    sql = dbModule.sql;
    if (!sql) throw new Error('sql não encontrado');
  } catch (err) {
    console.error('❌ Não foi possível carregar o cliente de banco:', err.message);
    console.log('\n💡 Para rodar a migration manualmente, execute o SQL abaixo no Neon SQL Editor:');
    console.log('\n' + '-'.repeat(60));
    const sqlFile = readFileSync(join(__dirname, '../supabase/migrations/20260921000002_credenciamento.sql'), 'utf-8');
    console.log(sqlFile);
    process.exit(0);
  }

  // Ler arquivo de migration
  const migrationFile = join(__dirname, '../supabase/migrations/20260921000002_credenciamento.sql');
  const migrationSQL = readFileSync(migrationFile, 'utf-8');

  // Dividir em statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    // Remover comentários de bloco
    .map(s => s.replace(/\/\*[\s\S]*?\*\//g, '').trim())
    .filter(s => s.length > 0);

  console.log(`📝 Executando ${statements.length} statements...\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    try {
      await sql.unsafe(stmt + ';');
      success++;
      console.log(`  ✓ ${preview}...`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        skipped++;
        console.log(`  ⏭ ${preview}... (já existe)`);
      } else {
        failed++;
        console.error(`  ✗ ${preview}...`);
        console.error(`    Erro: ${msg}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Executados: ${success}`);
  console.log(`⏭  Ignorados: ${skipped}`);
  if (failed > 0) console.log(`❌ Falhas: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Alguns statements falharam. Verifique os erros acima.');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration concluída com sucesso!');
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
