import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Calendar, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cadastro recebido',
  description:
    'Cadastro de clínica recebido com sucesso. Em breve nossa equipe entrará em contato para apresentar as soluções de viabilização financeira.',
  robots: { index: false, follow: false },
};

export default function ObrigadoClinicaPage() {
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
            background: 'linear-gradient(135deg, #f0faf8 0%, #d8f3ee 100%)',
            border: '2px solid #b4e6de',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
          }}>
            <CheckCircle2 size={40} style={{ color: '#309e92' }} />
          </div>

          <span className="section-tag" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            Solicitação recebida
          </span>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: '800',
            color: '#0f172a',
            letterSpacing: '-0.02em',
            marginBottom: '1rem',
            lineHeight: '1.2',
          }}>
            Recebemos sua solicitação!
          </h1>

          <p style={{
            fontSize: '1.0625rem',
            color: '#475569',
            lineHeight: '1.75',
            marginBottom: '2.5rem',
          }}>
            Nossa equipe vai analisar as informações que você enviou e,
            se houver aderência ao perfil do piloto, entraremos em contato
            pelo WhatsApp ou e-mail que você informou.
          </p>

          {/* Próximos passos */}
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
              O que acontece agora
            </p>

            {[
              {
                icon: Calendar,
                title: 'Análise da solicitação',
                desc: 'Nossa equipe vai avaliar as informações enviadas e verificar a aderência ao piloto.',
              },
              {
                icon: MessageCircle,
                title: 'Contato personalizado',
                desc: 'Se houver encaixe, entraremos em contato pelo WhatsApp ou e-mail para uma conversa inicial.',
              },
              {
                icon: CheckCircle2,
                title: 'Sem compromisso',
                desc: 'A conversa é para entender melhor o contexto da clínica. Você pode decidir depois.',
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

          <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
            Voltar para o início
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
