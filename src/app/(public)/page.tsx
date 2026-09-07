import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, ShieldCheck, Zap, TrendingUp, DollarSign,
  Users, Building2, CreditCard, ChevronRight, Clock, Star, Phone, FileText
} from 'lucide-react';
import { FinancialDisclaimer } from '@/components/FinancialDisclaimer';
import { ArticleCard } from '@/components/ArticleCard';
import { articles } from '@/content/articles';

export const metadata: Metadata = {
  title: {
    absolute: 'Benavera | Plataforma Clinic-First de Financiamento & CRM para Clínicas',
  },
  description:
    'Aumente a conversão de orçamentos particulares da sua clínica com parcelamento em até 36x, repasse em D+1 sem risco de inadimplência e CRM completo. Para pacientes: simule seu tratamento.',
  alternates: { canonical: 'https://www.benavera.com.br' },
};

const clinicStats = [
  { value: '+40%', label: 'Aumento na conversão de orçamentos de alto valor' },
  { value: 'D+1', label: 'Repasse integral na conta da clínica' },
  { value: 'Até 36x', label: 'Parcelas que cabem no bolso do paciente' },
  { value: '0 Risco', label: 'Inadimplência 100% assumida pelo parceiro financeiro' },
];

const howItWorksClinic = [
  {
    step: '01',
    title: 'Gere a proposta no balcão em 1 minuto',
    desc: 'Durante ou após a consulta, sua equipe insere o valor do tratamento no Portal Benavera e gera opções personalizadas de parcelamento.',
  },
  {
    step: '02',
    title: 'Envie o link direto no WhatsApp do paciente',
    desc: 'O paciente abre a proposta no próprio smartphone, visualiza o valor planejado e escolhe o número de parcelas ideal (6x a 36x).',
  },
  {
    step: '03',
    title: 'Aprovação de crédito e aceite digital',
    desc: 'Análise ágil com validação simplificada. O paciente assina digitalmente sem burocracia nem papéis.',
  },
  {
    step: '04',
    title: 'Repasse D+1 e início do tratamento',
    desc: 'Sua clínica recebe o valor líquido diretamente via Pix/TED no dia útil seguinte e inicia o procedimento com total segurança.',
  },
];

const treatments = [
  { label: 'Odontologia & Implantes', href: '/parcelamento-tratamento-odontologico', icon: '🦷' },
  { label: 'Cirurgias Particulares', href: '/parcelamento-cirurgia-particular', icon: '🏥' },
  { label: 'Implantes & Próteses Dentárias', href: '/financiamento-implante-dentario', icon: '✨' },
  { label: 'Cirurgias Oftalmológicas & Lentes', href: '/parcelamento-cirurgia-oftalmologica', icon: '👁️' },
  { label: 'Procedimentos Estéticos & Plástica', href: '/parcelamento-procedimento-estetico', icon: '💎' },
  { label: 'Outros Tratamentos Médicos', href: '/simular', icon: '🩺' },
];

