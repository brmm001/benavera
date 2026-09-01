import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedAdmin } from '@/lib/security';
import { getPatientLeads, getClinicLeads } from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type') || 'patient';

  if (type === 'clinic') {
    const leads = await getClinicLeads();
    const headers = [
      'ID',
      'Data',
      'Responsável',
      'Clínica',
      'WhatsApp',
      'Email',
      'Cidade',
      'Especialidade',
      'Status',
      'Origem',
      'UTM Source',
      'UTM Campaign',
    ];
    const rows = leads.map((l) => [
      l.id || '',
      l.createdAt || l.timestamp,
      `"${l.nome.replace(/"/g, '""')}"`,
      `"${l.nomeClinica.replace(/"/g, '""')}"`,
      l.whatsapp,
      l.email || '',
      `"${l.cidade.replace(/"/g, '""')}"`,
      `"${l.especialidade.replace(/"/g, '""')}"`,
      l.statusComercial || 'novo',
      l.origem,
      l.utmSource || '',
      l.utmCampaign || '',
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    return new NextResponse('\uFEFF' + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_clinicas_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } else {
    const leads = await getPatientLeads();
    const headers = [
      'ID',
      'Data',
      'Nome',
      'Telefone',
      'Email',
      'Cidade',
      'Tratamento',
      'Valor Tratamento',
      'Entrada',
      'Parcela Desejada',
      'Status',
      'Origem',
      'UTM Source',
      'UTM Campaign',
    ];
    const rows = leads.map((l) => [
      l.id || '',
      l.createdAt || l.timestamp,
      `"${l.nome.replace(/"/g, '""')}"`,
      l.telefone,
      l.email || '',
      `"${l.cidade.replace(/"/g, '""')}"`,
      `"${l.tratamento.replace(/"/g, '""')}"`,
      l.valorTratamento || '',
      l.entrada || '',
      l.parcelaDesejada || '',
      l.status || 'nova',
      l.origem,
      l.utmSource || '',
      l.utmCampaign || '',
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    return new NextResponse('\uFEFF' + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_pacientes_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
}
