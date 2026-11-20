import { ClinicLayoutShell } from '@/components/ClinicLayoutShell';

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return <ClinicLayoutShell>{children}</ClinicLayoutShell>;
}
