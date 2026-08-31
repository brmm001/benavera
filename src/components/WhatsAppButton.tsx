'use client';

import { MessageCircle } from 'lucide-react';

export function WhatsAppButton() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) return null;

  const clinicMessage = encodeURIComponent(
    'Olá, conheci a Benavera pelo site e gostaria de entender o piloto para clínicas.'
  );
  const patientMessage = encodeURIComponent(
    'Olá, estou fazendo uma simulação na Benavera e gostaria de tirar uma dúvida.'
  );

  const href = `https://wa.me/${number.replace(/\D/g, '')}?text=${patientMessage}`;

  return (
    <a
      id="whatsapp-button"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Benavera pelo WhatsApp"
      title="WhatsApp Benavera"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.875rem 1.25rem',
        background: '#25d366',
        color: 'white',
        borderRadius: '100px',
        textDecoration: 'none',
        fontWeight: '600',
        fontSize: '0.9375rem',
        boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(37, 211, 102, 0.5)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(37, 211, 102, 0.4)';
      }}
    >
      <MessageCircle size={20} />
      <span className="hidden sm:inline">Falar com a Benavera</span>
    </a>
  );
}
