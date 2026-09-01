import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Painel Administrativo | Benavera',
  description: 'Gestão segura de leads e métricas operacionais.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-clarity-mask="true" className="admin-root">
      {children}
    </div>
  );
}
