import { readFileSync, existsSync } from 'fs';
import path from 'path';

console.log('====================================================');
console.log('BENAVERA — TEST SUITE DE VALIDAÇÃO TÉCNICA E SEO');
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

// 1. Validar URLs Canônicas dos Artigos
console.log('1. Verificando URLs Canônicas e E-E-A-T em articles.ts...');
const articlesFilePath = path.join(process.cwd(), 'src', 'content', 'articles.ts');
assert(existsSync(articlesFilePath), 'Arquivo src/content/articles.ts existe');
if (existsSync(articlesFilePath)) {
  const fileContent = readFileSync(articlesFilePath, 'utf-8');
  assert(fileContent.includes('https://www.benavera.com.br/conteudos/'), 'Contém canonicals com www.benavera.com.br');
  assert(fileContent.includes("author: 'Equipe Benavera'"), 'Artigos possuem autor Equipe Benavera');
  assert(fileContent.includes("reviewer: 'Revisão Editorial Benavera'"), 'Artigos possuem selo de revisão editorial');
  assert(fileContent.includes('sources: ['), 'Artigos possuem fontes e referências oficiais');
}

// 2. Validar Estrutura do llms.txt
console.log('\n2. Verificando llms.txt...');
const llmsPath = path.join(process.cwd(), 'public', 'llms.txt');
assert(existsSync(llmsPath), 'Arquivo public/llms.txt existe');
if (existsSync(llmsPath)) {
  const content = readFileSync(llmsPath, 'utf-8');
  assert(content.includes('https://www.benavera.com.br'), 'llms.txt contém URLs padronizadas www');
  assert(content.includes('Públicos Atendidos'), 'llms.txt define públicos atendidos');
  assert(content.includes('Limitações e Avisos Importantes'), 'llms.txt possui avisos regulatórios e disclaimer');
}

// 3. Validar Migração SQL do Turso
console.log('\n3. Verificando migrações de banco de dados (Turso)...');
const tursoMigrationPath = path.join(
  process.cwd(),
  'turso',
  'migrations',
  '20260901000001_create_leads_and_events.sql'
);
assert(existsSync(tursoMigrationPath), 'Migração SQL do Turso existe');
if (existsSync(tursoMigrationPath)) {
  const sql = readFileSync(tursoMigrationPath, 'utf-8');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS patient_leads'), 'Cria tabela patient_leads no Turso');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS clinic_leads'), 'Cria tabela clinic_leads no Turso');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS lead_events'), 'Cria tabela lead_events no Turso');
}

// 4. Validar Arquivos de Novas Landing Pages
console.log('\n4. Verificando páginas de intenção de busca...');
const intentPages = [
  'parcelamento-tratamento-odontologico',
  'financiamento-implante-dentario',
  'parcelamento-cirurgia-particular',
  'parcelamento-cirurgia-oftalmologica',
  'parcelamento-procedimento-estetico',
  'solucoes-financeiras-para-clinicas',
  'politica-editorial',
];

intentPages.forEach((p) => {
  const pagePath = path.join(process.cwd(), 'src', 'app', p, 'page.tsx');
  assert(existsSync(pagePath), `Página /${p} criada com sucesso`);
});

// 5. Validar Robots.txt e Sitemap.ts
console.log('\n5. Verificando Robots.txt e Sitemap.ts...');
const robotsPath = path.join(process.cwd(), 'src', 'app', 'robots.ts');
const sitemapPath = path.join(process.cwd(), 'src', 'app', 'sitemap.ts');
assert(existsSync(robotsPath), 'Arquivo app/robots.ts existe');
assert(existsSync(sitemapPath), 'Arquivo app/sitemap.ts existe');

// 6. Validar Endpoints de Backend e Cliente Turso
console.log('\n6. Verificando Endpoints de API e Integração Turso...');
const apiPaths = [
  path.join(process.cwd(), 'src', 'lib', 'turso.ts'),
  path.join(process.cwd(), 'src', 'lib', 'db.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'leads', 'route.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'leads', 'patient', 'route.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'leads', 'clinic', 'route.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'health', 'route.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'auth', 'login', 'route.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'leads', 'route.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'leads', '[id]', 'route.ts'),
  path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'export', 'route.ts'),
];

apiPaths.forEach((api) => {
  assert(existsSync(api), `Módulo ${path.relative(process.cwd(), api)} existe`);
});

console.log('\n====================================================');
console.log(`TOTAL DE TESTES: ${passedTests + failedTests}`);
console.log(`PASSOU: ${passedTests} | FALHOU: ${failedTests}`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
