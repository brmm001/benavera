// inspect-tables.mjs
import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DATABASE_URL || '';
const DATABASE_URL = rawUrl.replace(/^["']|["']$/g, '').trim();
const sql = neon(DATABASE_URL);

async function run() {
  const columns = await sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `;

  console.log('--- DATABASE SCHEMA COLUMNS ---');
  let currentTable = '';
  for (const col of columns) {
    if (col.table_name !== currentTable) {
      currentTable = col.table_name;
      console.log(`\nTABLE [${currentTable}]:`);
    }
    console.log(`  - ${col.column_name} (${col.data_type})`);
  }
}

run().catch(console.error);
