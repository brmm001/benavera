import { ClinicLayoutShell } from '@/components/ClinicLayoutShell';

export default async function EquipeLayout({ children }: { children: React.ReactNode }) {
  return <ClinicLayoutShell>{children}</ClinicLayoutShell>;
}
