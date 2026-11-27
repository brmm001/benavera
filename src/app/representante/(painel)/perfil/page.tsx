// Perfil, dados de pagamento e link de indicação
import { headers } from 'next/headers';
import { getRepresentanteSession } from '@/lib/representantes-db';
import { RepresentantePerfilForm } from '@/components/RepresentantePerfilForm';
import { pct, periodoLabel } from '@/components/rep-format';

export const dynamic = 'force-dynamic';

export default async function RepresentantePerfil() {
  const ctx = await getRepresentanteSession();
  if (!ctx) return null;
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'benavera.com.br';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  const link = `${proto}://${host}/credenciamento?ref=${ctx.rep.codigo_indicacao}`;

  return (
    <div className="rep-page">
      <h1 className="rep-h1">Perfil &amp; link de indicação</h1>
      <p className="rep-sub">Clínicas que se cadastrarem por este link ficam vinculadas a você automaticamente.</p>

      <div className="rep-card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Seu link de indicação padrão</h3>
          <a href="/representante/links" className="rep-btn small" style={{ textDecoration: 'none' }}>⚡ Gerar link com plano + assinatura →</a>
        </div>
        <RepresentantePerfilForm mode="link" link={link} codigo={ctx.rep.codigo_indicacao} />
      </div>

      <div className="rep-card" style={{ marginBottom: 18 }}>
        <h3>Condições de comissionamento e alçadas</h3>
        <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
          Financiamentos: <strong>{pct(ctx.rep.comissao_percent, 2)}</strong> sobre o valor financiado ·
          Mensalidades SaaS: <strong>{pct(ctx.rep.mensalidade_percent, 2)}</strong> sobre faturas pagas ·
          Período: <strong>{periodoLabel(ctx.rep.periodo_meses)}</strong>
          {ctx.rep.bonus_ativacao > 0 && <> · Bônus por clínica ativada: <strong>R$ {ctx.rep.bonus_ativacao.toFixed(2).replace('.', ',')}</strong></>}
          <br />
          Alçada em links de assinatura: desconto até <strong>{pct(ctx.rep.max_discount_percent, 2)}</strong> · carência/teste até <strong>{ctx.rep.max_trial_days} dias</strong>.
          <br /><span style={{ color: '#94a3b8' }}>As condições de cada clínica ficam registradas no momento do vínculo. Em caso de dúvida, fale com a Benavera.</span>
        </p>
      </div>

      <div className="rep-card">
        <h3>Dados de contato e pagamento</h3>
        <RepresentantePerfilForm
          mode="dados"
          initial={{ nome: ctx.rep.nome, email: ctx.rep.email, telefone: ctx.rep.telefone ?? '', documento: ctx.rep.documento ?? '', tipo_pix: ctx.rep.tipo_pix ?? 'cpf', chave_pix: ctx.rep.chave_pix ?? '', notif_email: ctx.rep.notif_email }}
        />
      </div>
    </div>
  );
}

