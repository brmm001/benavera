// Referência comercial única para páginas públicas. Alterações exigem validação da oferta.
const clinicFeePercent = 5;
const maxInstallments = 36;

export const COMMERCIAL = {
  clinicFeePercent,
  maxInstallments,
  reviewedAt: '2026-11-14',
  reviewedLabel: '14 de novembro de 2026',
  clinicCost: `Taxa de ${clinicFeePercent}% por operação, sem mensalidade ou adesão`,
  installmentCondition: `Até ${maxInstallments} parcelas, conforme análise e modalidade`,
  description: `Financiamento para tratamentos de saúde: taxa de ${clinicFeePercent}% por operação para a clínica, sem mensalidade ou adesão. Até ${maxInstallments} parcelas, conforme análise e modalidade.`,
} as const;

export const CLINIC_FINANCING_PATH = '/financiamento-odontologico-para-clinicas';
export const IMPLANT_FINANCING_PATH = '/financiamento-implantes-para-clinicas';

export function clinicFeeExample(amount: number) {
  const fee = Math.round(amount * COMMERCIAL.clinicFeePercent) / 100;
  return { amount, fee, net: amount - fee };
}

export function currencyBRL(amount: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}
