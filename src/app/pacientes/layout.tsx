import { ClinicLayoutShell } from '@/components/ClinicLayoutShell';

export default async function PacientesLayout({ children }: { children: React.ReactNode }) {
  return <ClinicLayoutShell>{children}</ClinicLayoutShell>;
}
