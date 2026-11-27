-- 2026-11-27: Links de Cadastro + Assinatura para Representantes e Atendentes + Comissões SaaS Separadas

ALTER TABLE representantes
  ADD COLUMN IF NOT EXISTS max_discount_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_trial_days INT NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS codigo_indicacao VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mensalidade_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_periodo_meses INT,
  ADD COLUMN IF NOT EXISTS max_discount_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_trial_days INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_codigo_indicacao
  ON users (codigo_indicacao) WHERE codigo_indicacao IS NOT NULL;

CREATE TABLE IF NOT EXISTS seller_signup_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(24) NOT NULL UNIQUE,
  seller_type VARCHAR(20) NOT NULL CHECK (seller_type IN ('REPRESENTANTE', 'ATENDENTE')),
  representante_id UUID REFERENCES representantes(id) ON DELETE CASCADE,
  atendente_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(160),
  plan_id UUID NOT NULL REFERENCES saas_plans(id) ON DELETE RESTRICT,
  billing_cycle VARCHAR(16) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
  coupon_code VARCHAR(50),
  discount_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  trial_days INT NOT NULL DEFAULT 0,
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (seller_type = 'REPRESENTANTE' AND representante_id IS NOT NULL AND atendente_user_id IS NULL) OR
    (seller_type = 'ATENDENTE' AND atendente_user_id IS NOT NULL AND representante_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_seller_signup_links_rep
  ON seller_signup_links (representante_id) WHERE representante_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seller_signup_links_atend
  ON seller_signup_links (atendente_user_id) WHERE atendente_user_id IS NOT NULL;

ALTER TABLE clinic_subscriptions
  ADD COLUMN IF NOT EXISTS signup_link_id UUID REFERENCES seller_signup_links(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS atendente_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendente_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  signup_link_id UUID REFERENCES seller_signup_links(id) ON DELETE SET NULL,
  mensalidade_percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  periodo_meses INT,
  inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fim TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  origem VARCHAR(32) NOT NULL DEFAULT 'LINK_ASSINATURA',
  criado_por VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_atendente_vinculos_clinic_active
  ON atendente_vinculos (clinic_id) WHERE ativo = TRUE;

CREATE TABLE IF NOT EXISTS atendente_saas_comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendente_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vinculo_id UUID NOT NULL REFERENCES atendente_vinculos(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES saas_invoices(id) ON DELETE CASCADE,
  base_valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  percent NUMERIC(6,3) NOT NULL DEFAULT 0,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PREVISTA' CHECK (status IN ('PREVISTA', 'A_RECEBER', 'PAGA', 'CANCELADA')),
  competencia DATE,
  liberada_em TIMESTAMPTZ,
  paga_em TIMESTAMPTZ,
  observacao TEXT,
  comprovante_url TEXT,
  pago_por VARCHAR(160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vinculo_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_atendente_saas_com_user
  ON atendente_saas_comissoes (atendente_user_id, status);
