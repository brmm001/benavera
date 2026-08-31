import type { Metadata } from 'next';
import { SimulationWizard } from '@/components/SimulationWizard';

export const metadata: Metadata = {
  title: 'Simular possibilidades de pagamento',
  description:
    'Faça uma simulação gratuita e entenda quais possibilidades de pagamento podem existir para o seu tratamento. Simples, transparente e sem compromisso.',
  alternates: { canonical: 'https://benavera.com.br/simular' },
  robots: { index: true, follow: true },
};

export default function SimularPage() {
  return (
    <div style={{
      minHeight: '100vh',
      paddingTop: '5rem',
      background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 60%, #f8fafc 100%)',
    }}>
      {/* Header da página */}
      <div style={{
        paddingTop: '3rem',
        paddingBottom: '2rem',
        textAlign: 'center',
      }}>
        <div className="container-benavera">
          <div className="badge badge-blue" style={{ marginBottom: '1rem' }}>
            Simulação gratuita
          </div>
          <h1 style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: '800',
            color: '#0f172a',
            letterSpacing: '-0.02em',
            marginBottom: '0.75rem',
          }}>
            Simular possibilidades de pagamento
          </h1>
          <p style={{
            fontSize: '1.0625rem',
            color: '#475569',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: '1.7',
          }}>
            Responda algumas perguntas simples e a Benavera organiza as possibilidades de acordo com o que você precisa.
          </p>
        </div>
      </div>

      {/* Wizard */}
      <div className="container-benavera" style={{ paddingBottom: '5rem' }}>
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          <SimulationWizard />
        </div>
      </div>
    </div>
  );
}
