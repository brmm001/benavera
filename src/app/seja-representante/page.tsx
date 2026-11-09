import type { Metadata } from 'next';
import { SejaRepresentanteClient } from './SejaRepresentanteClient';
import './seja-representante.css';

export const metadata: Metadata = {
  title: 'Seja um representante | Benavera',
  description:
    'Leve a Benavera a mais clínicas. Conheça a parceria comercial, simule comissões e converse com nossa equipe.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SejaRepresentantePage() {
  return <SejaRepresentanteClient />;
}

