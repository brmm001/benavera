#!/usr/bin/env node
// scripts/test-credenciamento-security.mjs
// Testes de segurança automatizados para o módulo de credenciamento

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let passed = 0;
let failed = 0;
let warnings = 0;

function ok(label) { passed++; console.log(`  ✅ ${label}`); }
function fail(label, detail = '') { failed++; console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`); }
function warn(label) { warnings++; console.log(`  ⚠️  ${label}`); }

async function get(path, headers = {}) {
  const r = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: r.status, body: await r.text().catch(() => '') };
}

async function post(path, body = {}, headers = {}) {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.text().catch(() => '') };
}

// ─── 1. AUTENTICAÇÃO E AUTORIZAÇÃO ──────────────────────────────────────────
async function testAuth() {
  console.log('\n📋 1. Autenticação e Autorização\n');

  // Admin routes sem auth devem retornar 401
  const adminRoutes = [
    '/api/admin/onboardings',
    '/api/admin/onboardings/test-id',
    '/api/admin/onboardings/test-id/status',
    '/api/admin/onboardings/test-id/invite',
    '/api/admin/onboardings/test-id/documents',
    '/api/admin/onboardings/test-id/audit',
  ];

  for (const route of adminRoutes) {
    const { status, body } = await get(route);
    const isJson = body.trim().startsWith('{');
    if (status === 401 && isJson) {
      ok(`GET ${route} → 401 JSON`);
    } else if (status === 401) {
      warn(`GET ${route} → 401 mas não JSON (recebeu HTML)`);
    } else {
      fail(`GET ${route} → esperado 401, recebeu ${status}`);
    }
  }

  // POST sem auth
  const postRoutes = [
    ['/api/admin/onboardings', {}],
    ['/api/admin/onboardings/test-id/status', { status: 'APPROVED' }],
    ['/api/admin/onboardings/test-id/invite', {}],
  ];

  for (const [route, body] of postRoutes) {
    const r = await post(route, body);
    const isJson = r.body.trim().startsWith('{');
    if (r.status === 401 && isJson) {
      ok(`POST ${route} → 401 JSON`);
    } else if (r.status === 401) {
      warn(`POST ${route} → 401 mas não JSON`);
    } else {
      fail(`POST ${route} → esperado 401, recebeu ${r.status}`);
    }
  }
}

// ─── 2. VALIDAÇÃO DE TOKEN DA CLÍNICA ───────────────────────────────────────
async function testClinicToken() {
  console.log('\n📋 2. Validação de Token da Clínica\n');

  // Token muito curto
  const short = await post('/api/c/abc/validate', {});
  if (short.status === 400 || short.status === 404) {
    ok(`Token muito curto → ${short.status}`);
  } else {
    fail(`Token muito curto → esperado 400/404, recebeu ${short.status}`, short.body.substring(0, 100));
  }

  // Token com caracteres especiais (injection attempt)
  const injected = await post("/api/c/' OR 1=1 --/validate", {});
  if (injected.status >= 400) {
    ok(`SQL Injection no token → ${injected.status} (bloqueado)`);
  } else {
    fail(`SQL Injection no token → deveria ser bloqueado, recebeu ${injected.status}`);
  }

  // Token válido (mas não existente no banco) — deve retornar 404, não 500
  const fakeToken = 'a'.repeat(64);
  const fake = await post(`/api/c/${fakeToken}/validate`, {});
  if (fake.status === 404 || fake.status === 400) {
    ok(`Token inexistente → ${fake.status} (sem vazar dados internos)`);
  } else if (fake.status === 500) {
    fail(`Token inexistente → 500 (erro interno vazado!)`);
  } else {
    warn(`Token inexistente → ${fake.status} (verificar manualmente)`);
  }
}

// ─── 3. RATE LIMITING ───────────────────────────────────────────────────────
async function testRateLimit() {
  console.log('\n📋 3. Rate Limiting\n');

  const token = 'b'.repeat(64);
  let blocked = false;
  let attempts = 0;

  // Fazer 15 requisições rápidas (limite é 10/hora por IP)
  for (let i = 0; i < 15; i++) {
    const r = await post(`/api/c/${token}/validate`, {});
    attempts++;
    if (r.status === 429) {
      blocked = true;
      ok(`Rate limit ativado após ${attempts} tentativas (recebeu 429)`);
      break;
    }
    // Pequena pausa para não sobrecarregar
    await new Promise(res => setTimeout(res, 50));
  }

  if (!blocked) {
    warn(`Rate limit não ativou após ${attempts} tentativas — pode ser que o token retornou 404 antes`);
  }
}

// ─── 4. OTP SEM SESSÃO ──────────────────────────────────────────────────────
async function testOTPWithoutSession() {
  console.log('\n📋 4. OTP sem Sessão\n');

  const token = 'c'.repeat(64);

  // Tentar enviar OTP sem cookie de sessão
  const r = await post(`/api/c/${token}/otp`, { otp: '123456' });
  if (r.status === 401 || r.status === 403 || r.status === 404) {
    ok(`OTP sem sessão → ${r.status} (requer sessão válida)`);
  } else if (r.status === 200) {
    fail(`OTP sem sessão → 200 (deveria exigir sessão!)`);
  } else {
    warn(`OTP sem sessão → ${r.status}`);
  }
}

// ─── 5. UPLOAD SEM SESSÃO ───────────────────────────────────────────────────
async function testUploadWithoutSession() {
  console.log('\n📋 5. Upload de Documento sem Sessão\n');

  const token = 'd'.repeat(64);

  const formData = new FormData();
  formData.append('documentType', 'CONTRATO_SOCIAL');
  formData.append('file', new Blob(['fake content'], { type: 'application/pdf' }), 'test.pdf');

  const r = await fetch(`${BASE_URL}/api/c/${token}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (r.status === 401 || r.status === 403 || r.status === 404) {
    ok(`Upload sem sessão → ${r.status} (requer sessão)`);
  } else if (r.status === 200) {
    fail(`Upload sem sessão → 200 (deveria exigir sessão!)`);
  } else {
    warn(`Upload sem sessão → ${r.status}`);
  }
}

