# Benavera — Plataforma de Pagamento de Tratamentos Particulares

A **Benavera** é uma plataforma de tecnologia que conecta pacientes a alternativas viáveis de pagamento para tratamentos particulares (odontologia, implantes, oftalmologia, cirurgias eletivas e procedimentos estéticos) e apoia clínicas e consultórios na viabilização de orçamentos.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16+ (App Router, Server Components & Route Handlers)
- **Linguagem:** TypeScript 5.9
- **Estilização:** CSS Variables nativas + Tailwind CSS v4
- **Banco de Dados:** **Turso** (`@libsql/client` / SQLite Serverless na Nuvem) com fallback persistente estruturado local
- **Analytics & UX:** Microsoft Clarity (com mascaramento LGPD rigoroso), GA4, Meta Pixel
- **SEO:** URLs padronizadas em `https://www.benavera.com.br`, sitemap dinâmico, robots.txt, JSON-LD Schemas e `/llms.txt`

---

## 🚀 Instalação e Desenvolvimento Local

1. **Clone e instale dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse: `http://localhost:3000`

---

## 🗄️ Banco de Dados: Turso (libSQL / SQLite Serverless)

O projeto está configurado para utilizar o **Turso** como banco de dados principal de produção.

### 1. Criar o banco no Turso:
Se você já tem a CLI do Turso instalada:
```bash
turso auth login
turso db create benavera-db
turso db show benavera-db --url
turso db tokens create benavera-db
```
Ou crie diretamente no dashboard em [turso.tech](https://turso.tech).

### 2. Configurar as variáveis no `.env.local` ou na Vercel:
```env
TURSO_DATABASE_URL=libsql://benavera-db-seu-usuario.turso.io
TURSO_AUTH_TOKEN=seu_token_do_turso
```

### 3. Aplicar as migrações:
O projeto possui auto-inicialização de schema, mas você também pode rodar o script de migração:
```bash
node scripts/init-turso.mjs
```
O arquivo de migração SQL para Turso está em: `turso/migrations/20260901000001_create_leads_and_events.sql`.

---

## 📊 Microsoft Clarity & Privacidade (LGPD)

O script do Microsoft Clarity é carregado de forma assíncrona sem afetar os Core Web Vitals.

### Configuração:
1. Crie um projeto em [Microsoft Clarity](https://clarity.microsoft.com).
2. Copie o **Project ID**.
3. Adicione no arquivo de variáveis:
   ```env
   NEXT_PUBLIC_MICROSOFT_CLARITY_ID=seu-id-clarity
   ```

---

## 🔒 Painel Administrativo (`/admin`)

O painel está localizado em `/admin/leads` com proteção no servidor e no frontend:
- **Metatags:** `noindex, nofollow`
- **Autenticação:** Cookie seguro HttpOnly ou secret token
- **Recursos:** Visualização de simulações, cadastros de clínicas, filtros por status/cidade/origem, dashboard de métricas, histórico de auditoria de eventos, inclusão de notas e exportação CSV.
- **Conformidade LGPD:** Botão de anonimização e exclusão de dados pessoais.

---

## ☁️ Deploy na Vercel

1. Conecte o repositório na [Vercel](https://vercel.com).
2. Adicione as variáveis de ambiente (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, etc.).
3. O deploy ocorre automaticamente com suporte nativo a Edge e Serverless.
