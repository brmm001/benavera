'use client';
// src/components/ClinicSubscriptionBanner.tsx
// Exibe aviso de carência/suspensão e redireciona páginas pagas bloqueadas para /painel/assinatura,
// mantendo acesso livre a contratos antigos (/financiamentos), repasses (/repasses) e configurações.

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';

interface Props {
  subscriptionStatus: string;
  subscriptionBlocked: boolean;
  graceUntil: string | null;
  trialEndsAt: string | null;
}

const ALLOWED_WHEN_SUSPENDED_PREFIXES = [
  '/painel/assinatura',
  '/financiamentos',
  '/repasses',
  '/dashboard',
  '/configuracoes',
  '/equipe',
];

function isAllowedWhenSuspended(pathname: string): boolean {
  return ALLOWED_WHEN_SUSPENDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function ClinicSubscriptionBanner({
  subscriptionStatus,
  subscriptionBlocked,
  graceUntil,
  trialEndsAt,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (subscriptionBlocked && pathname && !isAllowedWhenSuspended(pathname)) {
      router.replace('/painel/assinatura?blocked=1');
    }
  }, [subscriptionBlocked, pathname, router]);

  if (subscriptionBlocked && pathname !== '/painel/assinatura') {
    return (
      <div
        style={{
          background: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>
          <Lock size={16} style={{ flexShrink: 0 }} />
          <span>
            Assinatura suspensa por pendência financeira. Contratos antigos e repasses continuam liberados para consulta, mas novas solicitações e módulos pagos estão bloqueados.
          </span>
        </div>
        <Link
          href="/painel/assinatura"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: '#dc2626',
            color: 'white',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <CreditCard size={14} /> Regularizar agora
        </Link>
      </div>
    );
  }

  if (subscriptionStatus === 'GRACE') {
    const untilText = graceUntil ? new Date(graceUntil).toLocaleDateString('pt-BR') : 'breve';
    return (
      <div
        style={{
          background: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          padding: '11px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e', fontSize: '13px', fontWeight: '600' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>
            Mensalidade em período de carência até <strong>{untilText}</strong>. Regularize para evitar o bloqueio de novos financiamentos e módulos do painel.
          </span>
        </div>
        <Link
          href="/painel/assinatura"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: '#d97706',
            color: 'white',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <CreditCard size={14} /> Pagar mensalidade
        </Link>
      </div>
    );
  }

  if (subscriptionStatus === 'TRIAL' && trialEndsAt) {
    const daysLeft = Math.ceil((Date.parse(trialEndsAt) - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 5 && daysLeft >= 0) {
      return (
        <div
          style={{
            background: '#eef2ff',
            borderBottom: '1px solid #c7d2fe',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#3730a3', fontSize: '13px', fontWeight: '600' }}>
            Seu período de teste gratuito termina em {daysLeft === 0 ? 'hoje' : `${daysLeft} dia(s)`}. Escolha seu plano para continuar sem interrupções.
          </span>
          <Link
            href="/painel/assinatura"
            style={{
              padding: '6px 14px',
              background: '#4040ca',
              color: 'white',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              textDecoration: 'none',
            }}
          >
            Escolher plano →
          </Link>
        </div>
      );
    }
  }

  return null;
}
