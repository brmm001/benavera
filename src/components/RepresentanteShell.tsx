'use client';
// src/components/RepresentanteShell.tsx
// Casca da área do representante: sidebar no desktop, barra superior rolável no mobile.

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/representante', label: 'Visão geral', icon: '▦', exact: true },
  { href: '/representante/clinicas', label: 'Minhas clínicas', icon: '🏥' },
  { href: '/representante/financeiro', label: 'Financeiro', icon: '💰' },
  { href: '/representante/perfil', label: 'Perfil & link', icon: '🔗' },
];

export function RepresentanteShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [out, setOut] = useState(false);

  async function logout() {
    setOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/representante/login');
  }

  const isOn = (n: (typeof NAV)[number]) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/'));

  return (
    <div className="rep-shell">
      <aside className="rep-side">
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>B</div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', display: 'block' }}>Benavera</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>Área do Representante</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>{userName}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,.45)' }}>Representante de vendas</p>
          </div>
        </div>
        <nav className="rep-nav" style={{ padding: 12, flex: 1 }}>
          {NAV.map(n => (
            <a key={n.href} href={n.href} className={isOn(n) ? 'on' : ''}>
              <span>{n.icon}</span>{n.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <button onClick={logout} disabled={out} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 13 }}>
            {out ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </aside>

      <div className="rep-main">
        <div className="rep-top">
          <div className="rep-top-bar">
            <span>Benavera · Representante</span>
            <button onClick={logout} disabled={out} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.2)', color: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>Sair</button>
          </div>
          <nav className="rep-top-nav">
            {NAV.map(n => (
              <a key={n.href} href={n.href} className={isOn(n) ? 'on' : ''}>{n.label}</a>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </div>
  );
}

