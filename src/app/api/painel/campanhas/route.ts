// API: Campanhas de Reativação e Modelos Comerciais
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/benavera-db';
import { requireClinicModule } from '@/lib/clinic-modules';

const BLOCKED_CLAIMS = /(aprovação garantida|100%\s*aprovado|sem\s*análise|juros\s*zero\s*garantido)/i;

export async function GET() {
  const g = await requireClinicModule('campanhas_reativacao');
  if (!g.ok) return g.response;

  const [campaigns, recoveryCount] = await Promise.all([
    sql`SELECT * FROM clinic_campaigns WHERE clinic_id = ${g.ctx.clinicId}::uuid ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT COUNT(*) AS c FROM clinic_recovery_items WHERE clinic_id = ${g.ctx.clinicId}::uuid AND status IN ('ABERTA','EM_CONTATO')`,
  ]);
  return NextResponse.json({
    success: true,
    campaigns,
    eligibleRecoveryCount: Number(recoveryCount[0]?.c || 0),
  });
}

export async function POST(request: NextRequest) {
  const g = await requireClinicModule('campanhas_reativacao');
  if (!g.ok) return g.response;

  const body = await request.json().catch(() => ({}));
  const titulo = String(body.titulo || '').trim();
  const conteudo = String(body.conteudo || '').trim();
  if (!titulo || !conteudo) return NextResponse.json({ error: 'Título e conteúdo são obrigatórios.' }, { status: 400 });

  if (BLOCKED_CLAIMS.test(conteudo)) {
    return NextResponse.json(
      { error: 'Texto bloqueado por conformidade: não é permitido prometer aprovação garantida ou condições inexistentes.' },
      { status: 400 }
    );
  }

  const rows = await sql`
    INSERT INTO clinic_campaigns (clinic_id, titulo, tipo, segmento, conteudo, opt_out_respeitado)
    VALUES (
      ${g.ctx.clinicId}::uuid, ${titulo.slice(0, 150)},
      ${['whatsapp', 'comunicado', 'reativacao'].includes(body.tipo) ? body.tipo : 'whatsapp'},
      ${body.segmento ? String(body.segmento).slice(0, 80) : 'todos'},
      ${conteudo.slice(0, 4000)}, ${body.opt_out_respeitado !== false}
    )
    RETURNING *
  `;
  return NextResponse.json({ success: true, campaign: rows[0] }, { status: 201 });
}
