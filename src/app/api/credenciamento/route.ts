import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: 'Dados obrigatórios faltando (Nome da clínica, WhatsApp, E-mail e Senha).' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verifica se usuário ou clínica com este email já existe
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${cleanEmail} LIMIT 1
    `;

    if (existingUser[0]) {
      return NextResponse.json({ error: 'Já existe um cadastro com este e-mail. Por favor, faça login.' }, { status: 409 });
    }

    // 2. Insere a clínica no banco de dados Benavera
    const clinicRows = await sql`
      INSERT INTO clinics (
        nome_fantasia, razao_social, cnpj, telefone, whatsapp, email,
        responsavel, cidade, estado, especialidade, ativo
      ) VALUES (
        ${nomeClinica}, ${nomeClinica}, ${cnpj || null}, ${whatsapp}, ${whatsapp}, ${cleanEmail},
        ${nomeResponsavel || null}, ${cidade || 'São Paulo'}, ${estado || 'SP'},
        ${especialidade || 'Geral'}, TRUE
      )
      RETURNING id
    `;

    const clinicId = clinicRows[0].id;

    // 3. Hash seguro de senha com bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Cria o usuário Administrador da Clínica
    const userRows = await sql`
      INSERT INTO users (
        clinic_id, name, email, password_hash, role, ativo
      ) VALUES (
        ${clinicId}, ${nomeResponsavel || nomeClinica}, ${cleanEmail},
        ${passwordHash}, 'CLINIC_ADMIN', TRUE
      )
      RETURNING id
    `;

    const userId = userRows[0].id;

    // 5. Salva também como clinic_leads para histórico do CRM comercial Benavera
    const leadId = 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    try {
      await sql`
        INSERT INTO clinic_leads (
          id, nome_responsavel, nome_clinica, cargo, whatsapp, email,
          cidade, estado, especialidade_principal, orcamentos_mensais, ticket_medio,
          pagina_origem, status_comercial
        ) VALUES (
          ${leadId}, ${nomeResponsavel || nomeClinica}, ${nomeClinica}, ${cargo || 'Sócio'},
          ${whatsapp}, ${cleanEmail}, ${cidade || 'SP'}, ${estado || 'SP'},
          ${especialidade || 'Geral'}, ${volumeMensal || null}, ${ticketMedio || null},
          '/credenciamento', 'credenciado'
        )
      `;
    } catch (leadErr) {
      console.warn('Erro ao salvar clinic_lead histórico:', leadErr);
    }

    return NextResponse.json({ success: true, clinicId: String(clinicId), userId: String(userId) });
  } catch (err: any) {
    console.error('Erro no credenciamento:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar credenciamento' }, { status: 500 });
  }
}
