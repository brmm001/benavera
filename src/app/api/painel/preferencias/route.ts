// GET /api/painel/preferencias · PATCH /api/painel/preferencias
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { getSession } from '@/lib/auth';
import { getClinicContext, logModuleAudit, resolveClinicEntitlements } from '@/lib/clinic-modules';

export async function GET() {
  const ctx = await getClinicContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  return NextResponse.json({
    success: true,
    planName: ctx.planName,
    subscriptionStatus: ctx.subscriptionStatus,
    preferences: ctx.preferences,
    modules: ctx.modules,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.clinicId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  const clinicId = session.clinicId;

  try {
    const body = await request.json().catch(() => ({}));
    const current = await resolveClinicEntitlements(clinicId, session.role);

    if (body.action === 'restore_default') {
      await sql`DELETE FROM clinic_preferences WHERE clinic_id = ${clinicId}`;
      await logModuleAudit({
        clinicId,
        actorId: session.userId,
        actorName: session.name,
        scope: 'PREFERENCE',
        targetId: clinicId,
        action: 'RESTORE_DEFAULT',
        oldValue: current.preferences,
        newValue: null,
      });
      const refreshed = await resolveClinicEntitlements(clinicId, session.role);
      return NextResponse.json({ success: true, ...refreshed });
    }

    if (body.action === 'disable_all_optional') {
      if (session.role !== 'CLINIC_ADMIN' && session.role !== 'BENAVERA_ADMIN') {
        return NextResponse.json({ error: 'Apenas o proprietário/admin da clínica pode desativar módulos.' }, { status: 403 });
      }
      const nextMap: Record<string, boolean> = { ...current.preferences.enabledModules };
      for (const m of current.modules) {
        if (m.canToggle && !m.isCore) nextMap[m.id] = false;
      }
      await sql`
        INSERT INTO clinic_preferences (clinic_id, enabled_modules, updated_by, updated_at)
        VALUES (${clinicId}, ${JSON.stringify(nextMap)}::jsonb, ${session.name}, NOW())
        ON CONFLICT (clinic_id) DO UPDATE SET enabled_modules = EXCLUDED.enabled_modules, updated_by = EXCLUDED.updated_by, updated_at = NOW()
      `;
      await logModuleAudit({
        clinicId,
        actorId: session.userId,
        actorName: session.name,
        scope: 'PREFERENCE',
        targetId: clinicId,
        action: 'DISABLE_ALL_OPTIONAL',
        oldValue: current.preferences.enabledModules,
        newValue: nextMap,
      });
      const refreshed = await resolveClinicEntitlements(clinicId, session.role);
      return NextResponse.json({ success: true, ...refreshed });
    }

    // Regular preference updates
    const nextUiMode = body.uiMode === 'complete' ? 'complete' : body.uiMode === 'simple' ? 'simple' : current.preferences.uiMode;
    let nextEnabled = { ...current.preferences.enabledModules };
    if (body.enabledModules && typeof body.enabledModules === 'object') {
      if (session.role !== 'CLINIC_ADMIN' && session.role !== 'BENAVERA_ADMIN') {
        return NextResponse.json({ error: 'Apenas o administrador da clínica pode ativar/desativar módulos.' }, { status: 403 });
      }
      for (const [modId, val] of Object.entries(body.enabledModules)) {
        const mod = current.modules.find((m) => m.id === modId);
        if (mod && mod.canToggle && typeof val === 'boolean') {
          nextEnabled[modId] = val;
        }
      }
    }

    const nextMenuOrder = Array.isArray(body.menuOrder)
      ? body.menuOrder.filter((x: unknown): x is string => typeof x === 'string')
      : current.preferences.menuOrder;

    const nextWidgets = body.dashboardWidgets && typeof body.dashboardWidgets === 'object'
      ? { ...current.preferences.dashboardWidgets, ...body.dashboardWidgets }
      : current.preferences.dashboardWidgets;

    const nextQuickActions = Array.isArray(body.quickActions)
      ? body.quickActions.filter((x: unknown): x is string => typeof x === 'string').slice(0, 8)
      : current.preferences.quickActions;

    const nextNotifs = body.notificationsConfig && typeof body.notificationsConfig === 'object'
      ? { ...current.preferences.notificationsConfig, ...body.notificationsConfig }
      : current.preferences.notificationsConfig;

    await sql`
      INSERT INTO clinic_preferences (clinic_id, ui_mode, enabled_modules, menu_order, dashboard_widgets, quick_actions, notifications_config, updated_by, updated_at)
      VALUES (
        ${clinicId},
        ${nextUiMode},
        ${JSON.stringify(nextEnabled)}::jsonb,
        ${nextMenuOrder},
        ${JSON.stringify(nextWidgets)}::jsonb,
        ${nextQuickActions},
        ${JSON.stringify(nextNotifs)}::jsonb,
        ${session.name},
        NOW()
      )
      ON CONFLICT (clinic_id) DO UPDATE SET
        ui_mode = EXCLUDED.ui_mode,
        enabled_modules = EXCLUDED.enabled_modules,
        menu_order = EXCLUDED.menu_order,
        dashboard_widgets = EXCLUDED.dashboard_widgets,
        quick_actions = EXCLUDED.quick_actions,
        notifications_config = EXCLUDED.notifications_config,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `;

    await logModuleAudit({
      clinicId,
      actorId: session.userId,
      actorName: session.name,
      scope: 'PREFERENCE',
      targetId: clinicId,
      action: 'UPDATE_PREFERENCES',
      oldValue: current.preferences,
      newValue: { uiMode: nextUiMode, enabledModules: nextEnabled, menuOrder: nextMenuOrder, quickActions: nextQuickActions },
    });

    const refreshed = await resolveClinicEntitlements(clinicId, session.role);
    return NextResponse.json({ success: true, ...refreshed });
  } catch (err) {
    console.error('[API Preferencias PATCH]', err);
    return NextResponse.json({ error: 'Erro ao salvar preferências.' }, { status: 500 });
  }
}
