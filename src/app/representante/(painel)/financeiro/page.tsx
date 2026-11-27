// Financeiro do representante: extrato de comissões e pagamentos recebidos
import { getRepresentanteSession, listComissoes, listPagamentos, syncComissoes } from '@/lib/representantes-db';
import { brl, pct, dataBR, STATUS_COMISSAO, TIPO_COMISSAO } from '@/components/rep-format';

export const dynamic = 'force-dynamic';

const FILTROS = [
  { v: 'all', l: 'Todas' }, { v: 'PREVISTA', l: 'Previstas' }, { v: 'A_RECEBER', l: 'A receber' },
  { v: 'PAGA', l: 'Pagas' }, { v: 'CANCELADA', l: 'Canceladas' },
];

const TIPOS = [
  { v: 'all', l: 'Todos os tipos' },
  { v: 'MENSALIDADE', l: 'Mensalidades SaaS' },
  { v: 'FINANCIAMENTO', l: 'Financiamentos' },
  { v: 'BONUS', l: 'Bônus' },
];

export default async function RepresentanteFinanceiro({ searchParams }: { searchParams: Promise<{ status?: string; tipo?: string }> }) {
  const ctx = await getRepresentanteSession();
  if (!ctx) return null;
  const sp = await searchParams;
  const status = FILTROS.some(f => f.v === sp.status) ? sp.status! : 'all';
  const tipo = TIPOS.some(t => t.v === sp.tipo) ? sp.tipo! : 'all';

  await syncComissoes(ctx.rep.id);
  const [todas, comissoes, pagamentos] = await Promise.all([
    listComissoes(ctx.rep.id, 'all', 'all'),
    listComissoes(ctx.rep.id, status, tipo),
    listPagamentos(ctx.rep.id),
  ]);
  const soma = (st: string) => todas.filter(c => c.status === st).reduce((s, c) => s + c.valor, 0);
  const somaTipo = (tp: string, st?: string) =>
    todas.filter(c => c.tipo === tp && (st ? c.status === st : c.status !== 'CANCELADA')).reduce((s, c) => s + c.valor, 0);

  return (
    <div className="rep-page">
      <h1 className="rep-h1">Financeiro</h1>
      <p className="rep-sub">
        Extrato separado de comissões e pagamentos. Regras padrão: <strong>{pct(ctx.rep.comissao_percent, 2)}</strong> sobre financiamentos
        {ctx.rep.mensalidade_percent > 0 && <> · <strong>{pct(ctx.rep.mensalidade_percent, 2)}</strong> sobre mensalidades SaaS pagas</>}.
      </p>

      <div className="rep-grid rep-kpis">
        <div className="rep-card"><div className="rep-kpi-label">A receber (total)</div><div className="rep-kpi-value" style={{ color: '#4338ca' }}>{brl(soma('A_RECEBER'))}</div></div>
        <div className="rep-card"><div className="rep-kpi-label">Mensalidades SaaS</div><div className="rep-kpi-value" style={{ color: '#059669' }}>{brl(somaTipo('MENSALIDADE'))}</div><div className="rep-kpi-hint">A receber: {brl(somaTipo('MENSALIDADE', 'A_RECEBER'))} · Paga: {brl(somaTipo('MENSALIDADE', 'PAGA'))}</div></div>
        <div className="rep-card"><div className="rep-kpi-label">Financiamentos</div><div className="rep-kpi-value" style={{ color: '#1d4ed8' }}>{brl(somaTipo('FINANCIAMENTO'))}</div><div className="rep-kpi-hint">A receber: {brl(somaTipo('FINANCIAMENTO', 'A_RECEBER'))} · Paga: {brl(somaTipo('FINANCIAMENTO', 'PAGA'))}</div></div>
        <div className="rep-card"><div className="rep-kpi-label">Já recebido</div><div className="rep-kpi-value" style={{ color: '#047857' }}>{brl(soma('PAGA'))}</div><div className="rep-kpi-hint">Prevista: {brl(soma('PREVISTA'))}</div></div>
      </div>

      <div className="rep-card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Extrato de comissões</h3>
          <a className="rep-btn ghost small" style={{ textDecoration: 'none' }} href={`/api/representante/comissoes/export?status=${status}&tipo=${tipo}`}>⬇ Exportar CSV</a>
        </div>
        <div className="rep-filters" style={{ marginBottom: 8 }}>
          {TIPOS.map(t => <a key={t.v} href={`/representante/financeiro?status=${status}&tipo=${t.v}`} className={`rep-chip ${tipo === t.v ? 'on' : ''}`}>{t.l}</a>)}
        </div>
        <div className="rep-filters">
          {FILTROS.map(f => <a key={f.v} href={`/representante/financeiro?status=${f.v}&tipo=${tipo}`} className={`rep-chip ${status === f.v ? 'on' : ''}`}>{f.l}</a>)}
        </div>
        {comissoes.length === 0 ? <div className="rep-empty">Nenhuma comissão neste filtro.</div> : (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead><tr><th>Competência</th><th>Clínica</th><th>Tipo</th><th>Base</th><th>%</th><th>Comissão</th><th>Status</th></tr></thead>
              <tbody>
                {comissoes.map(c => {
                  const s = STATUS_COMISSAO[c.status];
                  const bonus = c.tipo === 'BONUS';
                  return (
                    <tr key={c.id}>
                      <td>{dataBR(c.competencia)}</td>
                      <td style={{ fontWeight: 600 }}>{c.clinica}</td>
                      <td>{TIPO_COMISSAO[c.tipo] ?? c.tipo}</td>
                      <td>{bonus ? '—' : brl(c.base_valor)}</td>
                      <td>{bonus ? '—' : pct(c.percent, 2)}</td>
                      <td style={{ fontWeight: 700 }}>{brl(c.valor)}</td>
                      <td><span className="rep-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rep-card">
        <h3>Pagamentos recebidos</h3>
        {pagamentos.length === 0 ? <div className="rep-empty">Nenhum pagamento registrado ainda.</div> : (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead><tr><th>Data</th><th>Valor</th><th>Observação</th><th>Comprovante</th></tr></thead>
              <tbody>
                {pagamentos.map(p => (
                  <tr key={p.id}>
                    <td>{dataBR(p.pago_em)}</td>
                    <td style={{ fontWeight: 700 }}>{brl(p.total)}</td>
                    <td>{p.observacao || '—'}</td>
                    <td>{p.comprovante_url ? <a href={p.comprovante_url} target="_blank" rel="noopener noreferrer" style={{ color: '#047857', fontWeight: 600 }}>Ver</a> : '—'}</td>
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

