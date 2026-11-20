'use client';
import { useState } from 'react';
import { Printer, CheckCircle2 } from 'lucide-react';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function OrcamentoPublicClient({ proposal }: { proposal: Record<string, unknown> }) {
  const [status, setStatus] = useState(String(proposal.status || 'ENVIADA'));
  const [accepting, setAccepting] = useState(false);
  const procs = (Array.isArray(proposal.procedimentos) ? proposal.procedimentos : []) as { nome: string; qtd: number; valor: number }[];

  async function accept() {
    setAccepting(true);
    const res = await fetch('/api/orcamento/aceitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: proposal.token }),
    });
    setAccepting(false);
    if (res.ok) setStatus('ACEITA');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '18px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1c1d4c' }}>{String(proposal.nome_fantasia || proposal.razao_social)}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>CNPJ {String(proposal.cnpj || '—')} · {String(proposal.cidade || '')} / {String(proposal.estado || '')}</div>
          </div>
          <button type="button" onClick={() => window.print()} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>

        <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Orçamento para {String(proposal.patient_name)}</h1>
        {Boolean(proposal.validade) && (
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b' }}>Válido até {new Date(String(proposal.validade)).toLocaleDateString('pt-BR')}</p>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '12px' }}>
              <th style={{ padding: '8px 0' }}>Procedimento</th><th>Qtd</th><th style={{ textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {procs.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 0', fontWeight: '600' }}>{p.nome}</td>
                <td>{p.qtd}</td>
                <td style={{ textAlign: 'right', fontWeight: '700' }}>{brl((Number(p.valor) || 0) * (Number(p.qtd) || 1))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}><span>Subtotal</span><span>{brl(Number(proposal.subtotal))}</span></div>
          {Number(proposal.desconto) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#059669', marginBottom: '4px' }}><span>Desconto</span><span>-{brl(Number(proposal.desconto))}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', color: '#1c1d4c', marginTop: '6px' }}><span>Total</span><span>{brl(Number(proposal.total))}</span></div>
        </div>

        {Boolean(proposal.condicoes) && <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}><strong>Condições:</strong> {String(proposal.condicoes)}</p>}

        {status === 'ACEITA' ? (
          <div style={{ padding: '14px', borderRadius: '12px', background: '#ecfdf5', color: '#047857', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> Proposta aceita digitalmente.
          </div>
        ) : (
          <button type="button" disabled={accepting} onClick={accept} style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#4040ca', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
            {accepting ? 'Registrando aceite…' : 'Aceitar orçamento digitalmente'}
          </button>
        )}
      </div>
    </div>
  );
}
