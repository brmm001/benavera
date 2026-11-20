// Página pública de orçamento / proposta digital da clínica com impressão PDF e aceite digital
import { notFound } from 'next/navigation';
import { sql } from '@/lib/benavera-db';
import { OrcamentoPublicClient } from '@/components/painel/OrcamentoPublicClient';

export const dynamic = 'force-dynamic';

export default async function OrcamentoPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await sql`
    SELECT p.*, c.nome_fantasia, c.razao_social, c.cnpj, c.telefone, c.cidade, c.estado
    FROM clinic_digital_proposals p
    JOIN clinics c ON c.id = p.clinic_id
    WHERE p.token = ${token}
    LIMIT 1
  `;
  if (!rows[0]) notFound();
  return <OrcamentoPublicClient proposal={JSON.parse(JSON.stringify(rows[0]))} />;
}
