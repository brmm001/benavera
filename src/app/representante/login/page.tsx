'use client';
// Login exclusivo do representante de vendas
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RepresentanteLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (data.user?.role !== 'REPRESENTANTE') {
        // Não mantém sessão de outro perfil aberta nesta área
        await fetch('/api/auth/logout', { method: 'POST' });
        setError('Esta área é exclusiva para representantes de vendas Benavera.');
        return;
      }
      router.push('/representante');
      router.refresh();
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const input: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 15, boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',-apple-system,sans-serif", padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: 'clamp(28px,6vw,48px) clamp(22px,6vw,42px)', width: '100%', maxWidth: 420, boxShadow: '0 32px 80px rgba(0,0,0,.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 18px', background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff' }}>B</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#fff' }}>Benavera</h1>
          <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 600, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 20, padding: '4px 12px' }}>Área do Representante</span>
        </div>

        {error && <div role="alert" style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <label style={{ display: 'block', color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>E-mail</label>
        <input style={input} type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
        <label style={{ display: 'block', color: 'rgba(255,255,255,.6)', fontSize: 12, fontWeight: 600, margin: '16px 0 6px' }}>Senha</label>
        <input style={input} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 24, padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

