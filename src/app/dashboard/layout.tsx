import { ClinicLayoutShell } from '@/components/ClinicLayoutShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ClinicLayoutShell>{children}</ClinicLayoutShell>;
}
