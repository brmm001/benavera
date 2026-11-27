'use client';
// src/app/admin/auditoria/page.tsx — Trilha de auditoria real (dados 100% do banco)

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AuditLog {
  id: string;
  application_id: string | null;
  protocol: string | null;
  clinic_nome: string | null;
  patient_nome: string | null;
  valor_financiado: number | null;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  actor_name: string | null;
  actor_role: string | null;
  metadata: Record<string, unknown> | null;
}

function formatMeta(meta: Record<string, unknown> | null): string {
  if (!meta || typeof meta !== 'object') return '—';
  const parts: string[] = [];
  if (meta.note) parts.push(String(meta.note));
  if (meta.partner) parts.push(`Parceiro: ${String(meta.partner)}`);
  if (Array.isArray(meta.partners) && meta.partners.length > 0) parts.push(`Parceiros: ${meta.partners.join(', ')}`);
  if (meta.motivo) parts.push(`Motivo: ${String(meta.motivo)}`);
  if (parts.length > 0) return parts.join(' · ');
  const keys = Object.keys(meta);
  return keys.length > 0 ? JSON.stringify(meta).slice(0, 140) : '—';
}

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/auditoria', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Trilha de Auditoria &amp; Compliance</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Registro real e imutável de todas as ações, decisões de crédito, transições de status e consentimentos LGPD.
        </p>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando eventos reais…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Nenhum evento de auditoria registrado ainda.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Data / Hora</th>
                <th style={{ padding: '14px 16px' }}>Protocolo / Clínica</th>
                <th style={{ padding: '14px 16px' }}>Evento</th>
                <th style={{ padding: '14px 16px' }}>Origem → Destino</th>
                <th style={{ padding: '14px 16px' }}>Usuário / Agente</th>
                <th style={{ padding: '14px 16px' }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(l.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {l.application_id && l.protocol ? (
                      <Link href={`/admin/solicitacoes/${l.application_id}`} style={{ fontWeight: '700', fontFamily: 'monospace', color: '#4040ca', textDecoration: 'none' }}>
                        {l.protocol}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{l.protocol || '—'}</span>
                    )}
                    {(l.clinic_nome || l.patient_nome) && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {[l.clinic_nome, l.patient_nome].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#334155' }}>
                    {l.event_type.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                    {l.from_status || '—'} → <strong style={{ color: '#059669' }}>{l.to_status || '—'}</strong>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#0f172a' }}>
                    {l.actor_name || l.actor_role || 'SYSTEM'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px', maxWidth: '280px' }}>
                    {formatMeta(l.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
