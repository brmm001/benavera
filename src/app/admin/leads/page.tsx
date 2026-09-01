'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Users, Building2, Download, Search, ChevronDown, ChevronUp, Inbox } from 'lucide-react';

interface Lead {
  id: string;
  receivedAt: string;
  tipoLead: 'patient' | 'clinic';
  nome?: string;
  email?: string;
  whatsapp?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  // patient-specific
  tratamento?: string;
  valorTratamento?: number;
  entrada?: number;
  parcelaDesejada?: number;
  // clinic-specific
  nomeClinica?: string;
  cargo?: string;
  especialidade?: string;
  ticketMedio?: string;
  orcamentosMes?: string;
  maiorDesafio?: string;
  // meta
  ip?: string;
  userAgent?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  [key: string]: unknown;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCurrency(val: unknown) {
  if (typeof val === 'number' && val > 0) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }
  return '—';
}

function LeadRow({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const isClinic = lead.tipoLead === 'clinic';

  const metaKeys = ['id', 'receivedAt', 'ip', 'userAgent', 'landingPage', 'tipoLead', 'origem',
    'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm', 'timestamp'];

  const extraEntries = Object.entries(lead).filter(
    ([k]) => !metaKeys.includes(k) && !['nome', 'email', 'whatsapp', 'telefone', 'cidade', 'estado',
      'tratamento', 'valorTratamento', 'entrada', 'parcelaDesejada', 'parcelaCustom',
      'nomeClinica', 'cargo', 'especialidade', 'ticketMedio', 'orcamentosMes', 'maiorDesafio',
      'aceitaTermos', 'aceitaMarketing', 'valorFinanciado', 'numeroUnidades', 'temOrcamento',
      'entradaDesconhecida', 'referrer'].includes(k)
  );

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'white',
      transition: 'box-shadow 0.2s ease',
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto auto',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Badge tipo */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.25rem 0.625rem',
          borderRadius: '100px',
          fontSize: '0.75rem',
          fontWeight: '700',
          background: isClinic ? '#e0eaff' : '#d8f3ee',
          color: isClinic ? '#3535a3' : '#1e6560',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {isClinic ? <Building2 size={12} /> : <Users size={12} />}
          {isClinic ? 'Clínica' : 'Paciente'}
        </span>

        {/* Name / clinic */}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: '700', color: '#0f172a', margin: 0, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.nome ?? '—'}
            {isClinic && lead.nomeClinica && (
              <span style={{ fontWeight: '400', color: '#64748b', marginLeft: '0.5rem' }}>
                · {lead.nomeClinica}
              </span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.email ?? '—'} · {lead.whatsapp ?? lead.telefone ?? '—'}
          </p>
        </div>

        {/* Location */}
        <span style={{ fontSize: '0.8125rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {[lead.cidade, lead.estado].filter(Boolean).join(', ') || '—'}
        </span>

        {/* Date */}
        <span style={{ fontSize: '0.8125rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatDate(lead.receivedAt)}
        </span>

        {/* Expand */}
        <span style={{ color: '#94a3b8', flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {/* Expanded details */}
      {open && (
        <div style={{
          borderTop: '1px solid #f1f5f9',
          padding: '1.25rem',
          background: '#f8fafc',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.875rem',
        }}>
          {/* Patient fields */}
          {!isClinic && (
            <>
              <Field label="Tratamento" value={lead.tratamento} />
              <Field label="Valor do tratamento" value={formatCurrency(lead.valorTratamento)} />
              <Field label="Entrada" value={formatCurrency(lead.entrada)} />
              <Field label="Parcela desejada" value={formatCurrency(lead.parcelaDesejada)} />
            </>
          )}

          {/* Clinic fields */}
          {isClinic && (
            <>
              <Field label="Cargo" value={lead.cargo} />
              <Field label="Especialidade" value={lead.especialidade} />
              <Field label="Ticket médio" value={lead.ticketMedio} />
              <Field label="Orçamentos/mês" value={lead.orcamentosMes} />
              {lead.maiorDesafio && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Maior desafio" value={lead.maiorDesafio} />
                </div>
              )}
            </>
          )}

          {/* UTMs */}
          {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
            <>
              <Field label="UTM Source" value={lead.utmSource} />
              <Field label="UTM Medium" value={lead.utmMedium} />
              <Field label="UTM Campaign" value={lead.utmCampaign} />
            </>
          )}

          <Field label="Landing Page" value={lead.landingPage} />
          <Field label="IP" value={lead.ip} />

          {/* Any extra unknown keys */}
          {extraEntries.map(([k, v]) => (
            <Field key={k} label={k} value={String(v)} />
          ))}

          {/* Raw JSON */}
          <div style={{ gridColumn: '1 / -1' }}>
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
                Ver JSON bruto
              </summary>
              <pre style={{
                marginTop: '0.75rem',
                padding: '0.875rem',
                background: '#0f172a',
                color: '#83d2c7',
                borderRadius: '8px',
                fontSize: '0.75rem',
                overflowX: 'auto',
                lineHeight: '1.6',
              }}>
                {JSON.stringify(lead, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  const display = value == null || value === '' || value === undefined ? '—' : String(value);
  return (
    <div>
      <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '0.25rem' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', wordBreak: 'break-word' }}>
        {display}
      </p>
    </div>
  );
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'patient' | 'clinic'>('all');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { leads: Lead[]; total: number };
      setLeads(data.leads ?? []);
    } catch (err) {
      setError('Não foi possível carregar os leads. Verifique se o servidor está rodando.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchLeads(); }, [fetchLeads]);

  const filtered = leads.filter(l => {
    if (filter === 'patient' && l.tipoLead !== 'patient') return false;
    if (filter === 'clinic' && l.tipoLead !== 'clinic') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.nome?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.nomeClinica?.toLowerCase().includes(q) ||
        l.cidade?.toLowerCase().includes(q) ||
        l.whatsapp?.includes(q) ||
        l.telefone?.includes(q)
      );
    }
    return true;
  });

  const patientCount = leads.filter(l => l.tipoLead === 'patient').length;
  const clinicCount = leads.filter(l => l.tipoLead === 'clinic').length;

  function downloadCSV() {
    if (filtered.length === 0) return;
    const allKeys = Array.from(new Set(filtered.flatMap(l => Object.keys(l))));
    const header = allKeys.join(',');
    const rows = filtered.map(l =>
      allKeys.map(k => {
        const v = l[k];
        const s = v == null ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benavera-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      paddingTop: '5rem',
      paddingBottom: '4rem',
    }}>
      <div className="container-benavera">
        {/* Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#4040ca',
              background: '#e0eaff',
              padding: '0.25rem 0.75rem',
              borderRadius: '100px',
              marginBottom: '0.75rem',
            }}>
              Admin
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Leads recebidos
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9375rem' }}>
              Dados salvos localmente em <code style={{ background: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.8125rem' }}>data/leads.json</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => void fetchLeads()}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1rem', background: 'white', border: '1px solid #e2e8f0',
                borderRadius: '10px', fontSize: '0.875rem', fontWeight: '600', color: '#334155',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Atualizar
            </button>
            <button
              onClick={downloadCSV}
              disabled={filtered.length === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1rem', background: '#4040ca', border: 'none',
                borderRadius: '10px', fontSize: '0.875rem', fontWeight: '600', color: 'white',
                cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filtered.length === 0 ? 0.5 : 1, transition: 'all 0.15s ease',
              }}
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          {[
            { label: 'Total de leads', value: leads.length, color: '#4040ca', bg: '#f0f4ff' },
            { label: 'Pacientes', value: patientCount, color: '#309e92', bg: '#f0faf8' },
            { label: 'Clínicas', value: clinicCount, color: '#3535a3', bg: '#e0eaff' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.25rem',
            }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', fontWeight: '600', marginBottom: '0.375rem' }}>
                {stat.label}
              </p>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          alignItems: 'center',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={15} style={{
              position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, cidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 0.875rem 0.75rem 2.375rem',
                border: '1.5px solid #e2e8f0', borderRadius: '10px',
                fontSize: '0.9375rem', color: '#0f172a', background: 'white',
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: '0.375rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.25rem' }}>
            {(['all', 'patient', 'clinic'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: filter === f ? '#4040ca' : 'transparent',
                  color: filter === f ? 'white' : '#64748b',
                  fontWeight: filter === f ? '700' : '500',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {f === 'all' ? 'Todos' : f === 'patient' ? 'Pacientes' : 'Clínicas'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <p>Carregando leads...</p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '1.25rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: '#dc2626',
            fontSize: '0.9375rem',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#94a3b8' }}>
            <Inbox size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontWeight: '600', color: '#64748b', fontSize: '1.0625rem', margin: 0 }}>
              {search || filter !== 'all' ? 'Nenhum lead encontrado com esse filtro.' : 'Nenhum lead recebido ainda.'}
            </p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
              Preencha um formulário no site para ver os dados aqui.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
              Mostrando {filtered.length} de {leads.length} leads · Clique em um lead para ver detalhes
            </p>
            {filtered.map(lead => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
