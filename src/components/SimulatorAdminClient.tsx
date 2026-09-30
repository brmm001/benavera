"use client";

import { useState } from "react";
import type { SimulatorConfig } from "@/lib/simulator-engine";
import { useRouter } from "next/navigation";

function AdminField({
  label,
  hint,
  value,
  onChange,
  type = "number",
  step = "0.01",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div className="sim-admin-field">
      <label className="sim-admin-label">{label}</label>
      <input
        type={type}
        step={step}
        className="sim-admin-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="sim-admin-hint">{hint}</span>}
    </div>
  );
}

const ALL_PRAZOS = [6, 12, 18, 24, 30, 36, 48, 60, 72];

export default function SimulatorAdminClient({ initialConfig }: { initialConfig: SimulatorConfig }) {
  const router = useRouter();

  // Form state
  const [taxaMin, setTaxaMin] = useState(String(initialConfig.taxa_minima));
  const [taxaPadrao, setTaxaPadrao] = useState(String(initialConfig.taxa_padrao));
  const [taxaMax, setTaxaMax] = useState(String(initialConfig.taxa_maxima));
  const [taxaSemJuros, setTaxaSemJuros] = useState(String(initialConfig.taxa_sem_juros));
  const [taxaRiscoFin, setTaxaRiscoFin] = useState(String(initialConfig.taxa_risco_financeira));
  const [taxaRiscoClinica, setTaxaRiscoClinica] = useState(String(initialConfig.taxa_risco_clinica));
  const [valorMin, setValorMin] = useState(String(initialConfig.valor_minimo));
  const [valorMax, setValorMax] = useState(String(initialConfig.valor_maximo));
  const [prazoRecebimento, setPrazoRecebimento] = useState(String(initialConfig.prazo_recebimento));
  const [custoFunding, setCustoFunding] = useState(String(initialConfig.custo_funding));
  const [custoParceiro, setCustoParceiro] = useState(String(initialConfig.custo_parceiro));
  const [spreadBenavera, setSpreadBenavera] = useState(String(initialConfig.spread_benavera));
  const [outrosCustos, setOutrosCustos] = useState(String(initialConfig.outros_custos));

  const [juros, setJuros] = useState({
    6: String(initialConfig.juros_6x),
    12: String(initialConfig.juros_12x),
    18: String(initialConfig.juros_18x),
    24: String(initialConfig.juros_24x),
    30: String(initialConfig.juros_30x),
    36: String(initialConfig.juros_36x),
    48: String(initialConfig.juros_48x),
    60: String(initialConfig.juros_60x),
    72: String(initialConfig.juros_72x),
  } as Record<number, string>);

  const [parcelasAtivas, setParcelasAtivas] = useState<number[]>(
    initialConfig.parcelas_ativas.length > 0
      ? initialConfig.parcelas_ativas
      : [6, 12, 18, 24, 30, 36]
  );

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  function toggleParcela(p: number) {
    setParcelasAtivas((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort((a, b) => a - b)
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");

    const updates: Record<string, string> = {
      taxa_minima: taxaMin,
      taxa_padrao: taxaPadrao,
      taxa_maxima: taxaMax,
      taxa_sem_juros: taxaSemJuros,
      taxa_risco_financeira: taxaRiscoFin,
      taxa_risco_clinica: taxaRiscoClinica,
      valor_minimo: valorMin,
      valor_maximo: valorMax,
      prazo_recebimento: prazoRecebimento,
      custo_funding: custoFunding,
      custo_parceiro: custoParceiro,
      spread_benavera: spreadBenavera,
      outros_custos: outrosCustos,
      parcelas_ativas: parcelasAtivas.join(","),
    };

    for (const p of ALL_PRAZOS) {
      updates[`juros_${p}x`] = juros[p] || "0";
    }

    try {
      const res = await fetch("/api/simulator/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_SECRET || "",
        },
        body: JSON.stringify({ updates, updatedBy: "admin_panel" }),
      });

      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/simulator/admin-auth", { method: "DELETE" });
    router.push("/simuladorclinicas/admin/login");
  }

  return (
    <div className="sim-admin-root">
      <header className="sim-admin-header">
        <div className="sim-logo-badge" style={{ width: 32, height: 32, fontSize: ".875rem" }}>B</div>
        <h1>Simulador Benavera — Painel Administrativo</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: "1rem" }}>
          <a href="/simuladorclinicas" target="_blank">Ver simulador ↗</a>
          <button onClick={handleLogout} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: ".875rem" }}>
            Sair
          </button>
        </div>
      </header>

      <div className="sim-admin-body">
        {/* STATUS */}
        {saveStatus === "success" && (
          <div className="sim-admin-success">✅ Configurações salvas com sucesso!</div>
        )}
        {saveStatus === "error" && (
          <div className="sim-admin-error">❌ Erro ao salvar. Verifique a conexão e tente novamente.</div>
        )}

        {/* TAXAS BENAVERA */}
        <div className="sim-admin-section">
          <div className="sim-admin-section-header">
            <h2>Taxas Benavera</h2>
            <p>Taxas cobradas sobre o valor financiado (em %)</p>
          </div>
          <div className="sim-admin-fields">
            <AdminField label="Taxa mínima (%)" hint="Ex: 3.5" value={taxaMin} onChange={setTaxaMin} />
            <AdminField label="Taxa padrão (%)" hint="Ex: 3.5" value={taxaPadrao} onChange={setTaxaPadrao} />
            <AdminField label="Taxa máxima (%)" hint="Ex: 7.0" value={taxaMax} onChange={setTaxaMax} />
            <AdminField label="Taxa sem juros ao paciente (%)" hint="Ex: 8.0" value={taxaSemJuros} onChange={setTaxaSemJuros} />
            <AdminField label="Adicional risco — instituição financeira (%)" hint="Ex: 1.5" value={taxaRiscoFin} onChange={setTaxaRiscoFin} />
            <AdminField label="Adicional risco — clínica (%)" hint="Ex: 0.0" value={taxaRiscoClinica} onChange={setTaxaRiscoClinica} />
          </div>
          <div className="sim-admin-footer">
            <span style={{ fontSize: ".8125rem", color: "var(--sim-slate-500)" }}>
              As taxas são aplicadas sobre o valor total financiado.
            </span>
          </div>
        </div>

        {/* LIMITES */}
        <div className="sim-admin-section">
          <div className="sim-admin-section-header">
            <h2>Limites de valor</h2>
            <p>Faixa de valores permitidos para financiamento</p>
          </div>
          <div className="sim-admin-fields">
            <AdminField label="Valor mínimo (R$)" hint="Ex: 500" value={valorMin} onChange={setValorMin} step="1" />
            <AdminField label="Valor máximo (R$)" hint="Ex: 100000" value={valorMax} onChange={setValorMax} step="1" />
            <AdminField label="Prazo de recebimento (dias úteis)" hint="Ex: 2 (D+2)" value={prazoRecebimento} onChange={setPrazoRecebimento} step="1" />
          </div>
        </div>

        {/* PRAZOS ATIVOS */}
        <div className="sim-admin-section">
          <div className="sim-admin-section-header">
            <h2>Prazos disponíveis</h2>
            <p>Ative ou desative os prazos de parcelamento</p>
          </div>
          <div className="sim-admin-toggle-grid">
            {ALL_PRAZOS.map((p) => {
              const ativo = parcelasAtivas.includes(p);
              return (
                <button
                  key={p}
                  className={`sim-toggle-btn ${ativo ? "sim-toggle-btn--active" : ""}`}
                  onClick={() => toggleParcela(p)}
                >
                  <span className="sim-toggle-dot" />
                  {p}x {ativo ? "(ativo)" : "(inativo)"}
                </button>
              );
            })}
          </div>
        </div>

        {/* JUROS POR PRAZO */}
        <div className="sim-admin-section">
          <div className="sim-admin-section-header">
            <h2>Juros mensais por prazo</h2>
            <p>Taxa mensal em % para o cálculo Price (PMT) de cada prazo</p>
          </div>
          <div className="sim-admin-fields">
            {ALL_PRAZOS.map((p) => (
              <AdminField
                key={p}
                label={`Juros ${p}x (% a.m.)`}
                hint={`Ex: ${p <= 12 ? "1.49" : p <= 24 ? "2.19" : "2.69"}`}
                value={juros[p] || ""}
                onChange={(v) => setJuros((prev) => ({ ...prev, [p]: v }))}
              />
            ))}
          </div>
          <div className="sim-admin-footer">
            <span style={{ fontSize: ".8125rem", color: "var(--sim-slate-500)" }}>
              PMT = PV × [i × (1+i)^n] / [(1+i)^n − 1]
            </span>
          </div>
        </div>

        {/* INTERNO BENAVERA */}
        <div className="sim-admin-section">
          <div className="sim-admin-section-header">
            <h2>Custos internos Benavera</h2>
            <p>Visíveis apenas no modo interno — não aparecem para as clínicas</p>
          </div>
          <div className="sim-admin-fields">
            <AdminField label="Custo de funding (%)" hint="Ex: 1.2" value={custoFunding} onChange={setCustoFunding} />
            <AdminField label="Custo parceiro (%)" hint="Ex: 0.5" value={custoParceiro} onChange={setCustoParceiro} />
            <AdminField label="Spread Benavera (%)" hint="Ex: 1.8" value={spreadBenavera} onChange={setSpreadBenavera} />
            <AdminField label="Outros custos (%)" hint="Ex: 0.0" value={outrosCustos} onChange={setOutrosCustos} />
          </div>
        </div>

        {/* SALVAR */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: "2rem" }}>
          <button
            className="sim-admin-save-btn"
            onClick={handleSave}
            disabled={saving}
            id="btn-salvar-config"
          >
            {saving ? "Salvando..." : "💾 Salvar todas as configurações"}
          </button>
        </div>
      </div>
    </div>
  );
}
