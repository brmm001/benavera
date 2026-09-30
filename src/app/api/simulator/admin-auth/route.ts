import { NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "bv-secure-token";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Bvr@Admin#2026!";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    if (password !== ADMIN_PASSWORD) {
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
