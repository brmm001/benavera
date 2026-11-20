// src/components/ModuleGate.tsx
// Bloqueio server-side de página quando um módulo está desativado ou bloqueado para a clínica.
import Link from 'next/link';
import { Lock, Sliders } from 'lucide-react';
import { getClinicContext, type ClinicEntitlementsContext } from '@/lib/clinic-modules';

export async function withModuleGate(moduleId: string): Promise<
  | { allowed: true; ctx: ClinicEntitlementsContext }
  | { allowed: false; element: React.ReactNode }
> {
  const ctx = await getClinicContext();
  if (!ctx) {
    return {
      allowed: false,
      element: (
        <div className="bv-page">
          <div className="bv-empty">Sessão expirada. Faça login novamente.</div>
        </div>
      ),
    };
  }

  const mod = ctx.modules.find((m) => m.id === moduleId);
  if (!mod || !mod.effectiveEnabled) {
    return {
      allowed: false,
      element: (
        <div className="bv-page">
          <div className="bv-card" style={{ maxWidth: '560px', margin: '48px auto', textAlign: 'center', padding: '40px 28px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Lock size={24} />
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '800', color: '#1c1d4c' }}>
              {mod ? mod.name : 'Módulo indisponível'}
            </h1>
            <p style={{ margin: '0 0 22px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
              {mod?.reason || 'Este módulo não está habilitado para a sua clínica no momento.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/dashboard" className="bv-btn ghost">Voltar ao Início</Link>
              {mod?.canToggle && (
                <Link href="/painel/modulos" className="bv-btn">
                  <Sliders size={15} /> Gerenciar Módulos
                </Link>
              )}
            </div>
          </div>
        </div>
      ),
    };
  }

  return { allowed: true, ctx };
}
