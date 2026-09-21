-- =============================================================================
-- BENAVERA — Módulo de Credenciamento de Clínicas
-- Migration: 20260921000002_credenciamento.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUM: Status do credenciamento
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE onboarding_status AS ENUM (
    'DRAFT',
    'PRE_REGISTERED',
    'INVITE_SENT',
    'INVITE_OPENED',
    'IN_PROGRESS',
    'PENDING_DOCUMENTS',
    'SUBMITTED',
    'UNDER_REVIEW',
    'CORRECTION_REQUIRED',
    'APPROVED',
    'CONTRACT_PENDING',
    'CONTRACT_SIGNED',
    'ACTIVE',
    'REJECTED',
    'EXPIRED',
    'REVOKED',
    'SUSPENDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- ENUM: Status de revisão de documento
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE document_review_status AS ENUM (
    'PENDING',
    'VALIDATED',
    'CORRECTION_REQUESTED',
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- ENUM: Status de scan antimalware
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE scan_status AS ENUM (
    'PENDING',
    'CLEAN',
    'THREAT_DETECTED',
    'ERROR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- TABELA PRINCIPAL: clinic_onboardings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinic_onboardings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados básicos (pré-cadastro feito pelo admin)
  trade_name            TEXT NOT NULL,               -- Nome fantasia
  legal_name            TEXT,                        -- Razão social
  cnpj                  TEXT,                        -- CNPJ (não obrigatório no pré-cadastro)
  contact_name          TEXT NOT NULL,               -- Nome do responsável pelo contato
  contact_cpf           TEXT,                        -- CPF do responsável
  phone                 TEXT NOT NULL,               -- WhatsApp
  email                 TEXT NOT NULL,               -- E-mail
  city                  TEXT NOT NULL,               -- Cidade
  state                 TEXT NOT NULL,               -- UF
  specialty             TEXT,                        -- Especialidade principal
  average_ticket        TEXT,                        -- Ticket médio aproximado
  internal_notes        TEXT,                        -- Observações internas (admin)

  -- Dados complementares (preenchidos pela clínica)
  trade_name_confirmed  TEXT,
  address_cep           TEXT,
  address_street        TEXT,
  address_number        TEXT,
  address_complement    TEXT,
  address_neighborhood  TEXT,
  address_city          TEXT,
  address_state         TEXT,
  phone_secondary       TEXT,
  email_admin           TEXT,
  email_financial       TEXT,
  website               TEXT,
  municipal_registration TEXT,
  state_registration    TEXT,

  -- Responsável legal
  legal_rep_name        TEXT,
  legal_rep_cpf         TEXT,
  legal_rep_role        TEXT,
  legal_rep_email       TEXT,
  legal_rep_phone       TEXT,
  legal_rep_has_powers  BOOLEAN,

  -- Representante com poderes (quando legal_rep_has_powers = false)
  authorized_rep_name   TEXT,
  authorized_rep_cpf    TEXT,
  authorized_rep_role   TEXT,

  -- Responsável técnico
  tech_rep_name         TEXT,
  tech_rep_cpf          TEXT,
  tech_rep_council      TEXT,           -- CRO, CRM, CRP, etc.
  tech_rep_council_number TEXT,
  tech_rep_council_state TEXT,
  cnes                  TEXT,
  sanitary_license_number TEXT,
  sanitary_license_expiry DATE,
  operating_permit      TEXT,

  -- Dados bancários
  bank_name             TEXT,
  bank_code             TEXT,
  bank_agency           TEXT,
  bank_account          TEXT,
  bank_account_type     TEXT,           -- corrente / poupança
  bank_holder_name      TEXT,
  bank_holder_document  TEXT,           -- CPF ou CNPJ
  bank_pix_key          TEXT,
  bank_titularity_divergence BOOLEAN DEFAULT FALSE,

  -- Controle de fluxo
  status                onboarding_status NOT NULL DEFAULT 'DRAFT',
  progress_percent      SMALLINT NOT NULL DEFAULT 0,
  assigned_to           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by            UUID NOT NULL REFERENCES users(id),
  clinic_id             UUID REFERENCES clinics(id) ON DELETE SET NULL,  -- preenchido ao ativar

  -- Rastreamento de datas
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invite_sent_at        TIMESTAMPTZ,
  invite_opened_at      TIMESTAMPTZ,
  started_at            TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ,
  reviewed_at           TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  activated_at          TIMESTAMPTZ,
  rejected_at           TIMESTAMPTZ,

  -- Metadados de aprovação/rejeição
  rejection_reason      TEXT,
  rejection_message     TEXT,           -- Mensagem para a clínica

  -- LGPD
  privacy_policy_version TEXT,
  terms_version         TEXT
);

CREATE INDEX IF NOT EXISTS idx_onboardings_status   ON clinic_onboardings(status);
CREATE INDEX IF NOT EXISTS idx_onboardings_cnpj     ON clinic_onboardings(cnpj);
CREATE INDEX IF NOT EXISTS idx_onboardings_email    ON clinic_onboardings(email);
CREATE INDEX IF NOT EXISTS idx_onboardings_created  ON clinic_onboardings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboardings_assigned ON clinic_onboardings(assigned_to);

-- ---------------------------------------------------------------------------
-- TABELA: onboarding_invites (links de convite)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id   UUID NOT NULL REFERENCES clinic_onboardings(id) ON DELETE CASCADE,

  -- Segurança: armazenamos APENAS o hash do token, nunca o token em texto puro
  token_hash      TEXT NOT NULL UNIQUE,       -- SHA-256 do token
  token_prefix    TEXT NOT NULL,              -- Primeiros 8 chars para lookup rápido (não é secreto)
  expires_at      TIMESTAMPTZ NOT NULL,

  -- Rastreamento de uso
  opened_at       TIMESTAMPTZ,               -- Primeira abertura
  last_seen_at    TIMESTAMPTZ,               -- Última atividade
  session_count   INT NOT NULL DEFAULT 0,    -- Contagem de sessões OTP validadas

  -- Revogação
  revoked_at      TIMESTAMPTZ,
  revoked_by      UUID REFERENCES users(id),

  -- Auditoria
  created_by      UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- IP de abertura (para registro)
  first_ip        TEXT,
  user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS idx_invites_onboarding ON onboarding_invites(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_invites_prefix     ON onboarding_invites(token_prefix);
CREATE INDEX IF NOT EXISTS idx_invites_hash       ON onboarding_invites(token_hash);

-- ---------------------------------------------------------------------------
-- TABELA: onboarding_otp_attempts (tentativas de OTP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_otp_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id       UUID NOT NULL REFERENCES onboarding_invites(id) ON DELETE CASCADE,

  -- OTP armazenado como hash bcrypt, nunca texto puro
  otp_hash        TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,

  -- Tentativas
  attempts        SMALLINT NOT NULL DEFAULT 0,
  max_attempts    SMALLINT NOT NULL DEFAULT 5,
  validated_at    TIMESTAMPTZ,              -- NULL = ainda não validado
  invalidated_at  TIMESTAMPTZ,             -- NULL = ainda ativo

  -- IP/UA para logs
  ip              TEXT,
  user_agent      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_invite    ON onboarding_otp_attempts(invite_id);
CREATE INDEX IF NOT EXISTS idx_otp_created   ON onboarding_otp_attempts(created_at DESC);

-- ---------------------------------------------------------------------------
-- TABELA: onboarding_documents (documentos enviados)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id     UUID NOT NULL REFERENCES clinic_onboardings(id) ON DELETE CASCADE,

  document_type     TEXT NOT NULL,           -- 'contrato_social', 'rg_responsavel', etc.
  document_label    TEXT NOT NULL,           -- Rótulo amigável
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Arquivo atual (aponta para versão mais recente)
  current_version   INT NOT NULL DEFAULT 1,
  storage_key       TEXT,                   -- Chave interna no storage (path aleatório)
  original_filename TEXT,                   -- Nome original (apenas para exibição)
  mime_type         TEXT,
  size_bytes        BIGINT,
  sha256            TEXT,                   -- Hash de integridade

  -- Quarentena / scan
  scan_status       scan_status NOT NULL DEFAULT 'PENDING',
  scan_completed_at TIMESTAMPTZ,
  scan_metadata     JSONB,

  -- Revisão admin
  review_status     document_review_status NOT NULL DEFAULT 'PENDING',
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  review_note       TEXT,                   -- Observação interna
  correction_message TEXT,                  -- Mensagem para a clínica

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_onboarding ON onboarding_documents(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_docs_type       ON onboarding_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_docs_review     ON onboarding_documents(review_status);

-- ---------------------------------------------------------------------------
-- TABELA: onboarding_document_versions (versionamento de documentos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_document_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES onboarding_documents(id) ON DELETE CASCADE,
  version         INT NOT NULL,

  storage_key     TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  sha256          TEXT NOT NULL,

  -- Scan
  scan_status     scan_status NOT NULL DEFAULT 'PENDING',
  scan_completed_at TIMESTAMPTZ,

  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by_ip  TEXT,
  uploaded_by_ua  TEXT,

  -- Versão substituída por quem e quando
  superseded_at   TIMESTAMPTZ,

  UNIQUE(document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON onboarding_document_versions(document_id);

-- ---------------------------------------------------------------------------
-- TABELA: onboarding_field_changes (rastreamento de alterações em campos críticos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_field_changes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id   UUID NOT NULL REFERENCES clinic_onboardings(id) ON DELETE CASCADE,

  field_name      TEXT NOT NULL,            -- ex: 'cnpj', 'bank_account'
  old_value       TEXT,                     -- Mascarado em campos sensíveis
  new_value       TEXT,                     -- Mascarado em campos sensíveis
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by_ip   TEXT,
  changed_by_ua   TEXT,
  session_token   TEXT,                     -- Token do convite usado

  -- Flag para análise admin
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT
);

CREATE INDEX IF NOT EXISTS idx_field_changes_onboarding ON onboarding_field_changes(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_field_changes_field      ON onboarding_field_changes(field_name);
CREATE INDEX IF NOT EXISTS idx_field_changes_review     ON onboarding_field_changes(requires_review) WHERE requires_review = TRUE;

-- ---------------------------------------------------------------------------
-- TABELA: onboarding_acceptances (aceites de termos/declarações)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_acceptances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id     UUID NOT NULL REFERENCES clinic_onboardings(id) ON DELETE CASCADE,

  acceptance_type   TEXT NOT NULL,          -- 'privacy_policy', 'declaration_1', ..., 'declaration_13'
  document_version  TEXT NOT NULL,          -- Versão do documento aceito
  accepted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip                TEXT,
  user_agent        TEXT,
  session_token     TEXT                    -- Token do convite
);

CREATE INDEX IF NOT EXISTS idx_acceptances_onboarding ON onboarding_acceptances(onboarding_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_acceptances_unique ON onboarding_acceptances(onboarding_id, acceptance_type);

-- ---------------------------------------------------------------------------
-- TABELA: onboarding_audit_logs (log de auditoria imutável)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS onboarding_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id   UUID REFERENCES clinic_onboardings(id) ON DELETE SET NULL,

  -- Quem fez a ação
  actor_type      TEXT NOT NULL,            -- 'admin', 'clinic', 'system'
  actor_id        TEXT,                     -- UUID do usuário admin, ou 'clinic_session', 'system'
  actor_name      TEXT,
  actor_role      TEXT,

  -- O que foi feito
  action          TEXT NOT NULL,            -- Ver lista de ações abaixo
  entity_type     TEXT,                     -- 'onboarding', 'document', 'invite', etc.
  entity_id       TEXT,

  -- Dados contextuais (sem PII sensível)
  metadata        JSONB,                    -- {old_status, new_status, field, etc.}

  -- Contexto técnico
  ip              TEXT,
  user_agent      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de auditoria é append-only: sem UPDATE/DELETE via aplicação
CREATE INDEX IF NOT EXISTS idx_audit_onboarding ON onboarding_audit_logs(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON onboarding_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor      ON onboarding_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON onboarding_audit_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- Extend roles existentes (apenas adicionamos novas, sem remover)
-- ---------------------------------------------------------------------------
-- Nota: Se o tipo `user_role` existir como enum no Postgres, adicionar valores:
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'BENAVERA_COMPLIANCE';
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'BENAVERA_COMERCIAL';
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'BENAVERA_FINANCEIRO';
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'BENAVERA_SUPORTE';
-- 
-- Se a coluna `role` for TEXT (é o caso no schema atual identificado), 
-- os valores são simplesmente strings — nenhuma alteração de tipo necessária.

-- ---------------------------------------------------------------------------
-- Extend tabela users para suportar novas roles (coluna role é TEXT)
-- Nenhuma alteração estrutural necessária — roles são validadas na aplicação.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Permissões de acesso a documentos — política de visibilidade
-- (Implementadas via RBAC na aplicação, documentadas aqui para referência)
-- 
-- BENAVERA_ADMIN:         Acesso total a todas as seções
-- BENAVERA_COMPLIANCE:    Ver e validar documentos, aprovar/reprovar
-- BENAVERA_COMERCIAL:     Criar pré-cadastro, acompanhar status (sem documentos)
-- BENAVERA_FINANCEIRO:    Ver e validar dados bancários
-- BENAVERA_ANALYST:       Ver dados, acompanhar status (sem documentos sensíveis)
-- BENAVERA_SUPORTE:       Ver status básico (sem documentos)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Comentários descritivos nas colunas principais
-- ---------------------------------------------------------------------------
COMMENT ON TABLE clinic_onboardings IS 'Registro central de credenciamento de clínicas. Cada linha representa um processo de credenciamento.';
COMMENT ON TABLE onboarding_invites IS 'Links de convite para credenciamento. Armazena APENAS o hash do token, nunca o token em texto puro.';
COMMENT ON TABLE onboarding_otp_attempts IS 'Tentativas de OTP para verificação de identidade. OTP armazenado como hash bcrypt.';
COMMENT ON TABLE onboarding_documents IS 'Documentos enviados pela clínica. Arquivo físico fica no storage privado, apenas a chave é armazenada.';
COMMENT ON TABLE onboarding_document_versions IS 'Versionamento de documentos. Documento substituído não é apagado, cria nova versão.';
COMMENT ON TABLE onboarding_field_changes IS 'Rastreamento de alterações em campos críticos (CNPJ, CPF, conta bancária). Imutável.';
COMMENT ON TABLE onboarding_acceptances IS 'Registro de aceites de termos, declarações e política de privacidade.';
COMMENT ON TABLE onboarding_audit_logs IS 'Log de auditoria append-only. Todas as ações relevantes do sistema são registradas aqui.';
