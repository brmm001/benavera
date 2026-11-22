-- Migração: Hub multi-financeiras (fan-out) + conector Parcelex com webhooks idempotentes
-- Data: 2026-11-22

ALTER TABLE financial_partners
  ADD COLUMN IF NOT EXISTS api_slug varchar(50) UNIQUE;

ALTER TABLE funding_attempts
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_transaction_id text,
  ADD COLUMN IF NOT EXISTS external_status text,
  ADD COLUMN IF NOT EXISTS external_step text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_funding_attempts_ext_tx
  ON funding_attempts(external_transaction_id);

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS external_option_id text;

CREATE TABLE IF NOT EXISTS partner_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_slug varchar(50) NOT NULL,
  dedupe_key varchar(64) NOT NULL,
  external_transaction_id text,
  action varchar(50),
  payload jsonb,
  received_at timestamptz DEFAULT NOW(),
  processed_at timestamptz,
  error text,
  UNIQUE (partner_slug, dedupe_key)
);

INSERT INTO financial_partners (
  nome,
  nome_legal,
  ativo,
  prioridade,
  ticket_minimo,
  ticket_maximo,
  prazo_maximo,
  comissao_benavera_percent,
  modo,
  integration_active,
  api_slug
)
VALUES (
  'Parcelex',
  'Parcelex',
  true,
  10,
  100,
  10000,
  24,
  0.02,
  'API'::partner_mode,
  false,
  'parcelex'
)
ON CONFLICT (api_slug) DO NOTHING;