const faqItems = [
  {
    question: 'Como a Benavera ajuda minha clínica a faturar mais?',
    answer:
      'A maior causa de perda de orçamentos em clínicas privadas é a falta de limite no cartão ou a impossibilidade de pagar à vista. A Benavera oferece parcelamento facilitado em até 36x via boleto/crédito direto, permitindo que pacientes que não fechariam aprovem o tratamento imediatamente.',
  },
  {
    question: 'A clínica assume risco de inadimplência caso o paciente atrase?',
    answer:
      'Não. O risco de crédito é 100% absorvido pelo parceiro financeiro. A clínica recebe o repasse integral (descontada a taxa de intermediação) em D+1 após a aprovação.',
  },
  {
    question: 'Como a clínica acessa o sistema e envia propostas?',
    answer:
      'Após o credenciamento gratuito, a clínica tem acesso ao Portal Benavera, onde pode gerar propostas instantâneas, acompanhar o status no CRM Kanban, verificar repasses e gerenciar pacientes.',
  },
  {
    question: 'Quanto custa para a clínica se credenciar?',
    answer:
      'Nesta fase de expansão com clínicas parceiras, não cobramos taxa de adesão, mensalidade ou custo de implantação. A clínica só paga a taxa percentual sobre os tratamentos efetivamente aprovados e liquidados.',
  },
  {
    question: 'Como funciona para o paciente que quer parcelar?',
    answer:
      'O paciente pode receber uma proposta diretamente de uma clínica parceira credenciada ou simular seu tratamento em nosso site para ser encaminhado a uma clínica da nossa rede.',
  },
  {
    question: 'A simulação do paciente é gratuita e sem compromisso?',
    answer:
      'Sim, a simulação é 100% gratuita. O paciente avalia os prazos e condições com total transparência antes de qualquer confirmação.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function HomePage() {
  const featuredArticles = articles.slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* =========================================================================
          HERO PRINCIPAL B2B — CLINIC-FIRST
      ========================================================================= */}
      <section
        style={{
          paddingTop: '7.5rem',
          paddingBottom: '5.5rem',
          background: 'linear-gradient(180deg, #090d16 0%, #0f172a 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow de fundo */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '800px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(99,112,241,0.18) 0%, rgba(15,23,42,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="container-benavera" style={{ position: 'relative', zIndex: 2 }}>
          <div className="grid-lg-2" style={{ alignItems: 'center', gap: '3.5rem' }}>
            {/* Coluna da Esquerda: Proposta de Valor B2B */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.875rem',
                  background: 'rgba(99,112,241,0.15)',
                  border: '1px solid rgba(99,112,241,0.3)',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  color: '#a5b4fc',
                  marginBottom: '1.25rem',
                }}
              >
                <Zap size={14} color="#818cf8" />
                Infraestrutura Financeira & CRM para Clínicas
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.25rem, 4.8vw, 3.5rem)',
                  fontWeight: '900',
                  lineHeight: '1.1',
                  letterSpacing: '-0.035em',
                  color: 'white',
                  marginBottom: '1.25rem',
                }}
              >
                A infraestrutura financeira que faz sua clínica{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #818cf8 0%, #34d399 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  aprovar mais orçamentos.
                </span>
              </h1>

              <p
                style={{
                  fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
                  color: '#94a3b8',
                  lineHeight: '1.7',
                  marginBottom: '2.25rem',
                  maxWidth: '540px',
                }}
              >
                Ofereça parcelamento em <strong>até 36x</strong> para seus pacientes sem comprometer o limite do cartão, receba o repasse <strong>integral em D+1</strong> sem risco de inadimplência e gerencie todo o funil em um portal moderno com CRM.
              </p>

              {/* Botões de Ação B2B */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                <Link
                  href="/credenciamento"
                  id="hero-credenciar-btn"
                  className="btn-primary"
                  style={{
                    background: '#4f46e5',
                    fontSize: '1rem',
                    padding: '0.9375rem 1.875rem',
                    gap: '0.5rem',
                  }}
                >
                  Credenciar clínica online
                  <ArrowRight size={17} />
                </Link>

                <Link
                  href="/portal/login"
                  id="hero-portal-btn"
                  className="btn-ghost"
                  style={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '0.9375rem',
                    padding: '0.9375rem 1.5rem',
                    gap: '0.5rem',
                  }}
                >
                  <Building2 size={16} />
                  Acessar Portal da Clínica
                </Link>
              </div>

              {/* Trust Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                {[
                  'Sem mensalidade fixa',
                  'Repasse garantido em D+1',
                  'Zero risco de crédito',
                ].map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: '0.8125rem',
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <CheckCircle2 size={15} color="#10b981" />
                    {item}
                  </span>
                ))}
              </div>

              {/* Link de alternância para paciente */}
              <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <a
                  href="#pacientes"
                  id="hero-anchor-patient"
                  style={{
                    fontSize: '0.875rem',
                    color: '#94a3b8',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    transition: 'color 0.15s',
                  }}
                >
                  É paciente e quer parcelar um tratamento? <span style={{ color: '#818cf8', fontWeight: '600' }}>Simule seu parcelamento aqui ↓</span>
                </a>
              </div>
            </div>

            {/* Coluna da Direita: Mockup Visual do Portal Benavera */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  padding: '1.75rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  width: '100%',
                  maxWidth: '440px',
                }}
              >
                {/* Topbar do Mockup */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.875rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem', fontWeight: '600' }}>
                      Portal Benavera • Visão Clínica
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#34d399', background: 'rgba(52,211,153,0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '700' }}>
                    D+1 Ativo
                  </span>
                </div>

                {/* Card de Proposta Aprovada */}
                <div style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6875rem', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Última Proposta Aceita
                      </span>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: 'white', marginTop: '0.125rem' }}>
                        Implante Protocolo Superior
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Paciente: Mariana Silva S.</div>
                    </div>
                    <span style={{ background: '#065f46', color: '#6ee7b7', fontSize: '0.6875rem', fontWeight: '700', padding: '0.25rem 0.625rem', borderRadius: '20px' }}>
                      ✓ Aprovado
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Condição Escolhida:</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: 'white' }}>24x R$ 560,00</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>Repasse Líquido D+1:</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: '#34d399' }}>R$ 11.400,00</div>
                    </div>
                  </div>
                </div>

                {/* Micro Funil CRM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#cbd5e1' }}>
                    <span>Propostas no mês</span>
                    <strong style={{ color: 'white' }}>R$ 184.000 / 22 pacientes</strong>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '74%', height: '100%', background: 'linear-gradient(90deg, #4f46e5, #34d399)' }} />
                  </div>
                </div>

                <Link
                  href="/credenciamento"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    fontSize: '0.8125rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  Simular ganho de faturamento da minha clínica →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BARRA DE IMPACTO E MÉTRICAS B2B
      ========================================================================= */}
      <section style={{ background: '#0b1120', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem 0' }}>
        <div className="container-benavera">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {clinicStats.map((st) => (
              <div key={st.label} style={{ textAlign: 'center', padding: '0.5rem' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#818cf8', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
                  {st.value}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMO FUNCIONA PARA A CLÍNICA
      ========================================================================= */}
      <section style={{ padding: '5.5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem' }}>
            <span className="section-label">Jornada Clinic-First</span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em', margin: '0.5rem 0 1rem' }}>
              Como a Benavera funciona na rotina da sua clínica
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#64748b', lineHeight: '1.7', margin: 0 }}>
              Sem maquininhas extras, sem fricção e sem burocracia. Uma experiência 100% digital integrada ao seu atendimento.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {howItWorksClinic.map((item) => (
              <div
                key={item.step}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '2rem 1.5rem',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#4f46e5', marginBottom: '1rem', opacity: 0.85 }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.625rem', lineHeight: '1.35' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.65', margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/credenciamento" className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Credenciar minha clínica agora
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMPARATIVO: SUA CLÍNICA SEM VS COM BENAVERA
      ========================================================================= */}
      <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
            <span className="section-label">Vantagem Competitiva</span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.375rem)', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.75rem' }}>
              O impacto direto no fechamento de orçamentos
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            {/* Sem Benavera */}
            <div style={{ background: 'white', border: '1px solid #fecaca', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: '800', color: '#b91c1c', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✕</span> Sem a Benavera
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem', color: '#475569' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>•</span>
                  Paciente desiste por falta de limite no cartão de crédito.
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>•</span>
                  Clínica é forçada a dar desconto excessivo à vista para fechar.
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>•</span>
                  Carnê próprio gera risco alto de inadimplência e cobrança desgastante.
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>•</span>
                  Orçamentos ficam esquecidos no WhatsApp sem acompanhamento.
                </li>
              </ul>
            </div>

            {/* Com Benavera */}
            <div style={{ background: 'white', border: '2px solid #4f46e5', borderRadius: '16px', padding: '2rem', boxShadow: '0 10px 25px -5px rgba(79,70,229,0.1)' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: '800', color: '#4f46e5', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>✓</span> Com a Benavera
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.875rem', color: '#1e293b' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Parcelamento em até 36x que viabiliza tratamentos de alto valor.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Repasse integral D+1 na conta da clínica, mantendo o fluxo de caixa saudável.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Zero risco de inadimplência para a clínica.</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Portal com CRM Kanban para nunca mais perder um orçamento enviado.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SEÇÃO B2C: PARA PACIENTES (ÂNCORA #PACIENTES)
      ========================================================================= */}
      <section id="pacientes" style={{ padding: '5.5rem 0', background: 'white' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '720px', margin: '0 auto 3.5rem', textAlign: 'center' }}>
            <span className="section-label" style={{ color: '#059669', background: '#ecfdf5' }}>
              Para Pacientes
            </span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.375rem)', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 1rem' }}>
              O tratamento que você precisa cabe no seu orçamento
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#64748b', lineHeight: '1.7', margin: 0 }}>
              Não adie sua saúde e seu bem-estar por questões de pagamento. Conheça as opções de parcelamento facilitado em clínicas parceiras.
            </p>
          </div>

          {/* Grid de Tratamentos com links SEO preservados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {treatments.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#0f172a' }}>{t.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ver condições e simulação →</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Card de Simulação B2C */}
          <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: '20px', padding: '2.5rem', color: 'white', textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
              Quer saber quanto ficaria a parcela do seu tratamento?
            </h3>
            <p style={{ fontSize: '0.9375rem', color: '#cbd5e1', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: '1.6' }}>
              Simule sem compromisso e sem custo. Nossos consultores ajudam a encontrar a melhor condição para você realizar o procedimento.
            </p>
            <Link
              href="/simular"
              className="btn-action"
              style={{
                background: '#10b981',
                color: 'white',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                display: 'inline-flex',
                fontWeight: '700',
              }}
            >
              Simular Meu Tratamento Agora
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ARTIGOS DE CONTEÚDO E AUTORIDADE SEO
      ========================================================================= */}
      {featuredArticles.length > 0 && (
        <section style={{ padding: '5rem 0', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <div className="container-benavera">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="section-label">Conteúdo Educativo & Guias</span>
                <h2 style={{ fontSize: '1.875rem', fontWeight: '800', color: '#0f172a', margin: '0.375rem 0 0' }}>
                  Artigos sobre custos e parcelamento de saúde
                </h2>
              </div>
              <Link href="/conteudos" className="btn-action btn-action-outline" style={{ gap: '0.375rem' }}>
                Ver todos os 90+ artigos
                <ArrowRight size={15} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {featuredArticles.map((article) => (
                <ArticleCard key={article.slug} {...article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          FAQ B2B2C COMPLETO
      ========================================================================= */}
      <section style={{ padding: '5.5rem 0', background: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div className="container-benavera">
          <div style={{ maxWidth: '680px', margin: '0 auto 3.5rem', textAlign: 'center' }}>
            <span className="section-label">Tire suas dúvidas</span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.375rem)', fontWeight: '800', color: '#0f172a', margin: '0.5rem 0 0.5rem' }}>
              Perguntas Frequentes
            </h2>
            <p style={{ fontSize: '1rem', color: '#64748b' }}>
              Respostas claras para clínicas parceiras e pacientes.
            </p>
          </div>

          <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqItems.map((faq, idx) => (
              <details
                key={idx}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                }}
              >
                <summary style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', cursor: 'pointer', outline: 'none' }}>
                  {faq.question}
                </summary>
                <p style={{ fontSize: '0.9375rem', color: '#475569', lineHeight: '1.7', margin: '0.875rem 0 0' }}>
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer de Transparência Financeira */}
      <FinancialDisclaimer />
    </>
  );
}
