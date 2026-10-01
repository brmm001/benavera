// src/app/api/atendente/clinicas/verificar-cnpj/route.ts
// Verificação de CNPJ antes de cadastrar — não expõe dados de outros atendentes

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { checkCnpjExists, normalizeCnpj, validateCnpj } from '@/lib/atendente-db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const cnpj = request.nextUrl.searchParams.get('cnpj') || '';
  const normalized = normalizeCnpj(cnpj);

  if (!validateCnpj(normalized)) {
    return NextResponse.json({ valid: false, available: false, message: 'CNPJ inválido.' });
  }

  const check = await checkCnpjExists(normalized);

  if (check.exists) {
    // Não expor a qual atendente pertence, apenas que não está disponível
    return NextResponse.json({
      valid: true,
      available: false,
      message: 'Este CNPJ já está cadastrado. Solicite revisão ao administrador se necessário.',
    });
  }

  return NextResponse.json({ valid: true, available: true, message: 'CNPJ disponível para cadastro.' });
}
