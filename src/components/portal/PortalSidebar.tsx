'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, Users, Kanban, Building2,
  ArrowLeftRight, BarChart3, BookOpen, Settings, LogOut, Menu, X, Bell
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/portal/dashboard', section: 'main' },
  { icon: FileText, label: 'Propostas', href: '/portal/propostas', section: 'main' },
  { icon: Kanban, label: 'CRM', href: '/portal/crm', section: 'main' },
  { icon: Users, label: 'Pacientes', href: '/portal/pacientes', section: 'main' },
  { icon: ArrowLeftRight, label: 'Repasses', href: '/portal/repasses', section: 'financeiro' },
  { icon: BarChart3, label: 'Relatorios', href: '/portal/relatorios', section: 'financeiro' },
  { icon: BookOpen, label: 'Blog', href: '/admin/blog', section: 'config', external: true },
  { icon: Settings, label: 'Configuracoes', href: '/portal/configuracoes', section: 'config' },
];

interface Props {
  clinicNome: string;
  userName: string;
  userInitials: string;
}

export function PortalSidebar({ clinicNome, userName, userInitials }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/portal/logout', { method: 'POST' });
    window.location.href = '/portal/login';
  }

  const sidebarContent = (
    <>
      <div className="portal-sidebar-brand">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
            bena<span style={{ color: '#8195f8' }}>vera</span>
          </span>
        </Link>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(99,112,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={14} style={{ color: '#8195f8' }} />
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
            {clinicNome}
          </span>
        </div>
      </div>

      <nav className="portal-sidebar-nav" aria-label="Navegacao do portal">
        {(['main', 'financeiro', 'config'] as const).map((section) => {
          const items = navItems.filter(i => i.section === section);
          const labels: Record<string, string> = { main: 'Principal', financeiro: 'Financeiro', config: 'Configuracoes' };
          return (
            <div key={section}>
              <div className="portal-nav-section-label">{labels[section]}</div>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/portal/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`portal-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="portal-sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem', padding: '0 0.125rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99,112,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: '700', color: '#a5b9fc', flexShrink: 0 }}>
            {userInitials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="portal-nav-item"
          style={{ width: '100%', color: '#ef4444', gap: '0.75rem' }}
          id="portal-logout-btn"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile topbar toggle */}
      <div style={{ display: 'none' }} className="portal-mobile-toggle">
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155' }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className={`portal-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Sidebar do portal">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
        />
      )}
    </>
  );
}
