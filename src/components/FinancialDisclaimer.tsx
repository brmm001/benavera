interface FinancialDisclaimerProps {
  compact?: boolean;
}

export function FinancialDisclaimer({ compact = false }: FinancialDisclaimerProps) {
  if (compact) {
    return (
      <p style={{
        fontSize: '0.8125rem',
        color: '#94a3b8',
        lineHeight: '1.6',
        fontStyle: 'italic',
      }}>
        Simulação educacional. Condições reais dependem da análise e dos parceiros disponíveis.
      </p>
    );
  }

  return (
    <div className="disclaimer">
      <strong style={{ fontWeight: '600', color: '#475569' }}>Aviso importante:</strong>{' '}
      A Benavera não garante aprovação, taxa, prazo ou disponibilidade de crédito. Eventuais condições
      financeiras serão apresentadas pelo parceiro responsável pela oferta e estarão sujeitas à análise
      e aos critérios aplicáveis.
    </div>
  );
}
