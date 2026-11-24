// app/api/applications/[id]/action/route.ts
// Ações do analista Benavera na solicitação

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import {
  setInternalDecision,
  submitToPartner,
  recordPartnerResponse,
  createProposal,
  generateProposalToken,
  transitionStatus,
  logEvent,
} from '@/lib/application-service';
import { quoteAllPartners, syncPartnerStatus } from '@/lib/partners/hub';
import {
  normalizeBase64Document,
  resolveKonsigaAttemptByApplication,
  sendKonsigaConfirmationToken,
  uploadKonsigaInvoice,
} from '@/lib/partners/konsiga';
import { sql, type InternalDecision, type ApplicationStatus } from '@/lib/benavera-db';

async function canAccessApplication(
  applicationId: string,
  role: string,
  clinicId?: string | null
): Promise<boolean> {
  if (
    role === 'BENAVERA_ADMIN' ||
    role === 'BENAVERA_ANALYST' ||
    role === 'BENAVERA_COMPLIANCE' ||
    role === 'BENAVERA_FINANCEIRO'
  ) {
    return true;
  }
  if (!clinicId) return false;
  const rows = await sql`SELECT clinic_id FROM applications WHERE id = ${applicationId} LIMIT 1`;
  return Boolean(rows[0] && String(rows[0].clinic_id) === String(clinicId));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      // ── Decisão interna Benavera ──────────────────────────────────────────
      case 'set_internal_decision': {
        if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const { decision, note } = body as { decision: InternalDecision; note?: string };
        const result = await setInternalDecision(id, decision, session, note);
        return NextResponse.json(result);
      }

      // ── Consultar todas as financeiras integradas (fan-out) ───────────────
      case 'quote_all_partners': {
        if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const result = await quoteAllPartners(id, session);
        return NextResponse.json(result);
      }

      // ── Encaminhar para parceiro ──────────────────────────────────────────
      case 'submit_to_partner': {
        if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const { partnerId } = body as { partnerId: string };
        if (!partnerId) return NextResponse.json({ error: 'Parceiro obrigatório.' }, { status: 400 });
        const result = await submitToPartner(id, partnerId, session);
        return NextResponse.json(result);
      }

      // ── Registrar retorno do parceiro ─────────────────────────────────────
      case 'record_partner_response': {
        if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const { attemptId, result: partnerResult } = body;
        const result = await recordPartnerResponse(attemptId, id, partnerResult, session);
        return NextResponse.json(result);
      }

      // ── Criar proposta ────────────────────────────────────────────────────
      case 'create_proposal': {
        if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const { proposalData } = body;
        const result = await createProposal({ ...proposalData, applicationId: id, createdBy: session.userId });
        return NextResponse.json(result);
      }

      // ── Gerar link para paciente ──────────────────────────────────────────
      case 'generate_patient_link': {
        const allowedRoles = ['CLINIC_ADMIN', 'CLINIC_ATTENDANT', 'BENAVERA_ADMIN', 'BENAVERA_ANALYST'];
        if (!allowedRoles.includes(session.role)) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const token = await generateProposalToken(id, session.userId);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        return NextResponse.json({ token, url: `${baseUrl}/proposta/${token}` });
      }

      // ── Transição de status geral ─────────────────────────────────────────
      case 'transition_status': {
        const { newStatus, note, declineReason, cancelReason } = body as {
          newStatus: ApplicationStatus;
          note?: string;
          declineReason?: string;
          cancelReason?: string;
        };

        // Verificar permissão para cancelar (clínica pode cancelar suas próprias)
        if (newStatus === 'CANCELLED') {
          const allowedRoles = ['CLINIC_ADMIN', 'BENAVERA_ADMIN', 'BENAVERA_ANALYST'];
          if (!allowedRoles.includes(session.role)) {
            return NextResponse.json({ error: 'Sem permissão para cancelar.' }, { status: 403 });
          }
        } else if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }

        const result = await transitionStatus(id, newStatus, session, { note, declineReason, cancelReason });
        return NextResponse.json(result);
      }

      // ── Registrar contrato ────────────────────────────────────────────────
      case 'register_contract': {
        if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const { contractUrl, contractProvider, contractId } = body;
        const { sql } = await import('@/lib/benavera-db');
        await sql`
          UPDATE applications
          SET contract_url = ${contractUrl || null},
              contract_provider = ${contractProvider || null},
              contract_id = ${contractId || null},
              contract_status = 'SENT',
              status = 'CONTRACT_SENT',
              updated_at = NOW()
          WHERE id = ${id}
        `;
        return NextResponse.json({ success: true });
      }

      // ── Confirmar assinatura do contrato ──────────────────────────────────
      case 'confirm_contract_signed': {
        if (!hasPermission(session.role, 'APPROVE_REJECT_INTERNAL')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        await sql`
          UPDATE applications
          SET contract_status = 'SIGNED',
              contract_signed_at = NOW(),
              status = 'CONTRACT_SIGNED',
              updated_at = NOW()
          WHERE id = ${id}
        `;
        return NextResponse.json({ success: true });
      }

      // ── Konsiga: sincronizar status e capturar link de assinatura ─────────
      case 'konsiga_sync_status': {
        const allowed = await canAccessApplication(id, session.role, session.clinicId);
        if (!allowed) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const result = await syncPartnerStatus(id, 'konsiga');
        if (!result.success) {
          return NextResponse.json(result, { status: 400 });
        }
        return NextResponse.json(result);
      }

      // ── Konsiga: reenviar token SMS de confirmação ao paciente ────────────
      case 'konsiga_send_sms': {
        const allowed = await canAccessApplication(id, session.role, session.clinicId);
        if (!allowed) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const ctx = await resolveKonsigaAttemptByApplication(id);
        if (!ctx) {
          return NextResponse.json(
            { success: false, error: 'Nenhuma transação Konsiga ativa nesta solicitação.' },
            { status: 400 }
          );
        }
        const smsRes = await sendKonsigaConfirmationToken(ctx.transactionId, ctx.clinicCnpj);
        if (!smsRes.sucesso) {
          return NextResponse.json(
            {
              success: false,
              error: smsRes.erros?.join('; ') || smsRes.mensagem || 'Falha ao enviar SMS.',
            },
            { status: 422 }
          );
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
          applicationId: id,
          actorType: 'USER',
          actorId: session.userId,
          actorName: session.name,
          event: 'KONSIGA_SMS_SENT',
          metadata: { partner: 'konsiga', transactionId: ctx.transactionId },
        });
        return NextResponse.json({
          success: true,
          message: 'Token SMS reenviado ao celular do paciente.',
        });
      }

      // ── Konsiga: enviar Nota Fiscal / Recibo (Base64) para liberar repasse ─
      case 'konsiga_upload_invoice': {
        const allowed = await canAccessApplication(id, session.role, session.clinicId);
        if (!allowed) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        const { nfBase64, fileName } = body as { nfBase64?: string; fileName?: string };
        const norm = normalizeBase64Document(nfBase64 || '', 8 * 1024 * 1024);
        if (!norm.ok) {
          return NextResponse.json({ success: false, error: norm.error }, { status: 400 });
        }
        const ctx = await resolveKonsigaAttemptByApplication(id);
        if (!ctx) {
          return NextResponse.json(
            { success: false, error: 'Nenhuma transação Konsiga ativa nesta solicitação.' },
            { status: 400 }
          );
        }
        const invRes = await uploadKonsigaInvoice(ctx.transactionId, ctx.clinicCnpj, norm.base64);
        if (!invRes.sucesso || invRes.data?.salvo === false) {
          return NextResponse.json(
            {
              success: false,
              error: invRes.erros?.join('; ') || invRes.mensagem || 'A Konsiga recusou o envio da NF.',
            },
            { status: 422 }
          );
        }
        await sql`
          UPDATE funding_attempts
          SET external_step = 'NF_ENVIADA', updated_at = NOW()
          WHERE id = ${ctx.attemptId}
        `;
        await logEvent({
          applicationId: id,
          actorType: 'USER',
          actorId: session.userId,
          actorName: session.name,
          event: 'KONSIGA_INVOICE_UPLOADED',
          metadata: {
            partner: 'konsiga',
            transactionId: ctx.transactionId,
            fileName: fileName ? String(fileName).slice(0, 120) : null,
            bytes: norm.bytes,
          },
        });
        return NextResponse.json({
          success: true,
          salvo: true,
          message: 'Nota Fiscal enviada com sucesso para a Konsiga.',
        });
      }

      default:
        return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Application Action]', err);
    return NextResponse.json({ error: 'Erro ao executar ação.' }, { status: 500 });
  }
}
