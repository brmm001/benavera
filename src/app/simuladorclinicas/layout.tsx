import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulador Benavera",
};

export default function SimuladorClinicasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout independente — sem Header/Footer do site principal
  // para parecer uma ferramenta dedicada
  return <>{children}</>;
}
