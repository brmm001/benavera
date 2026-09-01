'use client';

import { useState } from 'react';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

// Calculadora 1: Parcela estimada
export function ParcelaCalculator() {
  const [valor, setValor] = useState('');
  const [entrada, setEntrada] = useState('');
  const [parcelas, setParcelas] = useState('12');
  const [taxa, setTaxa] = useState('2.5');
  const [resultado, setResultado] = useState<number | null>(null);

  const calcular = () => {
    const v = parseCurrencyInput(valor);
    const e = parseCurrencyInput(entrada);
    const n = parseInt(parcelas, 10);
    const r = parseFloat(taxa.replace(',', '.')) / 100;

    if (!v || v <= 0 || n <= 0) return;

    const financiado = Math.max(v - e, 0);
    if (financiado === 0) {
      setResultado(0);
      return;
    }

    if (r === 0) {
      setResultado(financiado / n);
    } else {
      const parcela = (financiado * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      setResultado(parcela);
    }

    trackEvent({
      event: 'calculator_used',
      properties: {
        tipo: 'parcela_estimada',
        parcelas: n,
      },
    });
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.5rem',
        }}
      >
        Estimativa de parcela
      </h2>
      <p
        style={{
          fontSize: '0.9rem',
          color: '#64748b',
          marginBottom: '1.75rem',
          lineHeight: '1.65',
        }}
      >
        Estime o valor aproximado de uma parcela com base no valor do tratamento, entrada e taxa de
        juros mensal. Valores hipotéticos para referência.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="input-label" htmlFor="calc-valor">
            Valor do tratamento
          </label>
          <input
            id="calc-valor"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 8000"
            value={valor}
            onChange={(e) => setValor(formatCurrencyInput(e.target.value))}
            onBlur={() => {
              const num = parseCurrencyInput(valor);
              if (num > 0) setValor(formatCurrency(num));
            }}
            className="input-field"
          />
        </div>
        <div>
          <label className="input-label" htmlFor="calc-entrada">
            Entrada (opcional)
          </label>
          <input
            id="calc-entrada"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 2000"
            value={entrada}
            onChange={(e) => setEntrada(formatCurrencyInput(e.target.value))}
            onBlur={() => {
              const num = parseCurrencyInput(entrada);
              if (num > 0) setEntrada(formatCurrency(num));
            }}
            className="input-field"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label" htmlFor="calc-parcelas">
              Nº de parcelas
            </label>
            <select
              id="calc-parcelas"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
              className="select-field"
            >
              {[6, 12, 18, 24, 36, 48, 60].map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="calc-taxa">
              Taxa mensal (%)
            </label>
            <input
              id="calc-taxa"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 2.5"
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <button
          id="btn-calcular-parcela"
          onClick={calcular}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
        >
          Calcular estimativa
        </button>

        {resultado !== null && (
          <div
            style={{
              background: '#f0f4ff',
              border: '1px solid #c7d7fe',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 0.375rem' }}>
              Parcela estimada
            </p>
            <p style={{ fontSize: '2rem', fontWeight: '800', color: '#2f3181', margin: 0 }}>
              {formatCurrency(resultado)}
            </p>
            <p
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                margin: '0.5rem 0 0',
                lineHeight: '1.5',
              }}
            >
              Valor hipotético. Condições reais dependem da análise do parceiro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Calculadora 2: Total pago
export function TotalPagoCalculator() {
  const [parcela, setParcela] = useState('');
  const [numParcelas, setNumParcelas] = useState('12');
  const [entradaTotal, setEntradaTotal] = useState('');
  const [resultado, setResultado] = useState<{
    total: number;
    financiado: number;
  } | null>(null);

  const calcular = () => {
    const p = parseCurrencyInput(parcela);
    const n = parseInt(numParcelas, 10);
    const e = parseCurrencyInput(entradaTotal);

    if (!p || p <= 0 || n <= 0) return;

    const totalParcelas = p * n;
    const total = totalParcelas + e;
    const financiado = totalParcelas;

    setResultado({ total, financiado });

    trackEvent({
      event: 'calculator_used',
      properties: {
        tipo: 'total_pago',
        parcelas: n,
      },
    });
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: '700',
          color: '#0f172a',
          marginBottom: '0.5rem',
        }}
      >
        Total pago no parcelamento
      </h2>
      <p
        style={{
          fontSize: '0.9rem',
          color: '#64748b',
          marginBottom: '1.75rem',
          lineHeight: '1.65',
        }}
      >
        Some a entrada ao total de parcelas para entender o valor consolidado a ser pago.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="input-label" htmlFor="total-parcela">
            Valor da parcela
          </label>
          <input
            id="total-parcela"
            type="text"
            inputMode="numeric"
            placeholder="Ex: 300"
            value={parcela}
            onChange={(e) => setParcela(formatCurrencyInput(e.target.value))}
            onBlur={() => {
              const num = parseCurrencyInput(parcela);
              if (num > 0) setParcela(formatCurrency(num));
            }}
            className="input-field"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="input-label" htmlFor="total-num-parcelas">
              Nº de parcelas
            </label>
            <select
              id="total-num-parcelas"
              value={numParcelas}
              onChange={(e) => setNumParcelas(e.target.value)}
              className="select-field"
            >
              {[6, 12, 18, 24, 36, 48, 60].map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="total-entrada">
              Entrada
            </label>
            <input
              id="total-entrada"
              type="text"
              inputMode="numeric"
              placeholder="Ex: 2000"
              value={entradaTotal}
              onChange={(e) => setEntradaTotal(formatCurrencyInput(e.target.value))}
              onBlur={() => {
                const num = parseCurrencyInput(entradaTotal);
                if (num > 0) setEntradaTotal(formatCurrency(num));
              }}
              className="input-field"
            />
          </div>
        </div>

        <button
          id="btn-calcular-total"
          onClick={calcular}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
        >
          Calcular total
        </button>

        {resultado !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                background: '#f0f4ff',
                border: '1px solid #c7d7fe',
                borderRadius: '12px',
                padding: '1.25rem',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 0.375rem' }}>
                Total pago
              </p>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: '#2f3181', margin: 0 }}>
                {formatCurrency(resultado.total)}
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.25rem' }}>
                  Parcelas
                </p>
                <p
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  {formatCurrency(parseCurrencyInput(parcela) * parseInt(numParcelas, 10))}
                </p>
              </div>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.25rem' }}>
                  Entrada
                </p>
                <p
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  {formatCurrency(parseCurrencyInput(entradaTotal))}
                </p>
              </div>
            </div>
            <p
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                textAlign: 'center',
                lineHeight: '1.5',
              }}
            >
              Valores hipotéticos para orientação. Condições reais dependem da análise.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
