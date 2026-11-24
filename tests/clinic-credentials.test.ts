import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateTemporaryPassword } from '../src/lib/clinic-credentials';

describe('clinic-credentials — generateTemporaryPassword', () => {
  it('gera senhas temporárias fortes, legíveis e sem caracteres ambíguos', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const pwd = generateTemporaryPassword();
      assert.ok(pwd.startsWith('Bv-'), `Esperado prefixo Bv-, veio ${pwd}`);
      assert.equal(pwd.length, 15, `Esperado 15 caracteres, veio ${pwd.length}`);
      const body = pwd.slice(3);
      assert.match(body, /[A-Z]/, 'Deve conter ao menos uma letra maiúscula');
      assert.match(body, /[a-z]/, 'Deve conter ao menos uma letra minúscula');
      assert.match(body, /[2-9]/, 'Deve conter ao menos um dígito');
      assert.doesNotMatch(body, /[0O1lI]/, 'Não deve conter caracteres ambíguos');
      seen.add(pwd);
    }
    assert.equal(seen.size, 100, 'Todas as senhas geradas devem ser únicas');
  });
});
