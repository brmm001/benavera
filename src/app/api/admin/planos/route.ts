// Admin: Planos, Cupons e Controle Global de Módulos
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { getAdminSession } from '@/lib/auth';
import { logModuleAudit } from '@/lib/clinic-modules';

export async function GET() {
  const session = await getAdminSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito ao Superadministrador.' }, { status: 403 });
  }

  const [plans, modules, coupons, clinicsCount] = await Promise.all([
    sql`
      SELECT p.*, (SELECT COUNT(*) FROM clinic_subscriptions cs WHERE cs.plan_id = p.id) AS total_clinicas
      FROM saas_plans p ORDER BY p.archived ASC, p.price_monthly ASC, p.created_at DESC
    `,
    sql`SELECT * FROM platform_modules ORDER BY sort_order ASC`,
    sql`SELECT * FROM saas_coupons ORDER BY created_at DESC`,
    sql`SELECT COUNT(*) AS c FROM clinics WHERE ativo = TRUE`,
  ]);

  return NextResponse.json({
    success: true,
    plans,
    modules,
    coupons,
    activeClinicsCount: Number(clinicsCount[0]?.c || 0),
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (body.kind === 'plan') {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Nome do plano é obrigatório.' }, { status: 400 });
      const slug = String(body.slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      const priceMonthly = Math.max(0, Number(body.price_monthly) || 0);
      const priceAnnual = Math.max(0, Number(body.price_annual) || 0);
      const isFree = Boolean(body.is_free) || (priceMonthly === 0 && priceAnnual === 0);
      const moduleIds = Array.isArray(body.module_ids) ? body.module_ids.filter((x: unknown): x is string => typeof x === 'string') : [];
      const maxUsers = body.max_users ? Number(body.max_users) : null;
      const trialDays = Math.max(0, Number(body.trial_days) || 0);

      if (body.id) {
        const rows = await sql`
          UPDATE saas_plans SET
            name = ${name}, description = ${body.description ?? null},
            price_monthly = ${priceMonthly}, price_annual = ${priceAnnual},
            is_free = ${isFree}, is_custom = ${Boolean(body.is_custom)},
            trial_days = ${trialDays}, max_users = ${maxUsers},
            module_ids = ${moduleIds}, archived = ${Boolean(body.archived)}, updated_at = NOW()
          WHERE id = ${body.id}::uuid
          RETURNING *
        `;
        await logModuleAudit({ actorId: session.userId, actorName: session.name, scope: 'PLAN', targetId: String(body.id), action: 'UPDATE_PLAN', newValue: { name, priceMonthly, priceAnnual, moduleIds } });
        return NextResponse.json({ success: true, plan: rows[0] });
      } else {
        const rows = await sql`
          INSERT INTO saas_plans (name, slug, description, price_monthly, price_annual, is_free, is_custom, trial_days, max_users, module_ids)
          VALUES (${name}, ${slug}, ${body.description ?? null}, ${priceMonthly}, ${priceAnnual}, ${isFree}, ${Boolean(body.is_custom)}, ${trialDays}, ${maxUsers}, ${moduleIds})
          RETURNING *
        `;
        await logModuleAudit({ actorId: session.userId, actorName: session.name, scope: 'PLAN', targetId: String(rows[0].id), action: 'CREATE_PLAN', newValue: { name, priceMonthly, priceAnnual, moduleIds } });
        return NextResponse.json({ success: true, plan: rows[0] });
      }
    }

    if (body.kind === 'coupon') {
      const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!code) return NextResponse.json({ error: 'Código do cupom obrigatório.' }, { status: 400 });
      const rows = await sql`
        INSERT INTO saas_coupons (code, discount_type, discount_value, max_uses, expires_at, active)
        VALUES (${code}, ${body.discount_type === 'FIXED' ? 'FIXED' : 'PERCENT'}, ${Math.max(0, Number(body.discount_value) || 0)}, ${body.max_uses ? Number(body.max_uses) : null}, ${body.expires_at || null}, ${body.active !== false})
        ON CONFLICT (code) DO UPDATE SET
          discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value,
          max_uses = EXCLUDED.max_uses, expires_at = EXCLUDED.expires_at, active = EXCLUDED.active
        RETURNING *
      `;
      return NextResponse.json({ success: true, coupon: rows[0] });
    }

    if (body.kind === 'global_module') {
      const moduleId = String(body.module_id || '');
      if (!moduleId) return NextResponse.json({ error: 'module_id obrigatório.' }, { status: 400 });
      const rows = await sql`
        UPDATE platform_modules SET
          is_active_global = COALESCE(${typeof body.is_active_global === 'boolean' ? body.is_active_global : null}, is_active_global),
          default_available = COALESCE(${typeof body.default_available === 'boolean' ? body.default_available : null}, default_available)
        WHERE id = ${moduleId}
        RETURNING *
      `;
      if (body.apply_to_all === true && (body.admin_state === 'BLOCKED' || body.admin_state === 'AVAILABLE' || body.admin_state === 'REQUIRED')) {
        await sql`
          INSERT INTO clinic_module_overrides (clinic_id, module_id, admin_state, updated_by, updated_at)
          SELECT id, ${moduleId}, ${body.admin_state}, ${session.name}, NOW() FROM clinics
          ON CONFLICT (clinic_id, module_id) DO UPDATE SET admin_state = EXCLUDED.admin_state, updated_by = EXCLUDED.updated_by, updated_at = NOW()
        `;
      }
      await logModuleAudit({ actorId: session.userId, actorName: session.name, scope: 'GLOBAL', targetId: moduleId, action: 'UPDATE_GLOBAL_MODULE', newValue: body });
      return NextResponse.json({ success: true, module: rows[0] });
    }

    return NextResponse.json({ error: 'Tipo de operação inválido.' }, { status: 400 });
  } catch (err) {
    console.error('[API Admin Planos POST]', err);
    return NextResponse.json({ error: 'Erro ao salvar configuração.' }, { status: 500 });
  }
}
