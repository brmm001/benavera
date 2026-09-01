import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { timingSafeCompare, sanitizeString, maskPII, sanitizeObject } from '../src/lib/security.ts';
import { checkRateLimit } from '../src/lib/rateLimit.ts';

console.log('====================================================');
console.log('BENAVERA — SUÍTE DE TESTES E AUDITORIA TÉCNICA AVANÇADA');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedTests++;
  }
}

// -------------------------------------------------------------
// 1. TÍTULOS NÃO DUPLICADOS & METADATA
// -------------------------------------------------------------
console.log('1. Verificando Títulos e Prevenção de Duplicações ("Benavera | Benavera")...');

const appDir = path.join(process.cwd(), 'src', 'app');
const publicAppDir = path.join(appDir, '(public)');

function getAllFiles(dir, fileList = []) {
  if (!existsSync(dir)) return fileList;
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allAppFiles = getAllFiles(appDir);

allAppFiles.forEach((filePath) => {
  const content = readFileSync(filePath, 'utf-8');
  const relative = path.relative(process.cwd(), filePath);

  // Verifica se o title possui duplicidade evidente
  if (content.includes('title:')) {
    const hasDoubleBenavera = /title:\s*['"`][^'"`]*Benavera[^'"`]*\|\s*Benavera/i.test(content);
    assert(!hasDoubleBenavera, `Sem "Benavera | Benavera" em ${relative}`);
  }
});

// -------------------------------------------------------------
// 2. META DESCRIPTIONS (140-160 CARACTERES & QUALIDADE)
// -------------------------------------------------------------
console.log('\n2. Verificando Meta Descriptions (140 a 160 caracteres preferenciais)...');

const pagesWithMetadata = [
  path.join(publicAppDir, 'page.tsx'),
  path.join(publicAppDir, 'conteudos', 'page.tsx'),
  path.join(publicAppDir, 'clinicas', 'page.tsx'),
  path.join(publicAppDir, 'como-funciona', 'page.tsx'),
  path.join(publicAppDir, 'calculadoras', 'page.tsx'),
  path.join(publicAppDir, 'financiamento-implante-dentario', 'page.tsx'),
  path.join(publicAppDir, 'parcelamento-cirurgia-particular', 'page.tsx'),
  path.join(publicAppDir, 'parcelamento-cirurgia-oftalmologica', 'page.tsx'),
  path.join(publicAppDir, 'parcelamento-procedimento-estetico', 'page.tsx'),
  path.join(publicAppDir, 'parcelamento-tratamento-odontologico', 'page.tsx'),
  path.join(publicAppDir, 'solucoes-financeiras-para-clinicas', 'page.tsx'),
  path.join(publicAppDir, 'politica-editorial', 'page.tsx'),
  path.join(publicAppDir, 'simular', 'page.tsx'),
  path.join(publicAppDir, 'sobre', 'page.tsx'),
  path.join(publicAppDir, 'privacidade', 'page.tsx'),
  path.join(publicAppDir, 'termos', 'page.tsx'),
];

pagesWithMetadata.forEach((p) => {
  if (existsSync(p)) {
    const content = readFileSync(p, 'utf-8');
    const match = content.match(/description:\s*['"`]([\s\S]*?)['"`],/);
    if (match && match[1]) {
      const desc = match[1].replace(/\s+/g, ' ').trim();
      const len = desc.length;
      assert(len >= 135 && len <= 165, `Description (${len} chars) adequada em ${path.basename(path.dirname(p)) || 'home'}`);
    }
  }
});

// -------------------------------------------------------------
// 3. TERMO "ALL-ON-4" SUBSTITUÍDO
// -------------------------------------------------------------
console.log('\n3. Verificando substituição de "All-on-4" por "prótese protocolo sobre implantes"...');
const implantePagePath = path.join(publicAppDir, 'financiamento-implante-dentario', 'page.tsx');
if (existsSync(implantePagePath)) {
  const implanteContent = readFileSync(implantePagePath, 'utf-8');
  assert(!implanteContent.toLowerCase().includes('all-on-4'), 'Página de implantes não contém o termo All-on-4');
  assert(implanteContent.includes('prótese protocolo sobre implantes'), 'Página de implantes utiliza terminologia genérica adequada');
}

// -------------------------------------------------------------
// 4. SEPARAÇÃO DE LAYOUTS E SCHEMAS
// -------------------------------------------------------------
console.log('\n4. Verificando Isolamento do Layout Público vs Administrativo...');

const rootLayoutPath = path.join(appDir, 'layout.tsx');
const publicLayoutPath = path.join(publicAppDir, 'layout.tsx');
const adminLayoutPath = path.join(appDir, 'admin', 'layout.tsx');

assert(existsSync(publicLayoutPath), 'src/app/(public)/layout.tsx existe');
assert(existsSync(adminLayoutPath), 'src/app/admin/layout.tsx existe');

if (existsSync(rootLayoutPath)) {
  const rootContent = readFileSync(rootLayoutPath, 'utf-8');
  assert(!rootContent.includes('organizationSchema'), 'Root layout não injeta Organization schema indiscriminadamente');
  assert(!rootContent.includes('ClarityScript'), 'Root layout não injeta ClarityScript no admin');
}

if (existsSync(publicLayoutPath)) {
  const publicContent = readFileSync(publicLayoutPath, 'utf-8');
  assert(publicContent.includes('organizationSchema'), 'Layout público contém Organization schema');
  assert(publicContent.includes('webSiteSchema'), 'Layout público contém WebSite schema');
  assert(publicContent.includes('ClarityScript'), 'Layout público carrega ClarityScript');
}

if (existsSync(adminLayoutPath)) {
  const adminContent = readFileSync(adminLayoutPath, 'utf-8');
  assert(adminContent.includes('index: false'), 'Layout admin possui index: false');
  assert(adminContent.includes('follow: false'), 'Layout admin possui follow: false');
  assert(!adminContent.includes('Organization'), 'Layout admin não possui schemas públicos');
  assert(!adminContent.includes('ClarityScript'), 'Layout admin não possui ClarityScript');
}

// -------------------------------------------------------------
// 5. AUTENTICAÇÃO E ROTA DE LOGIN ADMIN
// -------------------------------------------------------------
console.log('\n5. Verificando Fluxo de Autenticação Administrativa e Segurança...');

const adminLoginPath = path.join(appDir, 'admin', 'login', 'page.tsx');
const adminLeadsPath = path.join(appDir, 'admin', 'leads', 'page.tsx');
const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts');

assert(existsSync(adminLoginPath), 'Rota /admin/login criada com sucesso');
assert(existsSync(adminLeadsPath), 'Rota /admin/leads criada com sucesso');
assert(existsSync(middlewarePath), 'src/middleware.ts implementado');

// Teste das funções de segurança criptográfica
assert(timingSafeCompare('senha123', 'senha123') === true, 'timingSafeCompare valida senhas iguais');
assert(timingSafeCompare('senha123', 'senhaErrada') === false, 'timingSafeCompare rejeita senhas diferentes');
assert(timingSafeCompare('senha123', 'senha1234') === false, 'timingSafeCompare lida com tamanhos diferentes com segurança');

// Teste de sanitização e mascaramento
assert(sanitizeString('<script>alert(1)</script>Teste') === 'Teste', 'Sanitização remove tags script maliciosas');
assert(maskPII('paciente@teste.com') === 'p***e@teste.com', 'Mascaramento seguro de e-mail PII');
assert(maskPII('(11) 98765-4321') === '11*****4321', 'Mascaramento seguro de telefone PII');

// Teste de Rate Limiting
const rlKey = `test_limit_${Date.now()}`;
assert(checkRateLimit(rlKey, 3, 1000).allowed === true, 'Rate limit permite 1ª tentativa');
assert(checkRateLimit(rlKey, 3, 1000).allowed === true, 'Rate limit permite 2ª tentativa');
assert(checkRateLimit(rlKey, 3, 1000).allowed === true, 'Rate limit permite 3ª tentativa');
assert(checkRateLimit(rlKey, 3, 1000).allowed === false, 'Rate limit bloqueia 4ª tentativa excedente');

// -------------------------------------------------------------
// 6. ROBOTS.TXT E SITEMAP.TS
// -------------------------------------------------------------
console.log('\n6. Verificando Robots.txt e Sitemap.ts...');

const robotsPath = path.join(appDir, 'robots.ts');
const sitemapPath = path.join(appDir, 'sitemap.ts');

if (existsSync(robotsPath)) {
  const robotsCode = readFileSync(robotsPath, 'utf-8');
  assert(robotsCode.includes("allow: '/'"), 'Robots permite indexação pública em produção');
  assert(robotsCode.includes("'/admin/'"), 'Robots desabilita /admin/');
  assert(robotsCode.includes("'/api/'"), 'Robots desabilita /api/');
  assert(robotsCode.includes('https://www.benavera.com.br/sitemap.xml'), 'Robots referencia sitemap canônico com www');
}

if (existsSync(sitemapPath)) {
  const sitemapCode = readFileSync(sitemapPath, 'utf-8');
  assert(!sitemapCode.includes('/admin'), 'Sitemap não contém URLs administrativas');
  assert(!sitemapCode.includes('/api'), 'Sitemap não contém URLs de API');
  assert(!sitemapCode.includes('/obrigado'), 'Sitemap não contém páginas de conversão privadas');
  assert(sitemapCode.includes('https://www.benavera.com.br'), 'Sitemap padronizado em www.benavera.com.br');
}

// -------------------------------------------------------------
// 7. LLMS.TXT
// -------------------------------------------------------------
console.log('\n7. Verificando llms.txt...');

const llmsPath = path.join(process.cwd(), 'public', 'llms.txt');
if (existsSync(llmsPath)) {
  const llmsContent = readFileSync(llmsPath, 'utf-8');
  assert(llmsContent.includes('https://www.benavera.com.br'), 'llms.txt utiliza URLs absolutas com www');
  assert(llmsContent.includes('Limitações e Avisos Importantes'), 'llms.txt declara limitações regulatórias');
  assert(llmsContent.includes('contato@benavera.com.br'), 'llms.txt contém canal institucional de contato');
}

// -------------------------------------------------------------
// 8. FIXTURES DE BACKEND (TESTES DE SCHEMA E PERSISTÊNCIA)
// -------------------------------------------------------------
console.log('\n8. Validando Validações de Formulários com Fixtures Fictícias...');

const mockPatientData = {
  name: 'Usuário Teste Automatizado',
  phone: '(11) 90000-0000',
  email: 'teste-automatizado@example.com',
  procedure: 'Implante dentário unitário',
  treatmentValue: 3500,
  downPayment: 500,
  monthlyBudget: 250,
  city: 'São Paulo',
  state: 'SP',
  consent: true,
  leadSource: 'simulador_teste',
  utmCampaign: 'teste_unitario',
};

const sanitizedPatient = sanitizeObject(mockPatientData);
assert(sanitizedPatient.name === 'Usuário Teste Automatizado', 'Sanitização preserva nome de teste válido');
assert(sanitizedPatient.consent === true, 'Consentimento LGPD preservado');
assert(sanitizedPatient.treatmentValue === 3500, 'Valor de tratamento validado numericamente');

console.log('\n====================================================');
console.log(`TOTAL DE TESTES EXECUTADOS: ${passedTests + failedTests}`);
console.log(`SUCESSO: ${passedTests} | FALHAS: ${failedTests}`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
