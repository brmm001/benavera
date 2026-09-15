'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ActivityTimeline from '@/components/crm/ActivityTimeline';

const KanbanBoard = dynamic(() => import('@/components/crm/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8', fontSize: '14px' }}>
      Carregando pipeline...
    </div>
  ),
});

interface Stage { id: string; label: string; color: string; }
interface ClinicCard {
  id: string;
  nome_clinica: string;
  nome_responsavel: string;
  cidade: string;
  estado: string;
  especialidade_principal: string;
  whatsapp: string;
  email?: string;
  pipeline_stage: string;
  status_comercial: string;
  assigned_name?: string;
  last_contact_at?: string;
  next_followup_at?: string;
  created_at: string;
}

export default function CrmPipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [cards, setCards] = useState<Record<string, ClinicCard[]>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<ClinicCard | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchPipeline = useCallback(async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/pipeline${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      if (!res.ok) throw new Error('Erro ao carregar pipeline');
      const data = await res.json();
      setStages(data.stages || []);
      setCards(data.cards || {});
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchPipeline(search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchPipeline]);

  const fetchActivities = useCallback(async (entityId: string) => {
    setActivitiesLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/activities?entity_id=${entityId}&entity_type=clinic_lead`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const handleCardClick = useCallback((card: ClinicCard) => {
    setSelectedCard(card);
    fetchActivities(card.id);
  }, [fetchActivities]);

  const handleStageChange = useCallback(async (cardId: string, newStage: string) => {
    await fetch(`/api/admin/crm/pipeline/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    });
  }, []);

  const totalByStage = stages.reduce((acc, s) => {
    acc[s.id] = (cards[s.id] || []).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh' }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
              Pipeline de Clínicas
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              {total} clínica{total !== 1 ? 's' : ''} no pipeline
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar clínica ou responsável..."
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                width: '260px',
                outline: 'none',
                color: '#0f172a',
              }}
            />
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {stages.map((s) => (
            <div
              key={s.id}
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                backgroundColor: s.color + '15',
                border: `1px solid ${s.color}30`,
                fontSize: '11px',
                fontWeight: '700',
                color: s.color,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: s.color,
                  color: '#fff',
                  fontSize: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                }}
              >
                {totalByStage[s.id] || 0}
              </span>
              {s.label}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '14px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        {/* Kanban */}
        {!loading && !error && (
          <KanbanBoard
            stages={stages}
            cards={cards}
            onStageChange={handleStageChange}
            onCardClick={handleCardClick}
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedCard && (
        <div
          style={{
            width: '420px',
            flexShrink: 0,
            borderLeft: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: '#fafafa',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 3px' }}>
                {selectedCard.nome_clinica}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                {selectedCard.nome_responsavel} • {selectedCard.cidade}, {selectedCard.estado}
              </p>
            </div>
            <button
              onClick={() => setSelectedCard(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: '20px',
                lineHeight: 1,
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>

          {/* Panel body */}
          <div style={{ padding: '20px 24px', flex: 1 }}>
            {/* Info grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              {[
                { label: 'Especialidade', value: selectedCard.especialidade_principal },
                { label: 'WhatsApp', value: selectedCard.whatsapp },
                { label: 'E-mail', value: selectedCard.email || '—' },
                { label: 'Responsável Bvr', value: selectedCard.assigned_name || 'Não atribuído' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Stage badge */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Etapa atual
              </div>
              {(() => {
                const stage = stages.find((s) => s.id === selectedCard.pipeline_stage);
                if (!stage) return null;
                return (
                  <span
                    style={{
                      padding: '4px 14px',
                      borderRadius: '99px',
                      backgroundColor: stage.color + '15',
                      color: stage.color,
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    ● {stage.label}
                  </span>
                );
              })()}
            </div>

            {/* Timeline */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                Histórico de Atividades
              </h3>
              {activitiesLoading ? (
                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Carregando...
                </div>
              ) : (
                <ActivityTimeline
                  activities={activities}
                  entityId={selectedCard.id}
                  entityType="clinic_lead"
                  onActivityAdded={() => fetchActivities(selectedCard.id)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
