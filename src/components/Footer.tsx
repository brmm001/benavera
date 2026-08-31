'use client';

import Link from 'next/link';

const DISCLAIMER =
  'A Benavera não garante aprovação, taxa, prazo ou disponibilidade de crédito. Eventuais condições financeiras serão apresentadas pelo parceiro responsável pela oferta e estarão sujeitas à análise e aos critérios aplicáveis.';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: '#0f172a',
      color: '#94a3b8',
      paddingTop: '4rem',
      paddingBottom: '2.5rem',
    }}>
      <div className="container-benavera">
        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3rem',
        }}>
          {/* Brand */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: 'white',
                letterSpacing: '-0.03em',
              }}>
                bena<span style={{ color: '#8195f8' }}>vera</span>
              </span>
            </Link>
            <p style={{
              fontSize: '0.875rem',
              lineHeight: '1.7',
              marginTop: '0.875rem',
              maxWidth: '240px',
            }}>
              Tecnologia para tornar a jornada financeira dos tratamentos mais simples.
            </p>
          </div>

          {/* Para pacientes */}
          <div>
            <h3 style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#e2e8f0',
              marginBottom: '1rem',
            }}>
              Para pacientes
            </h3>
            <nav aria-label="Links para pacientes">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  { href: '/simular', label: 'Simular possibilidades' },
                  { href: '/como-funciona', label: 'Como funciona' },
                  { href: '/conteudos', label: 'Conteúdos' },
                  { href: '/calculadoras', label: 'Calculadoras' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} style={{
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: '0.9375rem',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Para clínicas */}
          <div>
            <h3 style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#e2e8f0',
              marginBottom: '1rem',
            }}>
              Para clínicas
            </h3>
            <nav aria-label="Links para clínicas">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  { href: '/clinicas', label: 'Benavera para Clínicas' },
                  { href: '/clinicas#piloto', label: 'Participar do piloto' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} style={{
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: '0.9375rem',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Empresa */}
          <div>
            <h3 style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#e2e8f0',
              marginBottom: '1rem',
            }}>
              Empresa
            </h3>
            <nav aria-label="Links institucionais">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  { href: '/sobre', label: 'Sobre a Benavera' },
                  { href: '/privacidade', label: 'Política de Privacidade' },
                  { href: '/termos', label: 'Termos de Uso' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} style={{
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: '0.9375rem',
                      transition: 'color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          borderTop: '1px solid #1e293b',
          paddingTop: '1.75rem',
          marginBottom: '1.25rem',
        }}>
          <p style={{
            fontSize: '0.8125rem',
            lineHeight: '1.7',
            color: '#64748b',
            maxWidth: '800px',
          }}>
            <strong style={{ color: '#94a3b8', fontWeight: '600' }}>Aviso financeiro:</strong>{' '}
            {DISCLAIMER}
          </p>
        </div>

        {/* Bottom */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
            © {currentYear} Benavera. Todos os direitos reservados.
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
            benavera.com.br
          </p>
        </div>
      </div>
    </footer>
  );
}
