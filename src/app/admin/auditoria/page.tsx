'use client';

import React, { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  application_id: string;
  protocol: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  actor_name: string | null;
  actor_role: string | null;
  notes: string | null;
}

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We can fetch recent events or populate demo data
    setLogs([
      {
        id: '1',
        application_id: 'app-1',
        protocol: 'BEN-2026-0001',
        event_type: 'STATUS_CHANGE',
        from_status: 'INTERNAL_REVIEW',
        to_status: 'OFFERS_AVAILABLE',
        created_at: new Date().toISOString(),
        actor_name: 'Ana Benavera (Analista)',
        actor_role: 'BENAVERA_ANALYST',
        notes: 'Propostas geradas com sucesso para os parceiros Santander e FIDC Alpha.',
      },
      {
        id: '2',
        application_id: 'app-2',
        protocol: 'BEN-2026-0002',
        event_type: 'STATUS_CHANGE',
        from_status: 'SUBMITTED',
        to_status: 'PRE_ANALYSIS_APPROVED',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        actor_name: 'Sistema Automático',
        actor_role: 'SYSTEM',
        notes: 'Score aprovado no motor de pré-análise de crédito.',
      },
    ]);
    setLoading(false);
  }, []);

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Trilha de Auditoria & Compliance</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Registro imutável de todas as ações, decisões de crédito, transições de status e consentimentos LGPD.
        </p>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 20px' }}>Data / Hora</th>
              <th style={{ padding: '14px 20px' }}>Protocolo</th>
              <th style={{ padding: '14px 20px' }}>Evento</th>
              <th style={{ padding: '14px 20px' }}>Origem → Destino</th>
              <th style={{ padding: '14px 20px' }}>Usuário / Agente</th>
              <th style={{ padding: '14px 20px' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px' }}>
                  {new Date(l.created_at).toLocaleString('pt-BR')}
                </td>
                <td style={{ padding: '16px 20px', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>
                  {l.protocol}
                </td>
                <td style={{ padding: '16px 20px', fontWeight: '600', color: '#334155' }}>
                  {l.event_type}
                </td>
                <td style={{ padding: '16px 20px', fontSize: '12px', color: '#475569' }}>
                  {l.from_status || '—'} → <strong style={{ color: '#059669' }}>{l.to_status}</strong>
                </td>
                <td style={{ padding: '16px 20px', color: '#0f172a' }}>
                  {l.actor_name}
                </td>
                <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px' }}>
                  {l.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
