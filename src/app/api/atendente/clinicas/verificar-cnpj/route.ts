// src/app/api/atendente/clinicas/verificar-cnpj/route.ts
// Verificação de CNPJ antes de cadastrar — não expõe dados de outros atendentes

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkCnpjExists, validateCpfOrCnpj } from '@/lib/atendente-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const rawDoc = request.nextUrl.searchParams.get('cnpj') || request.nextUrl.searchParams.get('documento') || '';
  const typeParam = request.nextUrl.searchParams.get('type')?.toUpperCase();
  const requestedType = typeParam === 'PF' ? 'PF' : typeParam === 'PJ' ? 'PJ' : undefined;
  const docCheck = validateCpfOrCnpj(rawDoc, requestedType);
  const label = docCheck.personType === 'PF' ? 'CPF' : 'CNPJ';

  if (!docCheck.valid) {
    return NextResponse.json({ valid: false, available: false, personType: docCheck.personType, message: `${label} inválido.` });
  }

  const check = await checkCnpjExists(docCheck.normalized);

  if (check.exists) {
    // Não expor a qual atendente pertence, apenas que não está disponível
    return NextResponse.json({
      valid: true,
      available: false,
      personType: docCheck.personType,
      message: `Este ${label} já está cadastrado. Solicite revisão ao administrador se necessário.`,
    });
  }

  return NextResponse.json({
    valid: true,
    available: true,
    personType: docCheck.personType,
    message: `${label} disponível para cadastro.`,
  });
}
