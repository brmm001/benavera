'use client';
// src/app/atendente/login/page.tsx
// Login exclusivo para atendentes da Benavera

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AtendenteLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Se já estiver logado como atendente, redireciona direto
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user && (d.user.role === 'BENAVERA_COMERCIAL' || d.user.role === 'BENAVERA_ADMIN')) {
          router.replace('/atendente');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Credenciais inválidas.');
        return;
      }

      if (data.user?.role !== 'BENAVERA_COMERCIAL' && data.user?.role !== 'BENAVERA_ADMIN') {
        setError('Esta área é exclusiva para atendentes comerciais Benavera.');
        return;
      }

      router.push('/atendente');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif", padding: '20px',
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(99,112,241,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '30%',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px', padding: '52px 44px', width: '100%', maxWidth: '420px',
        position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: '900', color: 'white',
            boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
          }}>B</div>

          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px' }}>
            Benavera
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '20px', padding: '4px 12px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: '600', letterSpacing: '0.3px' }}>
              Área do Atendente
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.10)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px', padding: '13px 16px', marginBottom: '24px',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
            <p style={{ margin: 0, color: '#fca5a5', fontSize: '13px', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* E-mail */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.3px' }}>
              E-MAIL
            </label>
            <input
              id="atendente-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              style={{
                width: '100%', padding: '13px 16px', fontSize: '14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', color: 'white', outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(16,185,129,0.05)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
            />
          </div>

          {/* Senha */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', letterSpacing: '0.3px' }}>
              SENHA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="atendente-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '13px 48px 13px 16px', fontSize: '14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', color: 'white', outline: 'none',
                  transition: 'border-color 0.2s, background 0.2s',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(16,185,129,0.05)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', fontSize: '16px', padding: '4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Botão */}
          <button
            id="atendente-login-btn"
            type="submit"
            disabled={loading}
            style={{
              marginTop: '6px', padding: '14px', fontSize: '14px', fontWeight: '700',
              background: loading
                ? 'rgba(16,185,129,0.4)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white', border: 'none', borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'inherit', letterSpacing: '0.2px',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(16,185,129,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 28px rgba(16,185,129,0.5)'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.35)'; }}
          >
            {loading ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Entrando…
              </>
            ) : 'Entrar no painel'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ margin: '28px 0 0', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          Acesso restrito · Benavera Soluções Financeiras
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
      `}</style>
    </div>
  );
}
