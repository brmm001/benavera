import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin, sanitizeString } from '@/lib/security';
import {
  updatePatientLeadStatus,
  updateClinicLeadStatus,
  anonymizeLead,
  getLeadEvents,
} from '@/lib/db';
import type { PatientLeadStatus, ClinicLeadStatus } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const events = await getLeadEvents(id);

  return NextResponse.json({ success: true, events });
}

export async function PATCH(request: NextRequest, { params }: Props) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = (await request.json()) as {
      type: 'patient' | 'clinic';
      status?: string;
      note?: string;
    };

    const leadType = body.type || 'patient';
    const note = body.note ? sanitizeString(body.note) : undefined;
    let updated = false;

    if (leadType === 'patient' && body.status) {
      updated = await updatePatientLeadStatus(id, body.status as PatientLeadStatus, note);
    } else if (leadType === 'clinic' && body.status) {
      updated = await updateClinicLeadStatus(id, body.status as ClinicLeadStatus, note);
    }

    if (!updated) {
      return NextResponse.json({ error: 'Lead não encontrado ou status inválido.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar lead.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get('type') as 'patient' | 'clinic') || 'patient';

  const anonymized = await anonymizeLead(id, type);
  if (!anonymized) {
    return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Dados anonimizados com sucesso.' });
}
