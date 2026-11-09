'use client';
// src/components/AdminRepresentanteDetail.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { brl, pct, dataBR, periodoLabel, STATUS_COMISSAO, TIPO_COMISSAO } from './rep-format';
import type { Representante, DashboardData } from '@/lib/representantes-db';

interface Data {
  rep: Representante;
  clinicas: { vinculo_id: string; clinic_id: string; nome: string; cidade: string | null; estado: string | null; clinica_ativa: boolean; comissao_percent: number; periodo_meses: number | null; inicio: string; fim: string | null; vinculo_ativo: boolean; origem: string }[];
  comissoes: { id: string; tipo: string; status: string; base_valor: number; percent: number; valor: number; competencia: string | null; clinica: string }[];
  pagamentos: { id: string; total: number; observacao: string | null; comprovante_url: string | null; pago_em: string; pago_por: string | null }[];
  kpis: DashboardData['kpis'];
  clinicasDisponiveis: { id: string; nome: string; cnpj: string | null; ativa: boolean; representanteAtual: string | null }[];
}

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na operação.');
  return data;
}

export function AdminRepresentanteDetail({ data }: { data: Data }) {
  const router = useRouter();
  const { rep } = data;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [cond, setCond] = useState({
    comissao_percent: String(rep.comissao_percent), periodo_meses: rep.periodo_meses === null ? '' : String(rep.periodo_meses),
    bonus_ativacao: String(rep.bonus_ativacao), mensalidade_percent: String(rep.mensalidade_percent),
    telefone: rep.telefone ?? '', documento: rep.documento ?? '', chave_pix: rep.chave_pix ?? '',
  });
  const [vinc, setVinc] = useState({ clinicId: '', comissao_percent: '', periodo: 'default', periodo_meses: '', motivo: '' });
  const [busca, setBusca] = useState('');
  const [pag, setPag] = useState({ observacao: '', comprovanteUrl: '', pagoEm: new Date().toISOString().slice(0, 10) });

  const aReceber = data.comissoes.filter(c => c.status === 'A_RECEBER');
  const totalAReceber = data.kpis.comissaoAReceber;

  async function run(fn: () => Promise<string | void>) {
    setBusy(true); setMsg(null);
    try { const t = await fn(); setMsg({ ok: true, text: t || 'Salvo.' }); router.refresh(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro.' }); }
    finally { setBusy(false); }
  }

  const num = (s: string) => Number(s.replace(',', '.'));
  const disponiveis = data.clinicasDisponiveis.filter(c => !busca || `${c.nome} ${c.cnpj ?? ''}`.toLowerCase().includes(busca.toLowerCase())).slice(0, 100);

  return (
    <div>
      {msg && <div role="status" className="rep-card" style={{ marginBottom: 14, background: msg.ok ? '#ecfdf5' : '#fef2f2', borderColor: msg.ok ? '#a7f3d0' : '#fecaca', color: msg.ok ? '#065f46' : '#991b1b' }}>{msg.text}</div>}

      <div className="rep-grid rep-kpis">
        <div className="rep-card"><div className="rep-kpi-label">A receber</div><div className="rep-kpi-value" style={{ color: '#4338ca' }}>{brl(data.kpis.comissaoAReceber)}</div></div>
        <div className="rep-card"><div className="rep-kpi-label">Prevista</div><div className="rep-kpi-value">{brl(data.kpis.comissaoPrevista)}</div></div>
        <div className="rep-card"><div className="rep-kpi-label">Paga</div><div className="rep-kpi-value" style={{ color: '#047857' }}>{brl(data.kpis.comissaoPaga)}</div></div>
        <div className="rep-card"><div className="rep-kpi-label">Clínicas ativas</div><div className="rep-kpi-value">{data.kpis.clinicasAtivas}</div></div>
        <div className="rep-card"><div className="rep-kpi-label">Volume liberado</div><div className="rep-kpi-value">{brl(data.kpis.volumeLiberado)}</div></div>
      </div>

      {/* Condições */}
      <div className="rep-card" style={{ marginBottom: 18 }}>
        <h3>Condições padrão e dados</h3>
        <div className="rep-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          <div><label className="rep-label">Comissão (% do financiado)</label><input className="rep-input" value={cond.comissao_percent} onChange={e => setCond({ ...cond, comissao_percent: e.target.value })} /></div>
          <div><label className="rep-label">Período (meses; vazio = vitalício)</label><input className="rep-input" value={cond.periodo_meses} onChange={e => setCond({ ...cond, periodo_meses: e.target.value })} /></div>
          <div><label className="rep-label">Bônus por ativação (R$)</label><input className="rep-input" value={cond.bonus_ativacao} onChange={e => setCond({ ...cond, bonus_ativacao: e.target.value })} /></div>
          <div><label className="rep-label">% mensalidade (em breve)</label><input className="rep-input" value={cond.mensalidade_percent} onChange={e => setCond({ ...cond, mensalidade_percent: e.target.value })} /></div>
          <div><label className="rep-label">Telefone</label><input className="rep-input" value={cond.telefone} onChange={e => setCond({ ...cond, telefone: e.target.value })} /></div>
          <div><label className="rep-label">CPF / CNPJ</label><input className="rep-input" value={cond.documento} onChange={e => setCond({ ...cond, documento: e.target.value })} /></div>
          <div><label className="rep-label">Chave PIX ({rep.tipo_pix || 'n/d'})</label><input className="rep-input" value={cond.chave_pix} onChange={e => setCond({ ...cond, chave_pix: e.target.value })} /></div>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0 0' }}>Alterar o padrão vale para <strong>novos vínculos</strong>. Vínculos existentes mantêm as condições com que foram criados.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <button className="rep-btn" disabled={busy} onClick={() => run(async () => {
            await call(`/api/admin/representantes/${rep.id}`, 'PATCH', {
              comissao_percent: num(cond.comissao_percent), periodo_meses: cond.periodo_meses === '' ? null : Number(cond.periodo_meses),
              bonus_ativacao: num(cond.bonus_ativacao), mensalidade_percent: num(cond.mensalidade_percent),
              telefone: cond.telefone, documento: cond.documento, chave_pix: cond.chave_pix,
            });
            return 'Condições salvas.';
          })}>Salvar</button>
          <button className="rep-btn ghost" disabled={busy} onClick={() => run(async () => {
            await call(`/api/admin/representantes/${rep.id}`, 'PATCH', { ativo: !rep.ativo });
            return rep.ativo ? 'Representante desativado (acesso bloqueado).' : 'Representante reativado.';
          })}>{rep.ativo ? 'Desativar' : 'Reativar'}</button>
          <button className="rep-btn ghost" disabled={busy} onClick={() => {
            if (!confirm('Gerar nova senha temporária? A senha atual deixa de valer.')) return;
            run(async () => { const r = await call(`/api/admin/representantes/${rep.id}`, 'PATCH', { action: 'resetSenha' }); return `Nova senha temporária: ${r.senhaTemporaria}`; });
          }}>Redefinir senha</button>
        </div>
      </div>

      {/* Clínicas */}
      <div className="rep-card" style={{ marginBottom: 18 }}>
        <h3>Clínicas vinculadas</h3>
        {data.clinicas.length === 0 ? <div className="rep-empty">Nenhuma clínica vinculada.</div> : (
          <div className="rep-table-wrap"><table className="rep-table">
            <thead><tr><th>Clínica</th><th>Situação</th><th>% / período</th><th>Início</th><th>Fim</th><th>Origem</th><th></th></tr></thead>
            <tbody>{data.clinicas.map(c => (
              <tr key={c.vinculo_id} style={!c.vinculo_ativo ? { opacity: 0.55 } : undefined}>
                <td><div style={{ fontWeight: 700 }}>{c.nome}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{[c.cidade, c.estado].filter(Boolean).join(' / ')}</div></td>
                <td>{c.vinculo_ativo ? (c.clinica_ativa ? 'Ativa' : 'Em credenciamento') : 'Vínculo encerrado'}</td>
                <td>{pct(c.comissao_percent, 2)} · {periodoLabel(c.periodo_meses)}</td>
                <td>{dataBR(c.inicio)}</td>
                <td>{c.fim ? dataBR(c.fim) : 'Sem prazo'}</td>
                <td>{c.origem === 'CODIGO' ? 'Link' : 'Admin'}</td>
                <td>{c.vinculo_ativo && <button className="rep-btn danger small" disabled={busy} onClick={() => {
                  if (!confirm(`Desvincular ${c.nome}? Comissões já geradas são mantidas.`)) return;
                  run(async () => { await call(`/api/admin/representantes/${rep.id}/clinicas?clinicId=${c.clinic_id}`, 'DELETE'); return 'Clínica desvinculada.'; });
                }}>Desvincular</button>}</td>
              </tr>))}</tbody>
          </table></div>
        )}

        <h3 style={{ marginTop: 22 }}>Vincular / transferir clínica</h3>
        <div className="rep-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <div><label className="rep-label">Buscar clínica</label><input className="rep-input" placeholder="Nome ou CNPJ" value={busca} onChange={e => setBusca(e.target.value)} /></div>
          <div><label className="rep-label">Clínica</label>
            <select className="rep-input" value={vinc.clinicId} onChange={e => setVinc({ ...vinc, clinicId: e.target.value })}>
              <option value="">Selecione…</option>
              {disponiveis.map(c => <option key={c.id} value={c.id}>{c.nome}{c.representanteAtual ? ` (hoje: ${c.representanteAtual})` : ''}</option>)}
            </select></div>
          <div><label className="rep-label">% (vazio = padrão {pct(rep.comissao_percent, 2)})</label><input className="rep-input" value={vinc.comissao_percent} onChange={e => setVinc({ ...vinc, comissao_percent: e.target.value })} /></div>
          <div><label className="rep-label">Período</label>
            <select className="rep-input" value={vinc.periodo} onChange={e => setVinc({ ...vinc, periodo: e.target.value })}>
              <option value="default">Padrão ({periodoLabel(rep.periodo_meses)})</option>
              <option value="vitalicio">Vitalício</option>
              <option value="custom">Personalizado…</option>
            </select></div>
          {vinc.periodo === 'custom' && <div><label className="rep-label">Meses</label><input className="rep-input" inputMode="numeric" value={vinc.periodo_meses} onChange={e => setVinc({ ...vinc, periodo_meses: e.target.value })} /></div>}
          <div><label className="rep-label">Motivo</label><input className="rep-input" value={vinc.motivo} onChange={e => setVinc({ ...vinc, motivo: e.target.value })} /></div>
        </div>
        <button className="rep-btn" style={{ marginTop: 14 }} disabled={busy || !vinc.clinicId || !rep.ativo} onClick={() => run(async () => {
          await call(`/api/admin/representantes/${rep.id}/clinicas`, 'POST', {
            clinicId: vinc.clinicId,
            comissao_percent: vinc.comissao_percent === '' ? undefined : num(vinc.comissao_percent),
            periodo_meses: vinc.periodo === 'default' ? 'default' : vinc.periodo === 'vitalicio' ? '' : Number(vinc.periodo_meses),
            motivo: vinc.motivo,
          });
          setVinc({ clinicId: '', comissao_percent: '', periodo: 'default', periodo_meses: '', motivo: '' });
          return 'Clínica vinculada.';
        })}>Vincular</button>
      </div>

      {/* Pagamento */}
      <div className="rep-card" style={{ marginBottom: 18 }}>
        <h3>Registrar pagamento (controle manual)</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#475569' }}>
          {aReceber.length > 0 ? 'Há' : 'Não há'} comissões a receber · total <strong>{brl(totalAReceber)}</strong>. Ao registrar, todas passam para &quot;Paga&quot;.
        </p>
        <div className="rep-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <div><label className="rep-label">Data do pagamento</label><input type="date" className="rep-input" value={pag.pagoEm} onChange={e => setPag({ ...pag, pagoEm: e.target.value })} /></div>
          <div><label className="rep-label">Link do comprovante (opcional)</label><input className="rep-input" placeholder="https://…" value={pag.comprovanteUrl} onChange={e => setPag({ ...pag, comprovanteUrl: e.target.value })} /></div>
          <div><label className="rep-label">Observação</label><input className="rep-input" value={pag.observacao} onChange={e => setPag({ ...pag, observacao: e.target.value })} /></div>
        </div>
        <button className="rep-btn" style={{ marginTop: 14 }} disabled={busy || aReceber.length === 0} onClick={() => {
          if (!confirm(`Confirmar pagamento de ${brl(totalAReceber)} a ${rep.nome}?`)) return;
          run(async () => { const r = await call(`/api/admin/representantes/${rep.id}/pagamentos`, 'POST', pag); return `Pagamento de ${brl(r.total)} registrado.`; });
        }}>Marcar {brl(totalAReceber)} como pago</button>

        {data.pagamentos.length > 0 && (
          <div className="rep-table-wrap" style={{ marginTop: 16 }}><table className="rep-table">
            <thead><tr><th>Data</th><th>Valor</th><th>Observação</th><th>Por</th></tr></thead>
            <tbody>{data.pagamentos.map(p => <tr key={p.id}><td>{dataBR(p.pago_em)}</td><td style={{ fontWeight: 700 }}>{brl(p.total)}</td><td>{p.observacao || '—'}</td><td>{p.pago_por || '—'}</td></tr>)}</tbody>
          </table></div>
        )}
      </div>

      {/* Comissões */}
      <div className="rep-card">
        <h3>Comissões (últimas 300)</h3>
        {data.comissoes.length === 0 ? <div className="rep-empty">Sem comissões geradas.</div> : (
          <div className="rep-table-wrap"><table className="rep-table">
            <thead><tr><th>Competência</th><th>Clínica</th><th>Tipo</th><th>Base</th><th>%</th><th>Comissão</th><th>Status</th></tr></thead>
            <tbody>{data.comissoes.map(c => { const s = STATUS_COMISSAO[c.status]; return (
              <tr key={c.id}><td>{dataBR(c.competencia)}</td><td style={{ fontWeight: 600 }}>{c.clinica}</td><td>{TIPO_COMISSAO[c.tipo] ?? c.tipo}</td>
                <td>{c.tipo === 'BONUS' ? '—' : brl(c.base_valor)}</td><td>{c.tipo === 'BONUS' ? '—' : pct(c.percent, 2)}</td>
                <td style={{ fontWeight: 700 }}>{brl(c.valor)}</td>
                <td><span className="rep-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span></td></tr>); })}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
