import { NextRequest, NextResponse } from 'next/server';
import { getNeonClient } from '@/lib/neon';

export async function POST(req: NextRequest) {
  const db = getNeonClient();
  if (!db) {
    return NextResponse.json({ error: 'Banco de dados indisponível' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      nomeClinica,
      cnpj,
      especialidade,
      cidade,
      estado,
      nomeResponsavel,
      cargo,
      whatsapp,
      email,
      password,
      volumeMensal,
      ticketMedio,
    } = body;

    if (!nomeClinica || !whatsapp || !email || !password) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    const clinicId = 'cln_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // 1. Cria a clínica
    await db`
      INSERT INTO clinics (
        id, nome, cnpj, especialidade, cidade, estado, telefone, email, status, plano
      ) VALUES (
        ${clinicId}, ${nomeClinica}, ${cnpj || null}, ${especialidade || 'Geral'},
        ${cidade || 'São Paulo'}, ${estado || 'SP'}, ${whatsapp}, ${email},
        'ativo', 'clinic_first'
      )
    `;

    // 2. Cria o usuário administrador da clínica
    // Nota: Em produção usaríamos bcrypt; aqui salvamos o hash simplificado ou senha para autenticação de teste
    await db`
      INSERT INTO clinic_users (
        id, clinic_id, nome, email, password_hash, role, ativo
      ) VALUES (
        ${userId}, ${clinicId}, ${nomeResponsavel || nomeClinica},
        ${email.toLowerCase().trim()}, ${password}, 'admin', TRUE
      )
    `;

    // 3. Salva também como clinic_leads para histórico do CRM comercial Benavera
    const leadId = 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await db`
      INSERT INTO clinic_leads (
        id, nome_responsavel, nome_clinica, cargo, whatsapp, email,
        cidade, estado, especialidade_principal, orcamentos_mensais, ticket_medio,
        pagina_origem, status_comercial
      ) VALUES (
        ${leadId}, ${nomeResponsavel || nomeClinica}, ${nomeClinica}, ${cargo || 'Sócio'},
        ${whatsapp}, ${email}, ${cidade || 'SP'}, ${estado || 'SP'},
        ${especialidade || 'Geral'}, ${volumeMensal || null}, ${ticketMedio || null},
        '/credenciamento', 'credenciado'
      )
    `;

    return NextResponse.json({ success: true, clinicId, userId });
  } catch (err: any) {
    console.error('Erro no credenciamento:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar credenciamento' }, { status: 500 });
  }
}
