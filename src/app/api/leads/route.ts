import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LEADS_FILE = path.join(process.cwd(), 'data', 'leads.json');

async function ensureFile() {
  const dir = path.dirname(LEADS_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // dir already exists
  }
  try {
    await fs.access(LEADS_FILE);
  } catch {
    await fs.writeFile(LEADS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

async function readLeads(): Promise<unknown[]> {
  await ensureFile();
  const raw = await fs.readFile(LEADS_FILE, 'utf-8');
  try {
    return JSON.parse(raw) as unknown[];
  } catch {
    return [];
  }
}

async function writeLead(lead: unknown): Promise<void> {
  await ensureFile();
  const leads = await readLeads();
  leads.unshift(lead); // newer leads first
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
}

// POST /api/leads — receive a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;

    // Basic sanitization — strip potential XSS
    const sanitize = (val: unknown): unknown => {
      if (typeof val === 'string') return val.replace(/[<>]/g, '');
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return Object.fromEntries(
          Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, sanitize(v)])
        );
      }
      return val;
    };

    const sanitizedBody = sanitize(body) as Record<string, unknown>;
    const lead: Record<string, unknown> = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      receivedAt: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      ...sanitizedBody,
    };

    await writeLead(lead);

    console.log(`[Benavera] Lead salvo: ${lead.id} — tipo: ${lead.tipoLead ?? 'desconhecido'}`);

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (err) {
    console.error('[Benavera] Erro ao salvar lead:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar solicitação.' },
      { status: 500 }
    );
  }
}

// GET /api/leads — return all leads (for admin page)
export async function GET(request: NextRequest) {
  // Only accessible in development or with secret header
  const secret = process.env.ADMIN_SECRET;
  const providedSecret = request.headers.get('x-admin-secret');

  if (secret && providedSecret !== secret) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const leads = await readLeads();
    return NextResponse.json({ leads, total: leads.length });
  } catch (err) {
    console.error('[Benavera] Erro ao ler leads:', err);
    return NextResponse.json({ error: 'Erro ao carregar leads.' }, { status: 500 });
  }
}
