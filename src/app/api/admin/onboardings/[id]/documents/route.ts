// app/api/admin/onboardings/[id]/documents/route.ts
// GET: lista documentos do credenciamento (com URL assinada)

import { NextRequest, NextResponse } from 'next/server';
import { getSession, hasPermission } from '@/lib/auth';
import { getOnboardingDocuments } from '@/lib/onboarding-db';
import { getStorageAdapter } from '@/lib/storage-adapter';
import { logAuditEvent } from '@/lib/onboarding-audit';
import { getClientIP } from '@/lib/security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (!hasPermission(session.role, 'VIEW_ONBOARDING_DOCUMENTS')) {
    return NextResponse.json({ error: 'Sem permissão para visualizar documentos.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const documents = await getOnboardingDocuments(id);

    // Gerar URL assinada para cada documento (TTL: 15 minutos)
    const storage = getStorageAdapter();
    const docsWithUrls = await Promise.all(documents.map(async doc => {
      let signedUrl: string | null = null;
      if (doc.storage_key && doc.scan_status === 'CLEAN') {
        try {
          signedUrl = await storage.getSignedUrl(doc.storage_key, 900); // 15min
        } catch (e) {
          console.warn('[Storage] Falha ao gerar URL assinada:', e);
        }
      }
      // Não expor storage_key para o frontend
      const { storage_key: _, sha256: __, ...safeDoc } = doc;
      return { ...safeDoc, signedUrl };
    }));

    await logAuditEvent({
      onboardingId: id,
      actorType: 'admin',
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role,
      action: 'document_viewed',
      entityType: 'onboarding',
      entityId: id,
      ip: getClientIP(request),
      metadata: { document_count: documents.length },
    });

    return NextResponse.json({ documents: docsWithUrls });
  } catch (err) {
    console.error('[Admin Documents GET]', err);
    return NextResponse.json({ error: 'Erro ao buscar documentos.' }, { status: 500 });
  }
}