// ─── 6. CABEÇALHOS DE SEGURANÇA ─────────────────────────────────────────────
async function testSecurityHeaders() {
  console.log('\n📋 6. Cabeçalhos de Segurança HTTP\n');

  const r = await fetch(`${BASE_URL}/`);
  const headers = Object.fromEntries(r.headers.entries());

  const required = [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['x-xss-protection', '1; mode=block'],
    ['referrer-policy', 'strict-origin-when-cross-origin'],
  ];

  for (const [header, expected] of required) {
    const val = headers[header];
    if (val && val.toLowerCase().includes(expected.toLowerCase())) {
      ok(`${header}: ${val}`);
    } else {
      fail(`${header} ausente ou incorreto (esperado: ${expected}, recebeu: ${val || 'ausente'})`);
    }
  }

  // HSTS (pode não estar em dev)
  if (headers['strict-transport-security']) {
    ok(`Strict-Transport-Security: ${headers['strict-transport-security']}`);
  } else {
    warn(`Strict-Transport-Security ausente (normal em dev HTTP)`);
  }
}

// ─── 7. SUBMISSÃO SEM SESSÃO ────────────────────────────────────────────────
async function testSubmitWithoutSession() {
  console.log('\n📋 7. Submissão Final sem Sessão\n');

  const token = 'e'.repeat(64);
  const r = await post(`/api/c/${token}/submit`, { acceptances: [] });

  if (r.status === 401 || r.status === 403 || r.status === 404) {
    ok(`Submit sem sessão → ${r.status} (requer sessão)`);
  } else if (r.status === 200) {
    fail(`Submit sem sessão → 200 (crítico! deveria exigir sessão)`);
  } else {
    warn(`Submit sem sessão → ${r.status}`);
  }
}

// ─── 8. ROTAS PÚBLICAS ──────────────────────────────────────────────────────
async function testPublicRoutes() {
  console.log('\n📋 8. Rotas Públicas (não devem exigir auth)\n');

  // Página do wizard é pública (não API)
  const r = await get('/c/' + 'f'.repeat(64));
  if (r.status === 200 || r.status === 404) {
    ok(`GET /c/[token] → ${r.status} (rota pública, sem redirect para login)`);
  } else if (r.status === 302 || r.status === 307) {
    fail(`GET /c/[token] → ${r.status} (redirecionou para login — não deveria!)`);
  } else {
    warn(`GET /c/[token] → ${r.status}`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔐 Benavera Credenciamento — Security Tests`);
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Time:   ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    await testAuth();
    await testClinicToken();
    await testRateLimit();
    await testOTPWithoutSession();
    await testUploadWithoutSession();
    await testSecurityHeaders();
    await testSubmitWithoutSession();
    await testPublicRoutes();
  } catch (err) {
    console.error('\n💥 Erro fatal nos testes:', err.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Passou:    ${passed}`);
  console.log(`⚠️  Avisos:   ${warnings}`);
  console.log(`❌ Falhou:   ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n🚨 ATENÇÃO: Há falhas de segurança que precisam ser corrigidas antes do deploy!');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️  Há avisos que devem ser revisados antes do deploy.');
    process.exit(0);
  } else {
    console.log('\n🎉 Todos os testes de segurança passaram!');
    process.exit(0);
  }
}

main();
