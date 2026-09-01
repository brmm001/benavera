import { promises as fs } from 'fs';
import path from 'path';
import type {
  PatientLead,
  ClinicLead,
  LeadHistoryEvent,
  PatientLeadStatus,
  ClinicLeadStatus,
  LeadEventType,
} from '@/types';
import { getTursoClient, ensureTursoSchema } from '@/lib/turso';

const DB_FILE = path.join(process.cwd(), 'data', 'benavera_db.json');

interface DatabaseStore {
  patientLeads: PatientLead[];
  clinicLeads: ClinicLead[];
  events: LeadHistoryEvent[];
}

// Inicialização segura do arquivo de banco de dados local (fallback)
async function ensureDb(): Promise<void> {
  const dir = path.dirname(DB_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Diretório já existe
  }

  try {
    await fs.access(DB_FILE);
  } catch {
    const initial: DatabaseStore = {
      patientLeads: [],
      clinicLeads: [],
      events: [],
    };
    await fs.writeFile(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

async function readStore(): Promise<DatabaseStore> {
  await ensureDb();
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseStore;
    return {
      patientLeads: Array.isArray(parsed.patientLeads) ? parsed.patientLeads : [],
      clinicLeads: Array.isArray(parsed.clinicLeads) ? parsed.clinicLeads : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch (error) {
    console.error('[Benavera DB] Erro ao ler store local:', error);
    return { patientLeads: [], clinicLeads: [], events: [] };
  }
}

async function writeStore(store: DatabaseStore): Promise<void> {
  await ensureDb();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf-8');
  await fs.rename(tempFile, DB_FILE);
}

// ============================================================
// PACIENTES (SIMULAÇÕES)
// ============================================================

export async function savePatientLead(
  data: Omit<PatientLead, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<{ id: string }> {
  const id = `pat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const newLead: PatientLead = {
    ...data,
    id,
    status: 'nova',
    createdAt: now,
    updatedAt: now,
  };

  const turso = getTursoClient();
  if (turso) {
    try {
      await ensureTursoSchema(turso);
      await turso.execute({
        sql: `INSERT INTO patient_leads (
          id, nome, telefone, email, cidade, estado,
          categoria_tratamento, valor_tratamento, entrada, parcela_desejada,
          prazo_desejado, clinica_indicada, origem_lead, pagina_origem,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          status, consentimento, versao_termos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          newLead.nome,
          newLead.telefone,
          newLead.email || null,
          newLead.cidade,
          newLead.estado || null,
          newLead.tratamento,
          newLead.valorTratamento || null,
          newLead.entrada || 0,
          newLead.parcelaDesejada || null,
          newLead.prazoDesejado || null,
          newLead.clinicaIndicada || null,
          newLead.origem,
          newLead.landingPage,
          newLead.utmSource || null,
          newLead.utmMedium || null,
          newLead.utmCampaign || null,
          newLead.utmContent || null,
          newLead.utmTerm || null,
          newLead.status || 'nova',
          newLead.consentimento ? 1 : 0,
          newLead.versaoTermos || 'v1.0',
          now,
          now,
        ],
      });
    } catch (e) {
      console.error('[Benavera Turso] Erro ao salvar paciente no Turso, gravando no fallback local:', e);
    }
  }

  // Grava também no store local para redundância e desenvolvimento
  const store = await readStore();
  store.patientLeads.unshift(newLead);
  await writeStore(store);

  await recordLeadEvent(id, 'patient', 'lead_created', 'Simulação de paciente recebida pelo site.', {
    origem: newLead.origem,
    categoria: newLead.tratamento,
  });

  return { id };
}

export async function getPatientLeads(options?: {
  status?: string;
  search?: string;
}): Promise<PatientLead[]> {
  const turso = getTursoClient();
  if (turso) {
    try {
      await ensureTursoSchema(turso);
      let query = 'SELECT * FROM patient_leads WHERE 1=1';
      const args: (string | number)[] = [];

      if (options?.status && options.status !== 'all') {
        query += ' AND status = ?';
        args.push(options.status);
      }

      if (options?.search) {
        query += ' AND (nome LIKE ? OR cidade LIKE ? OR categoria_tratamento LIKE ?)';
        const term = `%${options.search}%`;
        args.push(term, term, term);
      }

      query += ' ORDER BY created_at DESC';

      const result = await turso.execute({ sql: query, args });
      return result.rows.map((row) => ({
        id: String(row.id),
        nome: String(row.nome),
        telefone: String(row.telefone),
        email: row.email ? String(row.email) : undefined,
        cidade: String(row.cidade),
        estado: row.estado ? String(row.estado) : undefined,
        tratamento: String(row.categoria_tratamento),
        valorTratamento: row.valor_tratamento ? Number(row.valor_tratamento) : undefined,
        entrada: row.entrada ? Number(row.entrada) : 0,
        parcelaDesejada: row.parcela_desejada ? Number(row.parcela_desejada) : undefined,
        prazoDesejado: row.prazo_desejado ? String(row.prazo_desejado) : undefined,
        clinicaIndicada: row.clinica_indicada ? String(row.clinica_indicada) : undefined,
        origem: String(row.origem_lead),
        landingPage: String(row.pagina_origem),
        utmSource: row.utm_source ? String(row.utm_source) : undefined,
        utmMedium: row.utm_medium ? String(row.utm_medium) : undefined,
        utmCampaign: row.utm_campaign ? String(row.utm_campaign) : undefined,
        utmContent: row.utm_content ? String(row.utm_content) : undefined,
        utmTerm: row.utm_term ? String(row.utm_term) : undefined,
        status: (row.status as PatientLeadStatus) || 'nova',
        consentimento: Boolean(row.consentimento),
        versaoTermos: String(row.versao_termos || 'v1.0'),
        tipoLead: 'patient',
        timestamp: String(row.created_at),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));
    } catch (e) {
      console.warn('[Benavera Turso] Falha na consulta do Turso, usando fallback local:', e);
    }
  }

  const store = await readStore();
  let list = store.patientLeads;

  if (options?.status && options.status !== 'all') {
    list = list.filter((l) => l.status === options.status);
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.nome.toLowerCase().includes(q) ||
        l.cidade.toLowerCase().includes(q) ||
        l.tratamento.toLowerCase().includes(q)
    );
  }

  return list;
}

export async function updatePatientLeadStatus(
  id: string,
  status: PatientLeadStatus,
  note?: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const turso = getTursoClient();

  if (turso) {
    try {
      await turso.execute({
        sql: 'UPDATE patient_leads SET status = ?, updated_at = ? WHERE id = ?',
        args: [status, now, id],
      });
    } catch (e) {
      console.error('[Benavera Turso] Erro ao atualizar status no Turso:', e);
    }
  }

  const store = await readStore();
  const lead = store.patientLeads.find((l) => l.id === id);
  const oldStatus = lead?.status || 'desconhecido';

  if (lead) {
    lead.status = status;
    lead.updatedAt = now;
    await writeStore(store);
  }

  await recordLeadEvent(
    id,
    'patient',
    'status_changed',
    `Status alterado de "${oldStatus}" para "${status}".`,
    { oldStatus, newStatus: status, note }
  );

  if (note) {
    await recordLeadEvent(id, 'patient', 'note_added', note);
  }

  return true;
}

// ============================================================
// CLÍNICAS (B2B)
// ============================================================

export async function saveClinicLead(
  data: Omit<ClinicLead, 'id' | 'createdAt' | 'updatedAt' | 'statusComercial'>
): Promise<{ id: string }> {
  const id = `cln_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const newLead: ClinicLead = {
    ...data,
    id,
    statusComercial: 'novo',
    createdAt: now,
    updatedAt: now,
  };

  const turso = getTursoClient();
  if (turso) {
    try {
      await ensureTursoSchema(turso);
      await turso.execute({
        sql: `INSERT INTO clinic_leads (
          id, nome_responsavel, nome_clinica, cargo, whatsapp, email,
          cidade, estado, especialidade_principal, numero_unidades,
          ticket_medio, orcamentos_mensais, principal_dificuldade,
          origem_lead, pagina_origem, utm_source, utm_medium,
          utm_campaign, utm_content, utm_term, status_comercial,
          consentimento, versao_termos, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          newLead.nome,
          newLead.nomeClinica,
          newLead.cargo || null,
          newLead.whatsapp,
          newLead.email || null,
          newLead.cidade,
          newLead.estado || null,
          newLead.especialidade,
          newLead.numeroUnidades || null,
          newLead.ticketMedio || null,
          newLead.orcamentosMes || null,
          newLead.maiorDesafio || null,
          newLead.origem,
          newLead.landingPage,
          newLead.utmSource || null,
          newLead.utmMedium || null,
          newLead.utmCampaign || null,
          newLead.utmContent || null,
          newLead.utmTerm || null,
          newLead.statusComercial || 'novo',
          newLead.consentimento ? 1 : 0,
          newLead.versaoTermos || 'v1.0',
          now,
          now,
        ],
      });
    } catch (e) {
      console.error('[Benavera Turso] Erro ao salvar clínica no Turso, gravando local:', e);
    }
  }

  const store = await readStore();
  store.clinicLeads.unshift(newLead);
  await writeStore(store);

  await recordLeadEvent(id, 'clinic', 'lead_created', 'Cadastro de clínica recebido pelo site.', {
    clinica: newLead.nomeClinica,
    especialidade: newLead.especialidade,
  });

  return { id };
}

