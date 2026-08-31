'use client';

import { useState } from 'react';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '@/lib/utils';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';

// Calculadora 1: Parcela estimada
function ParcelaCalculator() {
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
      const parcela = financiado * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      setResultado(parcela);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
        Estimativa de parcela
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.75rem', lineHeight: '1.65' }}>
        Estime o valor aproximado de uma parcela com base no valor do tratamento,
        entrada e taxa de juros mensal. Valores hipotéticos para referência.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="input-label" htmlFor="calc-valor">Valor do tratamento</label>
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
          <label className="input-label" htmlFor="calc-entrada">Entrada (opcional)</label>
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
            <label className="input-label" htmlFor="calc-parcelas">Nº de parcelas</label>
            <select
              id="calc-parcelas"
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
              className="select-field"
            >
              {[6, 12, 18, 24, 36, 48, 60].map(n => (
                <option key={n} value={n}>{n}x</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="calc-taxa">Taxa mensal (%)</label>
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
          <div style={{
            background: '#f0f4ff',
            border: '1px solid #c7d7fe',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 0.375rem' }}>
              Parcela estimada
            </p>
            <p style={{ fontSize: '2rem', fontWeight: '800', color: '#2f3181', margin: 0 }}>
              {formatCurrency(resultado)}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.5rem 0 0', lineHeight: '1.5' }}>
              Valor hipotético. Condições reais dependem da análise do parceiro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Calculadora 2: Total pago
function TotalPagoCalculator() {
  const [parcela, setParcela] = useState('');
  const [numParcelas, setNumParcelas] = useState('12');
  const [entradaTotal, setEntradaTotal] = useState('');
  const [resultado, setResultado] = useState<{ total: number; juros: number; financiado: number } | null>(null);

  const calcular = () => {
    const p = parseCurrencyInput(parcela);
    const n = parseInt(numParcelas, 10);
    const e = parseCurrencyInput(entradaTotal);

    if (!p || p <= 0 || n <= 0) return;

    const totalParcelas = p * n;
    const total = totalParcelas + e;
    const financiado = totalParcelas;
    const juros = total - (parseCurrencyInput(entradaTotal) || 0) - parseCurrencyInput(parcela) * n; // simplified

    setResultado({ total, juros: 0, financiado });
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
        Total pago no financiamento
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.75rem', lineHeight: '1.65' }}>
        Some a entrada ao total de parcelas para entender o valor total que você pagará pelo tratamento.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="input-label" htmlFor="total-parcela">Valor da parcela</label>
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
            <label className="input-label" htmlFor="total-num-parcelas">Nº de parcelas</label>
            <select
              id="total-num-parcelas"
              value={numParcelas}
              onChange={(e) => setNumParcelas(e.target.value)}
              className="select-field"
            >
              {[6, 12, 18, 24, 36, 48, 60].map(n => (
                <option key={n} value={n}>{n}x</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label" htmlFor="total-entrada">Entrada</label>
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
            <div style={{
              background: '#f0f4ff',
              border: '1px solid #c7d7fe',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 0.375rem' }}>
                Total pago
              </p>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: '#2f3181', margin: 0 }}>
                {formatCurrency(resultado.total)}
              </p>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.25rem' }}>Parcelas</p>
                <p style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {formatCurrency(parseCurrencyInput(parcela) * parseInt(numParcelas))}
                </p>
              </div>
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.25rem' }}>Entrada</p>
                <p style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  {formatCurrency(parseCurrencyInput(entradaTotal))}
                </p>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.5' }}>
              Valores hipotéticos. Condições reais dependem da análise do parceiro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalculadorasPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section style={{
        paddingTop: '8rem',
        paddingBottom: '4rem',
        background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%)',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '620px' }}>
            <span className="section-tag" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
              Calculadoras
            </span>
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: '1.15',
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}>
              Calculadoras de pagamento
            </h1>
            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.125rem)',
              color: '#475569',
              lineHeight: '1.75',
              maxWidth: '520px',
            }}>
              Ferramentas simples para estimar parcelas e entender o total pago
              em um financiamento. Valores são hipotéticos e não representam ofertas.
            </p>
          </div>
        </div>
      </section>

      {/* ===== CALCULADORAS ===== */}
      <section style={{ padding: '5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}>
            <ParcelaCalculator />
            <TotalPagoCalculator />
          </div>

          <div style={{ marginTop: '3rem', maxWidth: '720px' }}>
            <FinancialDisclaimer />
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{
        padding: '4rem 0',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
      }}>
        <div className="container-benavera" style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: 'clamp(1.375rem, 3vw, 1.875rem)',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '0.875rem',
            letterSpacing: '-0.02em',
          }}>
            Quer entender suas possibilidades reais?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#475569',
            marginBottom: '2rem',
            maxWidth: '400px',
            margin: '0 auto 2rem',
            lineHeight: '1.75',
          }}>
            Faça uma simulação gratuita e sem compromisso.
          </p>
          <Link href="/simular" className="btn-primary">
            Simular possibilidades
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
