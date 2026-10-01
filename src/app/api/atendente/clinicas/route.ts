// src/app/api/atendente/clinicas/route.ts
// Clínicas do atendente: listar e criar novas

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAtendenteClinicas,
  createProspectClinica,
  checkCnpjExists,
  normalizeCnpj,
  validateCnpj,
} from '@/lib/atendente-db';

function requireAtendente(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'BENAVERA_COMERCIAL' && session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const err = requireAtendente(session);
  if (err) return err;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || undefined;
  const status = searchParams.get('status') || undefined;

  try {
    const clinicas = await getAtendenteClinicas(session!.userId, { search, status });
    return NextResponse.json({ success: true, clinicas });
  } catch (e) {
    console.error('[API Atendente Clinicas GET]', e);
    return NextResponse.json({ error: 'Erro ao carregar clínicas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const err = requireAtendente(session);
  if (err) return err;

  try {
    const body = await request.json();
    const { cnpj, nome_fantasia, razao_social, responsavel, telefone, email,
      cidade, estado, especialidade, clinic_lead_id } = body;

    if (!cnpj || !nome_fantasia) {
      return NextResponse.json({ error: 'CNPJ e nome fantasia são obrigatórios.' }, { status: 400 });
    }

    const normalized = normalizeCnpj(cnpj);
    if (!validateCnpj(normalized)) {
      return NextResponse.json({ error: 'CNPJ inválido. Verifique os dígitos.' }, { status: 400 });
    }

    // Verificar unicidade antes de criar (proteção dupla: DB também tem UNIQUE)
    const cnpjCheck = await checkCnpjExists(normalized);
    if (cnpjCheck.exists) {
      return NextResponse.json({
        error: 'Este CNPJ já está cadastrado no sistema. Caso acredite ser um erro, solicite revisão ao administrador.',
      }, { status: 409 });
    }

    const result = await createProspectClinica({
      cnpj: normalized,
      nome_fantasia,
      razao_social,
      responsavel,
      telefone,
      email,
      cidade,
      estado,
      especialidade,
      clinic_lead_id,
      assigned_to: session!.userId,
      created_by: session!.userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, clinic: result.clinic }, { status: 201 });
  } catch (e) {
    console.error('[API Atendente Clinicas POST]', e);
    return NextResponse.json({ error: 'Erro ao cadastrar clínica.' }, { status: 500 });
  }
}
