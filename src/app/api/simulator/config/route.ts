import { NextResponse } from "next/server";
import { getSimulatorConfig, updateSimulatorConfig } from "@/lib/simulator-db";

// GET /api/simulator/config - retorna configuracoes atuais
export async function GET() {
  try {
    const config = await getSimulatorConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error("[simulator/config GET]", error);
    return NextResponse.json({ error: "Erro ao buscar configuracoes" }, { status: 500 });
  }
}

// POST /api/simulator/config - atualiza configuracoes (admin only)
export async function POST(request: Request) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    const expectedSecret = process.env.ADMIN_SECRET;
    if (expectedSecret && adminSecret !== expectedSecret) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { updates, updatedBy } = body as {
      updates: Record<string, string>;
      updatedBy?: string;
    };

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    await updateSimulatorConfig(updates, updatedBy ?? "admin");
    const config = await getSimulatorConfig();
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("[simulator/config POST]", error);
    return NextResponse.json({ error: "Erro ao atualizar configuracoes" }, { status: 500 });
  }
}
