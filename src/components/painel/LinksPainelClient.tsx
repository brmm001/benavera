'use client';
import { useEffect, useState } from 'react';
import { Link2, Copy, Check, Ban } from 'lucide-react';

interface LinkRow {
  id: string;
  token: string;
  protocol: string;
  patient_name: string | null;
  procedimento: string | null;
  valor_financiado: number;
  expires_at: string;
  revogado: boolean;
  acessos: number;
}

interface AppOption {
  id: string;
  protocol: string;
  patient_name: string | null;
  procedimento: string | null;
  valor_financiado: number;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function LinksPainelClient() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [apps, setApps] = useState<AppOption[]>([]);
  const [appId, setAppId] = useState('');
  const [days, setDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/painel/links');
    const data = await res.json();
    if (res.ok) {
      setLinks(data.links || []);
      setApps(data.applications || []);
    }
  }

  useEffect(() => { load(); }, []);

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    if (!appId) return;
    setCreating(true);
    await fetch('/api/painel/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id: appId, days }),
    });
    setCreating(false);
    setAppId('');
    load();
  }

  async function revoke(id: string) {
    await fetch('/api/painel/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/proposta/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Links de Financiamento</h1>
          <p className="bv-subtitle">Gere links individuais com validade configurável para o paciente consultar e enviar documentos com segurança.</p>
        </div>
      </div>

      <form onSubmit={createLink} className="bv-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Gerar novo link seguro</h3>
        <div className="bv-grid bv-cols-3" style={{ alignItems: 'end', marginBottom: 0 }}>
          <div>
            <label className="bv-label">Solicitação / Paciente</label>
            <select className="bv-select" required value={appId} onChange={(e) => setAppId(e.target.value)}>
              <option value="">Selecione…</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patient_name || 'Paciente'} — {a.procedimento || a.protocol} ({brl(Number(a.valor_financiado))})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="bv-label">Validade (dias)</label>
            <input className="bv-input" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <button type="submit" className="bv-btn" disabled={creating || !appId}>
            <Link2 size={15} /> {creating ? 'Gerando…' : 'Gerar link'}
          </button>
        </div>
      </form>

      <div className="bv-card">
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Links gerados</h3>
        {links.length === 0 ? <div className="bv-empty">Nenhum link gerado ainda.</div> : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead><tr><th>Paciente</th><th>Valor</th><th>Validade</th><th>Acessos</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {links.map((l) => {
                  const expired = new Date(l.expires_at) < new Date();
                  const active = !l.revogado && !expired;
                  return (
                    <tr key={l.id}>
                      <td><div style={{ fontWeight: '700' }}>{l.patient_name || 'Paciente'}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{l.protocol} · {l.procedimento}</div></td>
                      <td style={{ fontWeight: '700' }}>{brl(Number(l.valor_financiado))}</td>
                      <td>{new Date(l.expires_at).toLocaleDateString('pt-BR')}</td>
                      <td>{l.acessos}</td>
                      <td><span className="bv-badge" style={active ? { background: '#d1fae5', color: '#047857' } : { background: '#f1f5f9', color: '#64748b' }}>{l.revogado ? 'Revogado' : expired ? 'Expirado' : 'Ativo'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {active && (
                            <>
                              <button type="button" className="bv-btn soft sm" onClick={() => copyLink(l.token)}>
                                {copied === l.token ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                              </button>
                              <button type="button" className="bv-btn danger sm" onClick={() => revoke(l.id)}>
                                <Ban size={13} /> Revogar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
