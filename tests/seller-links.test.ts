import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCommissionAmount,
  calculateSellerLinkPricing,
  generateSellerLinkCode,
  normalizeSellerLinkCode,
  validateSellerLinkOffer,
} from '../src/lib/seller-links';

describe('Seller Signup Links — Alçadas, Preços e Comissões Separadas', () => {
  it('generateSellerLinkCode e normalizeSellerLinkCode geram e normalizam códigos URL-safe', () => {
    const code = generateSellerLinkCode('BV');
    assert.match(code, /^BV-[A-Z2-9]{8}$/);
    assert.equal(normalizeSellerLinkCode(`  ${code.toLowerCase()}!! `), code);
  });

  it('validateSellerLinkOffer bloqueia desconto e carência acima da alçada pré-autorizada pelo Admin', () => {
    const noAuthDisc = validateSellerLinkOffer({
      discountPercent: 10,
      trialDays: 0,
      maxDiscountPercent: 0,
      maxTrialDays: 14,
    });
    assert.equal(noAuthDisc.ok, false);

    const overDisc = validateSellerLinkOffer({
      discountPercent: 25,
      trialDays: 14,
      maxDiscountPercent: 20,
      maxTrialDays: 14,
    });
    assert.equal(overDisc.ok, false);

    const overTrial = validateSellerLinkOffer({
      discountPercent: 10,
      trialDays: 30,
      maxDiscountPercent: 20,
      maxTrialDays: 14,
    });
    assert.equal(overTrial.ok, false);

    const valid = validateSellerLinkOffer({
      discountPercent: 15,
      trialDays: 14,
      maxDiscountPercent: 20,
      maxTrialDays: 14,
    });
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.discountPercent, 15);
      assert.equal(valid.trialDays, 14);
    }
  });

  it('calculateSellerLinkPricing e calculateCommissionAmount calculam valor líquido e comissão separada corretamente', () => {
    const pricing = calculateSellerLinkPricing({
      plan: { price_monthly: 299.9, price_annual: 2999, is_free: false },
      cycle: 'MONTHLY',
      discountPercent: 10,
      coupon: { code: 'BEMVINDO', discount_type: 'FIXED', discount_value: 20, active: true },
    });
    // 299.90 * 0.90 = 269.91 - 20 = 249.91
    assert.equal(pricing.finalAmount, 249.91);
    assert.equal(pricing.appliedCoupon, 'BEMVINDO');

    // Comissão 15% de R$ 249,91 = R$ 37,49
    assert.equal(calculateCommissionAmount(pricing.finalAmount, 15), 37.49);
    // Comissão 0% ou valor 0
    assert.equal(calculateCommissionAmount(249.91, 0), 0);
  });
});
