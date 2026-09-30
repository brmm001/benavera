"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/simuladorclinicas/simulator.css";

export default function SimuladorAdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/simulator/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/simuladorclinicas/admin");
    } else {
      setError("Senha incorreta. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div className="sim-login-root">
      <div className="sim-login-card">
        <div className="sim-login-logo">
          <div className="sim-login-logo-badge">B</div>
          <h1 className="sim-login-title">Painel Administrativo</h1>
          <p className="sim-login-sub">Simulador Benavera — Acesso restrito</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="sim-field-group">
            <label htmlFor="admin-password" className="sim-label">Senha de acesso</label>
            <input
              id="admin-password"
              type="password"
              className="sim-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              required
              autoFocus
            />
          </div>
          {error && <div className="sim-admin-error">{error}</div>}
          <button
            type="submit"
            className="sim-admin-save-btn"
            style={{ width: "100%", justifyContent: "center", marginTop: ".5rem" }}
            disabled={loading}
          >
            {loading ? "Verificando..." : "Entrar →"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a href="/simuladorclinicas" className="sim-btn-ghost">← Voltar ao simulador</a>
        </div>
      </div>
    </div>
  );
}
