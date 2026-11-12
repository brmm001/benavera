import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getAcquisitionReport } from '@/lib/acquisition-db';
import { AcquisitionTools } from '@/components/AcquisitionTools';

export const metadata = { title: 'Aquisição e GEO', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
function Table({ headings, rows }: { headings: string[]; rows: React.ReactNode[][] }) {
  return <div style={{ overflowX: 'auto' }}><table className="acquisition-table"><thead><tr>{headings.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>) : <tr><td colSpan={headings.length}>Ainda não há registros neste período. A coleta começa após a publicação e o consentimento do visitante.</td></tr>}</tbody></table></div>;
}
export default async function Page({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const session = await getSession();
  if (!session || !['BENAVERA_ADMIN', 'BENAVERA_ANALYST'].includes(session.role)) redirect('/login');
  const query = await searchParams;
  const days = [7, 30, 90].includes(Number(query.dias)) ? Number(query.dias) : 30;
  const report = await getAcquisitionReport(days);
  const sessions = report.channels.reduce((sum, r) => sum + Number(r.sessions), 0);
  const views = report.events.find(e => e.event_name === 'page_view')?.total || 0;
  const whatsapp = report.events.find(e => e.event_name === 'whatsapp_clicked')?.total || 0;
  const brl = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <div style={{ padding: 'clamp(16px,3vw,36px)', maxWidth: 1500 }}>
    <h1 style={{ fontSize: 28, fontWeight: 800 }}>Aquisição e GEO</h1>
    <p style={{ margin: '12px 0 20px', color: '#475569' }}>Origem dos acessos, ações no site e resultados comerciais atribuídos.</p>
    <nav aria-label="Período" style={{ display: 'flex', gap: 16, marginBottom: 24 }}>{[7,30,90].map(n => <Link key={n} href={`?dias=${n}`} aria-current={n === days ? 'page' : undefined} style={{ fontWeight: n === days ? 800 : 400 }}>{n} dias</Link>)}<a href={`/api/admin/acquisition?dias=${days}&format=csv`}>Baixar CSV</a></nav>
    <div className="acquisition-kpis">{[['Sessões', sessions], ['Páginas vistas', views], ['Cliques no WhatsApp', whatsapp]].map(([label, value]) => <div className="acquisition-card" key={String(label)}><p>{label}</p><strong style={{ fontSize: 32 }}>{Number(value).toLocaleString('pt-BR')}</strong></div>)}</div>
    <section className="acquisition-card"><h2>De onde vêm as visitas</h2><Table headings={['Canal','Sessões','Visitantes identificados por cookie']} rows={report.channels.map(r => [String(r.channel),Number(r.sessions),Number(r.visitors)])} /></section>
    <section className="acquisition-card"><h2>Da origem ao resultado comercial</h2><p>Coorte de cadastros nos últimos {days} dias; resultados comerciais acumulados até agora. Atribuição ao último contato identificável. As etapas se sobrepõem: não some leads e cadastros como pessoas distintas.</p><Table headings={['Canal','Leads','Cadastros de clínicas','Clínicas ativas','Financiamentos liberados','Volume liberado']} rows={report.funnel.map(r => [String(r.channel),Number(r.leads),Number(r.registrations),Number(r.active_clinics),Number(r.financed),brl(r.volume)])} /></section>
    <section className="acquisition-card"><h2>Campanhas e páginas de entrada</h2><Table headings={['Origem','Campanha','Entrada','Sessões']} rows={report.campaigns.map(r => [String(r.source),String(r.campaign || '—'),String(r.landing),Number(r.sessions)])} /></section>
    <section className="acquisition-card"><h2>Ações no site</h2><Table headings={['Evento','Quantidade']} rows={report.events.map(r => [String(r.event_name),Number(r.total)])} /></section>
    <section className="acquisition-card"><h2>Como interpretar</h2><ul style={{ listStyle: 'disc', paddingLeft: 20, lineHeight: 1.8 }}>
      <li>A coleta depende de consentimento, cookies e disponibilidade do navegador. Não representa todos os visitantes.</li>
      <li>ChatGPT é identificado por referência ou UTM. Visitas sem esses sinais ficam em direto / não identificado. Uma citação sem clique não aparece nas visitas.</li>
      <li>WhatsApp mede o clique; conversa, orçamento fechado e pagamento exigem registro no sistema. Não contamos um clique como venda.</li>
      <li>Financiamento liberado exige que o sistema registre o repasse concluído ou o tratamento liberado. O volume é de tratamentos, não receita líquida da Benavera.</li>
      <li>As primeiras e últimas origens ficam vinculadas ao cadastro, sem enviar nomes, telefones, valores de tratamento ou documentos aos serviços de marketing.</li>
      <li>GA4: {process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ? 'identificador configurado; valide a recepção na propriedade Google.' : 'não há propriedade configurada. Este painel coleta diretamente no banco da Benavera.'} Search Console e Bing Webmaster Tools precisam de acesso às respectivas contas.</li>
    </ul></section>
    <AcquisitionTools />
    <section className="acquisition-card"><h2>Observações de presença em IA</h2><Table headings={['Data','Assistente','Pergunta','Benavera','Capim','URL citada']} rows={report.geo.map(r => [new Date(String(r.observed_at)).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),String(r.engine),String(r.prompt),r.benavera_mentioned ? 'Sim' : 'Não',r.capim_mentioned ? 'Sim' : 'Não',String(r.source_url || '—')])} /></section>
  </div>;
}
