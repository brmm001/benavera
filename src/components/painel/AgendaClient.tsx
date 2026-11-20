'use client';
import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Circle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  type: string;
  due_at: string | null;
  completed: boolean;
  assigned_to_name: string | null;
}

export function AgendaClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('retorno');
  const [dueAt, setDueAt] = useState('');

  async function load() {
    const res = await fetch('/api/painel/agenda');
    const data = await res.json();
    if (res.ok) setTasks(data.tasks || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/painel/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, due_at: dueAt || null }),
    });
    if (res.ok) { setTitle(''); setDueAt(''); load(); }
  }

  async function toggle(t: Task) {
    await fetch('/api/painel/agenda', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, completed: !t.completed }),
    });
    load();
  }

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">Agenda Comercial</h1>
          <p className="bv-subtitle">Lembretes, retornos de orçamentos e prazos de propostas da equipe comercial.</p>
        </div>
      </div>

      <form onSubmit={create} className="bv-card" style={{ marginBottom: '20px' }}>
        <div className="bv-grid bv-cols-3" style={{ alignItems: 'end', marginBottom: 0 }}>
          <div><label className="bv-label">Tarefa / Lembrete *</label><input className="bv-input" required placeholder="Ex: Ligar para paciente Maria" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div>
            <label className="bv-label">Tipo</label>
            <select className="bv-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="retorno">Retorno de orçamento</option>
              <option value="whatsapp">Contato WhatsApp</option>
              <option value="ligacao">Ligação</option>
              <option value="consulta">Consulta comercial</option>
              <option value="proposta">Prazo de proposta</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="bv-input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            <button className="bv-btn" style={{ flexShrink: 0 }}><Plus size={15} /> Criar</button>
          </div>
        </div>
      </form>

      <div className="bv-card">
        {tasks.length === 0 ? <div className="bv-empty">Nenhuma tarefa comercial agendada.</div> : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {tasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', opacity: t.completed ? 0.6 : 1 }}>
                <button type="button" onClick={() => toggle(t)} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}>
                  {t.completed ? <CheckCircle2 size={18} color="#059669" /> : <Circle size={18} color="#94a3b8" />}
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{t.type} · {t.due_at ? new Date(t.due_at).toLocaleString('pt-BR') : 'Sem data'}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
