-- ==============================================================================
-- BENAVERA — Migração para Turso (libSQL / SQLite)
-- Versão: 20260901000001
-- ==============================================================================

-- 1. TABELA DE LEADS DE PACIENTES (SIMULAÇÕES)
CREATE TABLE IF NOT EXISTS patient_leads (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT,
    cidade TEXT NOT NULL,
    estado TEXT,
    categoria_tratamento TEXT NOT NULL,
    valor_tratamento REAL,
    entrada REAL DEFAULT 0,
    parcela_desejada REAL,
    prazo_desejado TEXT,
    clinica_indicada TEXT,
    origem_lead TEXT DEFAULT 'site_simulador',
    pagina_origem TEXT NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    status TEXT NOT NULL DEFAULT 'nova' CHECK (status IN ('nova', 'em_analise', 'contatada', 'convertida', 'perdida')),
    consentimento INTEGER NOT NULL DEFAULT 1,
    versao_termos TEXT NOT NULL DEFAULT 'v1.0',
    ip_origem TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- 2. TABELA DE LEADS DE CLÍNICAS (B2B)
CREATE TABLE IF NOT EXISTS clinic_leads (
    id TEXT PRIMARY KEY,
    nome_responsavel TEXT NOT NULL,
    nome_clinica TEXT NOT NULL,
    cargo TEXT,
    whatsapp TEXT NOT NULL,
    email TEXT,
    cidade TEXT NOT NULL,
    estado TEXT,
    especialidade_principal TEXT NOT NULL,
    numero_unidades TEXT,
    ticket_medio TEXT,
    orcamentos_mensais TEXT,
    principal_dificuldade TEXT,
    origem_lead TEXT DEFAULT 'site_clinicas',
    pagina_origem TEXT NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    status_comercial TEXT NOT NULL DEFAULT 'novo' CHECK (status_comercial IN ('novo', 'em_contato', 'em_negociacao', 'parceiro_ativo', 'perdido')),
    consentimento INTEGER NOT NULL DEFAULT 1,
    versao_termos TEXT NOT NULL DEFAULT 'v1.0',
    ip_origem TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- 3. TABELA DE HISTÓRICO E EVENTOS DE AUDITORIA
CREATE TABLE IF NOT EXISTS lead_events (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    lead_tipo TEXT NOT NULL CHECK (lead_tipo IN ('patient', 'clinic')),
    tipo_evento TEXT NOT NULL,
    descricao TEXT,
    payload TEXT, -- JSON serializado
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- ÍNDICES PARA ALTA VELOCIDADE DE CONSULTA
CREATE INDEX IF NOT EXISTS idx_patient_leads_status ON patient_leads(status);
CREATE INDEX IF NOT EXISTS idx_patient_leads_created_at ON patient_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_clinic_leads_status ON clinic_leads(status_comercial);
CREATE INDEX IF NOT EXISTS idx_clinic_leads_created_at ON clinic_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
