// src/app/api/proposta/[token]/konsiga/send-token/route.ts
// Dispara o token de confirmação SMS da Konsiga (Manual v1.4 — Seção 3.3) para o paciente autenticado pelo token público

import { NextRequest, NextResponse } from 'next/server';
import { logEvent } from '@/lib/application-service';
import { sql } from '@/lib/benavera-db';
import {
  resolveKonsigaAttemptByApplication,
  sendKonsigaConfirmationToken,
} from '@/lib/partners/konsiga';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SMS_COOLDOWN_SECONDS = 45;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const tokenRows = await sql`
      SELECT pt.application_id
      FROM proposal_tokens pt
      WHERE pt.token = ${token}
        AND pt.revogado = false
        AND pt.expires_at > NOW()
      LIMIT 1
    `;
    if (!tokenRows[0]) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }

    const applicationId = String(tokenRows[0].application_id);
    const ctx = await resolveKonsigaAttemptByApplication(applicationId);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Nenhuma proposta Konsiga ativa encontrada para esta solicitação.' },
        { status: 400 }
      );
    }

    // Cooldown anti-spam de SMS
    const recent = await sql`
      SELECT created_at
      FROM event_logs
      WHERE application_id = ${applicationId}
        AND event = 'KONSIGA_SMS_SENT'
        AND created_at > NOW() - (${SMS_COOLDOWN_SECONDS}::text || ' seconds')::interval
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (recent[0]) {
      return NextResponse.json(
        { error: `Aguarde ${SMS_COOLDOWN_SECONDS} segundos antes de solicitar outro código SMS.` },
        { status: 429 }
      );
    }

    const res = await sendKonsigaConfirmationToken(ctx.transactionId, ctx.clinicCnpj);
    if (!res.sucesso) {
      const errMsg = res.erros?.join('; ') || res.mensagem || 'Não foi possível enviar o SMS.';
      return NextResponse.json({ error: errMsg }, { status: 422 });
    }

    await sql`
      UPDATE funding_attempts
      SET
        external_step = CASE
          WHEN external_step IN ('PROPOSTA_COMPLETA_ENVIADA', 'ASSINATURA_DISPONIVEL', 'NF_ENVIADA', 'CREDITO_EFETUADO')
            THEN external_step
          ELSE 'TOKEN_SMS_ENVIADO'
        END,
        updated_at = NOW()
      WHERE id = ${ctx.attemptId}
    `;

    await logEvent({
      applicationId,
      actorType: 'PATIENT',
      event: 'KONSIGA_SMS_SENT',
      metadata: {
        partner: 'konsiga',
        transactionId: ctx.transactionId,
        tokenClienteEnviado: Boolean(res.data?.tokenClienteEnviado),
      },
    });

    return NextResponse.json({
      success: true,
      tokenClienteEnviado: Boolean(res.data?.tokenClienteEnviado ?? true),
      message: 'Código SMS enviado para o seu celular cadastrado.',
    });
  } catch (err) {
    console.error('[Proposta Konsiga Send Token]', err);
    const msg = err instanceof Error ? err.message : 'Erro ao enviar código SMS.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
