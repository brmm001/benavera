import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import http from 'node:http';
import {
  verifyMercadoPagoSignature,
  sanitizeMercadoPagoUrl,
  createMpPreapproval,
  createMpBoletoPayment,
  cancelMpPreapprovalVerified,
} from '../src/lib/mercadopago';
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

  it('Checkout Transparente: createMpPreapproval envia card_token_id + status authorized e createMpBoletoPayment emite bolbradesco', async () => {
    const received: Array<{ path: string; body: Record<string, unknown> }> = [];
    const server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      received.push({ path: req.url || '', body });

      if (req.url === '/preapproval') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'pre_transp_1', status: body.status }));
        return;
      }
      if (req.url === '/v1/payments') {
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            id: '987654',
            status: 'pending',
            barcode: { content: '23791234500000299900000012345678901234567890' },
            transaction_details: {
              digitable_line: '23790.00009 12345.678901 23456.789012 1 23450000029990',
              external_resource_url: 'https://www.mercadopago.com.br/payments/987654/ticket?caller_id=1',
            },
          })
        );
        return;
      }
      res.writeHead(404).end();
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    const prevBase = process.env.MERCADOPAGO_API_BASE;
    const prevToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    process.env.MERCADOPAGO_API_BASE = `http://127.0.0.1:${addr.port}`;
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-unit-token';

    try {
      const pre = await createMpPreapproval({
        reason: 'Benavera Pro',
        externalReference: 'inv-1',
        payerEmail: 'clinica@test.com',
        amount: 299.9,
        frequency: 1,
        frequencyType: 'months',
        backUrl: 'https://www.benavera.com.br/painel/assinatura',
        idempotencyKey: 'key-1',
        cardTokenId: 'tok_card_abc123456',
      });
      assert.equal(pre.status, 'authorized');
      assert.equal(received[0].body.card_token_id, 'tok_card_abc123456');
      assert.equal(received[0].body.status, 'authorized');

      const bol = await createMpBoletoPayment({
        amount: 299.9,
        description: 'Benavera Pro',
        externalReference: 'inv-2',
        payerEmail: 'clinica@test.com',
        payerFullName: 'Maria Silva',
        payerDocument: '12.345.678/0001-95',
        payerAddress: {
          zipCode: '89010-000',
          streetName: 'Rua XV de Novembro',
          streetNumber: '100',
          neighborhood: 'Centro',
          city: 'Blumenau',
          federalUnit: 'sc',
        },
        idempotencyKey: 'key-2',
      });
      assert.equal(bol.id, '987654');
      assert.equal(bol.digitableLine, '23790.00009 12345.678901 23456.789012 1 23450000029990');
      assert.ok(bol.pdfUrl?.startsWith('https://www.mercadopago.com.br/payments/987654/ticket'));
      assert.equal(received[1].body.payment_method_id, 'bolbradesco');

      // Valida erro claro para documento inválido
      await assert.rejects(
        () =>
          createMpBoletoPayment({
            amount: 100,
            description: 'Teste',
            externalReference: 'inv-3',
            payerEmail: 'a@b.com',
            payerFullName: 'Teste',
            payerDocument: '123',
            payerAddress: {
              zipCode: '89010000',
              streetName: 'Rua A',
              streetNumber: '1',
              neighborhood: 'Centro',
              city: 'Blumenau',
              federalUnit: 'SC',
            },
            idempotencyKey: 'key-3',
          }),
        /CPF.*CNPJ/
      );
    } finally {
      server.close();
      if (prevBase === undefined) delete process.env.MERCADOPAGO_API_BASE;
      else process.env.MERCADOPAGO_API_BASE = prevBase;
      if (prevToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      else process.env.MERCADOPAGO_ACCESS_TOKEN = prevToken;
    }
  });

  it('cancelMpPreapprovalVerified confirma cancelamento, trata já-cancelada/404 e lança erro se MP recusar', async () => {
    const statuses: Record<string, string> = {
      pre_ok: 'authorized',
      pre_already: 'cancelled',
      pre_stuck: 'authorized',
    };

    const server = http.createServer(async (req, res) => {
      const id = (req.url || '').split('/')[2];
      if (req.method === 'PUT') {
        if (id === 'pre_ok') {
          statuses[id] = 'cancelled';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ id, status: 'cancelled' }));
        }
        if (id === 'pre_already') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Cannot modify a cancelled preapproval' }));
        }
        if (id === 'pre_missing') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Not found' }));
        }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'Internal MP failure' }));
      }
      if (req.method === 'GET') {
        if (!statuses[id]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ message: 'Not found' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ id, status: statuses[id] }));
      }
      res.writeHead(404).end();
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    const prevBase = process.env.MERCADOPAGO_API_BASE;
    const prevToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    process.env.MERCADOPAGO_API_BASE = `http://127.0.0.1:${addr.port}`;
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-unit-token';

    try {
      const r1 = await cancelMpPreapprovalVerified('pre_ok');
      assert.equal(r1.status, 'cancelled');
      assert.equal(r1.alreadyCancelled, false);

      const r2 = await cancelMpPreapprovalVerified('pre_already');
      assert.equal(r2.status, 'cancelled');
      assert.equal(r2.alreadyCancelled, true);

      const r3 = await cancelMpPreapprovalVerified('pre_missing');
      assert.equal(r3.status, 'not_found');

      // Se MP falhar e o status continuar authorized, DEVE lançar erro (jamais silenciar!)
      await assert.rejects(() => cancelMpPreapprovalVerified('pre_stuck'), /não confirmou|Não foi possível cancelar/i);
    } finally {
      server.closeAllConnections?.();
      server.close();
      if (prevBase === undefined) delete process.env.MERCADOPAGO_API_BASE;
      else process.env.MERCADOPAGO_API_BASE = prevBase;
      if (prevToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      else process.env.MERCADOPAGO_ACCESS_TOKEN = prevToken;
    }
  });
});
