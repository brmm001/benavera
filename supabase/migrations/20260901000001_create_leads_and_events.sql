-- ==============================================================================
-- BENAVERA — Migração Inicial de Banco de Dados (PostgreSQL / Supabase)
-- Versão: 20260901000001
-- ==============================================================================

-- 1. TABELA DE LEADS DE PACIENTES (SIMULAÇÕES)
CREATE TABLE IF NOT EXISTS public.patient_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    cidade VARCHAR(120) NOT NULL,
    estado VARCHAR(10),
    categoria_tratamento VARCHAR(100) NOT NULL,
    valor_tratamento NUMERIC(12, 2),
    entrada NUMERIC(12, 2) DEFAULT 0,
    parcela_desejada NUMERIC(12, 2),
    prazo_desejado VARCHAR(50),
    clinica_indicada VARCHAR(255),
    origem_lead VARCHAR(100) DEFAULT 'site_simulador',
    pagina_origem VARCHAR(255) NOT NULL,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'nova' CHECK (status IN ('nova', 'em_analise', 'contatada', 'convertida', 'perdida')),
    consentimento BOOLEAN NOT NULL DEFAULT true,
    versao_termos VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    ip_origem VARCHAR(60),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE LEADS DE CLÍNICAS (B2B)
CREATE TABLE IF NOT EXISTS public.clinic_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_responsavel VARCHAR(255) NOT NULL,
    nome_clinica VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    whatsapp VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    cidade VARCHAR(120) NOT NULL,
    estado VARCHAR(10),
    especialidade_principal VARCHAR(100) NOT NULL,
    numero_unidades VARCHAR(50),
    ticket_medio VARCHAR(50),
    orcamentos_mensais VARCHAR(50),
    principal_dificuldade TEXT,
    origem_lead VARCHAR(100) DEFAULT 'site_clinicas',
    pagina_origem VARCHAR(255) NOT NULL,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    status_comercial VARCHAR(30) NOT NULL DEFAULT 'novo' CHECK (status_comercial IN ('novo', 'em_contato', 'em_negociacao', 'parceiro_ativo', 'perdido')),
    consentimento BOOLEAN NOT NULL DEFAULT true,
    versao_termos VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    ip_origem VARCHAR(60),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA DE EVENTOS / HISTÓRICO DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    lead_tipo VARCHAR(20) NOT NULL CHECK (lead_tipo IN ('patient', 'clinic')),
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN ('lead_created', 'status_changed', 'contact_made', 'note_added', 'converted', 'lost', 'data_anonymized')),
    descricao TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_patient_leads_status ON public.patient_leads(status);
CREATE INDEX IF NOT EXISTS idx_patient_leads_created_at ON public.patient_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_leads_tratamento ON public.patient_leads(categoria_tratamento);
CREATE INDEX IF NOT EXISTS idx_patient_leads_cidade ON public.patient_leads(cidade);

CREATE INDEX IF NOT EXISTS idx_clinic_leads_status ON public.clinic_leads(status_comercial);
CREATE INDEX IF NOT EXISTS idx_clinic_leads_created_at ON public.clinic_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON public.lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON public.lead_events(created_at DESC);

-- TRIGGER AUTOMÁTICO DE UPDATED_AT
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_leads_updated_at ON public.patient_leads;
CREATE TRIGGER trg_patient_leads_updated_at
BEFORE UPDATE ON public.patient_leads
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_clinic_leads_updated_at ON public.clinic_leads;
CREATE TRIGGER trg_clinic_leads_updated_at
BEFORE UPDATE ON public.clinic_leads
FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
