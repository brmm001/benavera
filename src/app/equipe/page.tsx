'use client';

import React, { useState, useEffect } from 'react';

interface UserMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export default function EquipePage() {
  const [members, setMembers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In our seed we have clinic members
    // Let's set initial state or fetch from me
    setMembers([
      {
        id: '1',
        name: 'Dr. Roberto Santos',
        email: 'admin@odontoprime.com.br',
        role: 'CLINIC_ADMIN',
        active: true,
        created_at: '2026-01-15',
      },
      {
        id: '2',
        name: 'Juliana Lima (Recepção)',
        email: 'atendente@odontoprime.com.br',
        role: 'CLINIC_ATTENDANT',
        active: true,
        created_at: '2026-02-01',
      },
      {
        id: '3',
        name: 'Marcos Oliveira (Financeiro)',
        email: 'financeiro@odontoprime.com.br',
        role: 'CLINIC_FINANCIAL',
        active: true,
        created_at: '2026-02-10',
      },
    ]);
    setLoading(false);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CLINIC_ADMIN':
        return { label: 'Administrador da Clínica', bg: '#fdf4ff', color: '#a855f7', desc: 'Acesso total, gestão de equipe e contratos' };
      case 'CLINIC_ATTENDANT':
        return { label: 'Atendimento / Recepção', bg: '#eff6ff', color: '#2563eb', desc: 'Abertura de solicitações e envio de propostas' };
      case 'CLINIC_FINANCIAL':
        return { label: 'Financeiro', bg: '#ecfdf5', color: '#059669', desc: 'Acompanhamento de repasses e dados bancários' };
      default:
        return { label: role, bg: '#f1f5f9', color: '#475569', desc: 'Membro da equipe' };
    }
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>Equipe da Clínica</h1>
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

      {/* Members Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
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
                    }}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px' }}>{m.name}</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{m.email}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: badge.bg, padding: '8px 12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: badge.color }}>{badge.label}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{badge.desc}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                <span>Status: <strong style={{ color: '#059669' }}>Ativo</strong></span>
                <span>Desde {new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions Guide */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>Matriz de Permissões</h2>
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
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px' }}>Nova solicitação de financiamento</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>—</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px' }}>Acompanhar status e compartilhar link</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px' }}>Acompanhar repasses bancários / PIX</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>—</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
            </tr>
            <tr>
              <td style={{ padding: '12px' }}>Gerenciar equipe e configurações</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>✓</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>—</td>
              <td style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
