// app/api/admin/clinics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_ANALYST') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const clinics = await sql`
      SELECT c.*,
             COUNT(DISTINCT a.id) as total_applications,
             COALESCE(SUM(CASE WHEN a.status = 'CONCLUIDA' OR a.status = 'CONTRATO_ASSINADO' THEN a.valor_financiado ELSE 0 END), 0) as total_financiado
      FROM clinics c
      LEFT JOIN applications a ON a.clinic_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    return NextResponse.json({ clinics });
  } catch (err) {
    console.error('[Admin Clinics GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar clínicas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Apenas Administrador Benavera pode cadastrar clínicas.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nome_fantasia, razao_social, cnpj, telefone, email, endereco_cidade, endereco_uf } = body;

    if (!nome_fantasia || !cnpj) {
      return NextResponse.json({ error: 'Nome fantasia e CNPJ são obrigatórios.' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO clinics (nome_fantasia, razao_social, cnpj, telefone, email, endereco_cidade, endereco_uf, status)
      VALUES (${nome_fantasia}, ${razao_social || nome_fantasia}, ${cnpj}, ${telefone || null}, ${email || null}, ${endereco_cidade || null}, ${endereco_uf || null}, 'ATIVA')
      RETURNING id
    `;

    return NextResponse.json({ id: String(rows[0].id), success: true }, { status: 201 });
  } catch (err) {
    console.error('[Admin Clinics POST]', err);
    return NextResponse.json({ error: 'Erro ao cadastrar clínica.' }, { status: 500 });
  }
}
