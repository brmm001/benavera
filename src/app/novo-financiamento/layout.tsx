import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Lock } from 'lucide-react';
import { ClinicLayoutShell } from '@/components/ClinicLayoutShell';
import { getClinicContext } from '@/lib/clinic-modules';

export const dynamic = 'force-dynamic';

export default async function NovoFinanciamentoLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getClinicContext();

  if (ctx && ctx.subscriptionBlocked) {
    redirect('/painel/assinatura?blocked=1');
  }

  if (ctx && !ctx.allowNewApplications) {
    return (
      <ClinicLayoutShell>
        <div className="bv-page">
          <div
            className="bv-card"
            style={{
              maxWidth: '640px',
              margin: '40px auto',
              padding: '36px 32px',
              textAlign: 'center',
              borderColor: '#fde68a',
              background: '#fffdf7',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#fef3c7',
                color: '#b45309',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Lock size={26} />
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: '800', color: '#1c1d4c' }}>
              Novos financiamentos temporariamente bloqueados
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#475569', lineHeight: 1.65 }}>
              {ctx.newApplicationsBlockReason ||
                'A criação de novas solicitações de financiamento está bloqueada para esta conta no momento. Todas as demais ferramentas do painel permanecem totalmente liberadas.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/dashboard" className="bv-btn">
                Voltar ao início
              </Link>
              <Link href="/painel/simulador" className="bv-btn soft">
                Abrir Simulador
              </Link>
              <Link href="/painel/crm" className="bv-btn ghost">
                Ir para o CRM
              </Link>
            </div>
          </div>
        </div>
      </ClinicLayoutShell>
    );
  }

  return <ClinicLayoutShell>{children}</ClinicLayoutShell>;
}
