import { neon } from '@neondatabase/serverless';

const url = 'postgresql://neondb_owner:npg_a4EFbjtv8Aip@ep-lively-queen-axlifs9v-pooler.c-4.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const sql = neon(url);

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
