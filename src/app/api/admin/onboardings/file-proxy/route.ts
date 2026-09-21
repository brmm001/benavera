// src/app/api/admin/onboardings/file-proxy/route.ts
// Proxy para servir arquivos armazenados de forma segura

import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage-adapter';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Chave do arquivo não informada.' }, { status: 400 });
  }

  // Prevenir path traversal e validar formato esperado
  if (key.includes('..') || !key.startsWith('onboardings/')) {
    return NextResponse.json({ error: 'Chave de arquivo inválida.' }, { status: 400 });
  }

  try {
    const storage = getStorageAdapter();
    const file = await storage.readFile(key);

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    }

    const filename = key.split('/').pop() || 'documento';

    return new NextResponse(file.buffer as any, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[File Proxy GET]', err);
    return NextResponse.json({ error: err?.message || 'Erro ao carregar arquivo.' }, { status: 500 });
  }
}
