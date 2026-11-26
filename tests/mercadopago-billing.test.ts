import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { verifyMercadoPagoSignature, sanitizeMercadoPagoUrl } from '../src/lib/mercadopago';
import { calculateSubscriptionPricing, computeNextPeriod, GRACE_DAYS } from '../src/lib/billing-service';

describe('Mercado Pago Billing — Assinatura Webhook, Preços e Ciclos', () => {
  it('GRACE_DAYS está configurado em 7 dias', () => {
    assert.equal(GRACE_DAYS, 7);
  });

  it('verifyMercadoPagoSignature aceita assinatura HMAC-SHA256 válida (segundos e milissegundos) e rejeita adulterações/replay', () => {
    const secret = 'mp_webhook_secret_test_12345';
    const nowMs = 1795600000000;
    const tsSec = Math.floor(nowMs / 1000);
    const dataId = 'PAY12345ABC';
    const reqId = 'req-uuid-999';

    const manifest = `id:${dataId.toLowerCase()};request-id:${reqId};ts:${tsSec};`;
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

    const ok = verifyMercadoPagoSignature({
      xSignature: `ts=${tsSec},v1=${v1}`,
      xRequestId: reqId,
      dataId,
      secret,
      nowMs,
    });
    assert.equal(ok.valid, true);

    // Suporta ts em milissegundos
    const manifestMs = `id:${dataId.toLowerCase()};request-id:${reqId};ts:${nowMs};`;
    const v1Ms = createHmac('sha256', secret).update(manifestMs).digest('hex');
    const okMs = verifyMercadoPagoSignature({
      xSignature: `ts=${nowMs},v1=${v1Ms}`,
      xRequestId: reqId,
      dataId,
      secret,
      nowMs,
    });
    assert.equal(okMs.valid, true);

    // Assinatura adulterada -> inválida
    const badSig = verifyMercadoPagoSignature({
      xSignature: `ts=${tsSec},v1=${'0'.repeat(64)}`,
      xRequestId: reqId,
      dataId,
      secret,
      nowMs,
    });
    assert.equal(badSig.valid, false);
    assert.equal(badSig.reason, 'signature_mismatch');

    // Replay antigo (> 5 min) -> bloqueado
    const oldTs = tsSec - 600;
    const oldManifest = `id:${dataId.toLowerCase()};request-id:${reqId};ts:${oldTs};`;
    const oldV1 = createHmac('sha256', secret).update(oldManifest).digest('hex');
    const replay = verifyMercadoPagoSignature({
      xSignature: `ts=${oldTs},v1=${oldV1}`,
      xRequestId: reqId,
      dataId,
      secret,
      nowMs,
    });
    assert.equal(replay.valid, false);
    assert.equal(replay.reason, 'timestamp_out_of_window');
  });

  it('sanitizeMercadoPagoUrl aceita apenas domínios oficiais HTTPS do Mercado Pago', () => {
    assert.equal(
      sanitizeMercadoPagoUrl('https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=123'),
      'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=123'
    );
    assert.equal(sanitizeMercadoPagoUrl('http://www.mercadopago.com.br/checkout'), null);
    assert.equal(sanitizeMercadoPagoUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeMercadoPagoUrl('https://evil.example.com/mercadopago.com.br'), null);
  });

  it('calculateSubscriptionPricing calcula mensal, anual, preço customizado, desconto e cupons corretamente', () => {
    const proPlan = { price_monthly: 299.9, price_annual: 2990, is_free: false };

    const monthly = calculateSubscriptionPricing({ plan: proPlan, cycle: 'MONTHLY' });
    assert.equal(monthly.finalAmount, 299.9);
    assert.equal(monthly.isFree, false);

    const annualWithCoupon = calculateSubscriptionPricing({
      plan: proPlan,
      cycle: 'ANNUAL',
      coupon: { code: 'BENA10', discount_type: 'PERCENT', discount_value: 10, active: true },
    });
    assert.equal(annualWithCoupon.baseAmount, 2990);
    assert.equal(annualWithCoupon.discountAmount, 299);
    assert.equal(annualWithCoupon.finalAmount, 2691);
    assert.equal(annualWithCoupon.appliedCoupon, 'BENA10');

    const fixedCoupon = calculateSubscriptionPricing({
      plan: proPlan,
      cycle: 'MONTHLY',
      customPrice: 200,
      discountPercent: 10, // -> 180
      coupon: { code: 'MENOS30', discount_type: 'FIXED', discount_value: 30, active: true }, // -> 150
    });
    assert.equal(fixedCoupon.finalAmount, 150);

    // Cupom expirado é ignorado
    const expired = calculateSubscriptionPricing({
      plan: proPlan,
      cycle: 'MONTHLY',
      coupon: {
        code: 'OLD',
        discount_type: 'PERCENT',
        discount_value: 50,
        active: true,
        expires_at: '2020-01-01T00:00:00Z',
      },
      nowMs: Date.parse('2026-11-26T12:00:00Z'),
    });
    assert.equal(expired.finalAmount, 299.9);
    assert.equal(expired.appliedCoupon, null);
  });

  it('computeNextPeriod preserva dias pagos em renovação antecipada e reinicia de agora se vencido', () => {
    const now = new Date('2026-11-26T12:00:00Z');
    const futureEnd = new Date('2026-12-10T12:00:00Z');
    const early = computeNextPeriod({ currentPeriodEnd: futureEnd, cycle: 'MONTHLY', now });
    assert.equal(early.periodStart.toISOString(), '2026-12-10T12:00:00.000Z');
    assert.equal(early.periodEnd.toISOString(), '2027-01-10T12:00:00.000Z');

    const pastEnd = new Date('2026-10-01T12:00:00Z');
    const overdue = computeNextPeriod({ currentPeriodEnd: pastEnd, cycle: 'ANNUAL', now });
    assert.equal(overdue.periodStart.toISOString(), '2026-11-26T12:00:00.000Z');
    assert.equal(overdue.periodEnd.toISOString(), '2027-11-26T12:00:00.000Z');
  });
});
