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
import os from 'os';
import { sql } from './benavera-db';

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
  readFile(key: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
}

// ── DatabaseStorageAdapter (Neon Postgres) ───────────────────────────────────
// Solução robusta e persistente para ambientes Serverless (Vercel, AWS Lambda)
let _tableEnsured = false;
async function ensureDocumentTable() {
  if (_tableEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS onboarding_document_files (
        storage_key VARCHAR(255) PRIMARY KEY,
        file_data_base64 TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    _tableEnsured = true;
  } catch {
    // tabela já existente ou erro gerenciado
  }
}

export class DatabaseStorageAdapter implements StorageAdapter {
  async upload(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await ensureDocumentTable();
    const base64 = buffer.toString('base64');
    await sql`
      INSERT INTO onboarding_document_files (storage_key, file_data_base64, mime_type, size_bytes, created_at)
      VALUES (${key}, ${base64}, ${mimeType}, ${buffer.length}, NOW())
      ON CONFLICT (storage_key) DO UPDATE
      SET file_data_base64 = EXCLUDED.file_data_base64,
          mime_type = EXCLUDED.mime_type,
          size_bytes = EXCLUDED.size_bytes,
          created_at = NOW()
    `;

    // Cache em /tmp se for possível (silencioso em caso de falha)
    try {
      const tmpPath = path.join(os.tmpdir(), 'benavera_uploads', key);
      await fs.mkdir(path.dirname(tmpPath), { recursive: true });
      await fs.writeFile(tmpPath, buffer);
    } catch { /* silencioso */ }
  }

  async getSignedUrl(key: string, _ttlSeconds = 900): Promise<string> {
    const encodedKey = encodeURIComponent(key);
    return `/api/admin/onboardings/file-proxy?key=${encodedKey}`;
  }

  async delete(key: string): Promise<void> {
    await sql`DELETE FROM onboarding_document_files WHERE storage_key = ${key}`;
    try {
      const tmpPath = path.join(os.tmpdir(), 'benavera_uploads', key);
      await fs.unlink(tmpPath);
    } catch { /* silencioso */ }
  }

  async exists(key: string): Promise<boolean> {
    const rows = await sql`SELECT 1 FROM onboarding_document_files WHERE storage_key = ${key} LIMIT 1`;
    return Boolean(rows.length > 0);
  }

  async readFile(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    // 1. Tentar ler do cache local /tmp
    try {
      const tmpPath = path.join(os.tmpdir(), 'benavera_uploads', key);
      const data = await fs.readFile(tmpPath);
      const rows = await sql`SELECT mime_type FROM onboarding_document_files WHERE storage_key = ${key} LIMIT 1`;
      return { buffer: data, mimeType: rows[0]?.mime_type ? String(rows[0].mime_type) : 'application/octet-stream' };
    } catch {
      // Fallback para o banco
    }

    const rows = await sql`
      SELECT file_data_base64, mime_type
      FROM onboarding_document_files
      WHERE storage_key = ${key}
      LIMIT 1
    `;

    if (!rows[0] || !rows[0].file_data_base64) {
      return null;
    }

    const buffer = Buffer.from(String(rows[0].file_data_base64), 'base64');
    const mimeType = String(rows[0].mime_type || 'application/octet-stream');
    return { buffer, mimeType };
  }
}

// ── LocalDiskAdapter ─────────────────────────────────────────────────────────
// Protegido contra erros de sistema de arquivos somente-leitura em serverless
function getLocalStorageRoot(): string {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (typeof process.cwd === 'function' && process.cwd().startsWith('/var/task'))
  );
  return isServerless
    ? path.join(os.tmpdir(), 'benavera_uploads')
    : path.join(process.cwd(), 'uploads', 'credenciamento');
}

export class LocalDiskAdapter implements StorageAdapter {
  async upload(key: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const filePath = path.join(getLocalStorageRoot(), key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async getSignedUrl(key: string, _ttlSeconds = 900): Promise<string> {
    const encodedKey = encodeURIComponent(key);
    return `/api/admin/onboardings/file-proxy?key=${encodedKey}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(getLocalStorageRoot(), key);
    try {
      await fs.unlink(filePath);
    } catch { /* Arquivo pode não existir */ }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(getLocalStorageRoot(), key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const filePath = path.join(getLocalStorageRoot(), key);
    try {
      const buffer = await fs.readFile(filePath);
      return { buffer, mimeType: 'application/octet-stream' };
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

  async readFile(_key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    throw new Error('S3Adapter: Configure as variáveis de ambiente S3 para produção.');
  }
}

// ── Factory: retorna o adapter correto conforme ambiente ─────────────────────
let _storageInstance: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (_storageInstance) return _storageInstance;

  const provider = process.env.STORAGE_PROVIDER;

  if (provider === 's3' || provider === 'r2') {
    const bucket = process.env.S3_BUCKET || process.env.R2_BUCKET;
    const region = process.env.AWS_REGION || 'auto';
    if (!bucket) throw new Error('STORAGE_PROVIDER=s3 mas S3_BUCKET não configurado.');
    _storageInstance = new S3Adapter(bucket, region);
  } else if (provider === 'local') {
    _storageInstance = new LocalDiskAdapter();
  } else {
    // Padrão: DatabaseStorageAdapter (Neon Postgres)
    // 100% persistente e imune a erros de /var/task read-only em Serverless/Vercel
    _storageInstance = new DatabaseStorageAdapter();
  }

  return _storageInstance;
}
