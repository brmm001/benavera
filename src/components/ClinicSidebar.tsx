'use client';
// components/ClinicSidebar.tsx

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: '⊞' },
  { href: '/financiamentos', label: 'Financiamentos', icon: '◉' },
  { href: '/pacientes', label: 'Pacientes', icon: '♥' },
  { href: '/repasses', label: 'Repasses', icon: '◈' },
  { href: '/equipe', label: 'Equipe', icon: '◎' },
  { href: '/configuracoes', label: 'Configurações', icon: '⚙' },
];

interface ClinicSidebarProps {
  userName: string;
  clinicName: string;
}

export function ClinicSidebar({ userName, clinicName }: ClinicSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function handleNewFinancing() {
    router.push('/novo-financiamento');
  }

  return (
    <aside style={{
      width: '240px',
      minHeight: '100vh',
      background: 'white',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #6370f1, #4040ca)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '800', fontSize: '15px', flexShrink: 0,
          }}>B</div>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#1c1d4c', letterSpacing: '-0.3px' }}>
            Benavera
          </span>
        </div>
        <div style={{
          background: '#f8fafc', borderRadius: '8px', padding: '8px 10px',
        }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#334155' }}>{clinicName}</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{userName}</p>
        </div>
      </div>

      {/* CTA Principal */}
      <div style={{ padding: '16px 16px 8px' }}>
        <button
          onClick={handleNewFinancing}
          style={{
            width: '100%', padding: '12px',
            background: 'linear-gradient(135deg, #6370f1, #4040ca)',
            color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            boxShadow: '0 4px 12px rgba(99,112,241,0.35)',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,112,241,0.45)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,112,241,0.35)';
          }}
        >
          <span style={{ fontSize: '16px' }}>+</span> Novo financiamento
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 12px', flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', marginBottom: '2px',
                textDecoration: 'none',
                background: isActive ? '#f0f4ff' : 'transparent',
                color: isActive ? '#4040ca' : '#64748b',
                fontSize: '14px', fontWeight: isActive ? '600' : '500',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#334155';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid #f1f5f9' }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: '100%', padding: '10px 12px',
            background: 'none', border: '1px solid #e2e8f0',
            borderRadius: '8px', cursor: 'pointer',
            color: '#94a3b8', fontSize: '13px', fontWeight: '500',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#fecaca';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <span>⟵</span> {loggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </aside>
  );
}
