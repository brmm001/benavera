# Benavera — Plataforma de Pagamento de Tratamentos Particulares

A **Benavera** é uma plataforma de tecnologia que conecta pacientes a alternativas viáveis de pagamento para tratamentos particulares (odontologia, implantes, oftalmologia, cirurgias eletivas e procedimentos estéticos) e apoia clínicas e consultórios na viabilização de orçamentos.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16+ (App Router, Server Components & Route Handlers)
- **Linguagem:** TypeScript 5.9
- **Estilização:** CSS Variables nativas + Tailwind CSS v4
- **Banco de Dados:** **Turso** (`@libsql/client` / SQLite Serverless na Nuvem) com fallback persistente estruturado local
- **Analytics & UX:** Microsoft Clarity (com mascaramento LGPD rigoroso e bloqueio no admin), GA4, Meta Pixel
- **SEO & Dados Estruturados:** URLs padronizadas em `https://www.benavera.com.br`, sitemap estável, robots.txt ambiental, JSON-LD Schemas organizados por rota e `/llms.txt`

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
```bash
node scripts/init-turso.mjs
```
O arquivo de migração SQL para Turso está em: `turso/migrations/20260901000001_create_leads_and_events.sql`.

---

## 📊 Microsoft Clarity & Privacidade (LGPD)

O script do Microsoft Clarity é carregado de forma assíncrona (`afterInteractive`) sem afetar os Core Web Vitals e com isolamento estrito:

- **Zero PII:** Nomes, e-mails, telefones, CPFs e valores individuais nunca são enviados para tags ou eventos do Clarity.
- **Isolamento Administrativo:** O script **nunca** é executado ou inserido nas páginas administrativas (`/admin/*`).
- **Mascaramento:** Os formulários possuem atributos `data-clarity-mask="true"`.

### Como Configurar o Microsoft Clarity:
1. Acesse [clarity.microsoft.com](https://clarity.microsoft.com) e crie um novo projeto com o nome **Benavera** e domínio `https://www.benavera.com.br`.
2. Em **Settings > Overview**, copie o **Project ID** (código alfanumérico).
3. Na Vercel, acesse **Project Settings > Environment Variables** e adicione:
   ```env
   NEXT_PUBLIC_MICROSOFT_CLARITY_ID=seu_project_id_aqui
   ```
4. Realize um novo deploy (ou redeploy) na Vercel.
5. Acesse o site público e confirme que a tag `clarity.ms/tag/` é carregada no console da página pública.
6. Acesse `/admin/login` e `/admin/leads` e confirme que a tag do Clarity **não** é injetada.

---

## 🔍 Google Search Console & Indexação

Para monitorar o desempenho orgânico e a indexação das páginas no Google:

### Como Configurar:
1. Acesse o [Google Search Console](https://search.google.com/search-console).
2. Adicione a propriedade usando **Prefixo do URL**: `https://www.benavera.com.br`.
3. Escolha o método de verificação **Tag HTML** e copie o código alfanumérico do atributo `content`.
4. Configure a variável no ambiente da Vercel:
   ```env
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=codigo_da_tag_google
   ```
5. Faça o deploy e clique em **Verificar** no Search Console.
6. No menu lateral, acesse **Sitemaps** e envie: `https://www.benavera.com.br/sitemap.xml`.
7. Solicite a indexação prioritária da página inicial (`/`) e das landing pages de intenção de busca.
8. Verifique periodicamente a aba de **Cobertura** para confirmar que as páginas públicas estão como `Indexadas` e as rotas `/admin/` e `/api/` estão devidamente bloqueadas pelo `robots.txt`.

---

## 🔒 Painel Administrativo (`/admin`)

O painel administrativo possui autenticação robusta em duas camadas:

- **Fluxo de Navegação:**
  - Acessar `/admin` redireciona para `/admin/login` (ou `/admin/leads` se já logado).
  - Usuários não autenticados que tentarem acessar `/admin/leads` são redirecionados para `/admin/login`.
  - Após login com sucesso, o usuário é redirecionado para `/admin/leads`.
  - Botão **Sair** no cabeçalho encerra a sessão e invalida os cookies.
- **Segurança do Servidor:**
  - Comparação segura com proteção contra ataques de temporização (`crypto.timingSafeEqual`).
  - Cookie de sessão `benavera_admin_token` com flags `HttpOnly`, `Secure` (em produção), `SameSite=Lax` e validade de 7 dias.
  - Rate limiting ativo para prevenção de ataques de força bruta no endpoint de login.
  - Headers `X-Robots-Tag: noindex, nofollow, noarchive` injetados no middleware para toda a rota `/admin`.
  - Variáveis de ambiente necessárias:
    ```env
    ADMIN_PASSWORD=sua_senha_mestra_segura
    ADMIN_SECRET=seu_segredo_criptografico_de_sessao
    ```

---

## 🧪 Testes Automatizados

Para rodar a suíte completa de validação técnica, SEO, schemas e backend:
```bash
node scripts/test-suite.mjs
```
