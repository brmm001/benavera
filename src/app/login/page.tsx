'use client';
// app/login/page.tsx

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPendingApproval = searchParams.get('pending_approval') === '1';
  const isRegistered = searchParams.get('registered') === '1';

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
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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

        {/* Informative message for pending accounts */}
        {isPendingApproval && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: '10px', padding: '12px 14px',
            color: '#1e40af', fontSize: '13px',
            marginBottom: '20px', lineHeight: '1.5',
          }}>
            ℹ️ <strong>Credenciamento em análise:</strong> Seus documentos foram enviados. A sua conta será liberada após a aprovação pela administração da Benavera.
          </div>
        )}

        {isRegistered && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: '10px', padding: '12px 14px',
            color: '#1e40af', fontSize: '13px',
            marginBottom: '20px', lineHeight: '1.5',
          }}>
            ℹ️ <strong>Documentos pendentes:</strong> Conclua o envio de todos os documentos solicitados no credenciamento para liberar sua conta.
          </div>
        )}

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
              borderRadius: '10px', padding: '12px 16px',
              color: '#dc2626', fontSize: '13px',
              marginBottom: '20px', lineHeight: '1.5',
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
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1c1d4c' }} />}>
      <LoginForm />
    </Suspense>
  );
}
