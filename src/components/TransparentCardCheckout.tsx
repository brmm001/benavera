'use client';
// src/components/TransparentCardCheckout.tsx
// Checkout Transparente PCI-DSS (SAQ-A) via Mercado Pago JS SDK v2 (CardPayment Brick).
// Número do cartão, validade e CVV são digitados exclusivamente nos iframes oficiais do Mercado Pago
// e tokenizados em `card_token_id` antes de qualquer envio ao servidor da Benavera.

import { useEffect, useId, useRef, useState } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';

interface MpBrickController {
  unmount?: () => void;
}

interface MpCardFormData {
  token?: string;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
}

interface MpInstance {
  bricks: () => {
    create: (
      brick: string,
      containerId: string,
      settings: Record<string, unknown>
    ) => Promise<MpBrickController>;
  };
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MpInstance;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadMercadoPagoSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.mercadopago.com/js/v2"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar SDK do Mercado Pago.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error('Não foi possível carregar o SDK oficial do Mercado Pago.'));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

interface Props {
  publicKey: string;
  amount: number;
  payerEmail: string;
  planName: string;
  cycleLabel: string;
  onTokenSubmit: (payload: { cardTokenId: string; payerEmail?: string }) => Promise<void>;
}

export function TransparentCardCheckout({
  publicKey,
  amount,
  payerEmail,
  planName,
  cycleLabel,
  onTokenSubmit,
}: Props) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `mp-card-brick-${reactId}`;
  const submitRef = useRef(onTokenSubmit);
  submitRef.current = onTokenSubmit;

  const [ready, setReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let controller: MpBrickController | null = null;

    setReady(false);
    setSdkError(null);

    if (!publicKey) {
      setSdkError('Chave pública do Mercado Pago não configurada neste ambiente.');
      return;
    }

    (async () => {
      try {
        await loadMercadoPagoSdk();
        if (!active || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();

        controller = await bricksBuilder.create('cardPayment', containerId, {
          initialization: {
            amount: Number(amount.toFixed(2)),
            payer: {
              email: payerEmail || undefined,
            },
          },
          customization: {
            paymentMethods: {
              maxInstallments: 1,
            },
            visual: {
              style: {
                theme: 'default',
                customVariables: {
                  baseColor: '#4040ca',
                  borderRadiusMedium: '10px',
                },
              },
              texts: {
                formTitle: `Cartão para assinatura — ${planName} (${cycleLabel})`,
                formSubmit: 'Confirmar assinatura recorrente',
              },
            },
          },
          callbacks: {
            onReady: () => {
              if (active) setReady(true);
            },
            onSubmit: async (cardFormData: MpCardFormData) => {
              const token = String(cardFormData?.token || '').trim();
              if (!token) {
                throw new Error('Não foi possível tokenizar o cartão. Revise os dados e tente novamente.');
              }
              await submitRef.current({
                cardTokenId: token,
                payerEmail: cardFormData?.payer?.email || payerEmail || undefined,
              });
            },
            onError: (err: unknown) => {
              if (!active) return;
              const msg =
                err && typeof err === 'object' && 'message' in err
                  ? String((err as { message?: unknown }).message || '')
                  : 'Erro no formulário de cartão do Mercado Pago.';
              setSdkError(msg || 'Erro ao inicializar o formulário de cartão.');
            },
          },
        });
      } catch (err) {
        if (active) {
          setSdkError(err instanceof Error ? err.message : 'Erro ao carregar checkout transparente.');
        }
      }
    })();

    return () => {
      active = false;
      try {
        controller?.unmount?.();
      } catch {
        // silencioso no unmount
      }
    };
  }, [publicKey, amount, payerEmail, planName, cycleLabel, containerId]);

  if (sdkError) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
        <span>{sdkError}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#047857',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontWeight: '600',
        }}
      >
        <Lock size={13} />
        Ambiente criptografado Mercado Pago — seus dados de cartão são tokenizados direto no gateway e nunca trafegam pelo servidor Benavera.
      </div>
      {!ready && (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Carregando formulário seguro do Mercado Pago…
        </div>
      )}
      <div id={containerId} />
    </div>
  );
}
