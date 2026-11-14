import { ClinicFinancingPage } from '@/components/ClinicFinancingPage';
import { CLINIC_FINANCING_PATH, COMMERCIAL, IMPLANT_FINANCING_PATH, clinicFeeExample, currencyBRL } from '@/lib/commercial';
import { pageMetadata } from '@/lib/seo';

const title = 'Financiamento de implantes e prótese protocolo para clínicas';
const intro = `Apresente uma alternativa de crédito para orçamentos de implantes, prótese protocolo e reabilitação oral. Na Benavera, a clínica tem taxa de ${COMMERCIAL.clinicFeePercent}% por operação, sem mensalidade ou adesão; o paciente pode avaliar até ${COMMERCIAL.maxInstallments} parcelas, conforme análise e modalidade.`;
export const metadata = pageMetadata('Financiamento de implantes para clínicas', `Implantes e prótese protocolo: credenciamento, taxa de ${COMMERCIAL.clinicFeePercent}% para a clínica, pagamento por etapas e repasse. Até ${COMMERCIAL.maxInstallments}x sujeito à análise.`, IMPLANT_FINANCING_PATH);
const rows = [7000, 15000, 25000].map(clinicFeeExample).map(x => `| ${currencyBRL(x.amount)} | ${currencyBRL(x.fee)} | ${currencyBRL(x.net)} |`).join('\n');
const content = `
## Como oferecer crédito para implantes e protocolo
Comece pelo plano de tratamento e por um orçamento discriminado. Depois, apresente ao paciente as formas de pagamento e, se ele desejar, a possibilidade de solicitar financiamento. A Benavera intermedeia a jornada; a instituição responsável analisa o crédito e apresenta o contrato.

O orçamento odontológico e a proposta financeira têm finalidades diferentes. Um descreve o cuidado planejado e seus custos. A outra informa o valor financiado, parcelas, juros, CET e total a pagar. A aprovação de crédito não substitui a avaliação odontológica.

## O que incluir no orçamento antes da simulação?
Em reabilitações com várias etapas, explique o que está incluído e o que poderá ser cobrado separadamente. Isso ajuda a evitar que paciente e clínica comparem propostas com escopos diferentes.

| Parte do planejamento | O que esclarecer ao paciente |
| --- | --- |
| Avaliação e exames | Se estão incluídos ou serão pagos separadamente |
| Etapa cirúrgica | Procedimentos previstos no plano individual |
| Enxertos e procedimentos adicionais | Se já estão previstos ou dependem da avaliação |
| Prótese provisória e definitiva | Quais peças e etapas compõem o orçamento |
| Acompanhamento e manutenção | O que está incluído e quais custos são posteriores |
| Entrada e saldo a financiar | Valores distintos, evitando cobrar a mesma despesa duas vezes |

Esses itens são um roteiro de orçamento, não uma indicação clínica. O profissional responsável define a necessidade de cada etapa.

## Exemplo do custo da clínica
Com taxa de ${COMMERCIAL.clinicFeePercent}% por operação, os exemplos abaixo isolam a taxa da clínica. **São hipóteses de cálculo, não casos reais, propostas aprovadas ou limites garantidos.**

| Valor de referência da operação | Taxa da clínica | Líquido se não houver outros descontos |
| --- | --- | --- |
${rows}

O custo do paciente exige uma proposta própria: dividir o valor do tratamento pelo número de parcelas não calcula os juros nem o CET. Use o [simulador para clínicas](/simuladorclinicas) para planejamento e confira as [condições comerciais](/condicoes) antes de apresentar uma oferta.

## Como organizar o repasse quando o tratamento tem etapas?
Antes de contratar, confira se o repasse ocorre de uma vez ou por etapas, quais documentos ou confirmações condicionam a liberação e quando começa a contagem do prazo. Registre também como alterações do plano de tratamento e cancelamentos serão tratados.

Não considere uma simulação como valor disponível no caixa. Separe os registros de orçamento, proposta em análise, aprovação, contrato assinado e repasse confirmado. A confirmação de recebimento deve seguir as regras da operação.

## Paciente sem limite no cartão pode solicitar?
O crédito convencional é diferente do parcelamento no cartão. Pode ser uma alternativa a avaliar quando o limite do cartão não atende ao orçamento, mas a instituição fará sua própria análise. O consignado depende de vínculo elegível e oferta disponível. A clínica não deve prometer aprovação ou um prazo antes de receber a proposta.

Para boleto, confirme o meio de cobrança disponibilizado no contrato. Um boleto, isoladamente, não demonstra que uma financeira assumiu o risco da operação.

## Como apresentar a opção sem pressionar o paciente
Explique o tratamento primeiro. Depois, apresente valor à vista, entrada e alternativas de pagamento com suas diferenças. Na proposta financeira, mostre parcelas e total a pagar juntos. Dê espaço para o paciente avaliar se o compromisso cabe no orçamento.

Uma mensagem possível: “Este é o orçamento do seu tratamento e das etapas incluídas. Se quiser avaliar financiamento, podemos encaminhar uma solicitação. A instituição fará a análise e você confere juros, CET e valor total antes de decidir.”

## Comece pela clínica, acompanhe cada proposta
O [credenciamento](/credenciamento) solicita dados do estabelecimento e do responsável, seguido da validação documental no ambiente protegido. Não é necessário substituir seu software odontológico para iniciar. Veja [como funciona o financiamento odontológico para clínicas](${CLINIC_FINANCING_PATH}).

Para aprofundar, consulte [prótese protocolo: custos e pagamento](/conteudos/protese-protocolo-parcelada-custos-pagamento), [implante parcelado no boleto](/conteudos/implante-dentario-parcelado-no-boleto) e [rentabilidade por tratamento na clínica](/conteudos/rentabilidade-por-tratamento-clinica). Se você é paciente, acesse o [guia de financiamento de implante dentário](/financiamento-implante-dentario).
`;
const faqs = [
  { question: 'Posso solicitar financiamento de uma prótese protocolo?', answer: 'A clínica pode encaminhar o orçamento de prótese protocolo para avaliação, conforme a modalidade disponível. Valor, prazo, elegibilidade e aprovação dependem da análise da instituição responsável.' },
  { question: 'Existe um limite de crédito garantido para implantes?', answer: 'Não. Os valores dos exemplos são apenas cálculos da taxa da clínica. O limite efetivamente disponível é informado na proposta, após a análise.' },
  { question: 'Carga imediata muda o prazo de recebimento?', answer: 'O planejamento clínico e a liberação financeira seguem critérios diferentes. Confirme no contrato o evento que autoriza o repasse; a indicação de carga imediata não garante liberação ou recebimento imediato.' },
  { question: 'O que acontece se o tratamento mudar ou for interrompido?', answer: 'A clínica e o paciente devem comunicar a situação pelos canais de atendimento e seguir o procedimento dos contratos de tratamento e de crédito. Não presuma cancelamento automático das parcelas.' },
  { question: 'Como comparar a Benavera com outra opção para o mesmo protocolo?', answer: 'Compare propostas com o mesmo orçamento e escopo, entrada e prazo. Confira taxa da clínica, valor líquido, data e condições de repasse, custo total do paciente e responsabilidade por atraso ou cancelamento.' },
];

export default function Page() {
  return <ClinicFinancingPage title={title} intro={intro} path={IMPLANT_FINANCING_PATH} content={content} faqs={faqs} />;
}
