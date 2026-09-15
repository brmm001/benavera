import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { sendClinicWelcomeEmail, sendAnalystAlertEmail } from '@/lib/email';

// POST — disparar automação manualmente ou via trigger
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_ANALYST') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { trigger, entity_id, entity_type } = body;

    if (trigger === 'clinic_welcome' && entity_id) {
      // Buscar dados da clínica/usuário
      const rows = await sql`
        SELECT u.name, u.email, c.nome_fantasia
        FROM users u
        LEFT JOIN clinics c ON c.id = u.clinic_id
        WHERE u.id = ${entity_id}::uuid AND u.ativo = true
        LIMIT 1
      `;
      const user = rows[0];
      if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });

      const result = await sendClinicWelcomeEmail({
        to: String(user.email),
        clinicName: String(user.nome_fantasia || 'Clínica'),
        responsavel: String(user.name),
      });

      return NextResponse.json({ success: true, emailId: result.data?.id });
    }

    if (trigger === 'analyst_alert' && entity_id) {
      const { alertType, analystEmail, analystName, entityName, details } = body;
      await sendAnalystAlertEmail({
        to: analystEmail,
        analystName,
        alertType,
        entityName,
        details,
        entityUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/admin`,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Trigger desconhecido.' }, { status: 400 });
  } catch (err: any) {
    console.error('[Automations]', err);
    return NextResponse.json({ error: err.message || 'Erro na automação.' }, { status: 500 });
  }
}

// GET — listar automações disparadas recentemente (via crm_activities)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_ADMIN' && session.role !== 'BENAVERA_ANALYST') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  try {
    const rows = await sql`
      SELECT * FROM crm_activities
      WHERE tipo = 'automation'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ automations: rows });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar automações.' }, { status: 500 });
  }
}
