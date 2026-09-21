// app/api/admin/onboardings/[id]/documents/[docId]/route.ts
// PATCH: revisar documento (validar/solicitar correção/rejeitar)
// GET: gerar URL assinada para documento específico (download)

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { reviewDocument } from '@/lib/onboarding-db';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { logAuditEvent } from '@/lib/onboarding-audit';
import { getClientIP } from '@/lib/security';
import { sql } from '@/lib/benavera-db';
import type { DocumentReviewStatus } from '@/lib/benavera-db';
import { z } from 'zod';

const reviewSchema = z.object({
  reviewStatus: z.enum(['VALIDATED', 'CORRECTION_REQUESTED', 'REJECTED']),
  reviewNote: z.string().max(2000).optional(),
  correctionMessage: z.string().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'VALIDATE_ONBOARDING_DOCUMENTS')) {
    return NextResponse.json({ error: 'Sem permissão para revisar documentos.' }, { status: 403 });
  }

  const { id, docId } = await params;
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    // Verificar que o documento pertence ao onboarding (prevenção de IDOR)
    const docRows = await sql`
      SELECT id FROM onboarding_documents WHERE id = ${docId} AND onboarding_id = ${id}
    `;
    if (!docRows[0]) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    await reviewDocument({
      documentId: docId,
      onboardingId: id,
      reviewStatus: parsed.data.reviewStatus as DocumentReviewStatus,
      reviewNote: parsed.data.reviewNote,
      correctionMessage: parsed.data.correctionMessage,
      reviewedBy: session.userId,
      reviewerName: session.name,
      reviewerRole: session.role,
      ip: getClientIP(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Document Review PATCH]', err);
    return NextResponse.json({ error: 'Erro ao revisar documento.' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'VIEW_ONBOARDING_DOCUMENTS')) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
  }

  const { id, docId } = await params;
  const isDownload = request.nextUrl.searchParams.get('action') === 'download';

  try {
    // Verificar IDOR
    const docRows = await sql`
      SELECT id, storage_key, original_filename, scan_status, mime_type
      FROM onboarding_documents
      WHERE id = ${docId} AND onboarding_id = ${id}
    `;
    if (!docRows[0]) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    const doc = docRows[0];

    if (!doc.storage_key) {
      return NextResponse.json({ error: 'Documento ainda não enviado.' }, { status: 404 });
    }

    if (String(doc.scan_status) !== 'CLEAN') {
      return NextResponse.json({ error: 'Documento aguarda validação de segurança.' }, { status: 403 });
    }

    const storage = getStorageAdapter();
    const signedUrl = await storage.getSignedUrl(String(doc.storage_key), 900);

    await logAuditEvent({
      onboardingId: id,
      actorType: 'admin',
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role,
      action: isDownload ? 'document_downloaded' : 'document_viewed',
      entityType: 'document',
      entityId: docId,
      ip: getClientIP(request),
      metadata: { filename: String(doc.original_filename) },
    });

    return NextResponse.json({ signedUrl, filename: String(doc.original_filename) });
  } catch (err) {
    console.error('[Admin Document GET]', err);
    return NextResponse.json({ error: 'Erro ao gerar URL do documento.' }, { status: 500 });
  }
}
