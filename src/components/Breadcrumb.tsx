'use client';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href ? `https://benavera.com.br${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Você está em" style={{ marginBottom: '1.5rem' }}>
        <ol style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.25rem',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          {items.map((item, index) => (
            <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {index > 0 && (
                <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }} aria-hidden="true">/</span>
              )}
              {item.href && index < items.length - 1 ? (
                <a href={item.href} style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  textDecoration: 'none',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#4040ca')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  {item.label}
                </a>
              ) : (
                <span style={{
                  fontSize: '0.875rem',
                  color: index === items.length - 1 ? '#334155' : '#64748b',
                  fontWeight: index === items.length - 1 ? '500' : '400',
                }}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
