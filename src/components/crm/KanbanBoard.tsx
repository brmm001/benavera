'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stage {
  id: string;
  label: string;
  color: string;
}

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

interface KanbanBoardProps {
  stages: Stage[];
  cards: Record<string, ClinicCard[]>;
  onStageChange: (cardId: string, newStage: string) => Promise<void>;
  onCardClick: (card: ClinicCard) => void;
}

// ─── Card Component ────────────────────────────────────────────────────────────

function KanbanCard({
  card,
  onClick,
  isDragging,
}: {
  card: ClinicCard;
  onClick: () => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const initials = card.nome_clinica
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const isOverdue =
    card.next_followup_at && new Date(card.next_followup_at) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: `1px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}`,
          padding: '14px 16px',
          cursor: 'grab',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.15s',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#f0f4ff',
              color: '#4040ca',
              fontWeight: '800',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: '700',
                fontSize: '13px',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.nome_clinica}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
              {card.nome_responsavel}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
          {card.especialidade_principal && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '99px',
                backgroundColor: '#eff6ff',
                color: '#3b82f6',
                fontWeight: '600',
              }}
            >
              {card.especialidade_principal}
            </span>
          )}
          {card.cidade && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '99px',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                fontWeight: '500',
              }}
            >
              📍 {card.cidade}{card.estado ? `, ${card.estado}` : ''}
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '8px',
            fontSize: '10px',
            color: '#94a3b8',
          }}
        >
          <span>
            {card.assigned_name ? (
              <span style={{ color: '#6370f1', fontWeight: '600' }}>👤 {card.assigned_name.split(' ')[0]}</span>
            ) : (
              <span style={{ color: '#94a3b8' }}>Sem responsável</span>
            )}
          </span>
          {isOverdue ? (
            <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠ Followup atrasado</span>
          ) : card.last_contact_at ? (
            <span>
              Contato: {new Date(card.last_contact_at).toLocaleDateString('pt-BR')}
            </span>
          ) : (
            <span>Sem contato ainda</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Column Component ──────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  cards,
  onCardClick,
}: {
  stage: Stage;
  cards: ClinicCard[];
  onCardClick: (card: ClinicCard) => void;
}) {
  const cardIds = cards.map((c) => c.id);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '280px',
        flexShrink: 0,
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid ' + stage.color,
          backgroundColor: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: stage.color,
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{stage.label}</span>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '700',
            backgroundColor: stage.color + '20',
            color: stage.color,
            padding: '2px 8px',
            borderRadius: '99px',
          }}
        >
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: '80px',
            flex: 1,
          }}
        >
          {cards.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 0',
                color: '#cbd5e1',
                fontSize: '12px',
                border: '1px dashed #e2e8f0',
                borderRadius: '8px',
              }}
            >
              Nenhum lead
            </div>
          )}
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Main Board ────────────────────────────────────────────────────────────────

export default function KanbanBoard({ stages, cards, onStageChange, onCardClick }: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<ClinicCard | null>(null);
  const [localCards, setLocalCards] = useState<Record<string, ClinicCard[]>>(cards);

  // Sync props → local state
  React.useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const findCardStage = useCallback(
    (cardId: string): string | null => {
      for (const [stageId, stageCards] of Object.entries(localCards)) {
        if (stageCards.some((c) => c.id === cardId)) return stageId;
      }
      return null;
    },
    [localCards]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = String(event.active.id);
    const stage = findCardStage(cardId);
    if (!stage) return;
    const card = localCards[stage]?.find((c) => c.id === cardId);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cardId = String(active.id);
    const overId = String(over.id);

    // Verificar se "over" é um stage id ou um card id
    const targetStage = stages.find((s) => s.id === overId)?.id
      ?? findCardStage(overId);

    if (!targetStage) return;

    const fromStage = findCardStage(cardId);
    if (!fromStage || fromStage === targetStage) return;

    // Optimistic update
    setLocalCards((prev) => {
      const fromCards = prev[fromStage].filter((c) => c.id !== cardId);
      const movedCard = prev[fromStage].find((c) => c.id === cardId)!;
      const toCards = [{ ...movedCard, pipeline_stage: targetStage }, ...prev[targetStage]];
      return { ...prev, [fromStage]: fromCards, [targetStage]: toCards };
    });

    // Persist
    try {
      await onStageChange(cardId, targetStage);
    } catch {
      // Rollback
      setLocalCards(cards);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '16px',
          alignItems: 'flex-start',
        }}
      >
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            cards={localCards[stage.id] ?? []}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                border: '1px solid #c7d2fe',
                padding: '14px 16px',
                boxShadow: '0 12px 30px rgba(99,112,241,0.25)',
                width: '280px',
              }}
            >
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                {activeCard.nome_clinica}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {activeCard.nome_responsavel}
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
