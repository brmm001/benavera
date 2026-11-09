'use client';
// src/components/AdminRepresentantesClient.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { brl, pct, periodoLabel } from './rep-format';
import type { RepresentanteResumo } from '@/lib/representantes-db';

export function AdminRepresentantesClient({ initial }: { initial: RepresentanteResumo[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ email: string; senha: string } | null>(null);
  const [f, setF] = useState({ nome: '', email: '', telefone: '', documento: '', comissao_percent: '1', periodo_meses: '', bonus_ativacao: '0', mensalidade_percent: '0' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/representantes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          comissao_percent: Number(f.comissao_percent.replace(',', '.')),
          mensalidade_percent: Number(f.mensalidade_percent.replace(',', '.')),
          bonus_ativacao: Number(f.bonus_ativacao.replace(',', '.')),
          periodo_meses: f.periodo_meses === '' ? null : Number(f.periodo_meses),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao criar.'); return; }
      setCreated({ email: data.representante.email, senha: data.senhaTemporaria });
      setOpen(false);
      router.refresh();
    } catch { setError('Erro de conexão.'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {created && (
        <div className="rep-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', marginBottom: 16 }}>
          <strong>Representante criado.</strong> Envie estes dados de acesso (a senha só é exibida agora):
          <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 14 }}>
            Login: /representante/login<br />E-mail: {created.email}<br />Senha temporária: <strong>{created.senha}</strong>
          </div>
          <button className="rep-btn ghost small" style={{ marginTop: 10 }} onClick={() => setCreated(null)}>Fechar</button>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <button className="rep-btn" onClick={() => setOpen(!open)}>{open ? 'Cancelar' : '+ Novo representante'}</button>
      </div>

      {open && (
        <form onSubmit={create} className="rep-card" style={{ marginBottom: 18 }}>
          <h3>Novo representante</h3>
          {error && <div role="alert" style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div className="rep-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
            <div><label className="rep-label">Nome *</label><input className="rep-input" required value={f.nome} onChange={set('nome')} /></div>
            <div><label className="rep-label">E-mail (login) *</label><input className="rep-input" type="email" required value={f.email} onChange={set('email')} /></div>
            <div><label className="rep-label">Telefone</label><input className="rep-input" value={f.telefone} onChange={set('telefone')} /></div>
            <div><label className="rep-label">CPF / CNPJ</label><input className="rep-input" value={f.documento} onChange={set('documento')} /></div>
            <div><label className="rep-label">Comissão (% do valor financiado) *</label><input className="rep-input" required inputMode="decimal" value={f.comissao_percent} onChange={set('comissao_percent')} /></div>
            <div><label className="rep-label">Período de comissão (meses)</label><input className="rep-input" inputMode="numeric" placeholder="vazio = vitalício" value={f.periodo_meses} onChange={set('periodo_meses')} /></div>
            <div><label className="rep-label">Bônus por clínica ativada (R$)</label><input className="rep-input" inputMode="decimal" value={f.bonus_ativacao} onChange={set('bonus_ativacao')} /></div>
            <div><label className="rep-label">% sobre mensalidade (em breve)</label><input className="rep-input" inputMode="decimal" value={f.mensalidade_percent} onChange={set('mensalidade_percent')} /></div>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0 0' }}>O período conta a partir da data em que cada clínica é vinculada. Esses valores são o padrão; cada vínculo pode ter condições próprias.</p>
          <button className="rep-btn" style={{ marginTop: 14 }} disabled={saving}>{saving ? 'Criando…' : 'Criar representante'}</button>
        </form>
      )}

      <div className="rep-card">
        {initial.length === 0 ? <div className="rep-empty">Nenhum representante cadastrado.</div> : (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead><tr><th>Representante</th><th>Código</th><th>% / período</th><th>Clínicas</th><th>Prevista</th><th>A receber</th><th>Pago</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {initial.map(r => (
                  <tr key={r.id}>
                    <td><div style={{ fontWeight: 700 }}>{r.nome}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{r.email}</div></td>
                    <td style={{ fontFamily: 'monospace' }}>{r.codigo_indicacao}</td>
                    <td>{pct(r.comissao_percent, 2)} · {periodoLabel(r.periodo_meses)}</td>
                    <td>{r.clinicas_ativas}</td>
                    <td>{brl(r.total_previsto)}</td>
                    <td style={{ fontWeight: 700, color: '#4338ca' }}>{brl(r.total_a_receber)}</td>
                    <td>{brl(r.total_pago)}</td>
                    <td><span className="rep-badge" style={r.ativo ? { color: '#047857', background: '#d1fae5' } : { color: '#64748b', background: '#e2e8f0' }}>{r.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td><a href={`/admin/representantes/${r.id}`} style={{ color: '#059669', fontWeight: 700, textDecoration: 'none' }}>Abrir →</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

