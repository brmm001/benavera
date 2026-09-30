"use client";

import React, { useState, useEffect, useRef } from "react";
import type { SimulatorConfig, ResultadoSimulacao, Modalidade, RiscoInadimplencia, AlternativaPrazo } from "@/lib/simulator-engine";
import {
  simular,
  simularReverso,
  calcularPrazosPorParcela,
  compararModalidades,
} from "@/lib/simulator-engine";

// ─── Formatadores ────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);
}

function fmtPct(v: number) {
  return (
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"
  );
}

function formatBRLInput(v: number): string {
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Labels ──────────────────────────────────────────────────────────────────
const MODALIDADE_LABEL: Record<Modalidade, string> = {
  clinica_absorve: "Clínica absorve a taxa",
  taxa_repassada: "Taxa incorporada ao financiamento",
  sem_juros: "Parcelamento sem juros para o paciente",
};

const RISCO_LABEL: Record<RiscoInadimplencia, string> = {
  financeira: "Instituição financeira",
  clinica: "Clínica (modalidade compartilhada)",
};

// ─── CurrencyInput ────────────────────────────────────────────────────────────
function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  id?: string;
}) {
  const [display, setDisplay] = useState(formatBRLInput(value));

  useEffect(() => {
    const digits = display.replace(/[^\d]/g, "");
    const cur = digits === "" ? 0 : parseInt(digits, 10) / 100;
    if (Math.abs(cur - value) > 0.001) {
      setDisplay(formatBRLInput(value));
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    if (raw === "") { setDisplay(""); onChange(0); return; }
    const reais = parseInt(raw, 10) / 100;
    setDisplay(reais.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    onChange(reais);
  }

  return (
    <div className="sim-currency-wrap">
      <span className="sim-currency-prefix">R$</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className="sim-currency-input"
        autoComplete="off"
      />
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ children, variant = "default" }: {
  children: React.ReactNode;
  variant?: "default" | "green" | "purple" | "amber" | "blue";
}) {
  return <span className={`sim-badge sim-badge--${variant}`}>{children}</span>;
}

// ─── ResultRow ────────────────────────────────────────────────────────────────
function ResultRow({ label, value, highlight = false, sub = false }: {
  label: string; value: string; highlight?: boolean; sub?: boolean;
}) {
  return (
    <div className={`sim-result-row ${highlight ? "sim-result-row--highlight" : ""} ${sub ? "sim-result-row--sub" : ""}`}>
      <span className="sim-result-label">{label}</span>
      <span className="sim-result-value">{value}</span>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="sim-section-header">
      <span className="sim-section-icon">{icon}</span>
      <div>
        <h3 className="sim-section-title">{title}</h3>
        {subtitle && <p className="sim-section-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Tipos internos ───────────────────────────────────────────────────────────
type Aba = "principal" | "reverso" | "parcela_max";

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SimulatorClient({ initialConfig }: { initialConfig: SimulatorConfig }) {
  const config = initialConfig;
  const parcelas_ativas = config.parcelas_ativas.length > 0 ? config.parcelas_ativas : [6, 12, 18, 24, 30, 36];
  const TODOS_PRAZOS = [6, 12, 18, 24, 30, 36, 48, 60, 72];

  // Entradas principais
  const [valorTratamento, setValorTratamento] = useState(0);
  const [parcelas, setParcelas] = useState(12);
  const [modalidade, setModalidade] = useState<Modalidade>("clinica_absorve");
  const [risco, setRisco] = useState<RiscoInadimplencia>("financeira");
  const [aba, setAba] = useState<Aba>("principal");

  // Reverso
  const [valorLiquidoDesejado, setValorLiquidoDesejado] = useState(0);
  const [parcelasReverso, setParcelasReverso] = useState(12);

  // Parcela max
  const [valorTratamentoPM, setValorTratamentoPM] = useState(0);
  const [parcelaMaxima, setParcelaMaxima] = useState(0);

  // Lead
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [nomeClinica, setNomeClinica] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Resultados calculados em tempo real
  const resultado: ResultadoSimulacao | null = valorTratamento > 0
    ? simular({ valor_tratamento: valorTratamento, parcelas, modalidade, risco }, config)
    : null;

  const comparativo = valorTratamento > 0
    ? compararModalidades(valorTratamento, parcelas, risco, config)
    : null;

  const resultadoReverso = valorLiquidoDesejado > 0
    ? simularReverso({ valor_liquido_desejado: valorLiquidoDesejado, modalidade, risco, parcelas: parcelasReverso }, config)
    : null;

  const alternativasPrazo: AlternativaPrazo[] = valorTratamentoPM > 0 && parcelaMaxima > 0
    ? calcularPrazosPorParcela(valorTratamentoPM, parcelaMaxima, modalidade, risco, config)
    : [];

  function carregarExemplo() {
    setValorTratamento(20000);
    setParcelas(24);
    setModalidade("clinica_absorve");
    setRisco("financeira");
    setAba("principal");
  }

  function gerarMsgWhatsapp() {
    if (!resultado) return "https://wa.me/5511000000000";
    const lines = [
      "Olá, fiz uma simulação na Benavera.",
      "Valor do tratamento: " + fmtBRL(resultado.paciente.valor_tratamento),
      "Prazo: " + resultado.paciente.parcelas + "x",
      "Modalidade: " + MODALIDADE_LABEL[resultado.modalidade],
      "Parcela estimada: " + fmtBRL(resultado.paciente.parcela_estimada),
      "Valor líquido para a clínica: " + fmtBRL(resultado.clinica.valor_liquido),
      "Gostaria de entender essa condição.",
    ];
    return "https://wa.me/5511000000000?text=" + encodeURIComponent(lines.join("\n"));
  }

  async function enviarLead() {
    if (!resultado) return;
    try {
      await fetch("/api/simulator/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor_tratamento: resultado.paciente.valor_tratamento,
          parcelas: resultado.paciente.parcelas,
          modalidade: resultado.modalidade,
          risco: resultado.risco,
          parcela_estimada: resultado.paciente.parcela_estimada,
          valor_liquido: resultado.clinica.valor_liquido,
          total_pago: resultado.paciente.total_pago,
          taxa_aplicada: resultado.taxa_total,
          nome_clinica: nomeClinica || undefined,
          whatsapp: whatsapp || undefined,
        }),
      });
    } catch { /* silencioso */ }
    setLeadSent(true);
    window.open(gerarMsgWhatsapp(), "_blank");
  }

  return (
    <div className="sim-root">
      {/* HERO */}
      <header className="sim-hero">
        <div className="sim-hero-inner">
          <div className="sim-logo-row">
            <div className="sim-logo-badge">B</div>
            <span className="sim-logo-name">Benavera</span>
          </div>
          <h1 className="sim-hero-title">Simulador Benavera</h1>
          <p className="sim-hero-subtitle">
            Simule as condições de financiamento para seus pacientes
          </p>
          <button className="sim-btn-outline" onClick={carregarExemplo} id="btn-ver-exemplo">
            ✦ Ver exemplo com R$ 20.000 em 24x
          </button>
        </div>
      </header>

      <div className="sim-container">
        {/* ABAS */}
        <nav className="sim-tabs" aria-label="Funcionalidades do simulador">
          {([
            { id: "principal" as Aba, label: "Simular financiamento", icon: "📊" },
            { id: "reverso" as Aba, label: "Quanto preciso cobrar?", icon: "↩" },
            { id: "parcela_max" as Aba, label: "Parcela que cabe", icon: "💡" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              className={`sim-tab ${aba === tab.id ? "sim-tab--active" : ""}`}
              onClick={() => setAba(tab.id)}
              id={`tab-${tab.id}`}
            >
              <span>{tab.icon}</span> <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* ── ABA PRINCIPAL ──────────────────────────────────────────────────── */}
        {aba === "principal" && (
          <>
            <section className="sim-card sim-inputs-section" aria-label="Configuração da simulação">
              {/* Valor */}
              <div className="sim-field-group">
                <label htmlFor="valor-tratamento" className="sim-label">
                  Valor do tratamento
                </label>
                <CurrencyInput id="valor-tratamento" value={valorTratamento} onChange={setValorTratamento} />
                <span className="sim-field-hint">Até {fmtBRL(config.valor_maximo)}</span>
              </div>

              {/* Prazo */}
              <div className="sim-field-group">
                <label className="sim-label">Prazo desejado</label>
                <div className="sim-parcelas-grid">
                  {TODOS_PRAZOS.map((p) => {
                    const ativo = parcelas_ativas.includes(p);
                    return (
                      <button
                        key={p}
                        className={`sim-parcela-btn ${parcelas === p ? "sim-parcela-btn--active" : ""} ${!ativo ? "sim-parcela-btn--disabled" : ""}`}
                        onClick={() => ativo && setParcelas(p)}
                        disabled={!ativo}
                        id={`parcela-${p}x`}
                        title={!ativo ? "Prazo não disponível" : `${p} parcelas`}
                      >
                        {p}x
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modalidade */}
              <div className="sim-field-group sim-field-group--full">
                <label className="sim-label">Modalidade de operação</label>
                <div className="sim-modalidade-grid">
                  {(["clinica_absorve", "taxa_repassada", "sem_juros"] as Modalidade[]).map((m) => (
                    <button
                      key={m}
                      className={`sim-modalidade-btn ${modalidade === m ? "sim-modalidade-btn--active" : ""}`}
                      onClick={() => setModalidade(m)}
                      id={`modalidade-${m}`}
                    >
                      <span className="sim-modalidade-icon">
                        {m === "clinica_absorve" ? "🏥" : m === "taxa_repassada" ? "↕️" : "✨"}
                      </span>
                      <span className="sim-modalidade-label">{MODALIDADE_LABEL[m]}</span>
                      <span className="sim-modalidade-desc">
                        {m === "clinica_absorve"
                          ? "Você absorve o custo da operação"
                          : m === "taxa_repassada"
                          ? "Paciente financia o valor + taxa"
                          : "Paciente parcela sem juros aparentes"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risco */}
              <div className="sim-field-group sim-field-group--full">
                <label className="sim-label">Quem assume o risco de inadimplência?</label>
                <div className="sim-risco-grid">
                  {(["financeira", "clinica"] as RiscoInadimplencia[]).map((r) => (
                    <button
                      key={r}
                      className={`sim-risco-btn ${risco === r ? "sim-risco-btn--active" : ""}`}
                      onClick={() => setRisco(r)}
                      id={`risco-${r}`}
                    >
                      <div className="sim-risco-top">
                        <span>{r === "financeira" ? "🛡️" : "🤝"}</span>
                        <span className="sim-risco-name">
                          {r === "financeira" ? "Instituição financeira" : "Modalidade compartilhada"}
                        </span>
                      </div>
                      <p className="sim-risco-desc">
                        {r === "financeira"
                          ? "Após aprovação e liquidação, o risco fica com a estrutura financeira parceira. Maior proteção para a clínica."
                          : "Pode proporcionar condições comerciais melhores conforme perfil e performance da clínica."}
                      </p>
                      <Badge variant={r === "financeira" ? "green" : "amber"}>
                        {r === "financeira" ? "Maior proteção" : "Pode ser mais acessível"}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* RESULTADO */}
            {resultado && valorTratamento > 0 ? (
              <>
                <section className="sim-result-container" aria-label="Resultado da simulação">
                  <h2 className="sim-result-title">Sua simulação</h2>
                  <div className="sim-result-grid">
                    {/* Paciente */}
                    <div className="sim-result-card">
                      <SectionHeader icon="👤" title="Paciente" subtitle="Perspectiva do paciente" />
                      <div className="sim-result-rows">
                        <ResultRow label="Valor do tratamento" value={fmtBRL(resultado.paciente.valor_tratamento)} />
                        <ResultRow label="Valor financiado" value={fmtBRL(resultado.paciente.valor_financiado)} />
                        <ResultRow label="Prazo" value={`${resultado.paciente.parcelas}x`} />
                        <ResultRow label="Parcela estimada" value={fmtBRL(resultado.paciente.parcela_estimada)} highlight />
                        <ResultRow label="Total estimado pago" value={fmtBRL(resultado.paciente.total_pago)} />
                        {resultado.modalidade === "sem_juros" && (
                          <ResultRow label="Juros aparentes" value="R$ 0,00" sub />
                        )}
                      </div>
                    </div>

                    {/* Clinica */}
                    <div className="sim-result-card">
                      <SectionHeader icon="🏥" title="Clínica" subtitle="O que você recebe" />
                      <div className="sim-result-rows">
                        <ResultRow label="Valor do tratamento" value={fmtBRL(resultado.clinica.valor_tratamento)} />
                        <ResultRow label="Taxa Benavera" value={fmtPct(resultado.clinica.taxa_benavera)} />
                        <ResultRow label="Custo da operação" value={fmtBRL(resultado.clinica.custo_operacao)} />
                        <ResultRow label="Valor líquido estimado" value={fmtBRL(resultado.clinica.valor_liquido)} highlight />
                        <ResultRow label="Prazo estimado de recebimento" value={`D+${resultado.clinica.prazo_recebimento} após liquidação`} />
                        <ResultRow label="Responsável pela taxa" value={resultado.clinica.quem_absorve_taxa} sub />
                      </div>
                      {resultado.modalidade === "taxa_repassada" && (
                        <div className="sim-destaque-verde">
                          ✅ A clínica preserva 100% do valor do tratamento
                        </div>
                      )}
                    </div>

                    {/* Estrutura */}
                    <div className="sim-result-card">
                      <SectionHeader icon="⚙️" title="Estrutura" subtitle="Resumo da operação" />
                      <div className="sim-result-rows">
                        <ResultRow label="Modalidade" value={MODALIDADE_LABEL[resultado.modalidade]} />
                        <ResultRow label="Responsável pela taxa" value={resultado.clinica.quem_absorve_taxa} />
                        <ResultRow label="Risco de inadimplência" value={RISCO_LABEL[resultado.risco]} />
                        <ResultRow label="Taxa total aplicada" value={fmtPct(resultado.taxa_total)} />
                      </div>
                      <div className="sim-recebimento-card">
                        <span className="sim-recebimento-icon">📅</span>
                        <div>
                          <strong>Recebimento</strong>
                          <p>Prazo estimado: D+{resultado.clinica.prazo_recebimento} após conclusão e liquidação da operação.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* COMPARADOR */}
                {comparativo && (
                  <section className="sim-comparador" aria-label="Comparativo de modalidades">
                    <h2 className="sim-comparador-title">Compare as modalidades</h2>
                    <p className="sim-comparador-subtitle">
                      Análise das opções para {fmtBRL(valorTratamento)} em {parcelas}x
                    </p>
                    <div className="sim-comparador-grid">
                      <div className="sim-comp-card">
                        <div className="sim-comp-badge sim-comp-badge--green">💰 Menor custo para a clínica</div>
                        <h4 className="sim-comp-name">{MODALIDADE_LABEL.taxa_repassada}</h4>
                        <p className="sim-comp-hint">Pode ser interessante quando a clínica deseja preservar 100% do valor recebido e tem flexibilidade para ajustar o orçamento ao paciente.</p>
                        <div className="sim-comp-nums">
                          <div><span className="sim-comp-num-label">Custo clínica</span><span className="sim-comp-num sim-comp-num--green">R$ 0,00</span></div>
                          <div><span className="sim-comp-num-label">Clínica recebe</span><span className="sim-comp-num">{fmtBRL(comparativo.taxa_repassada.clinica.valor_liquido)}</span></div>
                          <div><span className="sim-comp-num-label">Parcela paciente</span><span className="sim-comp-num">{fmtBRL(comparativo.taxa_repassada.paciente.parcela_estimada)}</span></div>
                        </div>
                      </div>
                      <div className="sim-comp-card sim-comp-card--featured">
                        <div className="sim-comp-badge sim-comp-badge--purple">🛡️ Maior previsibilidade</div>
                        <h4 className="sim-comp-name">{MODALIDADE_LABEL.clinica_absorve}</h4>
                        <p className="sim-comp-hint">Pode ser interessante quando a clínica quer oferecer um orçamento direto e transparente, assumindo o custo da operação.</p>
                        <div className="sim-comp-nums">
                          <div><span className="sim-comp-num-label">Custo clínica</span><span className="sim-comp-num sim-comp-num--red">{fmtBRL(comparativo.clinica_absorve.clinica.custo_operacao)}</span></div>
                          <div><span className="sim-comp-num-label">Clínica recebe</span><span className="sim-comp-num">{fmtBRL(comparativo.clinica_absorve.clinica.valor_liquido)}</span></div>
                          <div><span className="sim-comp-num-label">Parcela paciente</span><span className="sim-comp-num">{fmtBRL(comparativo.clinica_absorve.paciente.parcela_estimada)}</span></div>
                        </div>
                      </div>
                      <div className="sim-comp-card">
                        <div className="sim-comp-badge sim-comp-badge--blue">✨ Melhor para o paciente</div>
                        <h4 className="sim-comp-name">{MODALIDADE_LABEL.sem_juros}</h4>
                        <p className="sim-comp-hint">Pode ser interessante como diferencial competitivo quando a clínica quer oferecer parcelamento sem juros como atrativo comercial.</p>
                        <div className="sim-comp-nums">
                          <div><span className="sim-comp-num-label">Custo clínica</span><span className="sim-comp-num sim-comp-num--red">{fmtBRL(comparativo.sem_juros.clinica.custo_operacao)}</span></div>
                          <div><span className="sim-comp-num-label">Clínica recebe</span><span className="sim-comp-num">{fmtBRL(comparativo.sem_juros.clinica.valor_liquido)}</span></div>
                          <div><span className="sim-comp-num-label">Parcela paciente</span><span className="sim-comp-num">{fmtBRL(comparativo.sem_juros.paciente.parcela_estimada)}</span></div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* CTA */}
                <div className="sim-cta">
                  <h2 className="sim-cta-title">Gostou desta condição?</h2>
                  <p className="sim-cta-sub">Solicite uma proposta ou fale com um consultor Benavera.</p>
                  <div className="sim-cta-btns">
                    <button className="sim-btn-primary" onClick={() => setShowLeadForm(true)} id="btn-solicitar-proposta">
                      Solicitar uma proposta
                    </button>
                    <a href={gerarMsgWhatsapp()} target="_blank" rel="noopener noreferrer" className="sim-btn-whatsapp" id="btn-falar-consultor">
                      Falar com um consultor
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="sim-empty-state">
                <div className="sim-empty-icon">📊</div>
                <p>Informe o valor do tratamento para visualizar a simulação.</p>
              </div>
            )}
          </>
        )}

        {/* ── ABA REVERSO ───────────────────────────────────────────────────── */}
        {aba === "reverso" && (
          <div className="sim-card">
            <SectionHeader icon="↩" title="Quanto preciso cobrar do paciente?" subtitle="Informe quanto deseja receber líquido e calcularemos o valor necessário" />
            <div className="sim-inputs-section" style={{ marginTop: "1.5rem" }}>
              <div className="sim-field-group">
                <label htmlFor="valor-liquido-desejado" className="sim-label">Quanto deseja receber líquido?</label>
                <CurrencyInput id="valor-liquido-desejado" value={valorLiquidoDesejado} onChange={setValorLiquidoDesejado} />
              </div>
              <div className="sim-field-group">
                <label htmlFor="parcelas-reverso" className="sim-label">Prazo</label>
                <select className="sim-select" value={parcelasReverso} onChange={(e) => setParcelasReverso(Number(e.target.value))} id="parcelas-reverso">
                  {parcelas_ativas.map((p) => <option key={p} value={p}>{p}x</option>)}
                </select>
              </div>
            </div>
            {resultadoReverso && (
              <div className="sim-reverso-result">
                <div className="sim-reverso-destaque">
                  <span>Valor a ser cobrado do paciente:</span>
                  <strong>{fmtBRL(resultadoReverso.valor_tratamento)}</strong>
                </div>
                <div className="sim-result-rows" style={{ marginTop: "1rem" }}>
                  <ResultRow label="Valor líquido desejado" value={fmtBRL(valorLiquidoDesejado)} />
                  <ResultRow label="Taxa aplicada" value={fmtPct(resultadoReverso.resultado.taxa_total)} />
                  <ResultRow label="Custo da operação" value={fmtBRL(resultadoReverso.resultado.clinica.custo_operacao)} />
                  <ResultRow label="Valor financiado pelo paciente" value={fmtBRL(resultadoReverso.resultado.paciente.valor_financiado)} highlight />
                  <ResultRow label="Parcela estimada" value={fmtBRL(resultadoReverso.resultado.paciente.parcela_estimada)} />
                </div>
                <p className="sim-field-hint" style={{ marginTop: "1rem" }}>Cálculo utilizando gross-up correto: Bruto = Líquido ÷ (1 − taxa)</p>
              </div>
            )}
          </div>
        )}

        {/* ── ABA PARCELA MAX ────────────────────────────────────────────────── */}
        {aba === "parcela_max" && (
          <div className="sim-card">
            <SectionHeader icon="💡" title="Qual parcela cabe para o paciente?" subtitle="Informe o tratamento e a parcela máxima para ver os prazos possíveis" />
            <div className="sim-inputs-section" style={{ marginTop: "1.5rem" }}>
              <div className="sim-field-group">
                <label htmlFor="valor-tratamento-pm" className="sim-label">Valor do tratamento</label>
                <CurrencyInput id="valor-tratamento-pm" value={valorTratamentoPM} onChange={setValorTratamentoPM} />
              </div>
              <div className="sim-field-group">
                <label htmlFor="parcela-maxima" className="sim-label">Paciente consegue pagar até</label>
                <CurrencyInput id="parcela-maxima" value={parcelaMaxima} onChange={setParcelaMaxima} placeholder="0,00 por mês" />
              </div>
            </div>
            {alternativasPrazo.length > 0 ? (
              <div style={{ marginTop: "1.5rem" }}>
                <h4 className="sim-label" style={{ marginBottom: "1rem" }}>Alternativas possíveis (sem garantia de aprovação):</h4>
                <div className="sim-alternativas-grid">
                  {alternativasPrazo.map((alt) => (
                    <div key={alt.parcelas} className="sim-alt-card">
                      <span className="sim-alt-parcelas">{alt.parcelas}x</span>
                      <div className="sim-alt-valores">
                        <div><span className="sim-comp-num-label">Parcela estimada</span><span className="sim-comp-num">{fmtBRL(alt.parcela_estimada)}</span></div>
                        <div><span className="sim-comp-num-label">Total pago</span><span className="sim-comp-num">{fmtBRL(alt.total_pago)}</span></div>
                        <div><span className="sim-comp-num-label">Taxa mensal</span><span className="sim-comp-num">{fmtPct(alt.taxa_mensal)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : valorTratamentoPM > 0 && parcelaMaxima > 0 ? (
              <div className="sim-empty-state"><p>Nenhum prazo disponível para essa combinação de valores.</p></div>
            ) : null}
          </div>
        )}

        {/* AVISO LEGAL */}
        <footer className="sim-aviso">
          <p><strong>Estimativa apenas.</strong> Esta simulação é apenas uma estimativa. As condições finais dependem da análise de crédito e da modalidade contratada.</p>
          <p style={{ marginTop: "0.5rem" }}>Valores apresentados possuem caráter exclusivamente indicativo e podem variar conforme análise de crédito, perfil do solicitante, prazo, instituição financeira, condições comerciais e políticas vigentes no momento da contratação. A simulação não representa garantia de aprovação ou concessão de crédito.</p>
        </footer>

        <div className="sim-footer-nav">
          <a href="/" className="sim-btn-ghost" id="btn-voltar-benavera">← Voltar para a Benavera</a>
        </div>
      </div>

      {/* MODAL LEAD */}
      {showLeadForm && !leadSent && resultado && (
        <div className="sim-modal-overlay" onClick={() => setShowLeadForm(false)}>
          <div className="sim-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sim-modal-close" onClick={() => setShowLeadForm(false)}>✕</button>
            <h3 className="sim-modal-title">Solicitar proposta</h3>
            <p className="sim-modal-sub">Vamos preparar uma proposta personalizada para você.</p>
            <div className="sim-modal-resumo">
              <div className="sim-modal-row"><span>Tratamento</span><strong>{fmtBRL(resultado.paciente.valor_tratamento)}</strong></div>
              <div className="sim-modal-row"><span>Prazo</span><strong>{resultado.paciente.parcelas}x</strong></div>
              <div className="sim-modal-row"><span>Parcela estimada</span><strong>{fmtBRL(resultado.paciente.parcela_estimada)}</strong></div>
              <div className="sim-modal-row"><span>Líquido para clínica</span><strong>{fmtBRL(resultado.clinica.valor_liquido)}</strong></div>
            </div>
            <div className="sim-field-group">
              <label className="sim-label">Nome da clínica (opcional)</label>
              <input type="text" className="sim-input" value={nomeClinica} onChange={(e) => setNomeClinica(e.target.value)} placeholder="Ex: Clínica Odonto Saúde" id="lead-nome-clinica" />
            </div>
            <div className="sim-field-group">
              <label className="sim-label">WhatsApp (opcional)</label>
              <input type="tel" className="sim-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" id="lead-whatsapp" />
            </div>
            <button className="sim-btn-primary sim-btn--full" onClick={enviarLead} id="btn-confirmar-proposta">
              Continuar pelo WhatsApp →
            </button>
          </div>
        </div>
      )}
      {showLeadForm && leadSent && (
        <div className="sim-modal-overlay" onClick={() => { setShowLeadForm(false); setLeadSent(false); }}>
          <div className="sim-modal sim-modal--success" onClick={(e) => e.stopPropagation()}>
            <div className="sim-success-icon">✅</div>
            <h3>Simulação enviada!</h3>
            <p>Você será redirecionado para o WhatsApp da Benavera com o resumo da sua simulação.</p>
            <button className="sim-btn-primary" onClick={() => { setShowLeadForm(false); setLeadSent(false); }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
