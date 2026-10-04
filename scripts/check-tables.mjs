import { neon } from '@neondatabase/serverless';

// Uso: node --env-file=.env.local scripts/check-tables.mjs
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL não definida (use --env-file=.env.local)');
const sql = neon(url.replace(/^["']|["']$/g, '').trim());

const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log('Tables:', tables.map(x => x.table_name));

// Check users table columns
try {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
  console.log('\nUsers columns:', cols.map(c => c.column_name + ':' + c.data_type));
} catch(e) { console.log('No users table:', e.message); }

// Check clinic_leads columns
try {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clinic_leads' ORDER BY ordinal_position`;
  console.log('\nClinic_leads columns:', cols.map(c => c.column_name + ':' + c.data_type));
} catch(e) { console.log('No clinic_leads:', e.message); }
