'use client';
// src/app/admin/planos/page.tsx — Planos, Assinaturas, Cupons e Controle Global de Módulos
import { useEffect, useState } from 'react';
import '@/app/painel/clinic-panel.css';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_annual: number;
  is_free: boolean;
  is_custom: boolean;
  trial_days: number;
  max_users: number | null;
  module_ids: string[];
  archived: boolean;
  total_clinicas?: string;
}

interface PlatformModule {
  id: string;
  name: string;
  category: string;
  is_core: boolean;
  is_active_global: boolean;
  default_available: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  active: boolean;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [couponForm, setCouponForm] = useState({ code: '', discount_type: 'PERCENT', discount_value: '10' });

  async function load() {
    const res = await fetch('/api/admin/planos');
    const data = await res.json();
    if (res.ok) {
      setPlans(data.plans || []);
      setModules(data.modules || []);
      setCoupons(data.coupons || []);
    }
  }
  useEffect(() => { load(); }, []);

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const res = await fetch('/api/admin/planos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'plan', ...editing }),
    });
    if (res.ok) {
      setEditing(null);
      setMsg('Plano salvo com sucesso.');
      load();
    }
  }

  async function toggleGlobal(mod: PlatformModule, field: 'is_active_global' | 'default_available') {
    await fetch('/api/admin/planos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'global_module', module_id: mod.id, [field]: !mod[field] }),
    });
    setMsg(`Módulo "${mod.name}" atualizado globalmente.`);
    load();
  }

  async function applyAll(moduleId: string, adminState: 'BLOCKED' | 'AVAILABLE') {
    if (!confirm(`Aplicar estado ${adminState} para TODAS as clínicas?`)) return;
    await fetch('/api/admin/planos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'global_module', module_id: moduleId, apply_to_all: true, admin_state: adminState }),
    });
    setMsg('Regra aplicada a todas as clínicas.');
    load();
  }

  async function saveCoupon(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/admin/planos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'coupon', ...couponForm }),
    });
    setCouponForm({ code: '', discount_type: 'PERCENT', discount_value: '10' });
    setMsg('Cupom salvo.');
    load();
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Planos, Assinaturas e Módulos</h1>
          <p className="bv-subtitle">Crie planos ilimitados, defina módulos incluídos e controle globalmente a disponibilidade (cobranças reais permanecem desativadas).</p>
        </div>
        <button
          type="button"
          className="bv-btn"
          onClick={() => setEditing({ name: '', description: '', price_monthly: 0, price_annual: 0, is_free: true, trial_days: 0, module_ids: modules.map((m) => m.id) })}
        >
          + Novo plano
        </button>
      </div>

      {msg && <div className="bv-card" style={{ marginBottom: '16px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', fontSize: '13px', fontWeight: '600' }}>{msg}</div>}

      {editing && (
        <form onSubmit={savePlan} className="bv-card" style={{ marginBottom: '20px', borderColor: '#c7d2fe' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '800' }}>{editing.id ? 'Editar plano' : 'Novo plano'}</h3>
          <div className="bv-grid bv-cols-3" style={{ marginBottom: '12px' }}>
            <div><label className="bv-label">Nome *</label><input className="bv-input" required value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><label className="bv-label">Preço mensal (R$)</label><input className="bv-input" type="number" step="0.01" value={editing.price_monthly ?? 0} onChange={(e) => setEditing({ ...editing, price_monthly: Number(e.target.value) })} /></div>
            <div><label className="bv-label">Preço anual (R$)</label><input className="bv-input" type="number" step="0.01" value={editing.price_annual ?? 0} onChange={(e) => setEditing({ ...editing, price_annual: Number(e.target.value) })} /></div>
            <div><label className="bv-label">Dias de trial</label><input className="bv-input" type="number" value={editing.trial_days ?? 0} onChange={(e) => setEditing({ ...editing, trial_days: Number(e.target.value) })} /></div>
            <div><label className="bv-label">Limite de usuários (vazio = ilimitado)</label><input className="bv-input" type="number" value={editing.max_users ?? ''} onChange={(e) => setEditing({ ...editing, max_users: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><label className="bv-label">Descrição</label><input className="bv-input" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          </div>
          <div className="bv-label">Módulos incluídos no plano</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {modules.map((m) => {
              const inc = (editing.module_ids || []).includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`bv-btn sm ${inc ? 'soft' : 'ghost'}`}
                  onClick={() => {
                    const cur = editing.module_ids || [];
                    setEditing({ ...editing, module_ids: inc ? cur.filter((x) => x !== m.id) : [...cur, m.id] });
                  }}
                >
                  {inc ? '✓ ' : '+ '}{m.name}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="bv-btn">Salvar plano</button>
            <button type="button" className="bv-btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista de Planos */}
      <div className="bv-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Planos cadastrados</h3>
        <div className="bv-table-wrap">
          <table className="bv-table">
            <thead><tr><th>Plano</th><th>Mensal</th><th>Anual</th><th>Módulos</th><th>Clínicas</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td><div style={{ fontWeight: '700' }}>{p.name}</div><div style={{ fontSize: '11px', color: '#64748b' }}>{p.description}</div></td>
                  <td>{p.is_free ? 'Gratuito' : brl(Number(p.price_monthly))}</td>
                  <td>{p.is_free ? 'Gratuito' : brl(Number(p.price_annual))}</td>
                  <td>{p.module_ids.length}</td>
                  <td>{p.total_clinicas || 0}</td>
                  <td><span className="bv-badge" style={p.archived ? { background: '#f1f5f9', color: '#64748b' } : { background: '#d1fae5', color: '#047857' }}>{p.archived ? 'Arquivado' : 'Ativo'}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button type="button" className="bv-btn soft sm" onClick={() => setEditing(p)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controle Global de Módulos */}
      <div className="bv-card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Controle Global de Módulos</h3>
        <div className="bv-table-wrap">
          <table className="bv-table">
            <thead><tr><th>Módulo</th><th>Global</th><th>Padrão novas contas</th><th>Ações em massa</th></tr></thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong> <span style={{ fontSize: '11px', color: '#94a3b8' }}>({m.id})</span></td>
                  <td>
                    <button type="button" className={`bv-btn sm ${m.is_active_global ? 'soft' : 'danger'}`} onClick={() => toggleGlobal(m, 'is_active_global')}>
                      {m.is_active_global ? 'Ativo' : 'Desativado globalmente'}
                    </button>
                  </td>
                  <td>
                    <button type="button" className={`bv-btn sm ${m.default_available ? 'soft' : 'ghost'}`} onClick={() => toggleGlobal(m, 'default_available')}>
                      {m.default_available ? 'Disponível' : 'Bloqueado p/ novas'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="bv-btn ghost sm" onClick={() => applyAll(m.id, 'AVAILABLE')}>Liberar p/ todas</button>
                      {!m.is_core && <button type="button" className="bv-btn danger sm" onClick={() => applyAll(m.id, 'BLOCKED')}>Bloquear p/ todas</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cupons */}
      <div className="bv-card">
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Cupons de desconto</h3>
        <form onSubmit={saveCoupon} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <input className="bv-input" style={{ width: '180px' }} placeholder="CÓDIGO (ex: BENAVERA20)" required value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} />
          <select className="bv-select" style={{ width: '140px' }} value={couponForm.discount_type} onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}>
            <option value="PERCENT">Percentual (%)</option>
            <option value="FIXED">Valor fixo (R$)</option>
          </select>
          <input className="bv-input" style={{ width: '120px' }} type="number" value={couponForm.discount_value} onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })} />
          <button className="bv-btn sm">Criar cupom</button>
        </form>
        {coupons.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {coupons.map((c) => (
              <span key={c.id} className="bv-badge" style={{ background: '#eef2ff', color: '#4040ca', padding: '6px 12px' }}>
                {c.code} · {c.discount_type === 'PERCENT' ? `${c.discount_value}%` : brl(Number(c.discount_value))}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
