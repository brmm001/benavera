'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/como-funciona', label: 'Como funciona' },
  { href: '/clinicas', label: 'Para clínicas' },
  { href: '/conteudos', label: 'Conteúdos' },
  { href: '/sobre', label: 'Sobre' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'all 0.25s ease',
        backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.95)',
        borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div className="container-benavera">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '68px',
          gap: '1rem',
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }} aria-label="Benavera — página inicial">
            <span style={{
              fontSize: '1.375rem',
              fontWeight: '800',
              color: '#2f3181',
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-inter), sans-serif',
            }}>
              bena<span style={{ color: '#4040ca' }}>vera</span>
            </span>
          </Link>

          {/* Nav desktop */}
          <nav aria-label="Navegação principal" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: '0.5rem 0.875rem',
                  fontSize: '0.9375rem',
                  fontWeight: '500',
                  color: '#475569',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = '#2f3181';
                  (e.target as HTMLElement).style.background = '#f0f4ff';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = '#475569';
                  (e.target as HTMLElement).style.background = 'transparent';
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTAs desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }} className="hidden md:flex">
            <Link href="/clinicas" className="btn-secondary" style={{ padding: '0.5625rem 1.25rem', fontSize: '0.875rem' }}>
              Sou uma clínica
            </Link>
            <Link href="/simular" className="btn-primary" style={{ padding: '0.5625rem 1.25rem', fontSize: '0.875rem' }}>
              Simular possibilidades
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            id="menu-toggle"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              background: 'white',
              cursor: 'pointer',
              color: '#334155',
              flexShrink: 0,
            }}
            className="md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-label="Menu de navegação"
          style={{
            position: 'fixed',
            top: '68px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'white',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto',
            zIndex: 99,
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '1rem 1.25rem',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#334155',
                textDecoration: 'none',
                borderRadius: '12px',
                border: '1px solid #f1f5f9',
                display: 'block',
                transition: 'background 0.15s ease',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link href="/clinicas" className="btn-secondary" onClick={() => setMenuOpen(false)}>
              Sou uma clínica
            </Link>
            <Link href="/simular" className="btn-primary" onClick={() => setMenuOpen(false)}>
              Simular possibilidades
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
