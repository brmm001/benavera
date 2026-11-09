// src/components/rep-format.ts
export const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export const brlCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

export const pct = (v: number, digits = 1) => `${(v || 0).toFixed(digits).replace('.', ',')}%`;

export const dataBR = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d);
};

export const STATUS_COMISSAO: Record<string, { label: string; color: string; bg: string }> = {
  PREVISTA: { label: 'Prevista', color: '#b45309', bg: '#fef3c7' },
  A_RECEBER: { label: 'A receber', color: '#4338ca', bg: '#e0e7ff' },
  PAGA: { label: 'Paga', color: '#047857', bg: '#d1fae5' },
  CANCELADA: { label: 'Cancelada', color: '#64748b', bg: '#e2e8f0' },
};

export const TIPO_COMISSAO: Record<string, string> = {
  FINANCIAMENTO: 'Financiamento',
  MENSALIDADE: 'Mensalidade',
  BONUS: 'Bônus de ativação',
};

export function periodoLabel(meses: number | null) {
  return meses === null || meses === undefined ? 'Vitalício' : `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

