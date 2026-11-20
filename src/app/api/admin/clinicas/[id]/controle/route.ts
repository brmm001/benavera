// Admin: Painel de controle individual por clínica (plano, assinatura, módulos e auditoria)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { getAdminSession } from '@/lib/auth';
import { logModuleAudit, resolveClinicEntitlements } from '@/lib/clinic-modules';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }
  const { id } = await params;

  const [clinicRows, subRows, plansRows, usersRows, auditRows, resolved] = await Promise.all([
    sql`SELECT * FROM clinics WHERE id = ${id}::uuid LIMIT 1`,
    sql`SELECT * FROM clinic_subscriptions WHERE clinic_id = ${id}::uuid LIMIT 1`,
    sql`SELECT * FROM saas_plans WHERE archived = false ORDER BY price_monthly ASC`,
    sql`SELECT id, name, email, role, ativo, last_login_at, created_at FROM users WHERE clinic_id = ${id}::uuid ORDER BY created_at DESC`,
    sql`SELECT * FROM module_audit_logs WHERE clinic_id = ${id}::uuid ORDER BY created_at DESC LIMIT 40`,
    resolveClinicEntitlements(id, 'CLINIC_ADMIN'),
  ]);

  if (!clinicRows[0]) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 });

  return NextResponse.json({
    success: true,
    clinic: clinicRows[0],
    subscription: subRows[0] || null,
    plans: plansRows,
    users: usersRows,
    auditLogs: auditRows,
    entitlements: resolved,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));

    if (body.kind === 'override') {
      const moduleId = String(body.module_id || '');
      const adminState = String(body.admin_state || 'AVAILABLE');
      if (!['AVAILABLE', 'BLOCKED', 'REQUIRED', 'EXCEPTION_FREE'].includes(adminState)) {
        return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
      }
      await sql`
        INSERT INTO clinic_module_overrides (clinic_id, module_id, admin_state, note, updated_by, updated_at)
        VALUES (${id}::uuid, ${moduleId}, ${adminState}, ${body.note ?? null}, ${session.name}, NOW())
        ON CONFLICT (clinic_id, module_id) DO UPDATE SET
          admin_state = EXCLUDED.admin_state, note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `;
      await logModuleAudit({
        clinicId: id,
        actorId: session.userId,
        actorName: session.name,
        scope: 'OVERRIDE',
        targetId: moduleId,
        action: `SET_MODULE_${adminState}`,
        newValue: { adminState, note: body.note ?? null },
      });
    } else if (body.kind === 'subscription') {
      await sql`
        INSERT INTO clinic_subscriptions (
          clinic_id, plan_id, status, billing_cycle, custom_price, discount_percent, is_exempt,
          coupon_code, due_day, grace_until, trial_ends_at, notes, updated_by, updated_at
        ) VALUES (
          ${id}::uuid,
          ${body.plan_id || null},
          ${body.status || 'EXEMPT'},
          ${body.billing_cycle || 'LIFETIME_FREE'},
          ${body.custom_price !== '' && body.custom_price !== null && body.custom_price !== undefined ? Number(body.custom_price) : null},
          ${Number(body.discount_percent) || 0},
          ${Boolean(body.is_exempt)},
          ${body.coupon_code || null},
          ${body.due_day ? Number(body.due_day) : null},
          ${body.grace_until || null},
          ${body.trial_ends_at || null},
          ${body.notes || null},
          ${session.name},
          NOW()
        )
        ON CONFLICT (clinic_id) DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          status = EXCLUDED.status,
          billing_cycle = EXCLUDED.billing_cycle,
          custom_price = EXCLUDED.custom_price,
          discount_percent = EXCLUDED.discount_percent,
          is_exempt = EXCLUDED.is_exempt,
          coupon_code = EXCLUDED.coupon_code,
          due_day = EXCLUDED.due_day,
          grace_until = EXCLUDED.grace_until,
          trial_ends_at = EXCLUDED.trial_ends_at,
          notes = EXCLUDED.notes,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `;
      await logModuleAudit({
        clinicId: id,
        actorId: session.userId,
        actorName: session.name,
        scope: 'SUBSCRIPTION',
        targetId: id,
        action: 'UPDATE_SUBSCRIPTION',
        newValue: body,
      });
    }

    const resolved = await resolveClinicEntitlements(id, 'CLINIC_ADMIN');
    return NextResponse.json({ success: true, entitlements: resolved });
  } catch (err) {
    console.error('[API Admin Clinica Controle PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar clínica.' }, { status: 500 });
  }
}
