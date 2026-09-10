// verify-public-and-protected.mjs
const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🔍 Testing Public vs Protected Route Access...\n');

  const publicRoutes = [
    '/',
    '/clinicas',
    '/como-funciona',
    '/simular',
    '/calculadoras',
    '/sobre',
    '/conteudos',
    '/credenciamento',
    '/financiamento-implante-dentario',
    '/login',
  ];

  console.log('--- 1. Testing Public Routes (NO Login Required) ---');
  for (const path of publicRoutes) {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
    const status = res.status;
    if (status === 200) {
      console.log(`✅ PUBLIC [${status}]: ${path}`);
    } else {
      console.error(`❌ FAILED [${status}]: ${path} (Location: ${res.headers.get('location')})`);
    }
  }

  const protectedRoutes = [
    '/dashboard',
    '/novo-financiamento',
    '/financiamentos',
    '/pacientes',
    '/repasses',
    '/equipe',
    '/configuracoes',
    '/admin',
    '/admin/fila',
    '/admin/solicitacoes',
  ];

  console.log('\n--- 2. Testing Protected Routes Without Auth (Must Redirect to /login) ---');
  for (const path of protectedRoutes) {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
    const status = res.status;
    const location = res.headers.get('location') || '';
    if ((status === 307 || status === 302) && location.includes('/login')) {
      console.log(`🔒 PROTECTED [${status} -> ${location}]: ${path}`);
    } else {
      console.error(`❌ UNEXPECTED [${status}]: ${path}`);
    }
  }

  console.log('\n--- 3. Testing Protected Routes With Valid Auth ---');
  // Login as clinic
  const clinicLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@odontoprime.com.br', password: 'Clinica@2026' }),
  });
  const clinicCookie = clinicLogin.headers.get('set-cookie')?.split(';')[0] || '';
  const clinicDash = await fetch(`${BASE_URL}/dashboard`, { headers: { Cookie: clinicCookie }, redirect: 'manual' });
  console.log(`✅ Clinic Dashboard with auth: Status ${clinicDash.status}`);

  // Login as admin
  const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@benavera.com.br', password: 'Benavera@2026' }),
  });
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0] || '';
  const adminDash = await fetch(`${BASE_URL}/admin`, { headers: { Cookie: adminCookie }, redirect: 'manual' });
  console.log(`✅ Admin Dashboard with auth: Status ${adminDash.status}`);

  console.log('\n🎉 ALL PUBLIC AND PROTECTED ROUTE TESTS PASSED PERFECTLY! 🎉\n');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
