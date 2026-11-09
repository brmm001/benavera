// Dashboard de performance do representante
import { getRepresentanteSession, getDashboard, parsePeriodo } from '@/lib/representantes-db';
import { brl, pct, dataBR, STATUS_COMISSAO, TIPO_COMISSAO } from '@/components/rep-format';
import {
  ComissaoMensalChart, VolumeMensalChart, FunilChart, StatusPieChart, ProcedimentoChart, RankingChart,
} from '@/components/RepresentanteCharts';

export const dynamic = 'force-dynamic';

const PERIODOS = [
  { v: '30d', l: '30 dias' }, { v: '90d', l: '90 dias' }, { v: '12m', l: '12 meses' }, { v: 'all', l: 'Tudo' },
];

function Kpi({ label, value, hint, color }: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <div className="rep-card">
      <div className="rep-kpi-label">{label}</div>
      <div className="rep-kpi-value" style={color ? { color } : undefined}>{value}</div>
      {hint && <div className="rep-kpi-hint">{hint}</div>}
    </div>
  );
}

export default async function RepresentanteDashboard({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const ctx = await getRepresentanteSession();
  if (!ctx) return null;
  const sp = await searchParams;
  const periodo = parsePeriodo(sp.periodo);
  const d = await getDashboard(ctx.rep.id, periodo);
  const k = d.kpis;
  const semClinicas = k.clinicasTotal === 0 && d.ranking.length === 0;

  return (
    <div className="rep-page">
      <h1 className="rep-h1">Olá, {ctx.rep.nome.split(' ')[0]} 👋</h1>
      <p className="rep-sub">Performance das clínicas indicadas por você e sua renda em comissões.</p>

      <div className="rep-filters">
        {PERIODOS.map(p => (
          <a key={p.v} href={`/representante?periodo=${p.v}`} className={`rep-chip ${periodo === p.v ? 'on' : ''}`}>{p.l}</a>
        ))}
      </div>

      {semClinicas && (
        <div className="rep-card" style={{ marginBottom: 18, background: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <strong>Você ainda não tem clínicas vinculadas.</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#065f46' }}>
            Compartilhe seu link de indicação (aba <a href="/representante/perfil" style={{ color: '#047857', fontWeight: 700 }}>Perfil &amp; link</a>) para começar a acompanhar suas comissões.
          </p>
        </div>
      )}

      <div className="rep-grid rep-kpis">
        <Kpi label="Comissão a receber" value={brl(k.comissaoAReceber)} hint="Repasses concluídos, aguardando pagamento" color="#4338ca" />
        <Kpi label="Comissão paga" value={brl(k.comissaoPaga)} hint="Total já recebido" color="#047857" />
        <Kpi label="Comissão prevista" value={brl(k.comissaoPrevista)} hint="Repasses ainda em andamento" color="#b45309" />
        <Kpi label="Comissão no mês" value={brl(k.comissaoMesAtual)} hint={`Total acumulado: ${brl(k.comissaoTotal)}`} />
      </div>

      <div className="rep-grid rep-kpis">
        <Kpi label="Clínicas ativas" value={`${k.clinicasAtivas}`} hint={`${k.clinicasEmCredenciamento} em credenciamento · ${k.clinicasTotal} no total`} />
        <Kpi label="Propostas" value={`${k.propostas}`} hint={`${k.liberadas} liberadas · ${k.recusadas} recusadas`} />
        <Kpi label="Volume solicitado" value={brl(k.volumeSolicitado)} hint={`Liberado: ${brl(k.volumeLiberado)}`} />
        <Kpi label="Ticket médio" value={brl(k.ticketMedio)} />
        <Kpi label="Taxa de aprovação" value={pct(k.taxaAprovacao)} hint="Aprovadas ÷ (aprovadas + recusadas)" />
        <Kpi label="Conversão em liberação" value={pct(k.taxaConversao)} hint="Liberadas ÷ propostas" />
      </div>

      {k.clinicasInativasHa30d > 0 && (
        <div className="rep-card" style={{ marginBottom: 18, background: '#fffbeb', borderColor: '#fde68a' }}>
          ⚠️ <strong>{k.clinicasInativasHa30d}</strong> {k.clinicasInativasHa30d === 1 ? 'clínica ativa está' : 'clínicas ativas estão'} há mais de 30 dias sem enviar propostas. Veja em <a href="/representante/clinicas" style={{ fontWeight: 700 }}>Minhas clínicas</a>.
        </div>
      )}

      <div className="rep-grid rep-two">
        <div className="rep-card"><h3>Comissão por mês (12 meses)</h3><ComissaoMensalChart data={d.serieMensal} /></div>
        <div className="rep-card"><h3>Funil de propostas</h3><FunilChart data={d.funil} /></div>
      </div>

      <div className="rep-grid rep-two">
        <div className="rep-card"><h3>Volume e propostas por mês</h3><VolumeMensalChart data={d.serieMensal} /></div>
        <div className="rep-card"><h3>Status das propostas</h3><StatusPieChart data={d.statusDistribuicao} /></div>
      </div>

      <div className="rep-grid rep-two-eq">
        <div className="rep-card"><h3>Clínicas que mais geram comissão</h3><RankingChart data={d.ranking} /></div>
        <div className="rep-card"><h3>Volume por procedimento</h3><ProcedimentoChart data={d.porProcedimento} /></div>
      </div>

      <div className="rep-card">
        <h3>Últimas comissões</h3>
        {d.ultimasComissoes.length === 0 ? <div className="rep-empty">Nenhuma comissão registrada ainda.</div> : (
          <div className="rep-table-wrap">
            <table className="rep-table">
              <thead><tr><th>Competência</th><th>Clínica</th><th>Tipo</th><th>Base</th><th>%</th><th>Comissão</th><th>Status</th></tr></thead>
              <tbody>
                {d.ultimasComissoes.map(c => {
                  const s = STATUS_COMISSAO[c.status];
                  return (
                    <tr key={c.id}>
                      <td>{dataBR(c.competencia)}</td>
                      <td style={{ fontWeight: 600 }}>{c.clinica}</td>
                      <td>{TIPO_COMISSAO[c.tipo] ?? c.tipo}</td>
                      <td>{c.tipo === 'BONUS' ? '—' : brl(c.base_valor)}</td>
                      <td>{c.tipo === 'BONUS' ? '—' : pct(c.percent, 2)}</td>
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
    </div>
  );
}

