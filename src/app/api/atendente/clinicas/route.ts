// src/app/api/atendente/clinicas/route.ts
// Clínicas do atendente: listar e criar novas

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAtendenteClinicas,
  createProspectClinica,
  checkCnpjExists,
  validateCpfOrCnpj,
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
    const { person_type, cnpj, cpf, nome_fantasia, razao_social, responsavel, telefone, email,
      cidade, estado, especialidade, clinic_lead_id } = body;

    const requestedType = String(person_type || '').toUpperCase() === 'PF' ? 'PF' : String(person_type || '').toUpperCase() === 'PJ' ? 'PJ' : undefined;
    const rawDoc = String(requestedType === 'PF' ? (cpf || cnpj || '') : (cnpj || cpf || '')).trim();

    if (!rawDoc || !nome_fantasia) {
      return NextResponse.json(
        { error: requestedType === 'PF' ? 'CPF e nome do consultório/profissional são obrigatórios.' : 'CNPJ/CPF e nome são obrigatórios.' },
        { status: 400 }
      );
    }

    const docCheck = validateCpfOrCnpj(rawDoc, requestedType);
    if (!docCheck.valid) {
      return NextResponse.json(
        { error: `${docCheck.personType === 'PF' ? 'CPF' : 'CNPJ'} inválido. Verifique os dígitos.` },
        { status: 400 }
      );
    }

    // Verificar unicidade antes de criar (proteção dupla: DB também tem UNIQUE)
    const cnpjCheck = await checkCnpjExists(docCheck.normalized);
    if (cnpjCheck.exists) {
      return NextResponse.json({
        error: `Este ${docCheck.personType === 'PF' ? 'CPF' : 'CNPJ'} já está cadastrado no sistema. Caso acredite ser um erro, solicite revisão ao administrador.`,
      }, { status: 409 });
    }

    const result = await createProspectClinica({
      person_type: docCheck.personType,
      cnpj: docCheck.normalized,
      nome_fantasia,
      razao_social: docCheck.personType === 'PF' ? (responsavel || nome_fantasia) : razao_social,
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
