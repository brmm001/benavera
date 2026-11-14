import Link from 'next/link';
import { CLINIC_FINANCING_PATH, IMPLANT_FINANCING_PATH } from '@/lib/commercial';

export function ClinicFinancingLinks() {
  return <nav aria-label="Financiamento para sua clínica" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.5rem', lineHeight: 1.6 }}>
    <Link href={CLINIC_FINANCING_PATH} style={{ color: '#3730a3', textDecoration: 'underline' }}>Financiamento odontológico para clínicas</Link>
    <Link href={IMPLANT_FINANCING_PATH} style={{ color: '#3730a3', textDecoration: 'underline' }}>Implantes e prótese protocolo</Link>
    <Link href="/benavera-ou-capim" style={{ color: '#3730a3', textDecoration: 'underline' }}>Comparar Benavera e Capim</Link>
  </nav>;
}
