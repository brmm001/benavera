// src/app/api/admin/atendentes/importar/route.ts
// Importação em massa de leads de clínica com distribuição automática

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { distributeLeadToAtendente } from '@/lib/lead-distribution';

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session || session.role !== 'BENAVERA_ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
  }
  return null;
}

type LeadRow = {
  whatsapp: string;
  nome_clinica: string;
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  const err = requireAdmin(session);
  if (err) return err;

  try {
    const body = await request.json();
    const leads: LeadRow[] = body.leads;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead enviado.' }, { status: 400 });
    }

    if (leads.length > 500) {
      return NextResponse.json({ error: 'Máximo de 500 leads por importação.' }, { status: 400 });
    }

    const results = {
      total: leads.length,
      inseridos: 0,
      distribuidos: 0,
      duplicados: 0,
      invalidos: 0,
      erros: [] as string[],
    };

    for (const lead of leads) {
      const whatsapp = (lead.whatsapp || '').replace(/\D/g, '');
      const nome_clinica = (lead.nome_clinica || '').trim();

      // Validação básica
      if (whatsapp.length < 10 || whatsapp.length > 13) {
        results.invalidos++;
        results.erros.push(`Telefone inválido: "${lead.whatsapp}"`);
        continue;
      }
      if (!nome_clinica) {
        results.invalidos++;
        results.erros.push(`Nome da clínica ausente para o telefone "${lead.whatsapp}"`);
        continue;
      }

      // Verificar duplicidade por whatsapp
      const existing = await sql`
        SELECT id FROM clinic_leads WHERE whatsapp = ${whatsapp} LIMIT 1
      `;
      if (existing.length > 0) {
        results.duplicados++;
        continue;
      }

      // Inserir o lead
      const leadId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        await sql`
          INSERT INTO clinic_leads (
            id, nome_responsavel, nome_clinica, whatsapp,
            cidade, especialidade_principal, pagina_origem,
            origem_lead, status_comercial, consentimento, versao_termos
          ) VALUES (
            ${leadId},
            ${nome_clinica},
            ${nome_clinica},
            ${whatsapp},
            'Não informado',
            'Não informado',
            'importacao_admin',
            'importacao_admin',
            'novo',
            TRUE,
            'v1.0'
          )
        `;
        results.inseridos++;

        // Distribuir automaticamente
        const dist = await distributeLeadToAtendente(leadId, 'clinic');
        if (dist.resultado === 'distribuido') {
          results.distribuidos++;
        }
      } catch (insertErr) {
        results.erros.push(`Erro ao inserir "${nome_clinica}" (${lead.whatsapp})`);
        console.error('[ImportarLeads] Erro ao inserir:', insertErr);
      }
    }

    return NextResponse.json({ success: true, results }, { status: 201 });
  } catch (e) {
    console.error('[API Importar Leads]', e);
    return NextResponse.json({ error: 'Erro ao processar importação.' }, { status: 500 });
  }
}
