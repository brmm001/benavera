'use client';
import { useEffect, useState } from 'react';
import { Megaphone, Copy, Check } from 'lucide-react';

interface Campaign {
  id: string;
  titulo: string;
  tipo: string;
  segmento: string;
  conteudo: string;
  opt_out_respeitado: boolean;
  created_at: string;
}

const TEMPLATES = [
  {
    titulo: 'Reativação de orçamentos pendentes',
    tipo: 'reativacao',
    conteudo: 'Olá {nome}! Aqui é da clínica. Passando para lembrar do seu plano de tratamento. Hoje contamos com opções de parcelamento facilitado (sujeito à análise de crédito). Se preferir não receber mensagens, é só responder SAIR.',
  },
  {
    titulo: 'Comunicado de novas opções de pagamento',
    tipo: 'comunicado',
    conteudo: 'Novidade na clínica: agora você pode consultar alternativas de parcelamento para seu tratamento sem comprometer o limite do cartão, sujeito à análise. Fale com nossa equipe!',
  },
];

export function CampanhasClient() {
  const [list, setList] = useState<Campaign[]>([]);
  const [eligible, setEligible] = useState(0);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('whatsapp');
  const [conteudo, setConteudo] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/painel/campanhas');
    const data = await res.json();
    if (res.ok) {
      setList(data.campaigns || []);
      setEligible(data.eligibleRecoveryCount || 0);
    }
  }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/painel/campanhas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, tipo, conteudo, opt_out_respeitado: true }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || 'Erro ao salvar.'); return; }
    setTitulo('');
    setConteudo('');
    load();
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Campanhas e Mensagens</h1>
          <p className="bv-subtitle">Crie modelos editáveis de WhatsApp e comunicados respeitando opt-out e regras de conformidade ({eligible} contatos elegíveis em recuperação).</p>
        </div>
      </div>

      <div className="bv-grid bv-cols-2">
        <form onSubmit={save} className="bv-card" style={{ display: 'grid', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={16} color="#4040ca" /> Novo modelo / campanha
          </h3>
          {err && <div className="bv-card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626', fontSize: '12px', padding: '10px' }}>{err}</div>}
          <div><label className="bv-label">Título *</label><input className="bv-input" required value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div>
            <label className="bv-label">Tipo</label>
            <select className="bv-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="whatsapp">Mensagem WhatsApp</option>
              <option value="reativacao">Reativação de orçamentos</option>
              <option value="comunicado">Comunicado / divulgação</option>
            </select>
          </div>
          <div><label className="bv-label">Texto da mensagem *</label><textarea className="bv-textarea" rows={4} required value={conteudo} onChange={(e) => setConteudo(e.target.value)} /></div>
          <button className="bv-btn">Salvar modelo</button>
        </form>

        <div className="bv-card">
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Modelos prontos (conformidade OK)</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {TEMPLATES.map((t, i) => (
              <div key={i} style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>{t.titulo}</div>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{t.conteudo}</p>
                <button type="button" className="bv-btn soft sm" onClick={() => { setTitulo(t.titulo); setTipo(t.tipo); setConteudo(t.conteudo); }}>
                  Usar modelo
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bv-card">
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800' }}>Campanhas salvas</h3>
        {list.length === 0 ? <div className="bv-empty">Nenhuma campanha salva ainda.</div> : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {list.map((c) => (
              <div key={c.id} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{c.titulo} <span className="bv-badge" style={{ background: '#eef2ff', color: '#4040ca', marginLeft: '6px' }}>{c.tipo}</span></div>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>{c.conteudo}</p>
                </div>
                <button type="button" className="bv-btn ghost sm" onClick={() => { navigator.clipboard.writeText(c.conteudo); setCopied(c.id); setTimeout(() => setCopied(null), 2000); }}>
                  {copied === c.id ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
