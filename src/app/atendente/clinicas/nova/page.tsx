'use client';
// src/app/atendente/clinicas/nova/page.tsx
// Cadastro de nova clínica com validação de CNPJ e verificação de unicidade

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function NovaClincinaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('lead_id') || '';
  const nomePreenchido = searchParams.get('nome') || '';

  const [form, setForm] = useState({
    cnpj: '', nome_fantasia: nomePreenchido, razao_social: '', responsavel: '',
    telefone: '', email: '', cidade: '', estado: '', especialidade: '',
    clinic_lead_id: leadId,
  });
  const [cnpjStatus, setCnpjStatus] = useState<'idle' | 'checking' | 'ok' | 'invalid' | 'taken'>('idle');
  const [cnpjMsg, setCnpjMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Verificar CNPJ ao digitar (debounce)
  useEffect(() => {
    const digits = form.cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      setCnpjStatus('idle');
      setCnpjMsg('');
      return;
    }

    setCnpjStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/atendente/clinicas/verificar-cnpj?cnpj=${digits}`);
        const data = await res.json();
        if (!data.valid) {
          setCnpjStatus('invalid');
          setCnpjMsg('CNPJ inválido. Verifique os dígitos.');
        } else if (!data.available) {
          setCnpjStatus('taken');
          setCnpjMsg(data.message);
        } else {
          setCnpjStatus('ok');
          setCnpjMsg('CNPJ disponível para cadastro.');
        }
      } catch {
        setCnpjStatus('idle');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.cnpj]);

  function formatCnpj(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0,2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`;
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cnpjStatus !== 'ok') {
      setError('Verifique o CNPJ antes de continuar.');
      return;
    }
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/atendente/clinicas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error || 'Erro ao cadastrar clínica.');
      setSubmitting(false);
      return;
    }

    router.push('/atendente/clinicas');
  }

  const cnpjColor = { idle: '#64748b', checking: '#f59e0b', ok: '#10b981', invalid: '#ef4444', taken: '#ef4444' }[cnpjStatus];

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: '14px',
    border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' as const,
    outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle = { display: 'block' as const, fontSize: '12px', fontWeight: '600' as const, color: '#64748b', marginBottom: '5px' };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: '28px' }}>
        <a href="/atendente/clinicas" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>
          ← Minhas clínicas
        </a>
        <h1 style={{ margin: '12px 0 4px', fontSize: '24px', fontWeight: '800', color: '#1c1d4c' }}>
          Cadastrar nova clínica
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          O CNPJ é validado e garante unicidade global no sistema.
        </p>
      </div>

      {leadId && (
        <div style={{ background: 'rgba(99,112,241,0.08)', border: '1px solid rgba(99,112,241,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#4c51bf' }}>
            🔗 Vinculando ao lead <strong>{leadId}</strong>
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* CNPJ — campo crítico */}
        <div style={{ marginBottom: '20px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <label style={labelStyle}>CNPJ <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            id="clinic-cnpj"
            type="text"
            required
            value={form.cnpj}
            onChange={e => setForm(f => ({ ...f, cnpj: formatCnpj(e.target.value) }))}
            placeholder="00.000.000/0000-00"
            style={{
              ...inputStyle,
              borderColor: cnpjStatus === 'ok' ? '#10b981' : cnpjStatus === 'invalid' || cnpjStatus === 'taken' ? '#ef4444' : '#e2e8f0',
            }}
          />
          {cnpjMsg && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: cnpjColor, fontWeight: '600' }}>
              {cnpjStatus === 'checking' ? '⏳ ' : cnpjStatus === 'ok' ? '✅ ' : '⚠️ '}{cnpjMsg}
            </p>
          )}
        </div>

        {/* Dados da clínica */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nome fantasia <span style={{ color: '#ef4444' }}>*</span></label>
            <input id="clinic-nome" type="text" required value={form.nome_fantasia}
              onChange={e => setForm(f => ({ ...f, nome_fantasia: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Razão social</label>
            <input type="text" value={form.razao_social}
              onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Responsável / Contato</label>
            <input type="text" value={form.responsavel}
              onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Telefone / WhatsApp</label>
            <input type="tel" value={form.telefone}
              onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>E-mail</label>
            <input type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Cidade</label>
            <input type="text" value={form.cidade}
              onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Estado (UF)</label>
            <input type="text" maxLength={2} value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Especialidade principal</label>
            <select value={form.especialidade}
              onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
              style={{ ...inputStyle, background: 'white', cursor: 'pointer' }}>
              <option value="">Selecionar…</option>
              {['Odontologia', 'Implantes', 'Oftalmologia', 'Cirurgia Eletiva', 'Estética', 'Dermatologia', 'Ortopedia', 'Outro'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <a href="/atendente/clinicas" style={{
            padding: '10px 20px', background: '#f8fafc', color: '#64748b',
            border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none',
            fontSize: '14px', fontWeight: '600',
          }}>Cancelar</a>
          <button
            id="clinic-submit"
            type="submit"
            disabled={submitting || cnpjStatus !== 'ok'}
            style={{
              padding: '10px 24px', background: cnpjStatus === 'ok' ? '#10b981' : '#94a3b8',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: '700', cursor: submitting || cnpjStatus !== 'ok' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Cadastrando…' : 'Cadastrar clínica'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NovaClincinaPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>}>
      <NovaClincinaForm />
    </Suspense>
  );
}
