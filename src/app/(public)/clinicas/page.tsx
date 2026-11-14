import { InformationPage } from '@/components/InformationPage';
import { COMMERCIAL, CLINIC_FINANCING_PATH, IMPLANT_FINANCING_PATH } from '@/lib/commercial';
import { pageMetadata } from '@/lib/seo';

const title = 'Financiamento para clínicas de saúde';
const intro = `Ofereça aos pacientes uma alternativa de crédito para tratamentos particulares. ${COMMERCIAL.clinicCost}. ${COMMERCIAL.installmentCondition}.`;
export const metadata = pageMetadata(title, intro, '/clinicas');
const content = `
## Escolha a solução para sua clínica
A Benavera intermedeia crédito para tratamentos particulares e apoia o acompanhamento das propostas. O paciente avalia as condições da instituição responsável antes de contratar.

- **Clínica odontológica:** conheça o [financiamento odontológico para clínicas](${CLINIC_FINANCING_PATH}), com custo da operação, credenciamento e perguntas sobre repasse.
- **Implantes, prótese protocolo e reabilitação oral:** veja [como organizar orçamento, proposta e recebimento](${IMPLANT_FINANCING_PATH}) em tratamentos com várias etapas.
- **Outras especialidades de saúde:** fale com a equipe para confirmar a modalidade disponível para seu estabelecimento. Há guias para pacientes sobre [estética](/parcelamento-procedimento-estetico), [oftalmologia](/parcelamento-cirurgia-oftalmologica) e [cirurgias particulares](/parcelamento-cirurgia-particular).

## Quanto custa para a clínica?
**${COMMERCIAL.clinicCost}.** A taxa comercial da clínica não corresponde aos juros do financiamento do paciente.

| Item | Condição Benavera |
| --- | --- |
| Taxa da clínica | ${COMMERCIAL.clinicFeePercent}% por operação |
| Mensalidade e adesão | Sem cobrança |
| Parcelamento | ${COMMERCIAL.installmentCondition} |
| Modalidades | Crédito convencional e consignado, conforme elegibilidade e disponibilidade |
| Juros e CET do paciente | Informados na proposta da instituição responsável |
| Repasse e inadimplência | Prazo, condições e responsabilidades definidos no contrato |

Confira o exemplo da taxa e as [condições comerciais completas](/condicoes).

## Como sua equipe utiliza a Benavera
1. Preencha o [credenciamento](/credenciamento) com os dados do estabelecimento e do responsável.
2. Envie os documentos pelo ambiente protegido e acompanhe a validação.
3. Após a liberação, apresente a alternativa ao paciente e encaminhe a proposta para análise.
4. O paciente confere parcelas, juros, CET e contrato antes de decidir.
5. A clínica acompanha a proposta e confere o repasse conforme as condições contratadas.

## Preciso trocar meu sistema de gestão?
Não é necessário substituir a agenda ou o prontuário para iniciar o credenciamento. O Portal Benavera é utilizado para a jornada das propostas. Sua clínica pode manter o software atual; isso não significa que exista integração automática entre os sistemas. Veja [o passo a passo](/como-funciona).

## Como decidir se o financiamento vale a pena?
Compare o valor líquido recebido com os custos do tratamento e a margem necessária. Para o paciente, compare o total a pagar e a parcela com o orçamento mensal. Financiamento pode ampliar as alternativas de pagamento, mas não garante fechamento nem aprovação de crédito.

Leia [como medir o resultado do financiamento](/conteudos/financiamento-pacientes-aumenta-conversao-clinica) e [como calcular rentabilidade por tratamento](/conteudos/rentabilidade-por-tratamento-clinica).

## Perguntas frequentes
### A clínica recebe à vista ou parcelado?
A proposta deve indicar como ocorre o repasse, o valor líquido, as condições de liberação e o prazo. O parcelamento do paciente e o recebimento da clínica são informações diferentes.

### Quem assume o risco se o paciente não pagar?
Confira a responsabilidade por inadimplência e eventual coobrigação no contrato da modalidade. Confira também cancelamento e contestação do tratamento.

### O paciente precisa ter cartão?
Crédito convencional e consignado são modalidades diferentes do parcelamento no cartão. A disponibilidade depende da análise e das regras da instituição responsável.

### Como comparar com a Capim?
Compare requisitos para contratar, mensalidades, taxa da operação, funções do software, repasse e custo total do paciente. A página [Benavera ou Capim](/benavera-ou-capim) reúne condições divulgadas e fontes da comparação.
`;
export default function Page() {
  return <InformationPage title={title} intro={intro} content={content} />;
}