export async function getClinicLeads(options?: {
  status?: string;
  search?: string;
}): Promise<ClinicLead[]> {
  const turso = getTursoClient();
  if (turso) {
    try {
      await ensureTursoSchema(turso);
      let query = 'SELECT * FROM clinic_leads WHERE 1=1';
      const args: (string | number)[] = [];

      if (options?.status && options.status !== 'all') {
        query += ' AND status_comercial = ?';
        args.push(options.status);
      }

      if (options?.search) {
        query += ' AND (nome_responsavel LIKE ? OR nome_clinica LIKE ? OR cidade LIKE ? OR especialidade_principal LIKE ?)';
        const term = `%${options.search}%`;
        args.push(term, term, term, term);
      }

      query += ' ORDER BY created_at DESC';

      const result = await turso.execute({ sql: query, args });
      return result.rows.map((row) => ({
        id: String(row.id),
        nome: String(row.nome_responsavel),
        nomeClinica: String(row.nome_clinica),
        cargo: row.cargo ? String(row.cargo) : undefined,
        whatsapp: String(row.whatsapp),
        email: row.email ? String(row.email) : undefined,
        cidade: String(row.cidade),
        estado: row.estado ? String(row.estado) : undefined,
        especialidade: String(row.especialidade_principal),
        numeroUnidades: row.numero_unidades ? String(row.numero_unidades) : undefined,
        ticketMedio: row.ticket_medio ? String(row.ticket_medio) : undefined,
        orcamentosMes: row.orcamentos_mensais ? String(row.orcamentos_mensais) : undefined,
        maiorDesafio: row.principal_dificuldade ? String(row.principal_dificuldade) : undefined,
        origem: String(row.origem_lead),
        landingPage: String(row.pagina_origem),
        utmSource: row.utm_source ? String(row.utm_source) : undefined,
        utmMedium: row.utm_medium ? String(row.utm_medium) : undefined,
        utmCampaign: row.utm_campaign ? String(row.utm_campaign) : undefined,
        utmContent: row.utm_content ? String(row.utm_content) : undefined,
        utmTerm: row.utm_term ? String(row.utm_term) : undefined,
        statusComercial: (row.status_comercial as ClinicLeadStatus) || 'novo',
        consentimento: Boolean(row.consentimento),
        versaoTermos: String(row.versao_termos || 'v1.0'),
        tipoLead: 'clinic',
        timestamp: String(row.created_at),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));
    } catch (e) {
      console.warn('[Benavera Turso] Falha ao consultar clínicas no Turso, usando fallback local:', e);
    }
  }

  const store = await readStore();
  let list = store.clinicLeads;

  if (options?.status && options.status !== 'all') {
    list = list.filter((l) => l.statusComercial === options.status);
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.nome.toLowerCase().includes(q) ||
        l.nomeClinica.toLowerCase().includes(q) ||
        l.cidade.toLowerCase().includes(q) ||
        l.especialidade.toLowerCase().includes(q)
    );
  }

  return list;
}

