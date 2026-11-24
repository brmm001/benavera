// src/app/api/proposta/[token]/konsiga/refresh-link/route.ts
// Permite ao paciente consultar sob demanda o status e o link de assinatura na Konsiga

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { syncPartnerStatus } from '@/lib/partners/hub';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const tokenRows = await sql`
      SELECT pt.application_id
      FROM proposal_tokens pt
      WHERE pt.token = ${token}
        AND pt.revogado = false
        AND pt.expires_at > NOW()
      LIMIT 1
    `;
    if (!tokenRows[0]) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }

    const applicationId = String(tokenRows[0].application_id);
    const synced = await syncPartnerStatus(applicationId, 'konsiga');
    if (!synced.success) {
      return NextResponse.json(
        { error: synced.error || 'Não foi possível consultar o status na Konsiga.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      externalStatus: synced.externalStatus || null,
      externalStep: synced.externalStep || null,
      signingUrl: synced.signingUrl || null,
      appStatus: synced.appStatus || null,
    });
  } catch (err) {
    console.error('[Proposta Konsiga Refresh]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao consultar status na Konsiga.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
