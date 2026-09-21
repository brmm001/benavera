'use client';
// app/c/[token]/page.tsx — Página de verificação OTP para o credenciamento da clínica

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ClinicVerifyPage() {
  const router = useRouter();
  const { token } = useParams();
  const [step, setStep] = useState<'loading' | 'verify' | 'otp' | 'error'>('loading');
  const [error, setError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [onboardingId, setOnboardingId] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState('');
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setStep('error'); return; }
    validateToken();
  }, [token]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const validateToken = async () => {
    setStep('loading');
    setError('');
    try {
      const res = await fetch(`/api/c/${token}/validate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMaskedEmail(data.maskedEmail || '');
        setMaskedPhone(data.maskedPhone || '');
        setClinicName(data.clinicName || '');
        setInviteId(data.inviteId || '');
        setOnboardingId(data.onboardingId || '');
        if (data._devOtp) { setDevOtp(data._devOtp); }
        setStep('otp');
        setResendCooldown(30);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || 'Link inválido.');
        setStep('error');
      }
    } catch {
      setError('Erro ao validar o link. Verifique sua conexão.');
      setStep('error');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...otpCode];
    newCode[index] = digit;
    setOtpCode(newCode);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newCode.every(d => d !== '') && digit) {
      handleVerifyOTP(newCode.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otpCode.every(d => d !== '')) {
      handleVerifyOTP(otpCode.join(''));
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      const newCode = text.split('');
      setOtpCode(newCode);
      handleVerifyOTP(text);
    }
  };

  const handleVerifyOTP = async (code: string) => {
    if (verifying) return;
    setVerifying(true);
    setError('');
    try {
      const res = await fetch(`/api/c/${token}/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, inviteId, onboardingId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/c/${token}/formulario`);
      } else {
        setError(data.error || 'Código inválido.');
        setOtpCode(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    setError('');
    try {
      const res = await fetch(`/api/c/${token}/validate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setOtpCode(['', '', '', '', '', '']);
        setResendCooldown(60);
        if (data._devOtp) setDevOtp(data._devOtp);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || 'Erro ao reenviar.');
      }
    } catch {
      setError('Erro ao reenviar. Tente novamente.');
    } finally {
      setResending(false);
    }
  };

  // Layout base com design Benavera
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); * { box-sizing: border-box; }` }} />
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '20px' }}>🪪</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'white', letterSpacing: '-0.5px' }}>Benavera</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '36px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      {children}
    </div>
  );

  if (step === 'loading') return (
    <Container>
      <Card>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#6370f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', margin: 0 }}>Validando seu link…</p>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </Card>
    </Container>
  );

  if (step === 'error') return (
    <Container>
      <Card>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 12px' }}>Link inválido</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }}>
            {error}
          </p>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
            Caso precise de um novo link, entre em contato com a equipe Benavera pelo mesmo canal em que foi atendido.
          </div>
        </div>
      </Card>
    </Container>
  );

  return (
    <Container>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>🔐</div>
          <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Verificação de identidade
          </h1>
          {clinicName && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 12px' }}>
              {clinicName}
            </p>
          )}
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
            Enviamos um código de 6 dígitos para{' '}
            <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{maskedEmail}</strong>
          </p>
        </div>

        {/* Campos OTP */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}
          onPaste={handleOtpPaste}>
          {otpCode.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKeyDown(i, e)}
              style={{
                width: '52px', height: '64px', textAlign: 'center', fontSize: '28px', fontWeight: '800',
                background: digit ? 'rgba(99,112,241,0.2)' : 'rgba(255,255,255,0.06)',
                border: `2px solid ${digit ? '#6370f1' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '12px', color: 'white', outline: 'none', fontFamily: 'monospace',
                caretColor: '#6370f1', transition: 'all 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#6370f1'}
            />
          ))}
        </div>

        {/* Dev mode: mostrar código */}
        {devOtp && (
          <div style={{ background: 'rgba(99,112,241,0.15)', border: '1px solid rgba(99,112,241,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>🛠 DEV MODE</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#a5b4fc', fontFamily: 'monospace', letterSpacing: '6px' }}>{devOtp}</p>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', textAlign: 'center', fontSize: '14px', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {verifying && (
          <div style={{ textAlign: 'center', padding: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Verificando…
          </div>
        )}

        <button onClick={() => handleVerifyOTP(otpCode.join(''))}
          disabled={verifying || otpCode.some(d => !d)}
          style={{
            width: '100%', padding: '14px', background: 'linear-gradient(135deg,#6370f1,#4040ca)',
            color: 'white', border: 'none', borderRadius: '12px', cursor: verifying || otpCode.some(d => !d) ? 'not-allowed' : 'pointer',
            fontSize: '15px', fontWeight: '700', fontFamily: 'inherit', marginBottom: '16px',
            opacity: otpCode.some(d => !d) ? 0.5 : 1, transition: 'opacity 0.2s',
          }}>
          Verificar código
        </button>

        <div style={{ textAlign: 'center' }}>
          <button onClick={handleResend} disabled={resending || resendCooldown > 0}
            style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', color: resendCooldown > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontFamily: 'inherit' }}>
            {resending ? 'Enviando…' : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Não recebeu? Reenviar código'}
          </button>
        </div>

        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.6' }}>
          🔒 Conexão segura · A Benavera nunca pedirá este código por telefone ou WhatsApp
        </div>
      </Card>
    </Container>
  );
}
