import { NextRequest, NextResponse } from 'next/server';

import {
  getPatientLeads,
  getClinicLeads,
  getDashboardMetrics,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  // A autorização agora é garantida 100% pelo middleware.ts
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || undefined;

    let patientLeads: unknown[] = [];
    let clinicLeads: unknown[] = [];

    if (type === 'all' || type === 'patient') {
      patientLeads = await getPatientLeads({ status, search });
    }
    if (type === 'all' || type === 'clinic') {
      clinicLeads = await getClinicLeads({ status, search });
    }

    const metrics = await getDashboardMetrics();

    return NextResponse.json({
      success: true,
      patientLeads,
      clinicLeads,
      metrics,
    });
  } catch (error) {
    console.error('[Benavera Admin API] Erro ao carregar leads:', error);
    return NextResponse.json({ error: 'Erro interno ao consultar leads.' }, { status: 500 });
  }
}
