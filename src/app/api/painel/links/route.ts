// API: Links de Financiamento da Clínica (reutiliza proposal_tokens e applications)
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

export async function GET() {
  const g = await requireClinicModule('links_financiamento');
  if (!g.ok) return g.response;

  const [tokens, apps] = await Promise.all([
    sql`
      SELECT pt.*, a.protocol, a.procedimento, a.valor_financiado, a.status::text AS app_status, p.nome AS patient_name
      FROM proposal_tokens pt
      JOIN applications a ON a.id = pt.application_id
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE a.clinic_id = ${g.ctx.clinicId}::uuid
      ORDER BY pt.created_at DESC
      LIMIT 100
    `,
    sql`
      SELECT a.id, a.protocol, a.procedimento, a.valor_financiado, p.nome AS patient_name
      FROM applications a
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE a.clinic_id = ${g.ctx.clinicId}::uuid AND a.status::text <> 'CANCELLED'
      ORDER BY a.created_at DESC
      LIMIT 100
    `,
  ]);

  return NextResponse.json({ success: true, links: tokens, applications: apps });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('links_financiamento');
  if (!g.ok) return g.response;

  const body = await request.json().catch(() => ({}));
  const appId = String(body.application_id || '');
  if (!appId) return NextResponse.json({ error: 'Selecione uma solicitação.' }, { status: 400 });

  // Garante isolamento multi-tenant: a aplicação precisa pertencer à clínica
  const app = await sql`SELECT id FROM applications WHERE id = ${appId}::uuid AND clinic_id = ${g.ctx.clinicId}::uuid LIMIT 1`;
  if (!app[0]) return NextResponse.json({ error: 'Solicitação não encontrada nesta clínica.' }, { status: 404 });

  const days = Math.min(90, Math.max(1, Number(body.days) || 7));
  const token = randomBytes(18).toString('base64url');
  const rows = await sql`
    INSERT INTO proposal_tokens (token, application_id, created_by, expires_at)
    VALUES (${token}, ${appId}::uuid, ${g.ctx.session.userId}::uuid, NOW() + (${days}::int * INTERVAL '1 day'))
    RETURNING *
  `;
  return NextResponse.json({ success: true, link: rows[0] }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const g = await requireClinicModule('links_financiamento');
  if (!g.ok) return g.response;

  const body = await request.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

  await sql`
    UPDATE proposal_tokens pt SET revogado = TRUE
    FROM applications a
    WHERE pt.id = ${body.id}::uuid AND pt.application_id = a.id AND a.clinic_id = ${g.ctx.clinicId}::uuid
  `;
  return NextResponse.json({ success: true });
}
