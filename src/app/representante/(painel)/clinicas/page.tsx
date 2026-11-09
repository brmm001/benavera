// Clínicas indicadas pelo representante: performance individual e prazo de comissionamento
import { getRepresentanteSession, getDashboard, parsePeriodo } from '@/lib/representantes-db';
import { brl, pct, dataBR, periodoLabel } from '@/components/rep-format';

export const dynamic = 'force-dynamic';

const PERIODOS = [
  { v: '30d', l: '30 dias' }, { v: '90d', l: '90 dias' }, { v: '12m', l: '12 meses' }, { v: 'all', l: 'Tudo' },
];

export default async function RepresentanteClinicas({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const ctx = await getRepresentanteSession();
  if (!ctx) return null;
  const sp = await searchParams;
  const periodo = parsePeriodo(sp.periodo === undefined ? 'all' : sp.periodo);
  const { ranking } = await getDashboard(ctx.rep.id, periodo);
  const now = Date.now();

  return (
    <div className="rep-page">
      <h1 className="rep-h1">Minhas clínicas</h1>
      <p className="rep-sub">Clínicas cadastradas em seu nome, desempenho e prazo de comissionamento de cada uma.</p>

      <div className="rep-filters">
        {PERIODOS.map(p => (
          <a key={p.v} href={`/representante/clinicas?periodo=${p.v}`} className={`rep-chip ${periodo === p.v ? 'on' : ''}`}>{p.l}</a>
        ))}
      </div>

      <div className="rep-card">
        {ranking.length === 0 ? <div className="rep-empty">Nenhuma clínica vinculada ainda.</div> : (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead>
                <tr><th>Clínica</th><th>Situação</th><th>Propostas</th><th>Aprovadas</th><th>Volume solicitado</th><th>Comissão gerada</th><th>% / período</th><th>Comissionamento até</th><th>Última atividade</th></tr>
              </thead>
              <tbody>
                {ranking.map(c => {
                  const fim = c.fimVinculo ? new Date(c.fimVinculo) : null;
                  const diasRestantes = fim ? Math.ceil((fim.getTime() - now) / 86400000) : null;
                  const encerrado = !c.vinculoAtivo || (diasRestantes !== null && diasRestantes < 0);
                  return (
                    <tr key={c.clinicId} style={encerrado ? { opacity: 0.6 } : undefined}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{c.nome}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{[c.cidade, c.estado].filter(Boolean).join(' / ') || '—'}</div>
                      </td>
                      <td>
                        <span className="rep-badge" style={c.ativa ? { color: '#047857', background: '#d1fae5' } : { color: '#b45309', background: '#fef3c7' }}>
                          {c.ativa ? 'Ativa' : 'Em credenciamento'}
                        </span>
                      </td>
                      <td>{c.propostas}</td>
                      <td>{c.aprovadas}</td>
                      <td>{brl(c.volume)}</td>
                      <td style={{ fontWeight: 700 }}>{brl(c.comissao)}</td>
                      <td>{pct(c.percent, 2)} · {periodoLabel(c.periodoMeses)}</td>
                      <td>
                        {!c.vinculoAtivo ? <span style={{ color: '#94a3b8' }}>Encerrado</span>
                          : fim === null ? 'Sem prazo'
                          : <>{dataBR(c.fimVinculo)}<div style={{ fontSize: 12, color: diasRestantes! < 0 ? '#ef4444' : diasRestantes! <= 30 ? '#b45309' : '#94a3b8' }}>
                              {diasRestantes! < 0 ? 'encerrado' : `${diasRestantes} dias restantes`}</div></>}
                      </td>
                      <td>
                        {c.ultimaAtividade ? dataBR(c.ultimaAtividade) : '—'}
                        {c.ativa && (c.diasSemAtividade === null || c.diasSemAtividade > 30) && (
                          <div style={{ fontSize: 12, color: '#b45309' }}>⚠ inativa</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

