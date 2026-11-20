'use client';
import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

interface Props {
  openRecoveryCount: number;
  openRecoveryValue: number;
  pendingTasksCount: number;
  stalledDealsCount: number;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function AssistenteClient({ openRecoveryCount, openRecoveryValue, pendingTasksCount, stalledDealsCount }: Props) {
  const [paciente, setPaciente] = useState('Carlos');
  const [procedimento, setProcedimento] = useState('Implante dentário');
  const [objetivo, setObjetivo] = useState('recuperar');
  const [copied, setCopied] = useState(false);

  const generated =
    objetivo === 'recuperar'
      ? `Olá ${paciente}! Tudo bem? Aqui é da clínica. Lembramos do seu orçamento para ${procedimento}. Caso o valor à vista tenha sido um obstáculo, podemos simular opções de parcelamento sem comprometer o limite do cartão (sujeito à análise de crédito). Quer que eu te envie os detalhes?`
      : objetivo === 'docs'
      ? `Olá ${paciente}! Para avançarmos com a análise do seu ${procedimento}, falta apenas o envio do documento pelo link seguro da Benavera. Se precisar de ajuda para enviar, estou por aqui!`
      : `Olá ${paciente}! Passando para saber se ficou alguma dúvida sobre o plano de ${procedimento}. Podemos conversar hoje para encontrar a melhor forma de viabilizar seu tratamento.`;

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Assistente Comercial</h1>
          <p className="bv-subtitle">Priorização inteligente do dia e sugestões de abordagem — sem compartilhar dados sensíveis externamente e sem decisões automáticas de crédito.</p>
        </div>
      </div>

      <div className="bv-grid bv-cols-3">
        <div className="bv-card"><div className="bv-label">Orçamentos para recuperar</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#4040ca' }}>{openRecoveryCount} ({brl(openRecoveryValue)})</div></div>
        <div className="bv-card"><div className="bv-label">Negociações em andamento</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#b45309' }}>{stalledDealsCount}</div></div>
        <div className="bv-card"><div className="bv-label">Tarefas pendentes na agenda</div><div style={{ fontSize: '24px', fontWeight: '800', color: '#1c1d4c' }}>{pendingTasksCount}</div></div>
      </div>

      <div className="bv-grid bv-cols-2">
        <div className="bv-card" style={{ display: 'grid', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#4040ca" /> Gerar sugestão de mensagem
          </h3>
          <div><label className="bv-label">Primeiro nome do paciente</label><input className="bv-input" value={paciente} onChange={(e) => setPaciente(e.target.value)} /></div>
          <div><label className="bv-label">Procedimento</label><input className="bv-input" value={procedimento} onChange={(e) => setProcedimento(e.target.value)} /></div>
          <div>
            <label className="bv-label">Objetivo</label>
            <select className="bv-select" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
              <option value="recuperar">Recuperar orçamento não fechado</option>
              <option value="docs">Lembrar envio de documentos</option>
              <option value="followup">Follow-up pós-consulta</option>
            </select>
          </div>
        </div>

        <div className="bv-card" style={{ background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <div className="bv-label">Sugestão pronta para WhatsApp</div>
            <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: 1.65, color: '#1e293b', background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              {generated}
            </p>
          </div>
          <button type="button" className="bv-btn" onClick={() => { navigator.clipboard.writeText(generated); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar mensagem</>}
          </button>
        </div>
      </div>
    </div>
  );
}
