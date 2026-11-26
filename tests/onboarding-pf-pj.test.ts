import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRequiredDocumentsForPersonType,
  normalizePersonType,
  resolveClinicDocumentForStorage,
} from '../src/lib/onboarding-db';
import { validateCpf, validateCnpj, validateCpfOrCnpj } from '../src/lib/atendente-db';

describe('onboarding PF / PJ — documentos e validadores', () => {
  it('normalizePersonType aceita PF e faz fallback seguro para PJ', () => {
    assert.equal(normalizePersonType('PF'), 'PF');
    assert.equal(normalizePersonType('pf'), 'PF');
    assert.equal(normalizePersonType('PJ'), 'PJ');
    assert.equal(normalizePersonType(undefined), 'PJ');
    assert.equal(normalizePersonType('outro'), 'PJ');
  });

  it('retorna documentos específicos para PJ (com Contrato Social) e PF (sem Contrato Social, com Comprovante de Endereço)', () => {
    const pjDocs = getRequiredDocumentsForPersonType('PJ');
    const pfDocs = getRequiredDocumentsForPersonType('PF');

    const pjRequiredTypes = pjDocs.filter(d => d.required).map(d => d.type);
    const pfRequiredTypes = pfDocs.filter(d => d.required).map(d => d.type);

    assert.ok(pjRequiredTypes.includes('contrato_social'));
    assert.ok(!pjRequiredTypes.includes('comprovante_residencia'));

    assert.ok(!pfRequiredTypes.includes('contrato_social'));
    assert.ok(!pfDocs.some(d => d.type === 'procuracao'));
    assert.ok(pfRequiredTypes.includes('comprovante_residencia'));
    assert.ok(pfRequiredTypes.includes('doc_representante'));
    assert.ok(pfRequiredTypes.includes('doc_resp_tecnico'));
    assert.ok(pfRequiredTypes.includes('comprovante_bancario'));
  });

  it('resolveClinicDocumentForStorage formata CPF/CNPJ e gera fallback único <= 18 chars sem colisão', () => {
    assert.equal(
      resolveClinicDocumentForStorage({ personType: 'PF', cpf: '52998224725' }),
      '529.982.247-25'
    );
    assert.equal(
      resolveClinicDocumentForStorage({ personType: 'PJ', cnpj: '34214909000164' }),
      '34.214.909/0001-64'
    );
    const fb1 = resolveClinicDocumentForStorage({ personType: 'PF' });
    const fb2 = resolveClinicDocumentForStorage({ personType: 'PF' });
    assert.ok(fb1.startsWith('PF-') && fb1.length <= 18);
    assert.ok(fb2.startsWith('PF-') && fb2.length <= 18);
    assert.notEqual(fb1, fb2);
  });

  it('validateCpf e validateCpfOrCnpj validam corretamente CPF e CNPJ', () => {
    assert.equal(validateCpf('52998224725'), true);
    assert.equal(validateCpf('529.982.247-25'), true);
    assert.equal(validateCpf('11111111111'), false);
    assert.equal(validateCpf('52998224720'), false);

    assert.equal(validateCnpj('34.214.909/0001-64'), true);
    assert.equal(validateCnpj('00.000.000/0000-00'), false);

    const pfCheck = validateCpfOrCnpj('529.982.247-25', 'PF');
    assert.equal(pfCheck.valid, true);
    assert.equal(pfCheck.personType, 'PF');
    assert.equal(pfCheck.normalized, '52998224725');

    const pjCheck = validateCpfOrCnpj('34.214.909/0001-64', 'PJ');
    assert.equal(pjCheck.valid, true);
    assert.equal(pjCheck.personType, 'PJ');
    assert.equal(pjCheck.normalized, '34214909000164');
  });
});
