// tests/email-system.test.ts
// Testes unitários do motor de e-mails Resend: Svix HMAC-SHA256, janelas de relatórios e segurança XSS dos templates.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyResendSvixSignature } from '../src/lib/email-engine';
import { getPeriodWindow } from '../src/lib/email-reports';
import {
  buildAdminDailyExecutiveEmail,
  buildAtendentePeriodicReportEmail,
  buildClinicBillingReminderEmail,
  buildClinicPayoutEmail,
  buildClinicPeriodicReportEmail,
  buildPatientFinancingEmail,
  buildRepresentantePeriodicReportEmail,
} from '../src/lib/email';

function makeSvixHeader(secret: string, id: string, ts: number, rawBody: string): string {
  const keyBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf8');
  const sig = createHmac('sha256', keyBytes).update(`${id}.${ts}.${rawBody}`, 'utf8').digest('base64');
  return `v1,${sig}`;
}

describe('Sistema de E-mails Resend — Svix Webhook, Períodos e Templates', () => {
  it('verifyResendSvixSignature aceita assinatura Svix válida (incluindo múltiplas chaves) e rejeita adulteração/replay', () => {
    const rawKey = Buffer.from('super-secret-resend-webhook-key-32bytes!').toString('base64');
    const secret = `whsec_${rawKey}`;
    const nowMs = 1_780_000_000_000;
    const tsSec = Math.floor(nowMs / 1000);
    const id = 'msg_2abc123';
    const rawBody = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_12345' } });
    const goodSig = makeSvixHeader(secret, id, tsSec, rawBody);

    assert.equal(
      verifyResendSvixSignature({ svixId: id, svixTimestamp: String(tsSec), svixSignature: goodSig, rawBody, secret, nowMs }).valid,
      true
    );

    // Múltiplas assinaturas (rotação de chave)
    assert.equal(
      verifyResendSvixSignature({
        svixId: id,
        svixTimestamp: String(tsSec),
        svixSignature: `v1,aW52YWxpZA== ${goodSig}`,
        rawBody,
        secret,
        nowMs,
      }).valid,
      true
    );

    // Corpo adulterado
    const tampered = verifyResendSvixSignature({
      svixId: id,
      svixTimestamp: String(tsSec),
      svixSignature: goodSig,
      rawBody: rawBody + ' ',
      secret,
      nowMs,
    });
    assert.equal(tampered.valid, false);
    assert.equal(tampered.reason, 'signature_mismatch');

    // Replay > 5 minutos
    const oldTs = tsSec - 600;
    const oldSig = makeSvixHeader(secret, id, oldTs, rawBody);
    const replay = verifyResendSvixSignature({
      svixId: id,
      svixTimestamp: String(oldTs),
      svixSignature: oldSig,
      rawBody,
      secret,
      nowMs,
    });
    assert.equal(replay.valid, false);
    assert.equal(replay.reason, 'timestamp_out_of_window');
  });

  it('getPeriodWindow calcula semana ISO e mês anterior fechado corretamente no dia 1º', () => {
    const firstOfDec = new Date('2026-12-01T11:30:00Z');
    const monthly = getPeriodWindow('monthly', firstOfDec);
    assert.equal(monthly.key, '2026-11');
    assert.equal(monthly.title, 'Mensal');
    assert.equal(monthly.start.toISOString(), '2026-11-01T00:00:00.000Z');

    const midMonth = new Date('2026-11-26T11:30:00Z');
    const monthlyMtd = getPeriodWindow('monthly', midMonth);
    assert.equal(monthlyMtd.key, '2026-11-MTD');

    const weekly = getPeriodWindow('weekly', midMonth);
    assert.equal(weekly.title, 'Semanal');
    assert.match(weekly.key, /^2026-W\d{2}$/);
  });

  it('templates escapam HTML malicioso (anti-XSS) e exibem dados essenciais de relatórios, pagamentos e pacientes', () => {
    const xss = '<script>alert(1)</script>Clínica & Saúde';

    const clinicRep = buildClinicPeriodicReportEmail({
      clinicName: xss,
      periodLabel: '19/11 a 26/11',
      periodTitle: 'Semanal',
      propostasTotal: 12,
      propostasAprovadas: 8,
      taxaAprovacao: 66.67,
      volumeSolicitado: 48000,
      volumeAprovado: 32000,
      repassesPagosValor: 25000,
      repassesPendentesValor: 7000,
      planName: 'Pro',
      subscriptionStatus: 'ACTIVE',
      nextBillingDate: '15/12/2026',
    });
    assert.ok(!clinicRep.html.includes('<script>'));
    assert.ok(clinicRep.html.includes('&lt;script&gt;'));
    assert.ok(clinicRep.html.includes('25.000,00'));

    const repEmail = buildRepresentantePeriodicReportEmail({
      repNome: xss,
      periodLabel: 'Novembro 2026',
      periodTitle: 'Mensal',
      clinicasAtivas: 6,
      clinicasInativas30d: [{ nome: 'Clínica Parada', diasSemAtividade: 45 }],
      propostasPeriodo: 20,
      volumePeriodo: 90000,
      comissaoPeriodo: 1800,
      comissaoAReceber: 950.5,
      comissaoPrevista: 400,
      comissaoPagaPeriodo: 850,
      topClinicas: [{ nome: 'Odonto Top', volume: 40000, comissao: 800 }],
    });
    assert.ok(!repEmail.html.includes('<script>'));
    assert.ok(repEmail.html.includes('Clínica Parada'));
    assert.ok(repEmail.html.includes('950,50'));

    const payout = buildClinicPayoutEmail({
      clinicName: 'Odonto Vida',
      protocol: 'BEN-2026-123456',
      patientName: 'Maria Silva',
      partnerName: 'Konsiga',
      valorBruto: 5000,
      taxaBenavera: 124.5,
      valorLiquido: 4875.5,
      status: 'PAID',
      dataReferencia: '26/11/2026',
    });
    assert.ok(payout.subject.includes('4.875,50'));
    assert.ok(payout.html.includes('BEN-2026-123456'));

    const reminder = buildClinicBillingReminderEmail({
      clinicName: 'Odonto Vida',
      planName: 'Pro',
      amount: 299.9,
      dueDate: '29/11/2026',
      daysLeft: 3,
    });
    assert.ok(reminder.subject.includes('3 dias'));
    assert.ok(reminder.html.includes('299,90'));

    const patient = buildPatientFinancingEmail({
      patientName: 'João <img src=x>',
      clinicName: 'Odonto Vida',
      protocol: 'BEN-2026-999999',
      procedimento: 'Implante',
      valor: 6000,
      status: 'OFFERS_AVAILABLE',
      proposalUrl: 'https://www.benavera.com.br/proposta/abc123',
    });
    assert.ok(!patient.html.includes('<img src=x>'));
    assert.ok(patient.html.includes('https://www.benavera.com.br/proposta/abc123'));

    const atendente = buildAtendentePeriodicReportEmail({
      atendenteName: 'Carlos',
      periodLabel: 'Semanal',
      periodTitle: 'Semanal',
      leadsRecebidos: 14,
      leadsEmAndamento: 5,
      leadsConvertidos: 3,
      followupsAtrasados: 2,
      comissaoAprovadaValor: 600,
      comissaoPagaValor: 300,
    });
    assert.ok(atendente.html.includes('600,00'));

    const exec = buildAdminDailyExecutiveEmail({
      dateLabel: '26/11/2026',
      novosLeadsClinicas24h: 4,
      novosLeadsPacientes24h: 9,
      onboardingsPendentes: 2,
      propostas24h: 7,
      propostasAprovadas24h: 5,
      volumeAprovado24h: 35000,
      mrrAtual: 4500,
      faturasPagasMes: 3800,
      faturasPendentesTotal: 700,
      assinaturasCarencia: 1,
      assinaturasSuspensas: 0,
      comissoesRepAReceber: 1200,
      comissoesAtendentesAprovadas: 450,
      repassesPendentesValor: 12000,
    });
    assert.ok(exec.subject.includes('4.500,00'));
    assert.ok(exec.html.includes('12.000,00'));
  });
});