export async function updateClinicLeadStatus(
  id: string,
  status: ClinicLeadStatus,
  note?: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const turso = getTursoClient();

  if (turso) {
    try {
      await turso.execute({
        sql: 'UPDATE clinic_leads SET status_comercial = ?, updated_at = ? WHERE id = ?',
        args: [status, now, id],
      });
    } catch (e) {
      console.error('[Benavera Turso] Erro ao atualizar status no Turso:', e);
    }
  }

  const store = await readStore();
  const lead = store.clinicLeads.find((l) => l.id === id);
  const oldStatus = lead?.statusComercial || 'desconhecido';

  if (lead) {
    lead.statusComercial = status;
    lead.updatedAt = now;
    await writeStore(store);
  }

  await recordLeadEvent(
    id,
    'clinic',
    'status_changed',
    `Status comercial alterado de "${oldStatus}" para "${status}".`,
    { oldStatus, newStatus: status, note }
  );

  if (note) {
    await recordLeadEvent(id, 'clinic', 'note_added', note);
  }

  return true;
}

// ============================================================
// HISTÓRICO & EVENTOS
// ============================================================

export async function recordLeadEvent(
  leadId: string,
  leadType: 'patient' | 'clinic',
  eventType: LeadEventType,
  description?: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const payloadStr = payload ? JSON.stringify(payload) : null;

  const turso = getTursoClient();
  if (turso) {
    try {
      await turso.execute({
        sql: 'INSERT INTO lead_events (id, lead_id, lead_tipo, tipo_evento, descricao, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, leadId, leadType, eventType, description || null, payloadStr, now],
      });
    } catch (e) {
      console.error('[Benavera Turso] Erro ao registrar evento no Turso:', e);
    }
  }

  const event: LeadHistoryEvent = {
    id,
    leadId,
    leadType,
    eventType,
    description,
    payload,
    createdAt: now,
  };

  const store = await readStore();
  store.events.unshift(event);
  await writeStore(store);
}

