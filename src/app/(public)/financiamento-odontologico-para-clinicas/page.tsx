import { ClinicFinancingPage } from '@/components/ClinicFinancingPage';
import { CLINIC_FINANCING_PATH, COMMERCIAL, IMPLANT_FINANCING_PATH, clinicFeeExample, currencyBRL } from '@/lib/commercial';
import { pageMetadata } from '@/lib/seo';

const title = 'Financiamento odontológico para clínicas';
const intro = `A Benavera intermedeia crédito para pacientes de clínicas odontológicas. Sua equipe pode apresentar uma alternativa ao pagamento à vista ou no cartão, com taxa de ${COMMERCIAL.clinicFeePercent}% por operação para a clínica, sem mensalidade ou adesão, e até ${COMMERCIAL.maxInstallments} parcelas para o paciente, conforme análise e modalidade.`;
export const metadata = pageMetadata(title, `Ofereça crédito aos pacientes: ${COMMERCIAL.clinicFeePercent}% por operação para a clínica, sem mensalidade ou adesão. Conheça credenciamento, parcelas e repasse.`, CLINIC_FINANCING_PATH);
const example = clinicFeeExample(10000);
const content = `
## Como funciona o financiamento odontológico na Benavera?
O dentista define o tratamento e seu orçamento. A clínica apresenta ao paciente a possibilidade de solicitar crédito. A Benavera organiza o encaminhamento e o acompanhamento da proposta; a instituição responsável decide a aprovação e apresenta as condições de contratação.

O financiamento pode ser avaliado para implantes, prótese protocolo, reabilitação oral e outros tratamentos odontológicos particulares. A indicação do procedimento é responsabilidade do profissional de saúde; o crédito depende de análise própria.

## Quanto a clínica paga e quanto o paciente paga?
São duas contas diferentes. **${COMMERCIAL.clinicCost}.** Para o paciente, juros, tributos, eventuais encargos e custo efetivo total (CET) aparecem na proposta individual.

| O que comparar | Condição Benavera |
| --- | --- |
| Custo comercial da clínica | ${COMMERCIAL.clinicFeePercent}% por operação |
| Mensalidade e adesão | Sem cobrança |
| Parcelamento do paciente | ${COMMERCIAL.installmentCondition} |
| Limite de crédito | Definido na análise; não há limite garantido pela calculadora |
| Juros e CET | Apresentados pela instituição responsável, antes do aceite |
| Repasse à clínica | Valor líquido, prazo e condições de liberação na contratação |
| Atraso do paciente | Responsabilidade e eventual coobrigação conforme contrato |

**Exemplo da taxa da clínica:** em uma operação de ${currencyBRL(example.amount)}, a taxa é ${currencyBRL(example.fee)}. O líquido seria ${currencyBRL(example.net)} se esse fosse o único desconto contratado. Isso não informa o total pago pelo paciente nem garante aprovação desse valor. Consulte as [condições comerciais](/condicoes).

## Preciso trocar meu software odontológico?
Não é necessário substituir sua agenda ou seu prontuário para iniciar o credenciamento. O Portal Benavera atende à jornada de propostas de financiamento. Sua clínica pode continuar usando o sistema de gestão que já utiliza.

O uso do portal não significa integração automática com esse sistema. Na conversa com a equipe, confirme como registrar o orçamento e acompanhar a proposta na rotina da clínica. Não há contratação obrigatória de uma suíte de gestão odontológica na oferta descrita nesta página.

## Como credenciar a clínica, passo a passo
1. **Cadastro:** informe CNPJ, especialidade, endereço e dados do responsável no [formulário de credenciamento](/credenciamento).
2. **Validação:** siga a solicitação de documentos no ambiente protegido. O cadastro não significa aprovação imediata para operar.
3. **Proposta:** após a liberação, apresente o orçamento ao paciente e encaminhe os dados necessários à análise da modalidade disponível.
4. **Decisão do paciente:** ele confere valor financiado, entrada, número de parcelas, juros, CET e total a pagar antes de assinar.
5. **Repasse e acompanhamento:** a clínica confere o valor líquido, as condições de liberação e a data de recebimento acordada. Simulação, aprovação, contratação e repasse são etapas diferentes.

## E para pacientes sem limite no cartão?
O financiamento convencional é uma modalidade distinta do parcelamento no cartão. O consignado também pode ser avaliado quando o paciente tem vínculo elegível e há oferta disponível. Não ter limite no cartão, por si só, não garante aprovação em outra modalidade.

Se o paciente pedir boleto, esclareça a diferença entre boleto como meio de cobrança e crédito contratado com uma instituição. Confirme na proposta qual é a forma de pagamento das parcelas. Veja o [guia de boleto para clínicas](/conteudos/parcelamento-no-boleto-clinica-odontologica).

## Quando a Benavera pode fazer sentido para sua clínica?
A proposta atende à busca por crédito para pacientes com custo por operação explícito, sem mensalidade ou adesão e sem necessidade de trocar o sistema de gestão. Para decidir, compare o custo líquido, as obrigações contratuais e as condições reais oferecidas ao mesmo paciente.

Se a prioridade for agenda, prontuário ou uma suíte odontológica completa, avalie esses recursos separadamente. A [comparação entre Benavera e Capim](/benavera-ou-capim) explica essas diferenças e identifica as fontes utilizadas.

## Implantes, protocolo e organização comercial
Para tratamentos em etapas, veja a página específica de [financiamento de implantes e prótese protocolo para clínicas](${IMPLANT_FINANCING_PATH}). Para organizar a rotina da equipe, consulte [como apresentar o orçamento odontológico](/conteudos/como-apresentar-orcamento-odontologico) e [como medir a conversão do financiamento](/conteudos/financiamento-pacientes-aumenta-conversao-clinica).
`;
const faqs = [
  { question: 'A Benavera cobra mensalidade da clínica?', answer: `A condição divulgada é de ${COMMERCIAL.clinicFeePercent}% por operação, sem mensalidade e sem taxa de adesão. A taxa da clínica não equivale aos juros do paciente.` },
  { question: `Todo paciente consegue pagar em ${COMMERCIAL.maxInstallments} vezes?`, answer: `Não. Até ${COMMERCIAL.maxInstallments} parcelas é o prazo máximo divulgado, sujeito à modalidade, disponibilidade e aprovação. A proposta individual informa o prazo efetivamente oferecido.` },
  { question: 'A clínica recebe à vista? Em quanto tempo?', answer: 'Confirme na proposta se a modalidade prevê repasse integral à clínica, qual é o valor líquido, o prazo e o evento que inicia sua contagem. O parcelamento do paciente não determina sozinho o calendário de recebimento da clínica.' },
  { question: 'Se o paciente deixar de pagar, a clínica assume a dívida?', answer: 'Confira quem assume o risco de crédito e se existe coobrigação no contrato da modalidade. Verifique também as regras para cancelamento, contestação e não realização do tratamento.' },
  { question: 'A Benavera é um banco?', answer: 'Não. A Benavera atua na intermediação de crédito. A instituição responsável pela operação deve ser identificada na proposta e no contrato antes da assinatura.' },
];

export default function Page() {
  return <ClinicFinancingPage title={title} intro={intro} path={CLINIC_FINANCING_PATH} content={content} faqs={faqs} />;
}
