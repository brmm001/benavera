// src/app/api/admin/clinicas/transferir/route.ts
// Admin: transferir clínica entre atendentes preservando histórico

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { transferClinica } from '@/lib/atendente-db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Apenas o administrador pode transferir clínicas.' }, { status: 403 });
  }

  try {
    const { clinica_id, novo_atendente_id, motivo } = await request.json();

    if (!clinica_id || !novo_atendente_id) {
      return NextResponse.json({ error: 'clinica_id e novo_atendente_id são obrigatórios.' }, { status: 400 });
    }

    const result = await transferClinica(
      clinica_id,
      novo_atendente_id,
      session.userId,
      session.name,
      motivo || null
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Clínica transferida com sucesso.' });
  } catch (e) {
    console.error('[API Admin Transferir Clinica]', e);
    return NextResponse.json({ error: 'Erro ao transferir clínica.' }, { status: 500 });
  }
}