export async function getLeadEvents(leadId: string): Promise<LeadHistoryEvent[]> {
  const turso = getTursoClient();
  if (turso) {
    try {
      const res = await turso.execute({
        sql: 'SELECT * FROM lead_events WHERE lead_id = ? ORDER BY created_at DESC',
        args: [leadId],
      });
      return res.rows.map((row) => ({
        id: String(row.id),
        leadId: String(row.lead_id),
        leadType: row.lead_tipo as 'patient' | 'clinic',
        eventType: row.tipo_evento as LeadEventType,
        description: row.descricao ? String(row.descricao) : undefined,
        payload: row.payload ? JSON.parse(String(row.payload)) : undefined,
        createdAt: String(row.created_at),
      }));
    } catch (e) {
      console.warn('[Benavera Turso] Falha ao consultar eventos no Turso:', e);
    }
  }

  const store = await readStore();
  return store.events.filter((e) => e.leadId === leadId);
}

// ============================================================
// LGPD ANONIMIZAÇÃO / EXCLUSÃO
// ============================================================

export async function anonymizeLead(
  id: string,
  type: 'patient' | 'clinic'
): Promise<boolean> {
  const now = new Date().toISOString();
  const turso = getTursoClient();

  if (turso) {
    try {
      if (type === 'patient') {
        await turso.execute({
          sql: `UPDATE patient_leads SET 
            nome = 'Usuário Anonimizado',
            telefone = '(00) 00000-0000',
            email = 'anonimizado@benavera.com.br',
            cidade = 'Anonimizado',
            updated_at = ?
          WHERE id = ?`,
          args: [now, id],
        });
      } else {
        await turso.execute({
          sql: `UPDATE clinic_leads SET 
            nome_responsavel = 'Responsável Anonimizado',
            nome_clinica = 'Clínica Anonimizada',
            whatsapp = '(00) 00000-0000',
            email = 'anonimizado@benavera.com.br',
            cidade = 'Anonimizado',
            updated_at = ?
          WHERE id = ?`,
          args: [now, id],
        });
      }
    } catch (e) {
      console.error('[Benavera Turso] Erro ao anonimizar lead no Turso:', e);
    }
  }

  const store = await readStore();
  if (type === 'patient') {
    const lead = store.patientLeads.find((l) => l.id === id);
    if (!lead) return false;
    lead.nome = 'Usuário Anonimizado';
    lead.telefone = '(00) 00000-0000';
    lead.email = 'anonimizado@benavera.com.br';
    lead.cidade = 'Anonimizado';
    lead.updatedAt = now;
  } else {
    const lead = store.clinicLeads.find((l) => l.id === id);
    if (!lead) return false;
    lead.nome = 'Responsável Anonimizado';
    lead.nomeClinica = 'Clínica Anonimizada';
    lead.whatsapp = '(00) 00000-0000';
    lead.email = 'anonimizado@benavera.com.br';
    lead.cidade = 'Anonimizado';
    lead.updatedAt = now;
  }

  await writeStore(store);
  await recordLeadEvent(id, type, 'data_anonymized', 'Dados pessoais anonimizados em conformidade com a LGPD.');
  return true;
}

