// app/api/admin/onboardings/route.ts
// GET: lista credenciamentos | POST: cria pré-cadastro

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { getClientIP } from '@/lib/security';
import { createOnboarding, getOnboardings } from '@/lib/onboarding-db';
import type { OnboardingStatus } from '@/lib/benavera-db';
import { z } from 'zod';

const createOnboardingSchema = z.object({
  tradeName: z.string().min(2, 'Nome da clínica obrigatório').max(200),
  legalName: z.string().max(200).optional(),
  cnpj: z.string().max(20).optional(),
  contactName: z.string().min(2, 'Nome do responsável obrigatório').max(200),
  contactCpf: z.string().max(15).optional(),
  phone: z.string().min(8, 'WhatsApp obrigatório').max(20),
  email: z.string().email('E-mail inválido'),
  city: z.string().min(2, 'Cidade obrigatória').max(100),
  state: z.string().length(2, 'UF inválida'),
  specialty: z.string().max(100).optional(),
  averageTicket: z.string().max(50).optional(),
  internalNotes: z.string().max(2000).optional(),
  assignedTo: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'VIEW_ONBOARDING_LIST')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const status = (searchParams.get('status') as OnboardingStatus | 'all') || 'all';
  const search = searchParams.get('search') || undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const result = await getOnboardings({ status, search, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Admin Onboardings GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar credenciamentos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'CREATE_ONBOARDING')) {
    return NextResponse.json({ error: 'Sem permissão para criar pré-cadastro.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Dados inválidos.',
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const result = await createOnboarding({
      ...parsed.data,
      createdBy: session.userId,
    });

    return NextResponse.json({ id: result.id, success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error('[Admin Onboardings POST]', err);
    const message = err instanceof Error ? err.message : 'Erro ao criar pré-cadastro.';
    if (message.includes('duplicate') || message.includes('unique')) {
      return NextResponse.json({ error: 'Já existe um credenciamento com este e-mail ou CNPJ.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar pré-cadastro.' }, { status: 500 });
  }
}
