'use client';

import React, { useState, useEffect } from 'react';

interface UserMember {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string; desc: string }> = {
  CLINIC_ADMIN: {
    label: 'Administrador da Clínica',
    bg: '#fdf4ff',
    color: '#a855f7',
    desc: 'Acesso total, gestão de equipe e contratos',
  },
  CLINIC_ATTENDANT: {
    label: 'Atendimento / Recepção',
    bg: '#eff6ff',
    color: '#2563eb',
    desc: 'Abertura de solicitações e envio de propostas',
  },
  CLINIC_FINANCIAL: {
    label: 'Financeiro',
    bg: '#ecfdf5',
    color: '#059669',
    desc: 'Acompanhamento de repasses e dados bancários',
  },
  BENAVERA_ADMIN: {
    label: 'Admin Benavera',
    bg: '#fff7ed',
    color: '#ea580c',
    desc: 'Acesso total à plataforma Benavera',
  },
  BENAVERA_ANALYST: {
    label: 'Analista Benavera',
    bg: '#f0fdf4',
    color: '#16a34a',
    desc: 'Análise e aprovação de financiamentos',
  },
};

export default function EquipePage() {
  const [members, setMembers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch('/api/equipe');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao carregar equipe.');
        }
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const getRoleBadge = (role: string) =>
    ROLE_CONFIG[role] ?? { label: role, bg: '#f1f5f9', color: '#475569', desc: 'Membro da equipe' };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
            Equipe da Clínica
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Gerencie os usuários e níveis de acesso autorizados na sua clínica.
          </p>
        </div>
        <button
          onClick={() => alert('Convite de novos membros em breve via e-mail.')}
          style={{
            padding: '10px 18px',
            backgroundColor: '#6370f1',
            color: '#fff',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99,112,241,0.25)',
          }}
        >
          + Convidar Membro
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '14px' }}>
          Carregando equipe...
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '16px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && members.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 0',
            color: '#94a3b8',
            fontSize: '14px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #e2e8f0',
          }}
        >
          Nenhum membro encontrado para esta clínica.
        </div>
      )}

      {/* Members Grid */}
      {!loading && members.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          {members.map((m) => {
            const badge = getRoleBadge(m.role);
            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: '#f0f4ff',
                        color: '#4040ca',
                        fontWeight: '800',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: '#0f172a',
                          margin: '0 0 2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '13px',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {m.email}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: badge.bg,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '700', color: badge.color }}>{badge.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{badge.desc}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '12px',
                    fontSize: '12px',
                    color: '#94a3b8',
                  }}
                >
                  <span>
                    Status:{' '}
                    <strong style={{ color: m.ativo ? '#059669' : '#dc2626' }}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </strong>
                  </span>
                  <span>
                    {m.last_login_at
                      ? `Último acesso ${new Date(m.last_login_at).toLocaleDateString('pt-BR')}`
                      : `Desde ${new Date(m.created_at).toLocaleDateString('pt-BR')}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions Matrix */}
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
          Matriz de Permissões
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '10px 12px' }}>Funcionalidade</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Admin Clínica</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Atendente</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Financeiro</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Nova solicitação de financiamento', true, true, false],
              ['Acompanhar status e compartilhar link', true, true, true],
              ['Acompanhar repasses bancários / PIX', true, false, true],
              ['Gerenciar equipe e configurações', true, false, false],
            ].map(([label, admin, atendente, financeiro]) => (
              <tr key={String(label)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px' }}>{String(label)}</td>
                {[admin, atendente, financeiro].map((v, i) => (
                  <td
                    key={i}
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      color: v ? '#059669' : '#94a3b8',
                      fontWeight: v ? '700' : '400',
                    }}
                  >
                    {v ? '✓' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
