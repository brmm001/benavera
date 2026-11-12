import type { Metadata } from 'next';
import { SejaRepresentanteClient } from './SejaRepresentanteClient';
import './seja-representante.css';

export const metadata: Metadata = {
  title: 'Seja um representante',
  description:
    'Leve a Benavera a mais clínicas. Conheça a parceria comercial, simule comissões e converse com nossa equipe.',
  alternates: { canonical: 'https://www.benavera.com.br/seja-representante' },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SejaRepresentantePage() {
  return <SejaRepresentanteClient />;
}

