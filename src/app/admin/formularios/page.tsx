// app/admin/formularios/page.tsx
// Página de visualização de todos que preencheram formulários (leads e credenciamentos)

import { sql } from '@/lib/benavera-db';

interface FormEntry {
  id: string;
  tipo: string;
  nome_responsavel: string;
  nome_clinica: string;
  cargo: string | null;
  whatsapp: string;
  email: string;
  cidade: string | null;
  estado: string | null;
  especialidade: string | null;
  status: string;
  pagina_origem: string | null;
  created_at: string;
}

async function getFormEntries(): Promise<FormEntry[]> {
  const rows = await sql`
    SELECT
      id,
      CASE 
        WHEN pagina_origem = '/credenciamento' THEN 'Credenciamento'
        ELSE 'Lead'
      END as tipo,
      COALESCE(nome_responsavel, '') as nome_responsavel,
      COALESCE(nome_clinica, '') as nome_clinica,
      cargo,
      COALESCE(whatsapp, '') as whatsapp,
      COALESCE(email, '') as email,
      cidade,
      estado,
      especialidade_principal as especialidade,
      COALESCE(status_comercial, 'novo') as status,
      pagina_origem,
      created_at
    FROM clinic_leads
    ORDER BY created_at DESC
  `;
  return rows as FormEntry[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    credenciado: { label: 'Credenciado ✓', bg: '#dcfce7', color: '#15803d' },
    novo:        { label: 'Novo lead',     bg: '#eff6ff', color: '#2563eb' },
    contato:     { label: 'Em contato',    bg: '#fef9c3', color: '#92400e' },
    qualificado: { label: 'Qualificado',   bg: '#f3e8ff', color: '#7c3aed' },
    perdido:     { label: 'Perdido',       bg: '#fef2f2', color: '#dc2626' },
  };
  const s = map[status] ?? { label: status, bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const isCredenciamento = tipo === 'Credenciamento';
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700',
      background: isCredenciamento ? '#ede9fe' : '#f0f9ff',
      color: isCredenciamento ? '#6d28d9' : '#0369a1',
    }}>
      {isCredenciamento ? '📝 Credenciamento' : '🎯 Lead'}
    </span>
  );
}

export default async function FormulariosPage() {
  const entries = await getFormEntries();

  const totalLeads = entries.filter(e => e.tipo === 'Lead').length;
  const totalCredenciamentos = entries.filter(e => e.tipo === 'Credenciamento').length;

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
          Formulários preenchidos
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Todos que enviaram formulários — leads e credenciamentos de clínicas
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total de envios', value: entries.length, color: '#6370f1', icon: '📋' },
          { label: 'Credenciamentos', value: totalCredenciamentos, color: '#6d28d9', icon: '📝' },
          { label: 'Leads captados', value: totalLeads, color: '#0369a1', icon: '🎯' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'white',
            borderRadius: '14px',
            padding: '20px 24px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <span style={{ fontSize: '28px' }}>{s.icon}</span>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>
            Registros ({entries.length})
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
            Mais recentes primeiro
          </p>
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
            <p style={{ fontSize: '40px', margin: '0 0 16px' }}>📭</p>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Nenhum formulário preenchido ainda</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Tipo', 'Responsável / Clínica', 'Contato', 'Localidade', 'Especialidade', 'Status', 'Data'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: '11px', fontWeight: '700', color: '#64748b',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: '1px solid #f1f5f9',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={entry.id} style={{
                    borderBottom: i < entries.length - 1 ? '1px solid #f8fafc' : 'none',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={undefined}
                  >
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <TipoBadge tipo={entry.tipo} />
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: '200px' }}>
                      <p style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '700', color: '#1c1d4c' }}>
                        {entry.nome_responsavel || '—'}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        {entry.nome_clinica || '—'}
                        {entry.cargo ? ` · ${entry.cargo}` : ''}
                      </p>
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: '180px' }}>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#334155' }}>
                        {entry.whatsapp || '—'}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                        {entry.email || '—'}
                      </p>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>
                        {[entry.cidade, entry.estado].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>
                        {entry.especialidade || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={entry.status} />
                    </td>
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {new Date(entry.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
