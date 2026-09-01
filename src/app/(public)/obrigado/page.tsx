import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Clock, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Simulação recebida',
  description:
    'Recebemos sua solicitação de simulação. Nossa equipe entrará em contato com as opções de parcelamento disponíveis para o seu perfil.',
  robots: { index: false, follow: false },
};

export default function ObrigadoPage() {
  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '5rem',
      background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 60%, #f8fafc 100%)',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div className="container-benavera" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
        <div style={{
          maxWidth: '560px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          {/* Ícone de sucesso */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #f0f4ff 0%, #e0eaff 100%)',
            border: '2px solid #a5b9fc',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
          }}>
            <CheckCircle2 size={40} style={{ color: '#4040ca' }} />
          </div>

          <span className="section-tag" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            Simulação enviada
          </span>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: '800',
            color: '#0f172a',
            letterSpacing: '-0.02em',
            marginBottom: '1rem',
            lineHeight: '1.2',
          }}>
            Simulação recebida com sucesso!
          </h1>

          <p style={{
            fontSize: '1.0625rem',
            color: '#475569',
            lineHeight: '1.75',
            marginBottom: '2.5rem',
          }}>
            Recebemos suas informações e nossa equipe vai organizar
            as possibilidades de acordo com o que você precisa.
            Em breve entraremos em contato.
          </p>

          {/* O que esperar */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.75rem',
            marginBottom: '2rem',
            textAlign: 'left',
            boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
          }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748b',
              marginBottom: '1.25rem',
            }}>
              O que esperar
            </p>

            {[
              {
                icon: Clock,
                title: 'Análise das possibilidades',
                desc: 'Com base nos dados que você informou, organizamos as opções que podem fazer sentido para a sua situação.',
              },
              {
                icon: Phone,
                title: 'Contato pelo WhatsApp',
                desc: 'Nossa equipe pode entrar em contato para esclarecer dúvidas e apresentar os próximos passos.',
              },
              {
                icon: CheckCircle2,
                title: 'Sem compromisso',
                desc: 'A simulação não obriga você a contratar nenhuma solução. Você decide se e quando avançar.',
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  paddingBottom: i < 2 ? '1.25rem' : 0,
                  borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none',
                  marginBottom: i < 2 ? '1.25rem' : 0,
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: '#f0f4ff',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={18} style={{ color: '#4040ca' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9375rem', margin: '0 0 0.25rem' }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aviso financeiro */}
          <p style={{
            fontSize: '0.8125rem',
            color: '#94a3b8',
            lineHeight: '1.65',
            marginBottom: '2rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
          }}>
            A simulação não garante aprovação ou oferta de crédito. Condições dependem da análise do parceiro responsável.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <Link href="/conteudos" className="btn-secondary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
              Ler conteúdos úteis
              <ArrowRight size={16} />
            </Link>
            <Link href="/" className="btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
              Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
