import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || '');
  if (!token) return NextResponse.json({ error: 'Token obrigatório.' }, { status: 400 });

  const ip = getClientIP(request);
  const rows = await sql`
    UPDATE clinic_digital_proposals SET status = 'ACEITA', accepted_at = NOW(), accepted_ip = ${ip}
    WHERE token = ${token} AND status <> 'ACEITA'
    RETURNING id
  `;
  if (!rows[0]) return NextResponse.json({ error: 'Proposta não encontrada ou já aceita.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
