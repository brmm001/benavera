'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SITE_URL } from '@/lib/seo';

export function AcquisitionTools() {
  const router = useRouter();
  const [source, setSource] = useState('google');
  const [medium, setMedium] = useState('cpc');
  const [campaign, setCampaign] = useState('clinicas');
  const [representative, setRepresentative] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const params = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: campaign });
  if (representative) params.set('ref', representative);
  const link = `${SITE_URL}/${representative ? 'credenciamento' : 'clinicas'}?${params}`;
  async function saveObservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/admin/acquisition/geo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        engine: data.get('engine'), prompt: data.get('prompt'), sourceUrl: data.get('sourceUrl'),
        benavera: data.get('benavera') === 'on', capim: data.get('capim') === 'on',
      }) });
      if (!response.ok) throw new Error();
      setMessage('Observação registrada.'); form.reset(); router.refresh();
    } catch { setMessage('Não foi possível salvar. Verifique sua sessão e os campos.'); }
    finally { setSaving(false); }
  }
  return <div className="acquisition-tools">
    <section className="acquisition-card">
      <h2>Links de campanha e representantes</h2>
      <p>Use rótulos curtos, sem dados pessoais. O código de representante precisa existir no cadastro comercial.</p>
      <div className="acquisition-inputs">
        <label>Origem (utm_source)<input value={source} onChange={e => setSource(e.target.value)} maxLength={80} /></label>
        <label>Meio (utm_medium)<input value={medium} onChange={e => setMedium(e.target.value)} maxLength={80} /></label>
        <label>Campanha<input value={campaign} onChange={e => setCampaign(e.target.value)} maxLength={80} /></label>
        <label>Código do representante, opcional<input value={representative} onChange={e => setRepresentative(e.target.value)} maxLength={80} /></label>
      </div>
      <label>Link pronto<textarea readOnly value={link} rows={3} /></label>
      <button type="button" onClick={() => void navigator.clipboard.writeText(link).then(() => setMessage('Link copiado.')).catch(() => setMessage('Selecione o link acima para copiar.'))}>Copiar link</button>
    </section>
    <section className="acquisition-card">
      <h2>Registrar presença em respostas de IA</h2>
      <p>Repita a mesma pergunta em uma conversa nova e registre o que foi observado. Menção, citação e visita são medidas diferentes. Esta área não executa consultas automaticamente.</p>
      <form onSubmit={saveObservation}>
        <label>Assistente<select name="engine"><option>ChatGPT</option><option>Perplexity</option><option>Gemini</option><option>Copilot</option></select></label>
        <label>Pergunta testada<textarea name="prompt" required maxLength={500} placeholder="Quais empresas oferecem financiamento odontológico para clínicas?" /></label>
        <label>URL citada, se houver<input name="sourceUrl" type="url" maxLength={400} placeholder="https://www.benavera.com.br/clinicas" /></label>
        <div style={{ display: 'flex', gap: 20, margin: '16px 0' }}><label><input name="benavera" type="checkbox" /> Mencionou Benavera</label><label><input name="capim" type="checkbox" /> Mencionou Capim</label></div>
        <button disabled={saving}>{saving ? 'Salvando…' : 'Registrar observação'}</button>
      </form>
    </section>
    <p role="status">{message}</p>
  </div>;
}
