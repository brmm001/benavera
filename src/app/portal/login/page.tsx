'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Building2, ArrowRight } from 'lucide-react';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/portal/dashboard';
      } else {
        setError(data.error || 'Email ou senha incorretos.');
      }
    } catch {
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
              bena<span style={{ color: '#8195f8' }}>vera</span>
            </span>
          </Link>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9375rem', color: '#64748b' }}>Portal da Clinica</p>
        </div>

        <div style={{ background: 'white', borderRadius: '20px', padding: '2.25rem 2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1.75rem', letterSpacing: '-0.02em' }}>
            Entrar no portal
          </h1>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <div>
              <label className="input-label" htmlFor="portal-email">Email</label>
              <input
                id="portal-email"
                type="email"
                className="input-field"
                placeholder="email@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="input-label" htmlFor="portal-password">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="portal-password"
                  type={showPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              id="portal-login-btn"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.375rem', gap: '0.5rem' }}
            >
              {loading ? 'Entrando...' : (
                <>Entrar no portal <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '0 0 0.5rem' }}>
              Nao tem acesso ainda?
            </p>
            <Link href="/credenciamento" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4040ca', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Building2 size={13} />
              Credenciar minha clinica
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8125rem', color: '#475569' }}>
          <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>Voltar ao site</Link>
        </p>
      </div>
    </div>
  );
}
