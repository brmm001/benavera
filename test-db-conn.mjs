// test-db-conn.mjs
import { neon } from '@neondatabase/serverless';

console.log('Testing DATABASE_URL from .env.local:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'NOT SET');

const rawUrl = process.env.DATABASE_URL || '';
const cleanUrl = rawUrl.replace(/^["']|["']$/g, '').trim();

async function testConn(url, label) {
  try {
    console.log(`\nTesting ${label}...`);
    const sql = neon(url);
    const result = await sql`SELECT 1 as test, current_database(), current_user, count(*) from clinics;`;
    console.log(`✅ Success for ${label}:`, result);
    return true;
  } catch (err) {
    console.error(`❌ Error for ${label}:`, err.message);
    return false;
  }
}

async function run() {
  await testConn(cleanUrl, 'Original URL');
  
  // Try removing channel_binding=require
  const withoutChannelBinding = cleanUrl.replace('&channel_binding=require', '').replace('channel_binding=require&', '').replace('channel_binding=require', '');
  await testConn(withoutChannelBinding, 'URL without channel_binding');
}

run();
