-- scripts/migrations/2026-11-24-konsiga-flow.sql
-- Adiciona datas de nascimento opcionais dos responsáveis da clínica (exigidas pela API Konsiga v1.4)

BEGIN;

ALTER TABLE clinic_onboardings
  ADD COLUMN IF NOT EXISTS tech_rep_birth_date DATE,
  ADD COLUMN IF NOT EXISTS legal_rep_birth_date DATE;

COMMIT;
