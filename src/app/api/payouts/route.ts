// app/api/payouts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { notifyPayoutEmails } from '@/lib/email-reports';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const allowedRoles = ['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN', 'BENAVERA_ANALYST'];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const isBenaveraStaff = session.role === 'BENAVERA_ADMIN' || session.role === 'BENAVERA_ANALYST';
  const clinicId = session.clinicId;

  try {
    let rows;
    if (isBenaveraStaff) {
      rows = await sql`
        SELECT py.*, a.protocol, p.nome as patient_nome, c.nome_fantasia as clinic_nome, fp.nome as partner_nome
        FROM payouts py
        LEFT JOIN applications a ON a.id = py.application_id
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = py.clinic_id
        LEFT JOIN financial_partners fp ON fp.id = py.partner_id
        ORDER BY py.created_at DESC LIMIT 50
      `;
    } else {
      rows = await sql`
        SELECT py.*, a.protocol, p.nome as patient_nome, c.nome_fantasia as clinic_nome, fp.nome as partner_nome
        FROM payouts py
        LEFT JOIN applications a ON a.id = py.application_id
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinics c ON c.id = py.clinic_id
        LEFT JOIN financial_partners fp ON fp.id = py.partner_id
        WHERE py.clinic_id = ${clinicId}
        ORDER BY py.created_at DESC LIMIT 50
      `;
    }

    const payouts = rows.map((r: any) => ({
      ...r,
      valor_bruto: Number(r.valor_financiado ?? r.valor_tratamento ?? 0),
      taxa_benavera: Number(r.taxa_benavera ?? 0),
      valor_liquido: Number(r.valor_liquido_clinica ?? r.valor_financiado ?? 0),
      data_pagamento: r.data_paga || null,
    }));

    return NextResponse.json({ payouts });
  } catch (err) {
    console.error('[Payouts GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar repasses.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Sem permissão para atualizar repasses.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';
    const dataPrevista = typeof body.dataPrevista === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dataPrevista) ? body.dataPrevista : null;
    const dataPaga = typeof body.dataPaga === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dataPaga) ? body.dataPaga : null;
    const notas = typeof body.notas === 'string' ? body.notas.slice(0, 1000) : null;

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'ID de repasse inválido.' }, { status: 400 });
    }
    if (!['SCHEDULED', 'PROCESSING', 'PAID', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Status de repasse inválido.' }, { status: 400 });
    }

    const updated = await sql`
      UPDATE payouts
      SET
        status = ${status}::payout_status,
        data_prevista = COALESCE(${dataPrevista}::date, data_prevista),
        data_paga = CASE WHEN ${status} = 'PAID' THEN COALESCE(${dataPaga}::date, CURRENT_DATE) ELSE data_paga END,
        notas = COALESCE(${notas}, notas),
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING id, application_id, clinic_id, status
    `;
    const row = updated[0];
    if (!row) {
      return NextResponse.json({ error: 'Repasse não encontrado.' }, { status: 404 });
    }

    if (row.application_id && (status === 'SCHEDULED' || status === 'PAID')) {
      const nextAppStatus = status === 'PAID' ? 'PAYOUT_COMPLETED' : 'PAYOUT_SCHEDULED';
      await sql`
        UPDATE applications
        SET status = ${nextAppStatus}::application_status, updated_at = NOW()
        WHERE id = ${row.application_id}::uuid
      `;
    }

    if (status === 'SCHEDULED' || status === 'PAID') {
      await notifyPayoutEmails(id, status).catch(() => {});
    }

    return NextResponse.json({ success: true, payout: row });
  } catch (err) {
    console.error('[Payouts PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar repasse.' }, { status: 500 });
  }
}
