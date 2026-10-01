'use client';
// src/components/AtendenteSidebar.tsx

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/atendente', label: 'Início', icon: '⊞', exact: true },
  { href: '/atendente/leads', label: 'Meus Leads', icon: '🎯' },
  { href: '/atendente/clinicas', label: 'Minhas Clínicas', icon: '🏥' },
  { href: '/atendente/comissoes', label: 'Minhas Comissões', icon: '💰' },
];

export function AtendenteSidebar({
  userName,
  role,
}: {
  userName: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/atendente/login');
  }

  return (
    <aside style={{
      width: '228px', minHeight: '100vh',
      background: '#0f172a', display: 'flex', flexDirection: 'column',
      flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '800', fontSize: '15px', flexShrink: 0,
          }}>B</div>
          <div>
            <span style={{ fontSize: '16px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px', display: 'block' }}>
              Benavera
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
              Área do Atendente
            </span>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{userName}</p>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
            Atendente Comercial
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px', flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href + '/') || pathname === item.href;
          return (
            <a key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
              textDecoration: 'none',
              background: isActive ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: isActive ? '#6ee7b7' : 'rgba(255,255,255,0.5)',
              fontSize: '13px', fontWeight: isActive ? '600' : '500',
              transition: 'all 0.15s',
              borderLeft: isActive ? '2px solid #10b981' : '2px solid transparent',
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

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: '100%', padding: '10px 12px', background: 'none',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: '13px',
            fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'; e.currentTarget.style.color = '#fca5a5'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          ⟵ {loggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </aside>
  );
}
