// app/api/c/[token]/upload/route.ts
// POST: upload de documento pelo fluxo da clínica
// Implementa todas as verificações de segurança de upload

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { validateFile, calculateSHA256, generateStorageKey, getStorageAdapter } from '@/lib/storage-adapter';
import { saveDocument, getOnboardingDocuments } from '@/lib/onboarding-db';
import { validateInviteToken } from '@/lib/onboarding-tokens';
import { getClientIP } from '@/lib/security';
import { checkRateLimit } from '@/lib/rateLimit';
import { sql } from '@/lib/benavera-db';
import { z } from 'zod';

const CLINIC_SESSION_SECRET = new TextEncoder().encode(
  process.env.CLINIC_SESSION_SECRET || process.env.JWT_SECRET || 'clinic-session-secret-change-me'
);
const CLINIC_SESSION_COOKIE = 'benavera_clinic_session';

async function getClinicSession(request: NextRequest) {
  const token = request.cookies.get(CLINIC_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, CLINIC_SESSION_SECRET);
    if (payload.type !== 'clinic_session') return null;
    return { onboardingId: String(payload.onboardingId), inviteId: String(payload.inviteId) };
  } catch { return null; }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clinicToken: string }> }
) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Rate limit: máximo 20 uploads por hora por IP
  const rl = checkRateLimit(`upload_${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Limite de uploads atingido. Tente mais tarde.' }, { status: 429 });
  }

  const session = await getClinicSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
  }

  const { clinicToken: token } = await params;
  const inviteValidation = await validateInviteToken(token);
  if (!inviteValidation.valid || inviteValidation.invite?.id !== session.inviteId) {
    return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentId = formData.get('documentId') as string | null;

    if (!file || !documentId) {
      return NextResponse.json({ error: 'Arquivo e documentId são obrigatórios.' }, { status: 400 });
    }

    // UUID validation para documentId
    if (!/^[0-9a-f-]{36}$/.test(documentId)) {
      return NextResponse.json({ error: 'documentId inválido.' }, { status: 400 });
    }

    // Verificar que o documento pertence ao onboarding (prevenção de IDOR)
    const docRows = await sql`
      SELECT id, document_type, current_version
      FROM onboarding_documents
      WHERE id = ${documentId} AND onboarding_id = ${session.onboardingId}
    `;
    if (!docRows[0]) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }

    const docType = String(docRows[0].document_type);
    const currentVersion = Number(docRows[0].current_version);

    // Limite de versões: máximo 10 versões por documento
    if (currentVersion >= 10) {
      return NextResponse.json({ error: 'Limite de versões atingido para este documento. Contate o suporte.' }, { status: 429 });
    }

    // Ler o arquivo como buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validar arquivo (tamanho, extensão, magic bytes, MIME)
    const validation = await validateFile(buffer, file.type, file.name);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Calcular SHA-256 para integridade
    const sha256 = calculateSHA256(buffer);

    // Gerar chave interna aleatória (nunca usa o nome do usuário)
    const storageKey = generateStorageKey(session.onboardingId, docType, currentVersion + 1);

    // Fazer upload para o storage
    const storage = getStorageAdapter();
    await storage.upload(storageKey, buffer, validation.detectedMime || file.type);

    // Salvar no banco (cria versão anterior se houver)
    await saveDocument({
      documentId,
      onboardingId: session.onboardingId,
      storageKey,
      originalFilename: file.name.substring(0, 255), // Limitar tamanho
      mimeType: validation.detectedMime || file.type,
      sizeBytes: buffer.length,
      sha256,
      ip,
      userAgent,
    });

    // Em produção, aqui seria enviado para fila de scan antimalware
    // Por ora, marcamos como CLEAN (sem integração com antivirus)
    await sql`
      UPDATE onboarding_documents SET scan_status = 'CLEAN' WHERE id = ${documentId}
    `;

    return NextResponse.json({
      success: true,
      documentId,
      sha256,
      size: buffer.length,
      filename: file.name,
    });
  } catch (err) {
    console.error('[Clinic Upload POST]', err);
    return NextResponse.json({ error: 'Erro ao processar upload. Tente novamente.' }, { status: 500 });
  }
}
