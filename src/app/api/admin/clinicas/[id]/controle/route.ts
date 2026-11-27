// Admin: Painel de controle individual por clínica (plano, assinatura, módulos e auditoria)
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { getAdminSession } from '@/lib/auth';
import { logModuleAudit, resolveClinicEntitlements } from '@/lib/clinic-modules';
import { cancelMpPreapprovalVerified, isMercadoPagoConfigured } from '@/lib/mercadopago';

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
    } else if (body.kind === 'financing_access') {
      const allowNew = Boolean(body.allow_new_applications);
      const blockReason = allowNew
        ? null
        : (typeof body.block_reason === 'string' && body.block_reason.trim()
            ? body.block_reason.trim().slice(0, 500)
            : 'A criação de novos financiamentos está temporariamente bloqueada para esta conta. Todas as demais ferramentas do painel estão liberadas.');

      await sql`
        UPDATE clinics
        SET allow_new_applications = ${allowNew},
            new_applications_block_reason = ${blockReason},
            updated_at = NOW()
        WHERE id = ${id}::uuid
      `;

      await logModuleAudit({
        clinicId: id,
        actorId: session.userId,
        actorName: session.name,
        scope: 'OVERRIDE',
        targetId: 'allow_new_applications',
        action: allowNew ? 'ALLOW_NEW_APPLICATIONS' : 'BLOCK_NEW_APPLICATIONS',
        newValue: { allow_new_applications: allowNew, block_reason: blockReason },
      });
    } else if (body.kind === 'subscription') {
      const nextStatus = String(body.status || 'EXEMPT');
      const nextExempt = Boolean(body.is_exempt) || nextStatus === 'EXEMPT';
      // Se o admin mudar para CANCELLED ou EXEMPT via seletor, cancelar qualquer recorrência ativa no Mercado Pago!
      const shouldStopMpRecurring = nextStatus === 'CANCELLED' || nextExempt;
      const cancelledPreIds: string[] = [];
      if (shouldStopMpRecurring) {
        const [curSubRows, openPreRows] = await Promise.all([
          sql`SELECT mp_preapproval_id FROM clinic_subscriptions WHERE clinic_id = ${id}::uuid LIMIT 1`,
          sql`
            SELECT DISTINCT mp_preapproval_id FROM saas_invoices
            WHERE clinic_id = ${id}::uuid AND mp_preapproval_id IS NOT NULL AND COALESCE(mp_status, '') <> 'cancelled'
          `,
        ]);
        const preIds = new Set<string>();
        if (curSubRows[0]?.mp_preapproval_id) preIds.add(String(curSubRows[0].mp_preapproval_id));
        for (const r of openPreRows) {
          if (r.mp_preapproval_id) preIds.add(String(r.mp_preapproval_id));
        }
        if (preIds.size > 0) {
          if (!isMercadoPagoConfigured()) {
            return NextResponse.json(
              { error: 'Esta clínica tem recorrência ativa no Mercado Pago, mas o gateway não está configurado para cancelá-la.' },
              { status: 400 }
            );
          }
          for (const preId of preIds) {
            await cancelMpPreapprovalVerified(preId);
            cancelledPreIds.push(preId);
          }
        }
      }

      await sql`
        INSERT INTO clinic_subscriptions (
          clinic_id, plan_id, status, billing_cycle, custom_price, discount_percent, is_exempt,
          coupon_code, due_day, grace_until, trial_ends_at, notes, updated_by, updated_at
        ) VALUES (
          ${id}::uuid,
          ${body.plan_id || null},
          ${nextStatus},
          ${body.billing_cycle || 'LIFETIME_FREE'},
          ${body.custom_price !== '' && body.custom_price !== null && body.custom_price !== undefined ? Number(body.custom_price) : null},
          ${Number(body.discount_percent) || 0},
          ${nextExempt},
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
          mp_preapproval_id = CASE WHEN ${shouldStopMpRecurring} THEN NULL ELSE clinic_subscriptions.mp_preapproval_id END,
          next_billing_at = CASE WHEN ${shouldStopMpRecurring} THEN NULL ELSE clinic_subscriptions.next_billing_at END,
          cancel_at_period_end = CASE WHEN ${nextStatus === 'CANCELLED'} THEN TRUE ELSE clinic_subscriptions.cancel_at_period_end END,
          cancelled_at = CASE WHEN ${nextStatus === 'CANCELLED'} THEN COALESCE(clinic_subscriptions.cancelled_at, NOW()) ELSE clinic_subscriptions.cancelled_at END,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `;
      if (shouldStopMpRecurring) {
        await sql`
          UPDATE saas_invoices SET status = 'CANCELLED', mp_status = 'cancelled', updated_at = NOW()
          WHERE clinic_id = ${id}::uuid AND status = 'PENDING'
        `;
        if (cancelledPreIds.length > 0) {
          await sql`
            UPDATE saas_invoices SET mp_status = 'cancelled', updated_at = NOW()
            WHERE clinic_id = ${id}::uuid AND mp_preapproval_id = ANY(${cancelledPreIds}::text[])
          `;
        }
      }
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
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar clínica.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
