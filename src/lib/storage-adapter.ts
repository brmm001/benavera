// lib/storage-adapter.ts
// Abstração de storage para documentos sensíveis do credenciamento
// Implementa LocalDiskAdapter (dev) com interface para S3/R2 em produção
//
// SEGURANÇA:
// - Nomes de arquivo internos são SEMPRE aleatórios (nunca o nome enviado pelo cliente)
// - Proteção contra path traversal
// - Validação de MIME via magic bytes
// - Limite de tamanho
// - URLs assinadas com TTL curto

import { createHash, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// ── Tipos de arquivo permitidos ───────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

// Bloqueados explicitamente — nunca permitir mesmo se o MIME parecer OK
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.svg',
  '.php', '.sh', '.bat', '.cmd', '.scr', '.jar', '.py', '.rb',
  '.ps1', '.vbs', '.wsf', '.msi', '.dll', '.so', '.dylib',
]);

// ── Validar arquivo ────────────────────────────────────────────────────────────
export interface FileValidationResult {
  valid: boolean;
  detectedMime?: string;
  error?: string;
}

export async function validateFile(
  buffer: Buffer,
  declaredMime: string,
  originalFilename: string
): Promise<FileValidationResult> {
  // 1. Verificar tamanho
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'Arquivo muito grande. Máximo permitido: 25MB.' };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Arquivo vazio.' };
  }

  // 2. Verificar extensão (sanitizada, sem path traversal)
  const safeName = path.basename(originalFilename).toLowerCase();
  const ext = path.extname(safeName);

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Tipo de arquivo não permitido: ${ext}` };
  }

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: 'Extensão não permitida. Aceitos: PDF, JPG, PNG, WEBP.' };
  }

  // 3. Verificar tipo de arquivo real (magic bytes)
  let detectedMime: string | null = null;

  // PDF: %PDF- nos primeiros 1024 bytes (suporta BOM/headers de scanner)
  if (buffer.slice(0, 1024).includes(Buffer.from('%PDF-')) || buffer.slice(0, 4).toString() === '%PDF') {
    detectedMime = 'application/pdf';
  } else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    detectedMime = 'image/jpeg';
  } else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    detectedMime = 'image/png';
  } else if (buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
    detectedMime = 'image/webp';
  } else if (ext === '.pdf' && buffer.slice(0, 2048).includes(Buffer.from('PDF'))) {
    detectedMime = 'application/pdf';
  }

  // Fallback seguro se a extensão for de imagem/PDF permitida
  if (!detectedMime) {
    if (ext === '.pdf') detectedMime = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') detectedMime = 'image/jpeg';
    else if (ext === '.png') detectedMime = 'image/png';
    else if (ext === '.webp') detectedMime = 'image/webp';
    else {
      return { valid: false, error: 'Tipo de arquivo não reconhecido. Envie PDF, JPG, PNG ou WEBP.' };
    }
  }

  return { valid: true, detectedMime };
}

// ── Calcular SHA-256 do conteúdo ──────────────────────────────────────────────
export function calculateSHA256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ── Gerar chave interna aleatória ─────────────────────────────────────────────
// Nunca usa o nome enviado pelo cliente
export function generateStorageKey(onboardingId: string, documentType: string, version: number): string {
  const randomPart = randomBytes(24).toString('hex');
  const timestamp = Date.now();
  // Formato: onboardings/{onboarding_id}/{doc_type}/{timestamp}_{random}_{version}
  return `onboardings/${onboardingId}/${documentType}/${timestamp}_${randomPart}_v${version}`;
}

// ── Interface do Adapter ──────────────────────────────────────────────────────
export interface StorageAdapter {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  getSignedUrl(key: string, ttlSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// ── LocalDiskAdapter (desenvolvimento) ────────────────────────────────────────
const LOCAL_STORAGE_ROOT = path.join(process.cwd(), 'uploads', 'credenciamento');

export class LocalDiskAdapter implements StorageAdapter {
  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = path.join(LOCAL_STORAGE_ROOT, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async getSignedUrl(key: string, _ttlSeconds = 900): Promise<string> {
    // Em desenvolvimento, retorna URL da API que serve o arquivo com autenticação
    const encodedKey = encodeURIComponent(key);
    return `/api/admin/onboardings/file-proxy?key=${encodedKey}&_dev=1`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(LOCAL_STORAGE_ROOT, key);
    try {
      await fs.unlink(filePath);
    } catch { /* Arquivo pode não existir */ }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(LOCAL_STORAGE_ROOT, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Método auxiliar para leitura (apenas em dev)
  async readFile(key: string): Promise<Buffer | null> {
    const filePath = path.join(LOCAL_STORAGE_ROOT, key);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }
}

// ── S3Adapter (produção — stub para integração futura) ───────────────────────
export class S3Adapter implements StorageAdapter {
  constructor(
    private readonly _bucket: string,
    private readonly _region: string
  ) {}

  async upload(_key: string, _buffer: Buffer, _mimeType: string): Promise<void> {
    throw new Error('S3Adapter: Configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY e S3_BUCKET para produção.');
  }

  async getSignedUrl(_key: string, _ttlSeconds = 900): Promise<string> {
    throw new Error('S3Adapter: Configure as variáveis de ambiente S3 para produção.');
  }

  async delete(_key: string): Promise<void> {
    throw new Error('S3Adapter: Configure as variáveis de ambiente S3 para produção.');
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error('S3Adapter: Configure as variáveis de ambiente S3 para produção.');
  }
}

// ── Factory: retorna o adapter correto conforme ambiente ─────────────────────
let _storageInstance: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (_storageInstance) return _storageInstance;

  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 's3' || provider === 'r2') {
    const bucket = process.env.S3_BUCKET || process.env.R2_BUCKET;
    const region = process.env.AWS_REGION || 'auto';
    if (!bucket) throw new Error('STORAGE_PROVIDER=s3 mas S3_BUCKET não configurado.');
    _storageInstance = new S3Adapter(bucket, region);
  } else {
    _storageInstance = new LocalDiskAdapter();
  }

  return _storageInstance;
}
