import { NextResponse } from "next/server";
import { saveSimulatorLead, listSimulatorLeads } from "@/lib/simulator-db";

// POST /api/simulator/leads - registra lead de simulacao
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined;
    const ua = request.headers.get("user-agent") ?? undefined;

    const id = await saveSimulatorLead({
      ...body,
      ip_origem: ip,
      user_agent: ua,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[simulator/leads POST]", error);
    return NextResponse.json({ error: "Erro ao salvar lead" }, { status: 500 });
  }
}

// GET /api/simulator/leads - lista leads (admin only)
export async function GET(request: Request) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    const expectedSecret = process.env.ADMIN_SECRET;
    if (expectedSecret && adminSecret !== expectedSecret) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "100");
    const leads = await listSimulatorLeads(limit);
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("[simulator/leads GET]", error);
    return NextResponse.json({ error: "Erro ao buscar leads" }, { status: 500 });
  }
}
