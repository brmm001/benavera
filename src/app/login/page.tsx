'use client';
// app/login/page.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
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

      if (!res.ok) {
        setError(data.error || 'Credenciais inválidas.');
        return;
      }

      const role = data.user?.role;
      if (role === 'BENAVERA_ADMIN' || role === 'BENAVERA_ANALYST') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1c1d4c 0%, #2f3181 40%, #4040ca 100%)',
      padding: '24px',
    }}>
      {/* Card */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'linear-gradient(135deg, #6370f1, #4040ca)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '800', fontSize: '18px',
            }}>B</div>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#1c1d4c', letterSpacing: '-0.5px' }}>
              Benavera
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Plataforma de financiamento de saúde
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              required
              style={{
                width: '100%', padding: '12px 16px',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = '#6370f1')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 16px',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = '#6370f1')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '12px 16px',
              color: '#dc2626', fontSize: '14px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6370f1, #4040ca)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(99,112,241,0.4)',
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: '32px', padding: '16px', background: '#f8fafc', borderRadius: '10px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', margin: '0 0 10px 0' }}>
            CONTAS DE DEMONSTRAÇÃO
          </p>
          {[
            { label: 'Admin Benavera', email: 'admin@benavera.com.br', password: 'Benavera@2026' },
            { label: 'Analista', email: 'analista@benavera.com.br', password: 'Benavera@2026' },
            { label: 'Admin Clínica', email: 'admin@odontoprime.com.br', password: 'Clinica@2026' },
            { label: 'Atendente', email: 'atendente@odontoprime.com.br', password: 'Clinica@2026' },
          ].map(acc => (
            <button
              key={acc.email}
              type="button"
              onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 8px', marginBottom: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderRadius: '6px', transition: 'background 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#4040ca' }}>{acc.label}: </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{acc.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
