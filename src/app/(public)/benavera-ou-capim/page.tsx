import { InformationPage } from '@/components/InformationPage';
import { COMMERCIAL, CLINIC_FINANCING_PATH } from '@/lib/commercial';
import { pageMetadata } from '@/lib/seo';

const title = 'Benavera ou Capim: financiamento para sua clínica';
const intro = 'Compare a necessidade de assinar um sistema, o custo da clínica, o parcelamento do paciente e as condições de repasse. A escolha depende da proposta e da rotina da sua equipe.';
export const metadata = pageMetadata(title, intro, '/benavera-ou-capim');
const content = `
## Quem publica esta comparação?
Esta página é publicada pela **Benavera** e não é uma avaliação independente. Comparamos condições públicas dos produtos, sem pontuação de superioridade. A fonte da Capim é a [página oficial de financiamento odontológico](https://capim.com.br/site/financiamento-odontologico), consultada em **14 de novembro de 2026**. As informações da Benavera estão nas [condições comerciais](/condicoes).

## A diferença no modelo de contratação
Na Benavera, a oferta divulgada tem custo por operação, sem mensalidade ou adesão, e não exige substituir sua agenda ou prontuário. Na página consultada, a Capim condiciona o financiamento à assinatura do seu software e ao credenciamento da clínica. Portanto, inclua a contratação do sistema ao comparar as duas opções.

## Condições divulgadas
| Critério | Benavera | Financiamento Capim — fonte oficial consultada |
| --- | --- | --- |
| Acesso da clínica | Credenciamento e validação; sem assinatura obrigatória de suíte odontológica | Assinatura do sistema e credenciamento |
| Custo da clínica | ${COMMERCIAL.clinicFeePercent}% por operação; sem mensalidade ou adesão | Solicitar preços do software e condições da operação |
| Parcelamento | ${COMMERCIAL.installmentCondition} | Até 36 parcelas por boleto, sujeito à análise |
| Valor financiável | Definido na análise individual | Faixa divulgada de R$ 1 mil a R$ 30 mil |
| Repasse | Prazo, valor líquido e condições na contratação | Divulga pagamento à clínica em até 72 horas após a assinatura |
| Inadimplência | Conferir responsabilidade e coobrigação no contrato | Divulga assumir cobrança e risco no financiamento |
| Juros do paciente | Conforme proposta da instituição responsável | Conforme análise de crédito |
| Gestão | Portal para acompanhamento de propostas; preserve seu software atual | Financiamento integrado ao sistema da empresa |

As condições da Capim acima se referem ao **financiamento**, não ao carnê próprio da clínica ou à maquininha. Para ambas as empresas, peça a proposta e confira o contrato antes de decidir.

## Quando avaliar a Benavera
Considere a Benavera se sua clínica busca crédito para pacientes, quer conhecer uma taxa por operação explícita e pretende manter o sistema de gestão atual. O próximo passo é confirmar a modalidade disponível, o custo total do paciente e o repasse aplicável ao seu caso. Conheça a [oferta para clínicas odontológicas](${CLINIC_FINANCING_PATH}).

## Quando avaliar a Capim
Se você pretende contratar o sistema odontológico da Capim e integrar o financiamento à rotina dessa plataforma, avalie os recursos e o preço do conjunto em uma demonstração. A necessidade de um software deve entrar na decisão, além das condições financeiras.

## Compare propostas para o mesmo orçamento
Preencha estes campos com os valores recebidos de cada empresa. Não é possível concluir qual opção custa menos usando apenas a taxa anunciada ou o número máximo de parcelas.

| Informação para preencher | Por que comparar |
| --- | --- |
| Orçamento e procedimentos incluídos | Garante que as propostas tratem do mesmo tratamento |
| Entrada e valor financiado | Evita comparar saldos diferentes |
| Parcelas, juros, CET e total a pagar | Mostra o custo completo para o paciente |
| Taxa da clínica, mensalidades e outros descontos | Mostra o custo total para a clínica |
| Valor líquido, data e condições de liberação | Permite planejar o caixa |
| Atraso, cancelamento e coobrigação | Mostra quem responde por cada situação |
| Software e rotina operacional | Permite avaliar custo de adoção e funções necessárias |

## A Benavera aprova mais ou é sempre mais barata?
Não temos uma comparação independente de aprovação ou de custo para o mesmo conjunto de pacientes. Não fazemos essa afirmação. Uma alternativa pode ser mais adequada em um caso e não estar disponível em outro. Compare as condições efetivamente oferecidas.

## Como pedir uma análise para minha clínica?
Inicie o [credenciamento na Benavera](/credenciamento) e esclareça suas necessidades pelo [atendimento](/contato). Se já utiliza outra solução, leve os mesmos critérios para comparar. O objetivo é decidir com base em preço, disponibilidade e operação, não apenas no nome da empresa.
`;
export default function Page() {
  return <InformationPage title={title} intro={intro} content={content} />;
}
