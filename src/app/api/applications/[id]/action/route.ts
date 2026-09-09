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
} from '@/lib/application-service';
import type { InternalDecision, ApplicationStatus } from '@/lib/benavera-db';

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
        const { sql } = await import('@/lib/benavera-db');
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

      default:
        return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Application Action]', err);
    return NextResponse.json({ error: 'Erro ao executar ação.' }, { status: 500 });
  }
}
