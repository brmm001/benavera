// Admin: detalhe do representante — condições, clínicas vinculadas, comissões e pagamentos
import { notFound } from 'next/navigation';
import { sql } from '@/lib/benavera-db';
import {
  getRepresentanteById, listClinicasDoRepresentante, listComissoes, listPagamentos, syncComissoes, getDashboard,
} from '@/lib/representantes-db';
import { isUuid } from '@/lib/rep-guards';
import { AdminRepresentanteDetail } from '@/components/AdminRepresentanteDetail';
import '../../../representante/rep.css';

export const dynamic = 'force-dynamic';

export default async function AdminRepresentanteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const rep = await getRepresentanteById(id);
  if (!rep) notFound();

  await syncComissoes(id);
  const [clinicas, comissoes, pagamentos, dash, todasClinicas] = await Promise.all([
    listClinicasDoRepresentante(id),
    listComissoes(id, 'all'),
    listPagamentos(id),
    getDashboard(id, 'all'),
    sql`
      SELECT c.id, COALESCE(c.nome_fantasia, c.razao_social) AS nome, c.cnpj, c.ativo,
             (SELECT r.nome FROM representante_vinculos v JOIN representantes r ON r.id = v.representante_id
              WHERE v.clinic_id = c.id AND v.ativo LIMIT 1) AS representante_atual
      FROM clinics c ORDER BY c.nome_fantasia NULLS LAST LIMIT 2000
    `,
  ]);

  const payload = {
    rep,
    clinicas,
    comissoes: comissoes.slice(0, 300),
    pagamentos,
    kpis: dash.kpis,
    clinicasDisponiveis: todasClinicas.map(c => ({
      id: String(c.id), nome: String(c.nome), cnpj: (c.cnpj as string) ?? null, ativa: Boolean(c.ativo),
      representanteAtual: (c.representante_atual as string) ?? null,
    })),
  };

  return (
    <div className="rep-page" style={{ fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <a href="/admin/representantes" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Representantes</a>
      <h1 className="rep-h1" style={{ marginTop: 8 }}>{rep.nome}</h1>
      <p className="rep-sub">{rep.email} · Código de indicação <strong style={{ fontFamily: 'monospace' }}>{rep.codigo_indicacao}</strong></p>
      <AdminRepresentanteDetail data={JSON.parse(JSON.stringify(payload))} />
    </div>
  );
}

