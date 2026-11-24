import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearKonsigaTokenCache,
  computeFirstDueDate,
  formatDateOnly,
  getKonsigaSignatureLink,
  konsigaAdapter,
  normalizeKonsigaStatus,
  parseBankDetails,
  resolveCouncilName,
  resolveKonsigaAuthEndpoint,
  sendKonsigaConfirmationToken,
} from '../src/lib/partners/konsiga';
import {
  isValidKonsigaBasicAuth,
  normalizeKonsigaWebhookPayload,
} from '../src/lib/partners/konsiga-webhook';
import { PartnerHttpError, partnerFetch } from '../src/lib/partners/http';
import { getAdapter, listRegisteredSlugs } from '../src/lib/partners/registry';

const KONSIGA_ENV_KEYS = [
  'KONSIGA_USERNAME',
  'KONSIGA_PASSWORD',
  'KONSIGA_BASE_URL',
  'KONSIGA_AUTH_URL',
  'KONSIGA_CNPJ_CONSOLIDADOR',
  'KONSIGA_TIMEOUT_MS',
] as const;

function withEnv(overrides: Partial<Record<(typeof KONSIGA_ENV_KEYS)[number], string | undefined>>, fn: () => Promise<void> | void) {
  const backup: Record<string, string | undefined> = {};
  for (const key of KONSIGA_ENV_KEYS) {
    backup[key] = process.env[key];
    if (key in overrides) {
      const val = overrides[key];
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  }
  clearKonsigaTokenCache();
  const restore = () => {
    for (const key of KONSIGA_ENV_KEYS) {
      if (backup[key] === undefined) delete process.env[key];
      else process.env[key] = backup[key];
    }
    clearKonsigaTokenCache();
  };

  try {
    const res = fn();
    if (res && typeof (res as Promise<void>).then === 'function') {
      return (res as Promise<void>).finally(restore);
    }
    restore();
    return;
  } catch (err) {
    restore();
    throw err;
  }
}

test('registry exposes both parcelex and konsiga adapters', () => {
  const slugs = listRegisteredSlugs();
  assert.ok(slugs.includes('parcelex'));
  assert.ok(slugs.includes('konsiga'));
  assert.equal(getAdapter('konsiga'), konsigaAdapter);
});

test('resolveKonsigaAuthEndpoint normalizes full and base HTTPS URLs without duplicating /access_token', () => {
  assert.equal(
    resolveKonsigaAuthEndpoint('https://auth-2.b2egroup.com.br/api/access_token'),
    'https://auth-2.b2egroup.com.br/api/access_token'
  );
  assert.equal(
    resolveKonsigaAuthEndpoint('https://auth-2.b2egroup.com.br/api/access_token/'),
    'https://auth-2.b2egroup.com.br/api/access_token'
  );
  assert.equal(
    resolveKonsigaAuthEndpoint('https://sso-homolog.b2esistemas.com.br/api'),
    'https://sso-homolog.b2esistemas.com.br/api/access_token'
  );
  assert.equal(resolveKonsigaAuthEndpoint('http://auth-2.b2egroup.com.br/api/access_token'), null);
  assert.equal(resolveKonsigaAuthEndpoint('not-a-url'), null);
});

test('konsigaAdapter.isConfigured validates HTTPS and allows optional KONSIGA_CNPJ_CONSOLIDADOR', () => {
  withEnv(
    {
      KONSIGA_USERNAME: 'user_test',
      KONSIGA_PASSWORD: 'secret_password',
      KONSIGA_BASE_URL: 'https://integracao-api-hml.konsiga.com.br/v1',
      KONSIGA_AUTH_URL: 'https://sso-homolog.b2esistemas.com.br/api/access_token',
      KONSIGA_CNPJ_CONSOLIDADOR: undefined,
    },
    () => {
      assert.equal(konsigaAdapter.isConfigured(), true);
    }
  );

  withEnv(
    {
      KONSIGA_USERNAME: 'user_test',
      KONSIGA_PASSWORD: 'secret_password',
      KONSIGA_BASE_URL: 'http://insecure.example.com/v1',
      KONSIGA_AUTH_URL: 'https://sso-homolog.b2esistemas.com.br/api/access_token',
    },
    () => {
      assert.equal(konsigaAdapter.isConfigured(), false);
    }
  );

  withEnv(
    {
      KONSIGA_USERNAME: undefined,
      KONSIGA_PASSWORD: 'secret_password',
      KONSIGA_BASE_URL: 'https://integracao-api-hml.konsiga.com.br/v1',
      KONSIGA_AUTH_URL: 'https://sso-homolog.b2esistemas.com.br/api/access_token',
    },
    () => {
      assert.equal(konsigaAdapter.isConfigured(), false);
    }
  );
});

test('normalizeKonsigaStatus maps all documented Konsiga v1.4 statuses correctly', () => {
  assert.equal(normalizeKonsigaStatus('APROVADO'), 'APPROVED');
  assert.equal(normalizeKonsigaStatus('APROVADO COM AVALISTA'), 'APPROVED');
  assert.equal(normalizeKonsigaStatus('CRÉDITO EFETUADO NA CONTA INFORMADA'), 'APPROVED');
  assert.equal(normalizeKonsigaStatus('CREDITO EFETUADO NA CONTA INFORMADA'), 'APPROVED');

  assert.equal(normalizeKonsigaStatus('RECUSADO'), 'DENIED');
  assert.equal(normalizeKonsigaStatus('RECUSADO AUTOMATICAMENTE'), 'DENIED');
  assert.equal(normalizeKonsigaStatus('RECUSADO - SOLICITAR AVALISTA'), 'DENIED');
  assert.equal(normalizeKonsigaStatus('RECUSADO - DIRECIONAR PARA ENTRADA'), 'DENIED');
  assert.equal(normalizeKonsigaStatus('RECUSADO - DIRECIONAR PARA CARTÃO RECORRENTE'), 'DENIED');

  assert.equal(normalizeKonsigaStatus('CANCELADA VIA SISTEMA KONSIGAPAY'), 'CANCELLED');
  assert.equal(normalizeKonsigaStatus('CANCELADO'), 'CANCELLED');

  assert.equal(normalizeKonsigaStatus('PROPOSTA EXPIRADA'), 'ABANDONED');

  assert.equal(normalizeKonsigaStatus('PROSSEGUIR CADASTRO'), 'IN_PROGRESS');
  assert.equal(normalizeKonsigaStatus('AGUARDANDO ANÁLISE'), 'IN_PROGRESS');
  assert.equal(normalizeKonsigaStatus('AGUARDANDO ASSINATURA DO CONTRATO PELO PACIENTE'), 'IN_PROGRESS');
  assert.equal(normalizeKonsigaStatus('PRÉ-APROVADO MEDIANTE ENTRADA'), 'IN_PROGRESS');
  assert.equal(normalizeKonsigaStatus('GERAÇÃO DE CCB PENDENTE'), 'IN_PROGRESS');
});

test('parseBankDetails, resolveCouncilName, computeFirstDueDate and formatDateOnly work accurately', () => {
  assert.deepEqual(
    parseBankDetails({
      bankCode: '237 - Bradesco',
      agency: '0034-5',
      account: '123456-7',
      accountType: 'Conta Corrente',
    }),
    {
      codigoBanco: 237,
      agencia: '0034',
      digitoAgencia: '5',
      tipoConta: 1,
      conta: 123456,
      DigitoConta: '7',
    }
  );

  assert.deepEqual(
    parseBankDetails({
      bankCode: '104',
      agency: '1234',
      account: '987654',
      accountType: 'Poupança',
    }),
    {
      codigoBanco: 104,
      agencia: '1234',
      digitoAgencia: '0',
      tipoConta: 2,
      conta: 98765,
      DigitoConta: '4',
    }
  );

  assert.equal(resolveCouncilName('CRO'), 'Conselho Regional de Odontologia');
  assert.equal(resolveCouncilName('crm'), 'Conselho Regional de Medicina');
  assert.equal(resolveCouncilName('Conselho Customizado'), 'Conselho Customizado');

  assert.equal(computeFirstDueDate(new Date('2026-11-24T12:00:00Z')), '2027-01-08');
  assert.equal(formatDateOnly(new Date('1987-07-05T00:00:00Z')), '1987-07-05');
  assert.equal(formatDateOnly('1992-03-14T10:00:00Z'), '1992-03-14');
});

test('isValidKonsigaBasicAuth enforces timing-safe Basic Auth including passwords with colons', () => {
  const validHeader = 'Basic ' + Buffer.from('konsiga_cb:p@ss:with:colon').toString('base64');
  assert.equal(isValidKonsigaBasicAuth(validHeader, 'konsiga_cb', 'p@ss:with:colon'), true);
  assert.equal(isValidKonsigaBasicAuth(validHeader, 'konsiga_cb', 'wrong'), false);
  assert.equal(isValidKonsigaBasicAuth(validHeader, 'other', 'p@ss:with:colon'), false);
  assert.equal(isValidKonsigaBasicAuth(null, 'konsiga_cb', 'p@ss:with:colon'), false);
  assert.equal(isValidKonsigaBasicAuth(validHeader, '', 'p@ss:with:colon'), false);
  assert.equal(isValidKonsigaBasicAuth('Bearer abc', 'konsiga_cb', 'p@ss:with:colon'), false);
});

test('normalizeKonsigaWebhookPayload converts Konsiga callback JSON and handles missing status or bad JSON', () => {
  const normalized = JSON.parse(
    normalizeKonsigaWebhookPayload(
      JSON.stringify({
        Transacao: '7a9daa56-ca69-4e5a-a06d-dc50165d1d2c',
        Status: 'AGUARDANDO ASSINATURA DO CONTRATO PELO PACIENTE',
      })
    )
  );
  assert.deepEqual(normalized, {
    transactionId: '7a9daa56-ca69-4e5a-a06d-dc50165d1d2c',
    orderId: '7a9daa56-ca69-4e5a-a06d-dc50165d1d2c',
    action: 'AGUARDANDO ASSINATURA DO CONTRATO PELO PACIENTE',
    message: 'AGUARDANDO ASSINATURA DO CONTRATO PELO PACIENTE',
  });

  const withoutStatus = JSON.parse(
    normalizeKonsigaWebhookPayload(JSON.stringify({ transacao: '7a9daa56-ca69-4e5a-a06d-dc50165d1d2c' }))
  );
  assert.equal(withoutStatus.transactionId, '7a9daa56-ca69-4e5a-a06d-dc50165d1d2c');
  assert.equal('action' in withoutStatus, false);

  assert.equal(normalizeKonsigaWebhookPayload('{invalid-json'), '{invalid-json');
});

test('partnerFetch parses Konsiga Portuguese error responses (Mensagem / Erros)', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        Sucesso: false,
        Mensagem: 'Não foi possível realizar essa operação',
        Erros: ['Token Inválido'],
        Data: null,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )) as typeof fetch;

  try {
    await assert.rejects(
      partnerFetch('https://integracao-api-hml.konsiga.com.br/v1/test', { method: 'GET' }),
      (err: unknown) => {
        assert.ok(err instanceof PartnerHttpError);
        assert.equal(err.status, 401);
        assert.equal(err.message, 'Token Inválido');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Konsiga authenticated requests cache Bearer token, avoid double /access_token, and auto-refresh once on 401', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; auth?: string; cnpjClinica?: string; cnpjConsolidador?: string }> = [];
  let tokenCounter = 0;
  let forceOne401 = false;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers || {}) as Record<string, string>;
    calls.push({
      url,
      auth: headers.Authorization,
      cnpjClinica: headers.CnpjClinica,
      cnpjConsolidador: headers.CnpjConsolidador,
    });

    if (url.endsWith('/api/access_token')) {
      tokenCounter++;
      return new Response(
        JSON.stringify({
          AccessToken: `tok_${tokenCounter}`,
          ExpiringAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (forceOne401) {
      forceOne401 = false;
      return new Response(
        JSON.stringify({ Sucesso: false, Mensagem: 'Token Inválido', Erros: ['Token Inválido'] }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/proposta/enviar-token-confirmacao/')) {
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: 'Operação realizada com sucesso',
          erros: null,
          data: { tokenClienteEnviado: true, tokenAvalistaEnviado: false },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('/proposta/get-link_assinatura/')) {
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: 'Operação realizada com sucesso',
          erros: null,
          data: { link: 'https://assinar.konsigapay.com.br/abc' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  try {
    await withEnv(
      {
        KONSIGA_USERNAME: 'clinica_user',
        KONSIGA_PASSWORD: 'clinica_password',
        KONSIGA_BASE_URL: 'https://integracao-api-hml.konsiga.com.br/v1',
        KONSIGA_AUTH_URL: 'https://sso-homolog.b2esistemas.com.br/api/access_token',
        KONSIGA_CNPJ_CONSOLIDADOR: '12.345.678/0001-99',
      },
      async () => {
        // 1) First call fetches token + sends SMS token
        const smsRes = await sendKonsigaConfirmationToken('tx-uuid-1', '99.888.777/0001-66');
        assert.equal(smsRes.data?.tokenClienteEnviado, true);
        assert.equal(tokenCounter, 1);

        // 2) Second call reuses cached token (no extra /access_token call)
        const link1 = await getKonsigaSignatureLink('tx-uuid-1', '99.888.777/0001-66');
        assert.equal(link1, 'https://assinar.konsigapay.com.br/abc');
        assert.equal(tokenCounter, 1);

        // 3) Third call receives 401 -> refreshes token once and succeeds
        forceOne401 = true;
        const link2 = await getKonsigaSignatureLink('tx-uuid-1', '99.888.777/0001-66');
        assert.equal(link2, 'https://assinar.konsigapay.com.br/abc');
        assert.equal(tokenCounter, 2);

        // Verify URLs never contain duplicated /access_token/access_token
        assert.ok(calls.every((c) => !c.url.includes('/access_token/access_token')));
        const apiCalls = calls.filter((c) => !c.url.endsWith('/api/access_token'));
        assert.equal(apiCalls[0].cnpjClinica, '99.888.777/0001-66');
        assert.equal(apiCalls[0].cnpjConsolidador, '12.345.678/0001-99');
        assert.equal(apiCalls[apiCalls.length - 1].auth, 'Bearer tok_2');
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
