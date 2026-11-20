'use client';
// src/app/painel/modulos/page.tsx — Central de Módulos, Preferências e Ordem do Menu da Clínica
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sliders, Lock, ArrowUp, ArrowDown, RefreshCw, EyeOff } from 'lucide-react';
import type { ClinicPreferences, ResolvedModule } from '@/lib/clinic-modules';

export default function PainelModulosPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ResolvedModule[]>([]);
  const [prefs, setPrefs] = useState<ClinicPreferences | null>(null);
  const [planName, setPlanName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/painel/preferencias');
    const data = await res.json();
    if (res.ok) {
      setModules(data.modules || []);
      setPrefs(data.preferences);
      setPlanName(data.planName || '');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function patch(payload: Record<string, unknown>, feedback?: string) {
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/painel/preferencias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || 'Erro ao salvar.');
      return;
    }
    setModules(data.modules || []);
    setPrefs(data.preferences);
    if (feedback) setMsg(feedback);
    router.refresh();
  }

  function moveModule(id: string, dir: -1 | 1) {
    const ids = modules.map((m) => m.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    patch({ menuOrder: ids }, 'Ordem do menu atualizada.');
  }

  if (loading) return <div className="bv-page"><div className="bv-card">Carregando módulos…</div></div>;

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Módulos e Personalização</h1>
          <p className="bv-subtitle">
            Plano atual: <strong>{planName}</strong>. Ative só o que sua clínica usa — desativar oculta a ferramenta sem apagar seus dados.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bv-btn danger sm"
            disabled={saving}
            onClick={() => patch({ action: 'disable_all_optional' }, 'Todos os módulos opcionais foram desativados (seus dados foram mantidos).')}
          >
            <EyeOff size={14} /> Desativar todos opcionais
          </button>
          <button
            type="button"
            className="bv-btn ghost sm"
            disabled={saving}
            onClick={() => patch({ action: 'restore_default' }, 'Layout padrão restaurado.')}
          >
            <RefreshCw size={14} /> Restaurar padrão
          </button>
        </div>
      </div>

      {msg && (
        <div className="bv-card" style={{ marginBottom: '16px', background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', fontSize: '13px', fontWeight: '600' }}>
          {msg}
        </div>
      )}

      {prefs && (
        <div className="bv-card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={18} color="#4040ca" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>Modo da interface</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {prefs.uiMode === 'simple' ? 'Modo simples: início limpo e focado nas operações diárias.' : 'Modo completo: exibe grade de todas as ferramentas ativas no início.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="bv-btn soft sm"
            disabled={saving}
            onClick={() => patch({ uiMode: prefs.uiMode === 'simple' ? 'complete' : 'simple' })}
          >
            {prefs.uiMode === 'simple' ? 'Ativar Modo Completo' : 'Voltar ao Modo Simples'}
          </button>
        </div>
      )}

      <div className="bv-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
        {modules.map((m, idx) => (
          <div key={m.id} className="bv-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', opacity: m.effectiveEnabled ? 1 : 0.78 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '15px', color: '#1c1d4c' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{m.category.replace('_', ' ')}</div>
                </div>
                <span
                  className="bv-badge"
                  style={
                    m.effectiveEnabled
                      ? { background: '#ecfdf5', color: '#047857' }
                      : { background: '#f1f5f9', color: '#64748b' }
                  }
                >
                  {m.effectiveEnabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>{m.description}</p>
              <div style={{ fontSize: '11px', color: m.effectiveEnabled ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {!m.canToggle && <Lock size={12} />} {m.reason}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" className="bv-btn ghost sm" disabled={saving || idx === 0} onClick={() => moveModule(m.id, -1)} title="Subir no menu">
                  <ArrowUp size={13} />
                </button>
                <button type="button" className="bv-btn ghost sm" disabled={saving || idx === modules.length - 1} onClick={() => moveModule(m.id, 1)} title="Descer no menu">
                  <ArrowDown size={13} />
                </button>
              </div>

              {m.canToggle ? (
                <button
                  type="button"
                  disabled={saving}
                  className={`bv-btn sm ${m.clinicEnabled ? 'ghost' : ''}`}
                  onClick={() => patch({ enabledModules: { [m.id]: !m.clinicEnabled } }, `${m.name} ${!m.clinicEnabled ? 'ativado' : 'desativado'}.`)}
                >
                  {m.clinicEnabled ? 'Desativar' : 'Ativar'}
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                  {m.isCore ? 'Essencial' : 'Controlado'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
