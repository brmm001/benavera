import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon';
import { getPortalSession } from '@/lib/portal-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = getNeonClient();
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 500 });

  const { id } = await params;
  const body = await req.json();
  const { stage } = body;

  try {
    await db`
      UPDATE crm_opportunities
      SET stage = ${stage}, updated_at = NOW()
      WHERE id = ${id} AND clinic_id = ${session.clinicId}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
