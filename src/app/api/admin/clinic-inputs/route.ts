// src/app/api/admin/clinic-inputs/route.ts
// Lista propostas digitais (orçamentos) e simulações salvas digitadas pelas clínicas no painel
import { NextRequest, NextResponse } from 'next/server';
import { getSession, isBenaveraStaff } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!isBenaveraStaff(session.role)) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('clinicId') || null;
  const searchRaw = (searchParams.get('search') || '').trim();
  const searchWild = searchRaw ? `%${searchRaw}%` : null;

  try {
    const [digitalProposals, savedSimulations] = await Promise.all([
      sql`
        SELECT
          dp.id, dp.clinic_id, dp.token, dp.patient_name, dp.patient_phone, dp.patient_email,
          dp.procedimentos, dp.subtotal, dp.desconto, dp.total, dp.condicoes, dp.validade,
          dp.status, dp.accepted_at, dp.created_at,
          c.nome_fantasia AS clinic_nome, c.cidade AS clinic_cidade, c.estado AS clinic_estado
        FROM clinic_digital_proposals dp
        LEFT JOIN clinics c ON c.id = dp.clinic_id
        WHERE (${clinicId}::uuid IS NULL OR dp.clinic_id = ${clinicId}::uuid)
          AND (
            ${searchWild}::text IS NULL
            OR dp.patient_name ILIKE ${searchWild}
            OR dp.patient_phone ILIKE ${searchWild}
            OR dp.patient_email ILIKE ${searchWild}
            OR c.nome_fantasia ILIKE ${searchWild}
          )
        ORDER BY dp.created_at DESC
        LIMIT 150
      `,
      sql`
        SELECT
          cs.id, cs.clinic_id, cs.patient_name, cs.valor, cs.parcelas, cs.valor_parcela,
          cs.taxa_mensal, cs.repasse_liquido, cs.notas, cs.created_at,
          c.nome_fantasia AS clinic_nome, c.cidade AS clinic_cidade, c.estado AS clinic_estado
        FROM clinic_saved_simulations cs
        LEFT JOIN clinics c ON c.id = cs.clinic_id
        WHERE (${clinicId}::uuid IS NULL OR cs.clinic_id = ${clinicId}::uuid)
          AND (
            ${searchWild}::text IS NULL
            OR cs.patient_name ILIKE ${searchWild}
            OR cs.notas ILIKE ${searchWild}
            OR c.nome_fantasia ILIKE ${searchWild}
          )
        ORDER BY cs.created_at DESC
        LIMIT 150
      `,
    ]);

    return NextResponse.json(
      { success: true, digitalProposals, savedSimulations },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Admin Clinic Inputs GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar dados digitados pelas clínicas.' }, { status: 500 });
  }
}
