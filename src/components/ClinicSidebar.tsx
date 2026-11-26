'use client';
// components/ClinicSidebar.tsx
// Navegação modular, agrupada por categoria e responsiva (desktop sidebar + mobile drawer).

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Calculator,
  Link2,
  RotateCcw,
  Kanban,
  FileCheck,
  Users,
  Sparkles,
  Percent,
  Megaphone,
  Calendar,
  BarChart3,
  Trophy,
  Heart,
  Sliders,
  CreditCard,
  Settings,
  UserCog,
  Plus,
  Lock,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import type { ModuleCategory, ResolvedModule } from '@/lib/clinic-modules';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  FileText,
  Wallet,
  Calculator,
  Link2,
  RotateCcw,
  Kanban,
  FileCheck,
  Users,
  Sparkles,
  Percent,
  Megaphone,
  Calendar,
  BarChart3,
  Trophy,
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  moduleId?: string;
}

interface ClinicSidebarProps {
  userName: string;
  clinicName: string;
  modules?: ResolvedModule[];
  uiMode?: 'simple' | 'complete';
  planName?: string;
  allowNewApplications?: boolean;
  subscriptionBlocked?: boolean;
}

const CATEGORY_ORDER: { key: ModuleCategory; label: string }[] = [
  { key: 'inicio', label: 'Início' },
  { key: 'financiamentos', label: 'Financiamentos' },
  { key: 'pacientes_orcamentos', label: 'Pacientes e Orçamentos' },
  { key: 'ferramentas_comerciais', label: 'Ferramentas Comerciais' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'configuracoes', label: 'Configurações' },
];

export function ClinicSidebar({
  userName,
  clinicName,
  modules,
  uiMode = 'simple',
  planName,
  allowNewApplications = true,
  subscriptionBlocked = false,
}: ClinicSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const activeModules = (modules || []).filter((m) => m.effectiveEnabled);
  const hasDynamic = Array.isArray(modules);

  const grouped: Record<ModuleCategory, NavItem[]> = {
    inicio: [{ href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard }],
    financiamentos: hasDynamic
      ? []
      : [
          { href: '/financiamentos', label: 'Financiamentos', icon: FileText },
          { href: '/repasses', label: 'Repasses', icon: Wallet },
        ],
    pacientes_orcamentos: [{ href: '/pacientes', label: 'Pacientes', icon: Heart }],
    ferramentas_comerciais: [],
    relatorios: [],
    configuracoes: [
      { href: '/painel/assinatura', label: 'Assinatura e Faturas', icon: CreditCard },
      { href: '/painel/modulos', label: 'Módulos e Layout', icon: Sliders },
      { href: '/equipe', label: 'Equipe', icon: UserCog },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  };

  if (hasDynamic) {
    for (const m of activeModules) {
      const IconComp = ICON_MAP[m.icon] || FileText;
      const cat = grouped[m.category] ? m.category : 'ferramentas_comerciais';
      grouped[cat].push({
        href: m.href,
        label: m.name,
        icon: IconComp,
        moduleId: m.id,
      });
    }
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                background: 'linear-gradient(135deg, #6370f1, #4040ca)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '800',
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              B
            </div>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1c1d4c', letterSpacing: '-0.3px' }}>
              Benavera
            </span>
          </div>
          {mobileOpen && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', border: '1px solid #f1f5f9' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clinicName}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{userName}</p>
          {planName && (
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#4040ca', background: '#eef2ff', padding: '2px 7px', borderRadius: '99px' }}>
                {planName}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                {uiMode === 'simple' ? 'Modo simples' : 'Modo completo'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 16px 6px' }}>
        {allowNewApplications ? (
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              router.push('/novo-financiamento');
            }}
            className="bv-btn"
            style={{ width: '100%', padding: '11px 14px', fontSize: '13px', boxShadow: '0 4px 14px rgba(64,64,202,0.28)' }}
          >
            <Plus size={16} /> Novo financiamento
          </button>
        ) : subscriptionBlocked ? (
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              router.push('/painel/assinatura');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              background: '#dc2626',
              border: 'none',
              color: 'white',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <CreditCard size={14} /> Regularizar assinatura
          </button>
        ) : (
          <div
            title="A criação de novos financiamentos está bloqueada para esta clínica. Todas as demais ferramentas continuam liberadas."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#92400e',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxSizing: 'border-box',
            }}
          >
            <Lock size={14} /> Financiamentos bloqueados
          </div>
        )}
      </div>

      <nav style={{ padding: '10px 12px 16px', flex: 1 }}>
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat.key];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat.key} style={{ marginBottom: '14px' }}>
              <div
                style={{
                  padding: '0 10px 6px',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: '#94a3b8',
                }}
              >
                {cat.label}
              </div>
              {items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      marginBottom: '2px',
                      textDecoration: 'none',
                      background: isActive ? '#eef2ff' : 'transparent',
                      color: isActive ? '#4040ca' : '#475569',
                      fontSize: '13px',
                      fontWeight: isActive ? '700' : '500',
                      transition: 'all 0.14s ease',
                    }}
                  >
                    <Icon size={16} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  </a>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: '100%',
            padding: '9px 12px',
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'inherit',
          }}
        >
          <LogOut size={15} />
          {loggingOut ? 'Saindo…' : 'Sair da conta'}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="bv-mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '7px 9px',
              color: '#1c1d4c',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Menu size={18} />
          </button>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1c1d4c', lineHeight: 1.1 }}>Benavera</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{clinicName}</div>
          </div>
        </div>
        {allowNewApplications ? (
          <button type="button" onClick={() => router.push('/novo-financiamento')} className="bv-btn sm">
            <Plus size={14} /> Novo
          </button>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: '#fef3c7',
              color: '#92400e',
              fontSize: '11px',
              fontWeight: '700',
            }}
          >
            <Lock size={12} /> Bloqueado
          </span>
        )}
      </div>

      <div className={`bv-drawer-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`bv-sidebar ${mobileOpen ? 'open' : ''}`}>{sidebarContent}</aside>
    </>
  );
}
