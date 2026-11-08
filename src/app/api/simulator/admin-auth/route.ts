import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/secrets";

export async function POST(request: Request) {
  try {
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_SECRET || !ADMIN_PASSWORD) {
      console.error('[simulator/admin-auth] ADMIN_SECRET ou ADMIN_PASSWORD não configurados.');
      return NextResponse.json({ error: "Configuração de autenticação ausente." }, { status: 500 });
    }

    const { password } = await request.json();
    if (typeof password !== "string" || !safeEqual(password, ADMIN_PASSWORD)) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("sim_admin_session", ADMIN_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("sim_admin_session");
  return response;
}
