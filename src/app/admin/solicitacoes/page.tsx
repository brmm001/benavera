'use client';
// app/admin/solicitacoes/page.tsx — Todas as solicitações, orçamentos digitais e simulações digitados pelas clínicas

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED: { label: 'Enviada', color: '#7c3aed', bg: '#f5f3ff' },
  PRE_ANALYSIS: { label: 'Pré-análise', color: '#d97706', bg: '#fffbeb' },
  INTERNAL_REVIEW: { label: 'Revisão interna', color: '#d97706', bg: '#fffbeb' },
  READY_FOR_LENDERS: { label: 'Pronta p/ fin.', color: '#7c3aed', bg: '#f5f3ff' },
  SUBMITTED_TO_LENDER: { label: 'Na financeira', color: '#7c3aed', bg: '#f5f3ff' },
  LENDER_ANALYSIS: { label: 'Análise fin.', color: '#7c3aed', bg: '#f5f3ff' },
  OFFERS_AVAILABLE: { label: 'Proposta disp.', color: '#0891b2', bg: '#ecfeff' },
  OFFER_SELECTED: { label: 'Opção escolhida', color: '#0891b2', bg: '#ecfeff' },
  CONTRACT_SIGNED: { label: 'Assinado', color: '#059669', bg: '#f0fdf4' },
  APPROVED: { label: 'Aprovado', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_SCHEDULED: { label: 'Repasse prog.', color: '#059669', bg: '#f0fdf4' },
  PAYOUT_COMPLETED: { label: 'Pago', color: '#059669', bg: '#f0fdf4' },
  DECLINED: { label: 'Recusado', color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
};

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'INTERNAL_REVIEW', label: 'Em análise' },
  { value: 'READY_FOR_LENDERS', label: 'Prontas p/ fin.' },
  { value: 'OFFERS_AVAILABLE', label: 'Proposta disp.' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'CONTRACT_SIGNED', label: 'Contratadas' },
  { value: 'PAYOUT_SCHEDULED', label: 'Repasse prog.' },
  { value: 'DECLINED', label: 'Recusadas' },
];

function AdminSolicitacoesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'propostas' ? 'propostas' : searchParams.get('tab') === 'simulacoes' ? 'simulacoes' : 'financiamentos';

  const [tab, setTab] = useState<'financiamentos' | 'propostas' | 'simulacoes'>(initialTab);
  const [apps, setApps] = useState<any[]>([]);
  const [digitalProposals, setDigitalProposals] = useState<any[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (search) params.set('search', search);
    params.set('limit', '150');

    const inputParams = new URLSearchParams();
    if (search) inputParams.set('search', search);

    const [appsRes, inputsRes] = await Promise.all([
      fetch(`/api/applications?${params}`, { cache: 'no-store' }),
      fetch(`/api/admin/clinic-inputs?${inputParams}`, { cache: 'no-store' }),
    ]);
    const appsData = await appsRes.json();
    const inputsData = await inputsRes.json();
    setApps(appsData.applications || []);
    setDigitalProposals(inputsData.digitalProposals || []);
    setSavedSimulations(inputsData.savedSimulations || []);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(fetchAll, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchAll, search]);

  const totalTratamento = apps.reduce((s, a) => s + Number(a.valor_tratamento || 0), 0);
  const totalFinanciado = apps.reduce((s, a) => s + Number(a.valor_financiado || 0), 0);

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800', color: '#1c1d4c' }}>
            Solicitações e Dados das Clínicas
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Visualize todos os valores e dados de pacientes digitados pelas clínicas em financiamentos, orçamentos digitais e simulações.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total tratamentos</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(totalTratamento)}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total financiado</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669' }}>{formatCurrency(totalFinanciado)}</div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { k: 'financiamentos' as const, label: `💳 Financiamentos (${apps.length})` },
          { k: 'propostas' as const, label: `📄 Orçamentos / Propostas Digitais (${digitalProposals.length})` },
          { k: 'simulacoes' as const, label: `🧮 Simulações Salvas (${savedSimulations.length})` },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
              background: tab === t.k ? '#fff' : 'transparent',
              color: tab === t.k ? '#1c1d4c' : '#64748b',
              boxShadow: tab === t.k ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Busca e filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por paciente, CPF, celular, e-mail, clínica, procedimento ou código…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', width: '380px', maxWidth: '100%', fontFamily: 'inherit', background: '#fff' }}
        />
        {tab === 'financiamentos' && FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: '7px 14px', borderRadius: '20px', background: filter === f.value ? '#6370f1' : 'white', color: filter === f.value ? 'white' : '#64748b', border: filter === f.value ? 'none' : '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SOLICITAÇÕES DE FINANCIAMENTO */}
      {tab === 'financiamentos' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
          ) : apps.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '15px' }}>Nenhuma solicitação encontrada.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Código / Data', 'Clínica', 'Paciente (dados digitados)', 'Tratamento', 'Valores digitados', 'Status', 'Ação'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app, i) => {
                    const st = STATUS_CONFIG[app.status] || { label: app.status, color: '#64748b', bg: '#f1f5f9' };
                    return (
                      <tr key={app.id} style={{ borderBottom: i < apps.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => router.push(`/admin/solicitacoes/${app.id}`)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#4040ca', fontFamily: 'monospace' }}>{app.protocol}</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>{formatDate(app.created_at)}</div>
                        </td>
                        <td style={{ padding: '12px 14px', minWidth: '150px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{app.clinic_nome || '—'}</div>
                          {app.creator_name && <div style={{ fontSize: '11.5px', color: '#64748b' }}>Digitado por {app.creator_name}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', minWidth: '220px' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1c1d4c' }}>{app.patient_nome || '—'}</div>
                          <div style={{ fontSize: '12px', color: '#334155', fontFamily: 'monospace' }}>
                            CPF: {app.patient_cpf || '—'}
                            {app.patient_nasc ? ` · Nasc.: ${new Date(app.patient_nasc).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {[app.patient_celular, app.patient_email].filter(Boolean).join(' · ') || 'Sem contato'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', minWidth: '160px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{app.procedimento || '—'}</div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{app.categoria || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>
                            Financiado: {formatCurrency(app.valor_financiado)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            Tratamento: <strong>{formatCurrency(app.valor_tratamento)}</strong>
                          </div>
                          {Number(app.entrada || 0) > 0 && (
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                              Entrada: {formatCurrency(app.entrada)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '13px', color: '#6370f1', fontWeight: '700' }}>Detalhes →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROPOSTAS DIGITAIS / ORÇAMENTOS DAS CLÍNICAS */}
      {tab === 'propostas' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
          ) : digitalProposals.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center', color: '#64748b' }}>Nenhum orçamento digital criado pelas clínicas ainda.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafafa', textAlign: 'left', color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Data</th>
                    <th style={{ padding: '12px 14px' }}>Clínica</th>
                    <th style={{ padding: '12px 14px' }}>Paciente (dados digitados)</th>
                    <th style={{ padding: '12px 14px' }}>Procedimentos / Condições</th>
                    <th style={{ padding: '12px 14px' }}>Valores digitados</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {digitalProposals.map((dp: any) => {
                    const procs = Array.isArray(dp.procedimentos) ? dp.procedimentos : [];
                    return (
                      <tr key={dp.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '12px' }}>{formatDate(dp.created_at)}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{dp.clinic_nome || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#1c1d4c' }}>{dp.patient_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{[dp.patient_phone, dp.patient_email].filter(Boolean).join(' · ') || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                          {procs.length > 0 ? procs.map((pr: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '12px', color: '#334155' }}>
                              • {pr.nome || pr.descricao || 'Procedimento'} ({pr.qtd || 1}x {formatCurrency(pr.valor)})
                            </div>
                          )) : '—'}
                          {dp.condicoes && <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>Cond.: {dp.condicoes}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669' }}>Total: {formatCurrency(dp.total)}</div>
                          {Number(dp.desconto || 0) > 0 && (
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                              Subtotal: {formatCurrency(dp.subtotal)} · Desc.: -{formatCurrency(dp.desconto)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '14px', fontSize: '11.5px', fontWeight: 700, background: '#eef2ff', color: '#4040ca' }}>
                            {dp.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SIMULAÇÕES SALVAS PELAS CLÍNICAS */}
      {tab === 'simulacoes' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Carregando…</div>
          ) : savedSimulations.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center', color: '#64748b' }}>Nenhuma simulação salva pelas clínicas ainda.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fafafa', textAlign: 'left', color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Data</th>
                    <th style={{ padding: '12px 14px' }}>Clínica</th>
                    <th style={{ padding: '12px 14px' }}>Paciente</th>
                    <th style={{ padding: '12px 14px' }}>Valor simulado</th>
                    <th style={{ padding: '12px 14px' }}>Parcelamento</th>
                    <th style={{ padding: '12px 14px' }}>Repasse est.</th>
                    <th style={{ padding: '12px 14px' }}>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {savedSimulations.map((sim: any) => (
                    <tr key={sim.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '12px' }}>{formatDate(sim.created_at)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>{sim.clinic_nome || '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1c1d4c' }}>{sim.patient_name || 'Simulação rápida'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(sim.valor)}</td>
                      <td style={{ padding: '12px 14px' }}>{sim.parcelas}x de {formatCurrency(sim.valor_parcela)} ({Number(sim.taxa_mensal || 0).toFixed(2)}% a.m.)</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669' }}>{formatCurrency(sim.repasse_liquido)}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>{sim.notas || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSolicitacoesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', color: '#94a3b8' }}>Carregando…</div>}>
      <AdminSolicitacoesContent />
    </Suspense>
  );
}
