'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { login } from '@/app/actions/auth';
import { Lock, ShieldCheck, AlertCircle, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        width: '100%',
        padding: '14px 20px',
        background: pending
          ? 'rgba(99, 102, 241, 0.5)'
          : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: pending ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        boxShadow: pending ? 'none' : '0 4px 24px rgba(99, 102, 241, 0.4)',
        letterSpacing: '0.01em',
      }}
    >
      {pending ? (
        <>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Verificando...
        </>
      ) : (
        <>
          Acessar Painel
          <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Quando o servidor retorna { success: true }, fazemos uma
  // navegação COMPLETA com window.location — isso garante que o
  // cookie já está salvo antes do próximo request ao servidor.
  useEffect(() => {
    if (state && 'success' in state && state.success) {
      setRedirecting(true);
      window.location.assign('/admin/leads');
    }
  }, [state]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 40%, #0d1b2a 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '44px 40px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(79,70,229,0.15) 100%)',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.2)',
          }}>
            <Lock size={28} color="#818cf8" />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: 'white', letterSpacing: '-0.03em' }}>
              bena<span style={{ color: '#818cf8' }}>vera</span>
            </span>
            <span style={{
              display: 'inline-block', marginLeft: '8px',
              fontSize: '11px', fontWeight: '700', color: '#6366f1',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '6px', padding: '2px 8px', letterSpacing: '0.08em',
              textTransform: 'uppercase', verticalAlign: 'middle',
            }}>
              ADMIN
            </span>
          </div>

          <p style={{
            fontSize: '13px', color: '#64748b', margin: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
            <ShieldCheck size={14} color="#34d399" />
            Acesso restrito e protegido
          </p>
        </div>

        {/* Redirecting state */}
        {redirecting && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '12px', padding: '24px 0', marginBottom: '16px',
          }}>
            <Loader2 size={28} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Entrando no painel...</p>
          </div>
        )}

        {/* Error */}
        {!redirecting && state && 'error' in state && state.error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '24px',
          }}>
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.5' }}>
              {state.error}
            </span>
          </div>
        )}

        {/* Form */}
        {!redirecting && (
          <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="admin-password"
                style={{
                  display: 'block', fontSize: '11px', fontWeight: '700',
                  color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Senha de Acesso
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%', padding: '13px 44px 13px 16px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: 'white', fontSize: '15px',
                    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                    cursor: 'pointer', color: '#475569', padding: '4px',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <SubmitButton />
          </form>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '28px', paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#334155', margin: 0 }}>
            Sessão criptografada · Rate limiting ativo · LGPD compliant
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::placeholder { color: #334155 !important; }
      `}</style>
    </div>
  );
}
