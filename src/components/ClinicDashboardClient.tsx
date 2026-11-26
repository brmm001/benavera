'use client';
// src/components/ClinicDashboardClient.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Lock, Sliders, RotateCcw, Calculator, Kanban, Link2, FileCheck,
  Sparkles, BarChart3, ArrowRight, CheckCircle2, EyeOff, RefreshCw,
} from 'lucide-react';
import type { ClinicPreferences, ResolvedModule } from '@/lib/clinic-modules';

interface AppRow {
  id: string;
  protocol: string;
  patient_nome: string;
  procedimento: string;
  valor_financiado: number;
  status: string;
  created_at: string;
}

interface Props {
  userName: string;
  clinicName: string;
  planName: string;
  isClinicAdmin: boolean;
  allowNewApplications?: boolean;
  newApplicationsBlockReason?: string | null;
  initialPrefs: ClinicPreferences;
  modules: ResolvedModule[];
  kpis: {
    total_mes: number;
    volume_solicitado: number;
    volume_aprovado: number;
    taxa_aprovacao: number;
    recovery_open_count: number;
    recovery_open_value: number;
    crm_open_count: number;
  };
  recentApps: AppRow[];
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED: { label: 'Enviada', color: '#6d28d9', bg: '#f5f3ff' },
  PRE_ANALYSIS: { label: 'Pré-análise', color: '#b45309', bg: '#fffbeb' },
  INTERNAL_REVIEW: { label: 'Em análise', color: '#b45309', bg: '#fffbeb' },
  AWAITING_DOCUMENTS: { label: 'Docs pendentes', color: '#b45309', bg: '#fffbeb' },
  OFFERS_AVAILABLE: { label: 'Proposta disp.', color: '#0e7490', bg: '#ecfeff' },
  APPROVED: { label: 'Aprovado', color: '#047857', bg: '#ecfdf5' },
  PAYOUT_SCHEDULED: { label: 'Repasse prog.', color: '#047857', bg: '#ecfdf5' },
  PAYOUT_COMPLETED: { label: 'Repasse pago', color: '#047857', bg: '#ecfdf5' },
  TREATMENT_RELEASED: { label: 'Liberado', color: '#047857', bg: '#ecfdf5' },
  DECLINED: { label: 'Recusado', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
};

const KPI_CATALOG = [
  { id: 'total_mes', label: 'Solicitações no mês' },
  { id: 'volume_solicitado', label: 'Volume solicitado' },
  { id: 'volume_aprovado', label: 'Volume aprovado' },
  { id: 'taxa_aprovacao', label: 'Taxa de aprovação' },
];

const SHORTCUT_CATALOG = [
  { id: 'novo_financiamento', label: 'Novo financiamento', href: '/novo-financiamento', moduleId: null, icon: Plus },
  { id: 'simulador', label: 'Simular parcelas', href: '/painel/simulador', moduleId: 'simulador', icon: Calculator },
  { id: 'recuperacao', label: 'Recuperar orçamentos', href: '/painel/recuperacao', moduleId: 'recuperacao', icon: RotateCcw },
  { id: 'crm', label: 'Abrir CRM', href: '/painel/crm', moduleId: 'crm', icon: Kanban },
  { id: 'links', label: 'Gerar link', href: '/painel/links', moduleId: 'links_financiamento', icon: Link2 },
  { id: 'propostas', label: 'Proposta digital', href: '/painel/propostas-digitais', moduleId: 'propostas_digitais', icon: FileCheck },
  { id: 'assistente', label: 'Assistente', href: '/painel/assistente', moduleId: 'assistente_ia', icon: Sparkles },
  { id: 'indicadores', label: 'Indicadores', href: '/painel/indicadores', moduleId: 'indicadores', icon: BarChart3 },
];

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function ClinicDashboardClient({
  userName,
  clinicName,
  planName,
  isClinicAdmin,
  allowNewApplications = true,
  newApplicationsBlockReason = null,
  initialPrefs,
  modules,
  kpis,
  recentApps,
}: Props) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<ClinicPreferences>(initialPrefs);
  const [modList, setModList] = useState<ResolvedModule[]>(modules);
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeSet = new Set(modList.filter((m) => m.effectiveEnabled).map((m) => m.id));
  const optionalActive = modList.filter((m) => !m.isCore && m.effectiveEnabled);

