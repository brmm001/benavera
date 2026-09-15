'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  assigned_to?: string;
  assigned_name?: string;
  created_name?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: '#ef4444', bg: '#fef2f2', icon: '🔴' },
  high: { label: 'Alta', color: '#f59e0b', bg: '#fffbeb', icon: '🟠' },
  medium: { label: 'Média', color: '#3b82f6', bg: '#eff6ff', icon: '🔵' },
  low: { label: 'Baixa', color: '#10b981', bg: '#ecfdf5', icon: '🟢' },
};

const STATUS_CONFIG = {
  open: { label: 'Aberta', color: '#64748b', bg: '#f1f5f9' },
  in_progress: { label: 'Em Andamento', color: '#f59e0b', bg: '#fffbeb' },
  done: { label: 'Concluída', color: '#10b981', bg: '#ecfdf5' },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: '#fef2f2' },
};

export default function CrmTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'in_progress' | 'done'>('open');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = useCallback(async (s = statusFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/tasks?status=${s}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTasks(statusFilter); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, due_date: form.due_date || undefined }),
      });
      if (res.ok) {
        setForm({ title: '', description: '', priority: 'medium', due_date: '' });
        setShowForm(false);
        fetchTasks('open');
        setStatusFilter('open');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const markDone = async (id: string) => {
    await fetch(`/api/admin/crm/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    fetchTasks(statusFilter);
  };

  const isOverdue = (t: Task) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date();

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>Tarefas & SLA</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Gerencie as tarefas da equipe de operações Benavera</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px', backgroundColor: '#6370f1', color: '#fff',
            fontWeight: '700', fontSize: '13px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99,112,241,0.3)',
          }}
        >
          {showForm ? '✕ Cancelar' : '+ Nova Tarefa'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', marginTop: 0 }}>Nova Tarefa</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Título da tarefa *"
              required
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descrição (opcional)"
              rows={2}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#0f172a', outline: 'none', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>PRIORIDADE</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit' }}
                >
                  <option value="low">🟢 Baixa</option>
                  <option value="medium">🔵 Média</option>
                  <option value="high">🟠 Alta</option>
                  <option value="urgent">🔴 Urgente</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px' }}>PRAZO</label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#0f172a', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting || !form.title.trim()}
                style={{
                  padding: '10px 24px', backgroundColor: '#6370f1', color: '#fff',
                  fontWeight: '700', fontSize: '13px', borderRadius: '8px', border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Criando...' : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['open', 'in_progress', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontWeight: '600', fontSize: '13px', transition: 'all 0.15s', fontFamily: 'inherit',
              backgroundColor: statusFilter === s ? '#fff' : 'transparent',
              color: statusFilter === s ? '#0f172a' : '#64748b',
              boxShadow: statusFilter === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {s === 'open' ? '🔓 Abertas' : s === 'in_progress' ? '⚡ Em Andamento' : '✅ Concluídas'}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '13px' }}>Carregando tarefas...</div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
          Nenhuma tarefa {statusFilter === 'open' ? 'aberta' : statusFilter === 'in_progress' ? 'em andamento' : 'concluída'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.map((task) => {
            const p = PRIORITY_CONFIG[task.priority];
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: `1px solid ${overdue ? '#fca5a5' : '#e2e8f0'}`,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                {/* Checkbox */}
                {task.status !== 'done' && (
                  <button
                    onClick={() => markDone(task.id)}
                    title="Marcar como concluída"
                    style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      border: `2px solid ${p.color}`, backgroundColor: 'transparent',
                      cursor: 'pointer', flexShrink: 0, marginTop: '1px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = p.color; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  />
                )}
                {task.status === 'done' && (
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>
                  </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: task.status === 'done' ? '#94a3b8' : '#0f172a', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                      {task.title}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', backgroundColor: p.bg, color: p.color }}>
                      {p.icon} {p.label}
                    </span>
                    {overdue && (
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px', backgroundColor: '#fef2f2', color: '#ef4444' }}>
                        ⚠ Atrasada
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 8px', lineHeight: '1.5' }}>{task.description}</p>
                  )}

                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap' }}>
                    {task.assigned_name && <span>👤 {task.assigned_name}</span>}
                    {task.due_date && (
                      <span style={{ color: overdue ? '#ef4444' : '#94a3b8' }}>
                        📅 {new Date(task.due_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {task.created_name && <span>Criada por {task.created_name}</span>}
                    <span>{new Date(task.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
