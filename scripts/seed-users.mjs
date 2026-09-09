// scripts/seed-users.mjs
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_1XPh7JtnbqTr@ep-lively-queen-axlifs9v-pooler.c-4.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
const sql = neon(DATABASE_URL);

// IDs fixos com formato UUID válido
const IDS = {
  clinic1: '11111111-1111-4111-a111-111111111111',
  clinic2: '22222222-2222-4222-a222-222222222222',
  userAdmin: 'a1000001-0001-4001-a001-000000000001',
  userAnalista: 'a2000002-0002-4002-a002-000000000002',
  userClinicAdmin: 'a3000003-0003-4003-a003-000000000003',
  userAtendente: 'a4000004-0004-4004-a004-000000000004',
  userFinanceiro: 'a5000005-0005-4005-a005-000000000005',
  partner1: 'c1000001-0001-4001-a001-000000000001',
  partner2: 'c2000002-0002-4002-a002-000000000002',
  partner3: 'c3000003-0003-4003-a003-000000000003',
  patient1: 'd1000001-0001-4001-a001-000000000001',
  patient2: 'd2000002-0002-4002-a002-000000000002',
  patient3: 'd3000003-0003-4003-a003-000000000003',
  patient4: 'd4000004-0004-4004-a004-000000000004',
  patient5: 'd5000005-0005-4005-a005-000000000005',
  app1: 'e1000001-0001-4001-a001-000000000001',
  app2: 'e2000002-0002-4002-a002-000000000002',
  app3: 'e3000003-0003-4003-a003-000000000003',
  app4: 'e4000004-0004-4004-a004-000000000004',
  app5: 'e5000005-0005-4005-a005-000000000005',
};

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // ── CLÍNICAS ──
  console.log('📋 Clínicas...');
  await sql`
    INSERT INTO clinics (id, razao_social, nome_fantasia, cnpj, telefone, whatsapp, email, responsavel, cpf_responsavel, cidade, estado, especialidade, ativo)
    VALUES
      (${IDS.clinic1}, 'Odonto Prime Curitiba LTDA', 'Odonto Prime', '12.345.678/0001-90', '(41) 3333-4444', '(41) 99999-8888', 'contato@odontoprime.com.br', 'Dr. Ricardo Mendes', '111.111.111-11', 'Curitiba', 'PR', 'Odontologia', true),
      (${IDS.clinic2}, 'Clínica Bella Estética EIRELI', 'Bella Estética', '98.765.432/0001-10', '(11) 4444-5555', '(11) 98888-7777', 'contato@bellastetica.com.br', 'Dra. Carla Souza', '222.222.222-22', 'São Paulo', 'SP', 'Estética', true)
  `;
  console.log('  ✓ Clínicas inseridas');

  await sql`
    INSERT INTO fee_configs (clinic_id, clinic_transaction_fee_percent)
    VALUES (${IDS.clinic1}, 0.0249), (${IDS.clinic2}, 0.0299)
    ON CONFLICT (clinic_id) DO NOTHING
  `;
  console.log('  ✓ Fee configs inseridas');

  // ── USUÁRIOS ──
  console.log('\n👥 Usuários...');
  const users = [
    { id: IDS.userAdmin, clinic_id: null, name: 'Admin Benavera', email: 'admin@benavera.com.br', password: 'Benavera@2026', role: 'BENAVERA_ADMIN' },
    { id: IDS.userAnalista, clinic_id: null, name: 'Carlos Analista', email: 'analista@benavera.com.br', password: 'Benavera@2026', role: 'BENAVERA_ANALYST' },
    { id: IDS.userClinicAdmin, clinic_id: IDS.clinic1, name: 'Dr. Ricardo Mendes', email: 'admin@odontoprime.com.br', password: 'Clinica@2026', role: 'CLINIC_ADMIN' },
    { id: IDS.userAtendente, clinic_id: IDS.clinic1, name: 'Ana Atendente', email: 'atendente@odontoprime.com.br', password: 'Clinica@2026', role: 'CLINIC_ATTENDANT' },
    { id: IDS.userFinanceiro, clinic_id: IDS.clinic1, name: 'Paulo Financeiro', email: 'financeiro@odontoprime.com.br', password: 'Clinica@2026', role: 'CLINIC_FINANCIAL' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await sql`
      INSERT INTO users (id, clinic_id, name, email, password_hash, role)
      VALUES (${u.id}, ${u.clinic_id}, ${u.name}, ${u.email}, ${hash}, ${u.role}::user_role)
      ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}, name = ${u.name}
    `;
    console.log(`  ✓ ${u.email} (${u.role})`);
  }

  // ── PARCEIROS ──
  console.log('\n🏦 Parceiros financeiros...');
  const partners = [
    { id: IDS.partner1, nome: 'CredFacil', nome_legal: 'CredFacil Financeira S.A.', cnpj: '11.222.333/0001-44', ativo: true, prioridade: 10, ticket_minimo: 2000, ticket_maximo: 50000, prazo_maximo: 48, comissao: 0.02, modo: 'MANUAL' },
    { id: IDS.partner2, nome: 'MedCredit', nome_legal: 'MedCredit Soluções Financeiras LTDA', cnpj: '55.666.777/0001-88', ativo: true, prioridade: 20, ticket_minimo: 5000, ticket_maximo: 80000, prazo_maximo: 60, comissao: 0.025, modo: 'MANUAL' },
    { id: IDS.partner3, nome: 'SaúdePay', nome_legal: 'SaúdePay Intermediadora LTDA', cnpj: '99.888.777/0001-22', ativo: true, prioridade: 30, ticket_minimo: 1000, ticket_maximo: 30000, prazo_maximo: 36, comissao: 0.018, modo: 'SANDBOX' },
  ];

  for (const p of partners) {
    await sql`
      INSERT INTO financial_partners (id, nome, nome_legal, cnpj, ativo, prioridade, ticket_minimo, ticket_maximo, prazo_maximo, comissao_benavera_percent, modo)
      VALUES (${p.id}, ${p.nome}, ${p.nome_legal}, ${p.cnpj}, ${p.ativo}, ${p.prioridade}, ${p.ticket_minimo}, ${p.ticket_maximo}, ${p.prazo_maximo}, ${p.comissao}, ${p.modo}::partner_mode)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`  ✓ ${p.nome}`);
  }

  // ── PACIENTES ──
  console.log('\n🧑 Pacientes...');
  const patients = [
    { id: IDS.patient1, clinic_id: IDS.clinic1, nome: 'Maria Santos', cpf: '000.000.001-00', nasc: '1985-03-15', cel: '(41) 99111-2222', email: 'maria.santos@email.com' },
    { id: IDS.patient2, clinic_id: IDS.clinic1, nome: 'João Almeida', cpf: '000.000.002-00', nasc: '1990-07-22', cel: '(41) 99333-4444', email: 'joao.almeida@email.com' },
    { id: IDS.patient3, clinic_id: IDS.clinic1, nome: 'Fernanda Rocha', cpf: '000.000.003-00', nasc: '1978-11-05', cel: '(41) 99555-6666', email: 'fernanda.rocha@email.com' },
    { id: IDS.patient4, clinic_id: IDS.clinic1, nome: 'Carlos Pereira', cpf: '000.000.004-00', nasc: '1995-01-30', cel: '(41) 99777-8888', email: 'carlos.pereira@email.com' },
    { id: IDS.patient5, clinic_id: IDS.clinic1, nome: 'Luciana Ferreira', cpf: '000.000.005-00', nasc: '1988-06-14', cel: '(41) 98111-2222', email: 'luciana.ferreira@email.com' },
  ];

  for (const p of patients) {
    await sql`
      INSERT INTO patients (id, clinic_id, nome, cpf, data_nascimento, celular, email)
      VALUES (${p.id}, ${p.clinic_id}, ${p.nome}, ${p.cpf}, ${p.nasc}, ${p.cel}, ${p.email})
      ON CONFLICT (clinic_id, cpf) DO NOTHING
    `;
    console.log(`  ✓ ${p.nome}`);
  }

  // ── SOLICITAÇÕES ──
  console.log('\n📄 Solicitações...');
  const now = new Date();
  const apps = [
    {
      id: IDS.app1, protocol: 'BEN-2026-000001',
      clinic_id: IDS.clinic1, patient_id: IDS.patient1,
      created_by: IDS.userAtendente, analyst_id: IDS.userAnalista,
      categoria: 'odontologia', procedimento: 'Implante dentário',
      valor_tratamento: 18000, entrada: 3000, valor_financiado: 15000,
      status: 'APPROVED', int_decision: 'APPROVED_TO_PROCEED', lender_decision: 'APPROVED',
      created_at: new Date(Date.now() - 86400000),
    },
    {
      id: IDS.app2, protocol: 'BEN-2026-000002',
      clinic_id: IDS.clinic1, patient_id: IDS.patient2,
      created_by: IDS.userAtendente, analyst_id: null,
      categoria: 'odontologia', procedimento: 'Ortodontia',
      valor_tratamento: 7500, entrada: 0, valor_financiado: 7500,
      status: 'INTERNAL_REVIEW', int_decision: 'PENDING', lender_decision: 'NOT_SUBMITTED',
      created_at: new Date(Date.now() - 7200000),
    },
    {
      id: IDS.app3, protocol: 'BEN-2026-000003',
      clinic_id: IDS.clinic1, patient_id: IDS.patient3,
      created_by: IDS.userClinicAdmin, analyst_id: IDS.userAnalista,
      categoria: 'odontologia', procedimento: 'Lentes de contato dental',
      valor_tratamento: 12000, entrada: 2000, valor_financiado: 10000,
      status: 'OFFERS_AVAILABLE', int_decision: 'APPROVED_TO_PROCEED', lender_decision: 'PRE_APPROVED',
      created_at: new Date(Date.now() - 3600000),
    },
    {
      id: IDS.app4, protocol: 'BEN-2026-000004',
      clinic_id: IDS.clinic1, patient_id: IDS.patient4,
      created_by: IDS.userAtendente, analyst_id: null,
      categoria: 'estetica', procedimento: 'Harmonização facial',
      valor_tratamento: 5500, entrada: 500, valor_financiado: 5000,
      status: 'PRE_ANALYSIS', int_decision: 'PENDING', lender_decision: 'NOT_SUBMITTED',
      created_at: new Date(Date.now() - 900000),
    },
    {
      id: IDS.app5, protocol: 'BEN-2026-000005',
      clinic_id: IDS.clinic1, patient_id: IDS.patient5,
      created_by: IDS.userAtendente, analyst_id: IDS.userAnalista,
      categoria: 'odontologia', procedimento: 'Prótese total',
      valor_tratamento: 22000, entrada: 4000, valor_financiado: 18000,
      status: 'CONTRACT_SIGNED', int_decision: 'APPROVED_TO_PROCEED', lender_decision: 'APPROVED',
      created_at: new Date(Date.now() - 172800000),
    },
  ];

  for (const a of apps) {
    const submittedAt = new Date(a.created_at.getTime() + 30000);
    const preStartAt = new Date(a.created_at.getTime() + 35000);
    const preCompleteAt = new Date(a.created_at.getTime() + 50000);
    await sql`
      INSERT INTO applications (
        id, protocol, clinic_id, patient_id, created_by_user_id, assigned_analyst_id,
        categoria, procedimento, valor_tratamento, entrada, valor_financiado,
        status, internal_decision, lender_decision, created_at,
        submitted_at, pre_analysis_started_at, pre_analysis_completed_at
      ) VALUES (
        ${a.id}, ${a.protocol}, ${a.clinic_id}, ${a.patient_id}, ${a.created_by}, ${a.analyst_id},
        ${a.categoria}, ${a.procedimento}, ${a.valor_tratamento}, ${a.entrada}, ${a.valor_financiado},
        ${a.status}::application_status, ${a.int_decision}::internal_decision, ${a.lender_decision}::lender_decision,
        ${a.created_at.toISOString()}, ${submittedAt.toISOString()},
        ${preStartAt.toISOString()}, ${preCompleteAt.toISOString()}
      )
      ON CONFLICT (protocol) DO NOTHING
    `;
    console.log(`  ✓ ${a.protocol} (${a.status})`);
  }

  // ── PROPOSTAS ──
  console.log('\n💡 Propostas para BEN-2026-000003...');
  await sql`
    INSERT INTO proposals (application_id, partner_id, valor_financiado, entrada, parcelas, valor_parcela, taxa_mensal, cet_anual, valor_total, validade, ativa, created_by)
    VALUES
      (${IDS.app3}, ${IDS.partner1}, 10000, 2000, 36, 421.46, 0.019900, 0.268300, 15172.56, NOW() + INTERVAL '7 days', true, ${IDS.userAnalista}),
      (${IDS.app3}, ${IDS.partner2}, 10000, 2000, 24, 520.15, 0.017900, 0.237200, 12483.60, NOW() + INTERVAL '7 days', true, ${IDS.userAnalista})
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ 2 propostas inseridas');

  // ── FUNDING ATTEMPT ──
  await sql`
    INSERT INTO funding_attempts (application_id, partner_id, status, valor_solicitado, motivo, responded_at)
    VALUES
      (${IDS.app1}, ${IDS.partner1}, 'APPROVED', 15000, 'Aprovado automaticamente', NOW() - INTERVAL '23 hours 45 minutes'),
      (${IDS.app3}, ${IDS.partner1}, 'PRE_APPROVED', 10000, NULL, NOW() - INTERVAL '45 minutes'),
      (${IDS.app3}, ${IDS.partner2}, 'PRE_APPROVED', 10000, NULL, NOW() - INTERVAL '40 minutes')
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ Funding attempts inseridas');

  // ── REPASSE ──
  console.log('\n💰 Repasse para BEN-2026-000001...');
  await sql`
    INSERT INTO payouts (application_id, clinic_id, partner_id, valor_tratamento, valor_financiado, taxa_benavera, comissao_parceiro, valor_liquido_clinica, status, data_prevista)
    VALUES (${IDS.app1}, ${IDS.clinic1}, ${IDS.partner1}, 18000, 15000, 373.50, 300.00, 14326.50, 'SCHEDULED', NOW() + INTERVAL '5 days')
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ Repasse inserido');

  // ── EVENT LOGS ──
  console.log('\n📋 Event logs...');
  await sql`
    INSERT INTO event_logs (application_id, actor_id, actor_type, actor_name, event, old_status, new_status, created_at)
    VALUES
      (${IDS.app1}, ${IDS.userAtendente}, 'USER', 'Ana Atendente', 'APPLICATION_CREATED', NULL, 'SUBMITTED', NOW() - INTERVAL '1 day'),
      (${IDS.app1}, NULL, 'SYSTEM', 'Benavera', 'PRE_ANALYSIS_STARTED', 'SUBMITTED', 'PRE_ANALYSIS', NOW() - INTERVAL '23 hours 59 minutes'),
      (${IDS.app1}, NULL, 'SYSTEM', 'Benavera', 'PRE_ANALYSIS_COMPLETED', 'PRE_ANALYSIS', 'PRE_ANALYSIS_APPROVED', NOW() - INTERVAL '23 hours 58 minutes'),
      (${IDS.app1}, ${IDS.userAnalista}, 'USER', 'Carlos Analista', 'INTERNAL_APPROVAL', 'PRE_ANALYSIS_APPROVED', 'APPROVED', NOW() - INTERVAL '23 hours'),
      (${IDS.app3}, ${IDS.userClinicAdmin}, 'USER', 'Dr. Ricardo Mendes', 'APPLICATION_CREATED', NULL, 'SUBMITTED', NOW() - INTERVAL '1 hour'),
      (${IDS.app3}, NULL, 'SYSTEM', 'Benavera', 'OFFER_GENERATED', 'LENDER_ANALYSIS', 'OFFERS_AVAILABLE', NOW() - INTERVAL '50 minutes')
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ Event logs inseridos');

  // ── NOTIFICAÇÕES ──
  const link1 = `/admin/solicitacoes/${IDS.app2}`;
  const link2 = `/financiamentos/${IDS.app3}`;
  await sql`INSERT INTO notifications (user_id, clinic_id, tipo, titulo, mensagem, lida, link) VALUES (${IDS.userAnalista}, NULL, 'NEW_APPLICATION', 'Nova solicitação para revisar', 'BEN-2026-000002 aguarda análise', false, ${link1})`;
  await sql`INSERT INTO notifications (user_id, clinic_id, tipo, titulo, mensagem, lida, link) VALUES (${IDS.userClinicAdmin}, ${IDS.clinic1}, 'OFFER_AVAILABLE', 'Proposta disponível!', 'BEN-2026-000003: Fernanda Rocha tem propostas disponíveis', false, ${link2})`;
  await sql`INSERT INTO notifications (user_id, clinic_id, tipo, titulo, mensagem, lida, link) VALUES (${IDS.userAtendente}, ${IDS.clinic1}, 'OFFER_AVAILABLE', 'Proposta disponível!', 'BEN-2026-000003: Fernanda Rocha tem propostas disponíveis', false, ${link2})`;
  console.log('  ✓ Notificações inseridas');

  console.log('\n✅ Seed concluído com sucesso!\n');
  console.log('═══════════════════════════════════════');
  console.log('Contas de acesso:');
  console.log('  admin@benavera.com.br      → Benavera@2026 (BENAVERA_ADMIN)');
  console.log('  analista@benavera.com.br   → Benavera@2026 (BENAVERA_ANALYST)');
  console.log('  admin@odontoprime.com.br   → Clinica@2026  (CLINIC_ADMIN)');
  console.log('  atendente@odontoprime.com.br → Clinica@2026 (CLINIC_ATTENDANT)');
  console.log('  financeiro@odontoprime.com.br → Clinica@2026 (CLINIC_FINANCIAL)');
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('\n❌ Seed falhou:', err.message || err);
  process.exit(1);
});
