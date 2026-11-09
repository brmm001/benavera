'use client';
// src/components/RepresentantePerfilForm.tsx
import { useState } from 'react';

type Props =
  | { mode: 'link'; link: string; codigo: string }
  | { mode: 'dados'; initial: { nome: string; email: string; telefone: string; documento: string; tipo_pix: string; chave_pix: string } };

export function RepresentantePerfilForm(props: Props) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState(props.mode === 'dados' ? props.initial : null);

  if (props.mode === 'link') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="rep-input" style={{ flex: '1 1 260px' }} readOnly value={props.link} onFocus={e => e.currentTarget.select()} />
          <button
            className="rep-btn"
            onClick={async () => {
              try { await navigator.clipboard.writeText(props.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
            }}
          >{copied ? 'Copiado ✓' : 'Copiar link'}</button>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#64748b' }}>
          Código de indicação: <strong style={{ letterSpacing: 1 }}>{props.codigo}</strong>
        </p>
      </div>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/representante/perfil', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: form.telefone, documento: form.documento, tipo_pix: form.tipo_pix, chave_pix: form.chave_pix }),
      });
      const data = await res.json();
      setMsg(res.ok ? { ok: true, text: 'Dados salvos.' } : { ok: false, text: data.error || 'Erro ao salvar.' });
    } catch { setMsg({ ok: false, text: 'Erro de conexão.' }); }
    finally { setSaving(false); }
  }

  if (!form) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={save}>
      <div className="rep-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
        <div><label className="rep-label">Nome</label><input className="rep-input" value={form.nome} disabled /></div>
        <div><label className="rep-label">E-mail de acesso</label><input className="rep-input" value={form.email} disabled /></div>
        <div><label className="rep-label">Telefone</label><input className="rep-input" value={form.telefone} onChange={set('telefone')} maxLength={30} /></div>
        <div><label className="rep-label">CPF / CNPJ</label><input className="rep-input" value={form.documento} onChange={set('documento')} maxLength={18} /></div>
        <div>
          <label className="rep-label">Tipo da chave PIX</label>
          <select className="rep-input" value={form.tipo_pix} onChange={set('tipo_pix')}>
            <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option>
            <option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option>
          </select>
        </div>
        <div><label className="rep-label">Chave PIX</label><input className="rep-input" value={form.chave_pix} onChange={set('chave_pix')} maxLength={200} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button className="rep-btn" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? '#047857' : '#dc2626' }}>{msg.text}</span>}
      </div>
    </form>
  );
}

