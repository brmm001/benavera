import type { Metadata } from "next";
import { getSimulatorConfig } from "@/lib/simulator-db";
import { DEFAULT_CONFIG } from "@/lib/simulator-engine";
import SimulatorClient from "@/components/SimulatorClient";
import "@/app/simuladorclinicas/simulator.css";

export const metadata: Metadata = {
  title: "Simulador para clínicas",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  description: "Simule as condições de financiamento para seus pacientes. Calcule parcelas, taxas e valor líquido para sua clínica com o Simulador Benavera.",
  openGraph: {
    images: ['https://www.benavera.com.br/og-image.png'],
    title: "Simulador Benavera para Clínicas",
    description: "Simule condições de financiamento para tratamentos odontológicos, estéticos e médicos.",
    url: "https://www.benavera.com.br/simuladorclinicas",
  },
  alternates: {
    canonical: "https://www.benavera.com.br/simuladorclinicas",
  },
};

export const dynamic = "force-dynamic";

export default async function SimuladorClinicasPage() {
  let config = DEFAULT_CONFIG;
  try {
    config = await getSimulatorConfig();
  } catch (err) {
    console.error("[SimuladorClinicas] Erro ao carregar config, usando default:", err);
  }

  const publicConfig = { ...config, taxa_minima: 5, taxa_padrao: 5, taxa_maxima: 5,
    taxa_risco_financeira: 0, taxa_risco_clinica: 0,
    parcelas_ativas: config.parcelas_ativas.filter(n => n <= 36) };
  return <SimulatorClient initialConfig={publicConfig} />;
}
