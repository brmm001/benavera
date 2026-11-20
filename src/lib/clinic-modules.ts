// src/lib/clinic-modules.ts
// Motor centralizado de Feature Flags, Entitlements, Planos SaaS e Personalização das Clínicas.
//
// Ordem explícita de prioridade das regras:
// 1. Restrições globais (is_active_global = false)
// 2. Bloqueio administrativo (override = BLOCKED)
// 3. Obrigatório administrativo (override = REQUIRED)
// 4. Liberação excepcional administrativa (override = EXCEPTION_FREE)
// 5. Direitos do plano contratado (ou plano padrão gratuito se não houver assinatura)
// 6. Preferência da clínica (enabled_modules[id] === false desativa opcional sem apagar dados)
// 7. Permissão do usuário (allowed_roles)

import { NextResponse } from 'next/server';
import { sql } from './benavera-db';
import { getSession, type SessionPayload } from './auth';

export type AdminModuleState = 'AVAILABLE' | 'BLOCKED' | 'REQUIRED' | 'EXCEPTION_FREE';
export type ModuleCategory =
  | 'inicio'
  | 'financiamentos'
  | 'pacientes_orcamentos'
  | 'ferramentas_comerciais'
  | 'relatorios'
  | 'configuracoes';

export interface ResolvedModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ModuleCategory;
  href: string;
  isCore: boolean;
  isActiveGlobal: boolean;
  defaultAvailable: boolean;
  sortOrder: number;
  allowedRoles: string[];
  adminState: AdminModuleState;
  inPlan: boolean;
  clinicEnabled: boolean;
  roleAllowed: boolean;
  /** Resultado final após todas as regras */
  effectiveEnabled: boolean;
  /** Se a clínica pode ligar/desligar este módulo */
  canToggle: boolean;
  /** Explicação clara do estado efetivo */
  reason: string;
}

export interface ClinicPreferences {
  clinicId: string;
  uiMode: 'simple' | 'complete';
  enabledModules: Record<string, boolean>;
  menuOrder: string[];
  dashboardWidgets: {
    kpis: string[];
    show_recovery: boolean;
    show_modules: boolean;
  };
  quickActions: string[];
  notificationsConfig: {
    email: boolean;
    whatsapp: boolean;
  };
}

export interface ClinicEntitlementsContext {
  session: SessionPayload;
  clinicId: string;
  planName: string;
  subscriptionStatus: string;
  billingCycle: string;
  isExempt: boolean;
  preferences: ClinicPreferences;
  modules: ResolvedModule[];
}

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  inicio: 'Início',
  financiamentos: 'Financiamentos',
  pacientes_orcamentos: 'Pacientes e Orçamentos',
  ferramentas_comerciais: 'Ferramentas Comerciais',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
};

const DEFAULT_PREFS = (clinicId: string): ClinicPreferences => ({
  clinicId,
  uiMode: 'simple',
  enabledModules: {},
  menuOrder: [],
  dashboardWidgets: {
    kpis: ['total_mes', 'volume_solicitado', 'volume_aprovado', 'taxa_aprovacao'],
    show_recovery: true,
    show_modules: true,
  },
  quickActions: ['novo_financiamento', 'simulador', 'recuperacao', 'crm'],
  notificationsConfig: { email: true, whatsapp: true },
});

