-- 2026-11-27: Remove financeiras fictícias de seed (CredFacil, MedCredit, SaúdePay) mantendo apenas as financeiras reais (Parcelex, Konsiga)
DELETE FROM financial_partners
WHERE id IN (
  'c1000001-0001-4001-a001-000000000001',
  'c2000002-0002-4002-a002-000000000002',
  'c3000003-0003-4003-a003-000000000003'
)
  AND api_slug IS NULL
  AND NOT EXISTS (SELECT 1 FROM funding_attempts fa WHERE fa.partner_id = financial_partners.id)
  AND NOT EXISTS (SELECT 1 FROM proposals pr WHERE pr.partner_id = financial_partners.id)
  AND NOT EXISTS (SELECT 1 FROM payouts py WHERE py.partner_id = financial_partners.id);
