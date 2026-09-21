'use client';
// app/c/[token]/page.tsx — Acesso direto ao formulário de credenciamento

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ClinicAccessPage() {
  const router = useRouter();
  const { token } = useParams();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Link de credenciamento inválido.');
      return;
    }

    const startSession = async () => {
      try {
        const res = await fetch(`/api/c/${token}/validate`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          router.replace(`/c/${token}/formulario`);
        } else {
          setError(data.error || 'Link inválido ou expirado.');
        }
      } catch {
        // Fallback: tenta abrir diretamente o formulário
        router.replace(`/c/${token}/formulario`);
      }
    };

    startSession();
  }, [token, router]);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '36px',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.12)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 12px' }}>Link não disponível</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px' }}>
            {error}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: 0 }}>
            Caso precise de um novo link, entre em contato com a equipe Benavera.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '36px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.12)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#6370f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', fontWeight: '600', margin: 0 }}>
          Carregando formulário de credenciamento…
        </p>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