  async function savePrefs(payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch('/api/painel/preferencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.preferences) {
        setPrefs(data.preferences);
        if (data.modules) setModList(data.modules);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleKpi(id: string) {
    const cur = prefs.dashboardWidgets.kpis || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    savePrefs({ dashboardWidgets: { ...prefs.dashboardWidgets, kpis: next } });
  }

  function toggleShortcut(id: string) {
    const cur = prefs.quickActions || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    savePrefs({ quickActions: next });
  }

  const visibleKpis = KPI_CATALOG.filter((k) => (prefs.dashboardWidgets.kpis || []).includes(k.id));
  const visibleShortcuts = SHORTCUT_CATALOG.filter(
    (s) =>
      (s.id !== 'novo_financiamento' || allowNewApplications) &&
      (prefs.quickActions || []).includes(s.id) &&
      (!s.moduleId || activeSet.has(s.moduleId))
  );

  return (
    <div className="bv-page">
      {/* Header */}
      <div className="bv-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="bv-badge" style={{ background: '#eef2ff', color: '#4040ca' }}>{clinicName}</span>
            <span className="bv-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{planName}</span>
          </div>
          <h1 className="bv-title">Olá, {userName.split(' ')[0]} 👋</h1>
          <p className="bv-subtitle">
            Sua central de financiamento e crescimento comercial. Tudo organizado em poucos cliques.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="bv-btn ghost sm"
            disabled={saving}
            onClick={() => savePrefs({ uiMode: prefs.uiMode === 'simple' ? 'complete' : 'simple' })}
          >
            {prefs.uiMode === 'simple' ? 'Alternar para Modo Completo' : 'Alternar para Modo Simples'}
          </button>
          <button
            type="button"
            className="bv-btn soft sm"
            onClick={() => setCustomizing((v) => !v)}
          >
            <Sliders size={14} /> {customizing ? 'Fechar personalização' : 'Personalizar início'}
          </button>
          {allowNewApplications ? (
            <Link href="/novo-financiamento" className="bv-btn">
              <Plus size={16} /> Novo financiamento
            </Link>
          ) : (
            <span
              className="bv-badge"
              style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '8px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={14} /> Novos financiamentos bloqueados
            </span>
          )}
        </div>
      </div>

      {!allowNewApplications && (
        <div
          className="bv-card"
          style={{
            marginBottom: '20px',
            background: '#fffbeb',
            borderColor: '#fde68a',
            color: '#92400e',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Lock size={16} style={{ flexShrink: 0 }} />
          <span>
            {newApplicationsBlockReason ||
              'A criação de novos financiamentos está temporariamente bloqueada para esta conta. Todas as demais ferramentas do painel estão liberadas.'}
          </span>
        </div>
      )}

      {/* Personalization Drawer */}
      {customizing && (
        <div className="bv-card" style={{ marginBottom: '22px', borderColor: '#c7d2fe', background: '#fafbff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>Personalizar página inicial</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Suas escolhas ficam salvas automaticamente para toda a clínica.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isClinicAdmin && (
                <button
                  type="button"
                  className="bv-btn danger sm"
                  disabled={saving}
                  onClick={() => savePrefs({ action: 'disable_all_optional' })}
                >
                  <EyeOff size={13} /> Desativar todos opcionais
                </button>
              )}
              <button
                type="button"
                className="bv-btn ghost sm"
                disabled={saving}
                onClick={() => savePrefs({ action: 'restore_default' })}
              >
                <RefreshCw size={13} /> Restaurar padrão
              </button>
            </div>
          </div>

          <div className="bv-grid bv-cols-2" style={{ marginBottom: 0 }}>
            <div>
              <div className="bv-label">Indicadores visíveis</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {KPI_CATALOG.map((k) => {
                  const on = (prefs.dashboardWidgets.kpis || []).includes(k.id);
                  return (
                    <button
                      key={k.id}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleKpi(k.id)}
                      className={`bv-btn sm ${on ? 'soft' : 'ghost'}`}
                    >
                      {on ? '✓ ' : '+ '}{k.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="bv-label">Atalhos rápidos favoritos</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SHORTCUT_CATALOG.filter((s) => (s.id !== 'novo_financiamento' || allowNewApplications) && (!s.moduleId || activeSet.has(s.moduleId))).map((s) => {
                  const on = (prefs.quickActions || []).includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleShortcut(s.id)}
                      className={`bv-btn sm ${on ? 'soft' : 'ghost'}`}
                    >
                      {on ? '✓ ' : '+ '}{s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Shortcuts */}
      {visibleShortcuts.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
          {visibleShortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.id}
                href={s.href}
                className="bv-card bv-card-hover"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#1c1d4c',
                }}
              >
                <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eef2ff', color: '#4040ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} />
                </span>
                {s.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* KPIs */}
      {visibleKpis.length > 0 && (
        <div className="bv-grid bv-kpis">
          {visibleKpis.map((k) => {
            let value = '0';
            let accent = '#1c1d4c';
            if (k.id === 'total_mes') value = String(kpis.total_mes);
            if (k.id === 'volume_solicitado') value = brl(kpis.volume_solicitado);
            if (k.id === 'volume_aprovado') {
              value = brl(kpis.volume_aprovado);
              accent = '#047857';
            }
            if (k.id === 'taxa_aprovacao') {
              value = `${kpis.taxa_aprovacao.toFixed(0)}%`;
              accent = '#4040ca';
            }
            return (
              <div key={k.id} className="bv-card">
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: accent, letterSpacing: '-0.02em' }}>{value}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Oportunidades para recuperar highlight (apenas se módulo ativo) */}
      {activeSet.has('recuperacao') && prefs.dashboardWidgets.show_recovery !== false && (
        <div
          className="bv-card"
          style={{
            marginBottom: '22px',
            background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
            borderColor: '#c7d2fe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#4040ca', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              Oportunidades para recuperar
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#1c1d4c' }}>
              {kpis.recovery_open_count > 0
                ? `${kpis.recovery_open_count} orçamentos em aberto (${brl(kpis.recovery_open_value)})`
                : 'Nenhuma oportunidade pendente no momento'}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Recupere pacientes que ainda não fecharam oferecendo parcelamento pelo WhatsApp.
            </p>
          </div>
          <Link href="/painel/recuperacao" className="bv-btn">
            Abrir recuperação <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Ferramentas ativas (modo completo) */}
      {prefs.uiMode === 'complete' && optionalActive.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>
              Suas ferramentas ativas ({optionalActive.length})
            </h2>
            <Link href="/painel/modulos" style={{ fontSize: '13px', fontWeight: '600', color: '#4040ca', textDecoration: 'none' }}>
              Gerenciar módulos →
            </Link>
          </div>
          <div className="bv-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {optionalActive.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="bv-card bv-card-hover"
                style={{ textDecoration: 'none', color: 'inherit', padding: '16px 18px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>{m.name}</span>
                  <CheckCircle2 size={15} color="#10b981" />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{m.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Últimos financiamentos */}
      <div className="bv-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1c1d4c' }}>Últimas solicitações de financiamento</h2>
          <Link href="/financiamentos" style={{ fontSize: '13px', fontWeight: '600', color: '#4040ca', textDecoration: 'none' }}>
            Ver todas →
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="bv-empty">
            <p style={{ margin: '0 0 14px', fontSize: '14px' }}>
              {allowNewApplications
                ? 'Seu primeiro financiamento começa aqui.'
                : 'Nenhuma solicitação de financiamento registrada. A criação de novos financiamentos está bloqueada para esta conta.'}
            </p>
            {allowNewApplications && (
              <Link href="/novo-financiamento" className="bv-btn">
                <Plus size={15} /> Criar primeiro financiamento
              </Link>
            )}
          </div>
        ) : (
          <div className="bv-table-wrap">
            <table className="bv-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Procedimento</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentApps.map((app) => {
                  const st = STATUS_BADGE[app.status] || { label: app.status, color: '#475569', bg: '#f1f5f9' };
                  return (
                    <tr key={app.id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{app.patient_nome}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{app.protocol}</div>
                      </td>
                      <td>{app.procedimento}</td>
                      <td style={{ fontWeight: '700' }}>{brl(Number(app.valor_financiado || 0))}</td>
                      <td style={{ color: '#64748b' }}>
                        {new Date(app.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <span className="bv-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/financiamentos/${app.id}`} style={{ fontSize: '13px', fontWeight: '700', color: '#4040ca', textDecoration: 'none' }}>
                          Ver →
                        </Link>
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