// ============================================================
// MÉTRICAS ADMINISTRATIVAS
// ============================================================

export async function getDashboardMetrics() {
  const patientLeads = await getPatientLeads();
  const clinicLeads = await getClinicLeads();

  const patientStatusCount: Record<string, number> = {
    nova: 0,
    em_analise: 0,
    contatada: 0,
    convertida: 0,
    perdida: 0,
  };

  const clinicStatusCount: Record<string, number> = {
    novo: 0,
    em_contato: 0,
    em_negociacao: 0,
    parceiro_ativo: 0,
    perdido: 0,
  };

  const categoryCount: Record<string, number> = {};
  const sourceCount: Record<string, number> = {};
  let totalTicket = 0;
  let countWithTicket = 0;

  for (const p of patientLeads) {
    const st = p.status || 'nova';
    patientStatusCount[st] = (patientStatusCount[st] || 0) + 1;

    const cat = p.tratamento || 'Outros';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;

    const src = p.utmSource || p.origem || 'Direto';
    sourceCount[src] = (sourceCount[src] || 0) + 1;

    if (p.valorTratamento && p.valorTratamento > 0) {
      totalTicket += p.valorTratamento;
      countWithTicket += 1;
    }
  }

  for (const c of clinicLeads) {
    const st = c.statusComercial || 'novo';
    clinicStatusCount[st] = (clinicStatusCount[st] || 0) + 1;

    const src = c.utmSource || c.origem || 'Direto';
    sourceCount[src] = (sourceCount[src] || 0) + 1;
  }

  const averageTicket = countWithTicket > 0 ? Math.round(totalTicket / countWithTicket) : 0;

  return {
    totalPatientLeads: patientLeads.length,
    totalClinicLeads: clinicLeads.length,
    averageTicket,
    patientStatusCount,
    clinicStatusCount,
    categoryCount,
    sourceCount,
  };
}
