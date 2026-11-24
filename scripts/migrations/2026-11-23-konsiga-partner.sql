-- scripts/migrations/2026-11-23-konsiga-partner.sql
-- Registra a Konsiga (KonsigaPay) como parceira financeira no hub

BEGIN;

INSERT INTO financial_partners (
  nome,
  api_slug,
  modo,
  ativo,
  integration_active,
  ticket_minimo,
  ticket_maximo,
  prazo_maximo,
  prioridade,
  created_at,
  updated_at
) VALUES (
  'Konsiga',
  'konsiga',
  'API'::partner_mode,
  true,
  false,  -- Desativada até configurar credenciais no Vercel
  500.00,
  50000.00,
  15,
  20,
  NOW(),
  NOW()
)
ON CONFLICT (api_slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  updated_at = NOW();

COMMIT;
