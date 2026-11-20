import { ClinicLayoutShell } from '@/components/ClinicLayoutShell';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  return <ClinicLayoutShell>{children}</ClinicLayoutShell>;
}