export async function logModuleAudit(params: {
  clinicId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  scope: 'GLOBAL' | 'PLAN' | 'SUBSCRIPTION' | 'OVERRIDE' | 'PREFERENCE';
  targetId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  try {
    await sql`
      INSERT INTO module_audit_logs (clinic_id, actor_id, actor_name, scope, target_id, action, old_value, new_value)
      VALUES (
        ${params.clinicId ?? null},
        ${params.actorId ?? null},
        ${params.actorName ?? null},
        ${params.scope},
        ${params.targetId},
        ${params.action},
        ${params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null}::jsonb,
        ${params.newValue !== undefined ? JSON.stringify(params.newValue) : null}::jsonb
      )
    `;
  } catch (err) {
    console.error('[ModuleAudit] Erro ao registrar log:', err);
  }
}

export async function resolveClinicEntitlements(
  clinicId: string,
  userRole: string
): Promise<Omit<ClinicEntitlementsContext, 'session'>> {
  const [modulesRows, subRows, defaultPlanRows, overrideRows, prefRows] = await Promise.all([
    sql`SELECT * FROM platform_modules ORDER BY sort_order ASC, name ASC`,
    sql`
      SELECT cs.*, sp.name AS plan_name, sp.module_ids AS plan_module_ids
      FROM clinic_subscriptions cs
      LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
      WHERE cs.clinic_id = ${clinicId}
      LIMIT 1
    `,
    sql`SELECT id, name, module_ids FROM saas_plans WHERE is_free = true AND archived = false ORDER BY created_at ASC LIMIT 1`,
    sql`SELECT module_id, admin_state FROM clinic_module_overrides WHERE clinic_id = ${clinicId}`,
    sql`SELECT * FROM clinic_preferences WHERE clinic_id = ${clinicId} LIMIT 1`,
  ]);

  const sub = subRows[0];
  const fallbackPlan = defaultPlanRows[0];

  const planName = String(sub?.plan_name || fallbackPlan?.name || 'Gratuito Completo');
  const subscriptionStatus = String(sub?.status || 'EXEMPT');
  const billingCycle = String(sub?.billing_cycle || 'LIFETIME_FREE');
  const isExempt = sub ? Boolean(sub.is_exempt) : true;

  const planModuleSet = new Set<string>(
    (sub?.plan_module_ids as string[] | undefined) ||
    (fallbackPlan?.module_ids as string[] | undefined) ||
    []
  );

  const overrideMap = new Map<string, AdminModuleState>();
  for (const ov of overrideRows) {
    overrideMap.set(String(ov.module_id), String(ov.admin_state) as AdminModuleState);
  }

  const prefRow = prefRows[0];
  const base = DEFAULT_PREFS(clinicId);
  const preferences: ClinicPreferences = prefRow
    ? {
        clinicId,
        uiMode: prefRow.ui_mode === 'complete' ? 'complete' : 'simple',
        enabledModules: (prefRow.enabled_modules as Record<string, boolean>) || {},
        menuOrder: Array.isArray(prefRow.menu_order) ? (prefRow.menu_order as string[]) : [],
        dashboardWidgets: {
          ...base.dashboardWidgets,
          ...((prefRow.dashboard_widgets as Record<string, unknown>) || {}),
        },
        quickActions: Array.isArray(prefRow.quick_actions) && prefRow.quick_actions.length > 0
          ? (prefRow.quick_actions as string[])
          : base.quickActions,
        notificationsConfig: {
          ...base.notificationsConfig,
          ...((prefRow.notifications_config as Record<string, boolean>) || {}),
        },
      }
    : base;

  const subscriptionActive = subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIAL' || subscriptionStatus === 'GRACE' || subscriptionStatus === 'EXEMPT';

  const modules: ResolvedModule[] = modulesRows.map((m) => {
    const id = String(m.id);
    const isCore = Boolean(m.is_core);
    const isActiveGlobal = Boolean(m.is_active_global);
    const defaultAvailable = Boolean(m.default_available);
    const allowedRoles = Array.isArray(m.allowed_roles) ? (m.allowed_roles as string[]) : ['CLINIC_ADMIN'];
    const adminState: AdminModuleState = overrideMap.get(id) ?? (defaultAvailable ? 'AVAILABLE' : 'BLOCKED');
    const inPlan = planModuleSet.has(id) || isCore;
    const clinicToggle = preferences.enabledModules[id];
    const clinicEnabled = clinicToggle !== false;
    const roleAllowed = userRole === 'CLINIC_ADMIN' || userRole === 'BENAVERA_ADMIN' || allowedRoles.includes(userRole);

    let effectiveEnabled = false;
    let canToggle = false;
    let reason = 'Disponível';

    // 1. Global security/compliance
    if (!isActiveGlobal) {
      effectiveEnabled = false;
      reason = 'Desativado globalmente pela Benavera';
    }
    // 2. Administrative block
    else if (adminState === 'BLOCKED') {
      effectiveEnabled = false;
      reason = 'Bloqueado administrativamente para esta clínica';
    }
    // 3. Administrative mandatory
    else if (adminState === 'REQUIRED') {
      effectiveEnabled = roleAllowed;
      canToggle = false;
      reason = roleAllowed ? 'Obrigatório pela operação contratada' : 'Sem permissão no seu perfil de usuário';
    }
    // 4. Administrative exception (or 5. Plan entitlement)
    else {
      const entitled = adminState === 'EXCEPTION_FREE' || (subscriptionActive && inPlan);
      if (!entitled) {
        effectiveEnabled = false;
        reason = subscriptionActive ? 'Não incluído no plano atual' : 'Assinatura suspensa ou cancelada';
      } else if (!roleAllowed) {
        effectiveEnabled = false;
        canToggle = false;
        reason = 'Sem permissão no seu perfil de usuário';
      } else {
        canToggle = !isCore;
        effectiveEnabled = isCore ? true : clinicEnabled;
        reason = effectiveEnabled
          ? adminState === 'EXCEPTION_FREE'
            ? 'Liberado como exceção pela Benavera'
            : 'Ativo'
          : 'Desativado nas preferências da clínica (dados preservados)';
      }
    }

    return {
      id,
      name: String(m.name),
      description: String(m.description),
      icon: String(m.icon),
      category: String(m.category) as ModuleCategory,
      href: String(m.href),
      isCore,
      isActiveGlobal,
      defaultAvailable,
      sortOrder: Number(m.sort_order ?? 0),
      allowedRoles,
      adminState,
      inPlan,
      clinicEnabled,
      roleAllowed,
      effectiveEnabled,
      canToggle,
      reason,
    };
  });

  // Sort by clinic's custom menuOrder if configured
  if (preferences.menuOrder.length > 0) {
    const orderIdx = new Map(preferences.menuOrder.map((id, idx) => [id, idx]));
    modules.sort((a, b) => {
      const ia = orderIdx.get(a.id);
      const ib = orderIdx.get(b.id);
      if (ia !== undefined && ib !== undefined) return ia - ib;
      if (ia !== undefined) return -1;
      if (ib !== undefined) return 1;
      return a.sortOrder - b.sortOrder;
    });
  }

  return {
    clinicId,
    planName,
    subscriptionStatus,
    billingCycle,
    isExempt,
    preferences,
    modules,
  };
}

export async function getClinicContext(): Promise<ClinicEntitlementsContext | null> {
  const session = await getSession();
  if (!session || !session.clinicId) return null;
  const resolved = await resolveClinicEntitlements(session.clinicId, session.role);
  return { session, ...resolved };
}

/** Guarda de backend obrigatória para todas as rotas /api/painel/* */
export async function requireClinicModule(moduleId: string): Promise<
  | { ok: true; ctx: ClinicEntitlementsContext }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }
  if (!session.clinicId) {
    return { ok: false, response: NextResponse.json({ error: 'Acesso exclusivo de clínicas.' }, { status: 403 }) };
  }
  const resolved = await resolveClinicEntitlements(session.clinicId, session.role);
  const mod = resolved.modules.find((m) => m.id === moduleId);
  if (!mod || !mod.effectiveEnabled) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: mod?.reason || 'Módulo não habilitado para esta clínica.', moduleId },
        { status: 403 }
      ),
    };
  }
  return { ok: true, ctx: { session, ...resolved } };
}
