'use client';
// components/AdminSidebar.tsx

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Visão geral', icon: '⊞', exact: true },
  { href: '/admin/fila', label: 'Fila operacional', icon: '◉' },
  { href: '/admin/solicitacoes', label: 'Solicitações', icon: '📄' },
  { href: '/admin/clinicas', label: 'Clínicas', icon: '🏥' },
  { href: '/admin/parceiros', label: 'Parceiros', icon: '🏦' },
  { href: '/admin/repasses', label: 'Repasses', icon: '◈' },
  { href: '/admin/recuperacao', label: 'Recuperação', icon: '↩' },
  { href: '/admin/financeiro', label: 'Financeiro', icon: '◎' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
  { href: '/admin/auditoria', label: 'Auditoria', icon: '🔒' },
  { href: '/admin/configuracoes', label: 'Configurações', icon: '⚙' },
];

export function AdminSidebar({ userName, role }: { userName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside style={{
      width: '240px', minHeight: '100vh',
      background: '#0f172a', display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #6370f1, #4040ca)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '800', fontSize: '15px', flexShrink: 0,
          }}>B</div>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>
            Benavera
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{userName}</p>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
            {role === 'BENAVERA_ADMIN' ? 'Administrador' : 'Analista'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 12px', flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href + '/') || pathname === item.href;
          return (
            <a key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
              textDecoration: 'none',
              background: isActive ? 'rgba(99,112,241,0.2)' : 'transparent',
              color: isActive ? '#a5b9fc' : 'rgba(255,255,255,0.5)',
              fontSize: '13px', fontWeight: isActive ? '600' : '500',
              transition: 'all 0.15s',
              borderLeft: isActive ? '2px solid #6370f1' : '2px solid transparent',
            }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
            >
              <span style={{ fontSize: '15px', width: '18px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={handleLogout} disabled={loggingOut}
          style={{ width: '100%', padding: '10px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s', fontFamily: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'; e.currentTarget.style.color = '#fca5a5'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          ⟵ {loggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </aside>
  );
}
