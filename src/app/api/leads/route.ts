import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { sanitizeString, maskPII, getClientIP, isAuthorizedAdmin } from '@/lib/security';
import {
  savePatientLead,
  saveClinicLead,
  getPatientLeads,
  getClinicLeads,
} from '@/lib/db';
import type { PatientLead, ClinicLead } from '@/types';

// POST /api/leads — Submissão de leads (Paciente ou Clínica)
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  // 1. Rate Limiting (10 requisições por minuto por IP)
  const rateCheck = checkRateLimit(clientIP, 10, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Muitas requisições. Por favor, aguarde ${rateCheck.resetInSeconds} segundos antes de tentar novamente.`,
      },
      { status: 429 }
    );
  }

  try {
    const rawBody = (await request.json()) as Record<string, unknown>;

    // 2. Proteção contra Honeypot (campo invisível _hp_company preenchido por robôs)
    if (rawBody._hp_company || rawBody._hp_website) {
      // Retorna 200 silencioso para desencorajar spammers sem persistir no banco
      return NextResponse.json({ success: true, id: 'ok' }, { status: 200 });
    }

    const tipoLead = rawBody.tipoLead === 'clinic' ? 'clinic' : 'patient';

    // 3. Processamento e Validação específica por tipo
    if (tipoLead === 'clinic') {
      const nome = sanitizeString(rawBody.nome);
      const nomeClinica = sanitizeString(rawBody.nomeClinica);
      const whatsapp = sanitizeString(rawBody.whatsapp);
      const cidade = sanitizeString(rawBody.cidade);
      const especialidade = sanitizeString(rawBody.especialidade);

      if (!nome || !nomeClinica || !whatsapp || !cidade || !especialidade) {
        return NextResponse.json(
          {
            success: false,
            error: 'Campos obrigatórios incompletos (nome, clínica, whatsapp, cidade e especialidade).',
          },
          { status: 400 }
        );
      }

      const clinicData: Omit<ClinicLead, 'id' | 'createdAt' | 'updatedAt' | 'statusComercial'> = {
        origem: sanitizeString(rawBody.origem) || 'site_clinicas',
        tipoLead: 'clinic',
        nome,
        nomeClinica,
        cargo: sanitizeString(rawBody.cargo),
        whatsapp,
        email: sanitizeString(rawBody.email),
        cidade,
        estado: sanitizeString(rawBody.estado),
        especialidade,
        numeroUnidades: sanitizeString(rawBody.numeroUnidades),
        ticketMedio: sanitizeString(rawBody.ticketMedio),
        orcamentosMes: sanitizeString(rawBody.orcamentosMes),
        maiorDesafio: sanitizeString(rawBody.maiorDesafio),
        consentimento: Boolean(rawBody.consentimento !== false),
        versaoTermos: sanitizeString(rawBody.versaoTermos) || 'v1.0',
        utmSource: sanitizeString(rawBody.utmSource),
        utmMedium: sanitizeString(rawBody.utmMedium),
        utmCampaign: sanitizeString(rawBody.utmCampaign),
        utmContent: sanitizeString(rawBody.utmContent),
        utmTerm: sanitizeString(rawBody.utmTerm),
        landingPage: sanitizeString(rawBody.landingPage) || '/clinicas',
        referrer: sanitizeString(rawBody.referrer),
        timestamp: new Date().toISOString(),
      };

      const result = await saveClinicLead(clinicData);

      console.log(
        `[Benavera Lead] Clínica salva ID=${result.id} | Clínica=${maskPII(nomeClinica)} | Contato=${maskPII(nome)}`
      );

      return NextResponse.json({ success: true, id: result.id }, { status: 201 });
    } else {
      // Paciente
      const nome = sanitizeString(rawBody.nome);
      const telefone = sanitizeString(rawBody.telefone);
      const cidade = sanitizeString(rawBody.cidade);
      const tratamento = sanitizeString(rawBody.tratamento);

      if (!nome || !telefone || !cidade || !tratamento) {
        return NextResponse.json(
          {
            success: false,
            error: 'Campos obrigatórios incompletos (nome, telefone, cidade e tratamento).',
          },
          { status: 400 }
        );
      }

      const patientData: Omit<PatientLead, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
        origem: sanitizeString(rawBody.origem) || 'site_simulador',
        tipoLead: 'patient',
        nome,
        telefone,
        email: sanitizeString(rawBody.email),
        cidade,
        estado: sanitizeString(rawBody.estado),
        tratamento,
        valorTratamento: typeof rawBody.valorTratamento === 'number' ? rawBody.valorTratamento : Number(rawBody.valorTratamento) || undefined,
        entrada: typeof rawBody.entrada === 'number' ? rawBody.entrada : Number(rawBody.entrada) || undefined,
        parcelaDesejada: typeof rawBody.parcelaDesejada === 'number' ? rawBody.parcelaDesejada : Number(rawBody.parcelaDesejada) || undefined,
        prazoDesejado: sanitizeString(rawBody.prazoDesejado),
        clinicaIndicada: sanitizeString(rawBody.clinicaIndicada),
        consentimento: Boolean(rawBody.consentimento !== false),
        versaoTermos: sanitizeString(rawBody.versaoTermos) || 'v1.0',
        utmSource: sanitizeString(rawBody.utmSource),
        utmMedium: sanitizeString(rawBody.utmMedium),
        utmCampaign: sanitizeString(rawBody.utmCampaign),
        utmContent: sanitizeString(rawBody.utmContent),
        utmTerm: sanitizeString(rawBody.utmTerm),
        landingPage: sanitizeString(rawBody.landingPage) || '/simular',
        referrer: sanitizeString(rawBody.referrer),
        timestamp: new Date().toISOString(),
      };

      const result = await savePatientLead(patientData);

      console.log(
        `[Benavera Lead] Paciente salvo ID=${result.id} | Tratamento=${tratamento} | Cidade=${cidade}`
      );

      return NextResponse.json({ success: true, id: result.id }, { status: 201 });
    }
  } catch (error) {
    console.error('[Benavera Lead] Erro interno ao salvar lead:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao processar a solicitação. Por favor, tente novamente.',
      },
      { status: 500 }
    );
  }
}

// GET /api/leads — Consulta protegida de leads
export async function GET(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const patientLeads = await getPatientLeads();
    const clinicLeads = await getClinicLeads();

    return NextResponse.json({
      patientLeads,
      clinicLeads,
      total: patientLeads.length + clinicLeads.length,
    });
  } catch (error) {
    console.error('[Benavera Lead] Erro ao buscar leads:', error);
    return NextResponse.json({ error: 'Erro ao carregar leads.' }, { status: 500 });
  }
}
