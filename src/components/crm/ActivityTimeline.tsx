'use client';

import React, { useState } from 'react';

interface Activity {
  id: string;
  tipo: string;
  descricao: string;
  actor_name?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface ActivityTimelineProps {
  activities: Activity[];
  entityId: string;
  entityType?: string;
  onActivityAdded?: () => void;
}

const TIPO_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  call: { icon: '📞', label: 'Ligação', color: '#3b82f6', bg: '#eff6ff' },
  email: { icon: '📧', label: 'E-mail', color: '#8b5cf6', bg: '#fdf4ff' },
  whatsapp: { icon: '💬', label: 'WhatsApp', color: '#10b981', bg: '#ecfdf5' },
  note: { icon: '📝', label: 'Nota', color: '#f59e0b', bg: '#fffbeb' },
  meeting: { icon: '🤝', label: 'Reunião', color: '#6370f1', bg: '#eef2ff' },
  document: { icon: '📄', label: 'Documento', color: '#64748b', bg: '#f1f5f9' },
  status_change: { icon: '🔄', label: 'Mudança de Status', color: '#0ea5e9', bg: '#f0f9ff' },
};

export default function ActivityTimeline({
  activities,
  entityId,
  entityType = 'clinic_lead',
  onActivityAdded,
}: ActivityTimelineProps) {
  const [localActivities, setLocalActivities] = useState<Activity[]>(activities);
  const [tipo, setTipo] = useState<string>('note');
  const [descricao, setDescricao] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    setLocalActivities(activities);
  }, [activities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, tipo, descricao }),
      });

      if (!res.ok) throw new Error('Erro ao salvar atividade');

      const data = await res.json();
      setLocalActivities((prev) => [data.activity, ...prev]);
      setDescricao('');
      onActivityAdded?.();
    } catch (err) {
      alert('Erro ao registrar atividade. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Input rápido */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Tipo selector */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              padding: '10px 12px',
              borderBottom: '1px solid #f1f5f9',
              flexWrap: 'wrap',
            }}
          >
            {Object.entries(TIPO_CONFIG)
              .filter(([key]) => key !== 'status_change')
              .map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: '600',
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderColor: tipo === key ? cfg.color : '#e2e8f0',
                    backgroundColor: tipo === key ? cfg.bg : '#fff',
                    color: tipo === key ? cfg.color : '#64748b',
                  }}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
          </div>

          {/* Textarea */}
          <div style={{ padding: '12px' }}>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={`Registrar ${TIPO_CONFIG[tipo]?.label.toLowerCase() || 'atividade'}...`}
              rows={3}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '13px',
                color: '#0f172a',
                fontFamily: 'inherit',
                backgroundColor: 'transparent',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={submitting || !descricao.trim()}
                style={{
                  padding: '8px 18px',
                  backgroundColor: submitting || !descricao.trim() ? '#e2e8f0' : '#6370f1',
                  color: submitting || !descricao.trim() ? '#94a3b8' : '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: submitting || !descricao.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.15s',
                }}
              >
                {submitting ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {localActivities.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#94a3b8',
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px dashed #e2e8f0',
            }}
          >
            Nenhuma atividade registrada ainda.
            <br />
            Use o formulário acima para registrar o primeiro contato.
          </div>
        )}

        {localActivities.map((activity, idx) => {
          const cfg = TIPO_CONFIG[activity.tipo] ?? TIPO_CONFIG.note;
          const isLast = idx === localActivities.length - 1;

          return (
            <div key={activity.id} style={{ display: 'flex', gap: '12px' }}>
              {/* Line + Icon */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: cfg.bg,
                    border: `2px solid ${cfg.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {cfg.icon}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flex: 1,
                      backgroundColor: '#e2e8f0',
                      margin: '4px 0',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: isLast ? '0' : '20px', flex: 1 }}>
                <div
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: cfg.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(activity.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {activity.descricao && (
                    <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 8px', lineHeight: '1.5' }}>
                      {activity.descricao}
                    </p>
                  )}

                  {activity.actor_name && (
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      por <strong style={{ color: '#6370f1' }}>{activity.actor_name}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
