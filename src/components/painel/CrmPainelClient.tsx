'use client';
import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useDroppable, useSensor, useSensors, pointerWithin, closestCorners, type CollisionDetection } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Search } from 'lucide-react';

interface Deal {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  procedimento: string | null;
  valor: number;
  stage: string;
  responsavel: string | null;
  notas: string | null;
}

const STAGES = [
  { id: 'novo_paciente', label: 'Novo paciente', color: '#64748b' },
  { id: 'avaliacao', label: 'Avaliação', color: '#3b82f6' },
  { id: 'orcamento', label: 'Orçamento', color: '#8b5cf6' },
  { id: 'negociacao', label: 'Negociação', color: '#f59e0b' },
  { id: 'financiamento', label: 'Financiamento', color: '#4040ca' },
  { id: 'fechado', label: 'Fechado', color: '#059669' },
  { id: 'perdido', label: 'Perdido', color: '#ef4444' },
];

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        touchAction: 'none',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px 14px',
        cursor: 'grab',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{deal.patient_name}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{deal.procedimento || 'Tratamento'}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '12px' }}>
        <span style={{ fontWeight: '800', color: '#4040ca' }}>{brl(Number(deal.valor))}</span>
        <span style={{ color: '#94a3b8' }}>{deal.responsavel || 'Equipe'}</span>
      </div>
    </div>
  );
}

function StageColumn({ stage, deals, onCardClick }: { stage: (typeof STAGES)[number]; deals: Deal[]; onCardClick: (d: Deal) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: '264px',
        flexShrink: 0,
        background: isOver ? '#eef2ff' : '#f8fafc',
        border: `2px solid ${isOver ? stage.color : '#e2e8f0'}`,
        borderRadius: '14px',
        minHeight: '260px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ padding: '12px 14px', background: '#fff', borderBottom: `2px solid ${stage.color}`, borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{stage.label}</span>
        <span className="bv-badge" style={{ background: `${stage.color}18`, color: stage.color }}>{deals.length}</span>
      </div>
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {deals.map((d) => <DealCard key={d.id} deal={d} onClick={() => onCardClick(d)} />)}
        </div>
      </SortableContext>
    </div>
  );
}

export function CrmPainelClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [selected, setSelected] = useState<Deal | null>(null);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ patient_name: '', patient_phone: '', procedimento: '', valor: '', stage: 'novo_paciente', responsavel: '' });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const collision: CollisionDetection = (args) => {
    const p = pointerWithin(args);
    return p.length > 0 ? p : closestCorners(args);
  };

  async function load() {
    const res = await fetch('/api/painel/crm');
    const data = await res.json();
    if (res.ok) setDeals(data.deals || []);
  }

  useEffect(() => { load(); }, []);

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/painel/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, valor: Number(form.valor.replace(',', '.')) || 0 }),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ patient_name: '', patient_phone: '', procedimento: '', valor: '', stage: 'novo_paciente', responsavel: '' });
      load();
    }
  }

  async function moveDeal(id: string, stage: string) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    const res = await fetch('/api/painel/crm', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage }),
    });
    if (!res.ok) load();
  }

  function onDragStart(e: DragStartEvent) {
    setActiveDeal(deals.find((d) => d.id === String(e.active.id)) || null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveDeal(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const overId = String(e.over.id);
    const targetStage = STAGES.find((s) => s.id === overId)?.id || deals.find((d) => d.id === overId)?.stage;
    const cur = deals.find((d) => d.id === id);
    if (targetStage && cur && cur.stage !== targetStage) moveDeal(id, targetStage);
  }

  const visible = deals.filter((d) => !search || `${d.patient_name} ${d.procedimento || ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bv-page">
      <div className="bv-header">
        <div>
          <h1 className="bv-title">CRM Comercial</h1>
          <p className="bv-subtitle">Arraste seus pacientes entre as etapas até o fechamento do tratamento.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '12px', color: '#94a3b8' }} />
            <input className="bv-input" style={{ paddingLeft: '32px', width: '220px' }} placeholder="Buscar paciente…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="button" className="bv-btn" onClick={() => setShowNew((v) => !v)}><Plus size={15} /> Novo paciente</button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={createDeal} className="bv-card" style={{ marginBottom: '18px' }}>
          <div className="bv-grid bv-cols-3" style={{ marginBottom: '12px' }}>
            <div><label className="bv-label">Paciente *</label><input className="bv-input" required value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
            <div><label className="bv-label">WhatsApp</label><input className="bv-input" value={form.patient_phone} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} /></div>
            <div><label className="bv-label">Procedimento</label><input className="bv-input" value={form.procedimento} onChange={(e) => setForm({ ...form, procedimento: e.target.value })} /></div>
            <div><label className="bv-label">Valor (R$)</label><input className="bv-input" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
            <div><label className="bv-label">Responsável</label><input className="bv-input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
            <div>
              <label className="bv-label">Etapa inicial</label>
              <select className="bv-select" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="bv-btn">Adicionar ao CRM</button>
            <button type="button" className="bv-btn ghost" onClick={() => setShowNew(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '14px', alignItems: 'flex-start' }}>
          {STAGES.map((s) => (
            <StageColumn key={s.id} stage={s} deals={visible.filter((d) => d.stage === s.id)} onCardClick={setSelected} />
          ))}
        </div>
        <DragOverlay>
          {activeDeal && (
            <div className="bv-card" style={{ width: '250px', boxShadow: '0 14px 32px rgba(64,64,202,0.22)', borderColor: '#6370f1' }}>
              <div style={{ fontWeight: '700', fontSize: '13px' }}>{activeDeal.patient_name}</div>
              <div style={{ fontSize: '12px', color: '#4040ca', fontWeight: '800', marginTop: '4px' }}>{brl(Number(activeDeal.valor))}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}>
          <div className="bv-card" style={{ maxWidth: '460px', width: '100%' }}>
            <h3 style={{ margin: '0 0 4px' }}>{selected.patient_name}</h3>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>{selected.procedimento} · {brl(Number(selected.valor))}</p>
            <label className="bv-label">Mover etapa</label>
            <select className="bv-select" value={selected.stage} onChange={(e) => { moveDeal(selected.id, e.target.value); setSelected({ ...selected, stage: e.target.value }); }}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <label className="bv-label" style={{ marginTop: '12px' }}>Observações</label>
            <textarea className="bv-textarea" rows={3} defaultValue={selected.notas || ''} onBlur={(e) => fetch('/api/painel/crm', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, notas: e.target.value }) }).then(load)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
              <button type="button" className="bv-btn danger sm" onClick={async () => { await fetch(`/api/painel/crm?id=${selected.id}`, { method: 'DELETE' }); setSelected(null); load(); }}>Excluir</button>
              <button type="button" className="bv-btn ghost" onClick={() => setSelected(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
