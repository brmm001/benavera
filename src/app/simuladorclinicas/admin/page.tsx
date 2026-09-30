import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSimulatorConfig } from "@/lib/simulator-db";
import { DEFAULT_CONFIG } from "@/lib/simulator-engine";
import SimulatorAdminClient from "@/components/SimulatorAdminClient";
import "@/app/simuladorclinicas/simulator.css";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "bv-secure-token";

export default async function SimuladorAdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("sim_admin_session")?.value;
  const isAuth = session === ADMIN_SECRET;

  if (!isAuth) {
    redirect("/simuladorclinicas/admin/login");
  }

  let config = DEFAULT_CONFIG;
  try {
    config = await getSimulatorConfig();
  } catch (err) {
    console.error("[SimuladorAdmin] Erro ao carregar config:", err);
  }

  return <SimulatorAdminClient initialConfig={config} />;
}
