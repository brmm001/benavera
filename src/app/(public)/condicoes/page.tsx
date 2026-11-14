import { InformationPage } from '@/components/InformationPage';
import { COMMERCIAL, CLINIC_FINANCING_PATH, clinicFeeExample, currencyBRL } from '@/lib/commercial';
import { pageMetadata } from '@/lib/seo';

const title = 'Condições comerciais da Benavera';
export const metadata = pageMetadata(title, COMMERCIAL.description, '/condicoes');
const example = clinicFeeExample(10000);
const content = `
## Condições de referência
Informações revisadas em **${COMMERCIAL.reviewedLabel}**, com base no material comercial vigente da Benavera. A proposta individual e o contrato detalham a operação.

| Condição | O que considerar |
| --- | --- |
| Taxa da clínica | ${COMMERCIAL.clinicFeePercent}% por operação; não equivale aos juros do paciente |
| Mensalidade e adesão | Sem cobrança |
| Parcelamento máximo | ${COMMERCIAL.installmentCondition} |
| Modalidades | Crédito convencional e consignado, conforme elegibilidade e disponibilidade |
| Software de gestão | Não é necessário substituir agenda ou prontuário para iniciar o credenciamento |
| Aprovação | Sujeita à análise da instituição responsável |
| Valor financiável | Definido na análise; uma calculadora não assegura limite |
| Repasse | Valor líquido, prazo e condições de liberação informados na contratação |
| Inadimplência | Responsabilidade e eventual coobrigação definidas no contrato |

## Exemplo da taxa da clínica
Para uma operação de ${currencyBRL(example.amount)}, **${COMMERCIAL.clinicFeePercent}% = ${currencyBRL(example.fee)}**. Se esse for o único desconto contratado, o líquido será ${currencyBRL(example.net)}. Essa conta não representa o total pago pelo paciente e não é uma promessa de aprovação.

## Juros, CET e parcelas do paciente
Antes de contratar, confira taxa mensal e anual, custo efetivo total (CET), tributos, eventuais seguros, valor de cada parcela e total a pagar. Os valores de simuladores são estimativas e não substituem a proposta. Não há promessa geral de crédito sem juros.

## O que deve estar definido antes da assinatura?
- Instituição responsável pelo crédito e modalidade disponível para o paciente.
- Valor do tratamento, entrada, valor financiado e quantidade de parcelas.
- Juros, CET, total pago pelo paciente e forma de cobrança.
- Taxa da clínica, outros descontos contratados e valor líquido a receber.
- Repasse integral ou por etapas, prazo e evento que autoriza a liberação.
- Responsabilidade por atraso, eventual coobrigação, cancelamento e contestação.

Se algum item não estiver claro, peça esclarecimento pelos [canais oficiais](/contato) antes de contratar.

## Credenciamento e documentos
O cadastro inicial reúne informações da clínica, endereço e dados do responsável. O campo CNPJ é opcional na primeira tela, mas a validação posterior exige o preenchimento cadastral e a documentação aplicável. Iniciar o cadastro não equivale a obter liberação para operar.

A etapa protegida solicita contrato social ou ato constitutivo, documento do representante legal, documento ou registro do responsável técnico e comprovante de titularidade bancária. Outros documentos podem ser solicitados conforme a situação. A liberação depende da análise documental, sem prazo fixo de aprovação garantido nesta página.

Para o paciente, a documentação e os critérios dependem da modalidade, renda, vínculo elegível e análise da instituição. O consignado depende de vínculo compatível e oferta disponível.

## Quem concede o crédito?
A Benavera atua na intermediação e não é uma instituição financeira. A instituição responsável e suas condições devem estar identificadas na proposta antes da assinatura. Verifique a identificação da concedente em cada contratação.

## Cancelamento ou mudança do tratamento
Procure a clínica e a Benavera pelos [canais de atendimento](/contato). A interrupção do tratamento não cancela automaticamente o contrato de crédito. O procedimento de ajuste, cancelamento e eventuais valores devidos deve ser verificado nos contratos e com a instituição responsável.

## Conheça a solução ou solicite uma proposta
Veja o [financiamento odontológico para clínicas](${CLINIC_FINANCING_PATH}), inicie o [credenciamento](/credenciamento) ou, se você é paciente, solicite uma [simulação](/simular). A [calculadora para clínicas](/simuladorclinicas) serve para planejamento e não apresenta uma aprovação de crédito.
`;
export default function Page() {
  return <InformationPage title={title} intro={COMMERCIAL.description} content={content} />;
}
