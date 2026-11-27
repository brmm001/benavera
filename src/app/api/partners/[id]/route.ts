// src/app/api/partners/[id]/route.ts
// Atualização de parâmetros e ativação/desativação de parceiros financeiros no Hub

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, hasPermission } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

const UpdatePartnerSchema = z.object({
  nome: z.string().trim().min(2).max(120).optional(),
  nome_legal: z.string().trim().max(160).nullable().optional(),
  cnpj: z.string().trim().max(32).nullable().optional(),
  prioridade: z.coerce.number().int().min(1).max(999).optional(),
  ticket_minimo: z.coerce.number().min(0).max(10_000_000).optional(),
  ticket_maximo: z.coerce.number().min(1).max(10_000_000).optional(),
  prazo_maximo: z.coerce.number().int().min(1).max(120).optional(),
  comissao_benavera_percent: z.coerce.number().min(0).max(1).optional(),
  modo: z.enum(['MANUAL', 'API', 'SANDBOX']).optional(),
  ativo: z.boolean().optional(),
  integration_active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'MANAGE_PARTNERS')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = UpdatePartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Parâmetros inválidos.' },
        { status: 400 }
      );
    }

    const existingRows = await sql`
      SELECT * FROM financial_partners WHERE id = ${id} LIMIT 1
    `;
    const current = existingRows[0];
    if (!current) {
      return NextResponse.json({ error: 'Parceiro não encontrado.' }, { status: 404 });
    }

    const d = parsed.data;
    const nextMin = d.ticket_minimo ?? Number(current.ticket_minimo ?? 0);
    const nextMax = d.ticket_maximo ?? Number(current.ticket_maximo ?? 0);
    if (nextMax < nextMin) {
      return NextResponse.json(
        { error: 'Ticket máximo deve ser maior ou igual ao ticket mínimo.' },
        { status: 400 }
      );
    }

    const updated = await sql`
      UPDATE financial_partners
      SET
        nome = ${d.nome ?? String(current.nome)},
        nome_legal = ${d.nome_legal !== undefined ? d.nome_legal : current.nome_legal},
        cnpj = ${d.cnpj !== undefined ? d.cnpj : current.cnpj},
        prioridade = ${d.prioridade ?? Number(current.prioridade)},
        ticket_minimo = ${nextMin},
        ticket_maximo = ${nextMax},
        prazo_maximo = ${d.prazo_maximo ?? Number(current.prazo_maximo)},
        comissao_benavera_percent = ${d.comissao_benavera_percent ?? Number(current.comissao_benavera_percent ?? 0)},
        modo = ${(d.modo ?? String(current.modo))}::partner_mode,
        ativo = ${d.ativo ?? Boolean(current.ativo)},
        integration_active = ${d.integration_active ?? Boolean(current.integration_active)},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({ success: true, partner: updated[0] });
  } catch (err) {
    console.error('[Partners PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar parceiro.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'MANAGE_PARTNERS')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const refs = await sql`
      SELECT
        (SELECT COUNT(*) FROM funding_attempts WHERE partner_id = ${id})::int AS attempts,
        (SELECT COUNT(*) FROM proposals WHERE partner_id = ${id})::int AS proposals,
        (SELECT COUNT(*) FROM payouts WHERE partner_id = ${id})::int AS payouts
    `;
    const r = refs[0];
    if (r && (r.attempts > 0 || r.proposals > 0 || r.payouts > 0)) {
      return NextResponse.json(
        { error: 'Este parceiro já possui propostas ou repasses registrados. Desative-o em vez de excluir.' },
        { status: 409 }
      );
    }

    const deleted = await sql`
      DELETE FROM financial_partners WHERE id = ${id} RETURNING id, nome
    `;
    if (!deleted[0]) {
      return NextResponse.json({ error: 'Parceiro não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, removed: deleted[0] });
  } catch (err) {
    console.error('[Partners DELETE]', err);
    return NextResponse.json({ error: 'Erro ao remover parceiro.' }, { status: 500 });
  }
}
