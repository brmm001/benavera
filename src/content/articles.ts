import type { ArticleFrontmatter, ArticleCategory } from '@/types';

// ============================================================
// ARTIGOS — CONTEÚDO EDITORIAL COM E-E-A-T
// ============================================================

export const articles: ArticleFrontmatter[] = [
  {
    title: 'Como funciona o parcelamento de um tratamento odontológico?',
    slug: 'parcelamento-tratamento-odontologico',
    description:
      'Entenda como funciona o parcelamento de tratamentos odontológicos, quais são as formas disponíveis e o que considerar antes de escolher.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-09-01',
    author: 'Equipe Benavera',
    reviewer: 'Revisão Editorial Benavera',
    category: 'formas-de-pagamento',
    keywords: [
      'parcelamento tratamento odontológico',
      'como parcelar implante dentário',
      'tratamento odontológico parcelado',
      'financiamento odontológico',
    ],
    canonical: 'https://www.benavera.com.br/conteudos/parcelamento-tratamento-odontologico',
    relatedArticles: [
      'como-comparar-formas-pagamento-tratamento',
      'entrada-maior-ou-parcela-menor',
      'como-planejar-pagamento-tratamento-alto-valor',
    ],
    sources: [
      {
        title: 'Resolução CMN nº 4.966/2021 — Concessão de crédito e transparência',
        url: 'https://www.bcb.gov.br',
        organization: 'Banco Central do Brasil',
      },
      {
        title: 'Código de Defesa do Consumidor (Lei nº 8.078/1990) — Art. 52 sobre outorga de crédito',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
        organization: 'Presidência da República',
      },
    ],
  },
  {
    title: 'Como planejar o pagamento de um tratamento de alto valor?',
    slug: 'como-planejar-pagamento-tratamento-alto-valor',
    description:
      'Veja como se planejar financeiramente para pagar um tratamento caro, comparar opções e entender o que cabe no seu orçamento antes de contratar qualquer solução.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-09-01',
    author: 'Equipe Benavera',
    reviewer: 'Revisão Editorial Benavera',
    category: 'planejamento-financeiro',
    keywords: [
      'como pagar tratamento caro',
      'planejamento financeiro tratamento',
      'como pagar tratamento odontológico',
      'como financiar tratamento',
    ],
    canonical: 'https://www.benavera.com.br/conteudos/como-planejar-pagamento-tratamento-alto-valor',
    relatedArticles: [
      'parcelamento-tratamento-odontologico',
      'entrada-maior-ou-parcela-menor',
      'como-comparar-formas-pagamento-tratamento',
    ],
    sources: [
      {
        title: 'Caderno de Educação Financeira — Gestão de Orçamento Pessoal',
        url: 'https://www.bcb.gov.br/cidadaniafinanceira',
        organization: 'Banco Central do Brasil',
      },
    ],
  },
  {
    title: 'Entrada maior ou parcela menor: o que considerar?',
    slug: 'entrada-maior-ou-parcela-menor',
    description:
      'Entenda quando faz sentido dar uma entrada maior e reduzir as parcelas, e quando é melhor preservar o caixa e distribuir o valor no tempo.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-09-01',
    author: 'Equipe Benavera',
    reviewer: 'Revisão Editorial Benavera',
    category: 'planejamento-financeiro',
    keywords: [
      'entrada maior ou parcela menor',
      'entrada para tratamento odontológico',
      'quanto dar de entrada tratamento',
      'parcela ou entrada financiamento',
    ],
    canonical: 'https://www.benavera.com.br/conteudos/entrada-maior-ou-parcela-menor',
    relatedArticles: [
      'como-planejar-pagamento-tratamento-alto-valor',
      'parcelamento-tratamento-odontologico',
    ],
    sources: [
      {
        title: 'Guia do Consumidor sobre Crédito Responsável',
        url: 'https://www.bcb.gov.br/meubc',
        organization: 'Banco Central do Brasil',
      },
    ],
  },
  {
    title: 'Como comparar formas de pagamento de um tratamento?',
    slug: 'como-comparar-formas-pagamento-tratamento',
    description:
      'Saiba quais critérios usar para comparar cartão de crédito, financiamento e outras formas de pagamento antes de contratar para seu tratamento.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-09-01',
    author: 'Equipe Benavera',
    reviewer: 'Revisão Editorial Benavera',
    category: 'formas-de-pagamento',
    keywords: [
      'cartão ou financiamento tratamento',
      'como comparar formas de pagamento',
      'comparar CET financiamento',
      'melhor forma pagar tratamento',
    ],
    canonical: 'https://www.benavera.com.br/conteudos/como-comparar-formas-pagamento-tratamento',
    relatedArticles: [
      'parcelamento-tratamento-odontologico',
      'entrada-maior-ou-parcela-menor',
    ],
    sources: [
      {
        title: 'O que é CET (Custo Efetivo Total) — Resolução CMN nº 3.517/2007',
        url: 'https://www.bcb.gov.br/meubc/cet',
        organization: 'Banco Central do Brasil',
      },
    ],
  },
  {
    title: 'Por que pacientes desistem depois de receber um orçamento?',
    slug: 'por-que-pacientes-desistem-apos-orcamento',
    description:
      'Entenda os principais motivos que levam pacientes a não fechar tratamentos após receber um orçamento e o que clínicas podem fazer a respeito.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-09-01',
    author: 'Equipe Benavera',
    reviewer: 'Revisão Editorial Benavera',
    category: 'para-clinicas',
    keywords: [
      'paciente não fecha orçamento',
      'por que paciente desiste tratamento',
      'abandono de orçamento odontológico',
      'como recuperar paciente orçamento',
    ],
    canonical: 'https://www.benavera.com.br/conteudos/por-que-pacientes-desistem-apos-orcamento',
    relatedArticles: [
      'como-clinicas-melhorar-conversao-orcamentos',
    ],
    sources: [
      {
        title: 'Pesquisa Nacional de Saúde Bucal — Acesso e Barreiras Financeiras',
        url: 'https://www.gov.br/saude/pt-br',
        organization: 'Ministério da Saúde',
      },
    ],
  },
  {
    title: 'Como clínicas podem melhorar a conversão de orçamentos?',
    slug: 'como-clinicas-melhorar-conversao-orcamentos',
    description:
      'Estratégias práticas para clínicas aumentarem a taxa de fechamento, reduzirem o abandono de orçamentos e melhorarem o processo comercial.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-09-01',
    author: 'Equipe Benavera',
    reviewer: 'Revisão Editorial Benavera',
    category: 'para-clinicas',
    keywords: [
      'como aumentar conversão clínica odontológica',
      'como melhorar fechamento tratamentos',
      'reduzir abandono orçamento',
      'taxa de conversão odontológica',
    ],
    canonical: 'https://www.benavera.com.br/conteudos/como-clinicas-melhorar-conversao-orcamentos',
    relatedArticles: [
      'por-que-pacientes-desistem-apos-orcamento',
    ],
    sources: [
      {
        title: 'Gestão de Clínicas e Consultórios — Sebrae Nacional',
        url: 'https://www.sebrae.com.br',
        organization: 'Sebrae',
      },
    ],
  },
];

export function getArticleBySlug(slug: string): ArticleFrontmatter | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: ArticleCategory): ArticleFrontmatter[] {
  return articles.filter((a) => a.category === category);
}

export function getRelatedArticles(slugs: string[]): ArticleFrontmatter[] {
  return slugs.map((slug) => getArticleBySlug(slug)).filter(Boolean) as ArticleFrontmatter[];
}

// ============================================================
// CONTEÚDO COMPLETO DOS ARTIGOS
// ============================================================

export const articleContent: Record<string, string> = {
  'parcelamento-tratamento-odontologico': `
O parcelamento de tratamentos odontológicos funciona de formas distintas dependendo da opção escolhida: parcelamento direto na clínica, uso do cartão de crédito ou financiamento por meio de uma instituição financeira parceira.

## Resposta rápida

O parcelamento de um tratamento odontológico pode acontecer de três formas principais: direto com a clínica (geralmente em menos parcelas), via cartão de crédito (limitado ao seu limite disponível no momento) ou por financiamento bancário/fintech (geralmente com prazos mais longos, de 12 a 60 meses, incidindo juros e CET). As condições variam de acordo com o valor, a clínica e o perfil de crédito.

## Como funciona o parcelamento direto com a clínica?

Algumas clínicas oferecem parcelamento próprio, geralmente em menos parcelas e sem intermediários. As condições variam: algumas exigem entrada e dividem o restante em até 6 parcelas sem juros via boleto ou cheque. Outras utilizam parceiros intermediadores.

**O que observar:**
- Número máximo de parcelas disponíveis
- Necessidade e valor mínimo de entrada
- Se há incidência de juros embutidos
- Condições e multas contratuais em caso de atraso

## Como funciona o parcelamento no cartão de crédito?

O cartão de crédito é uma das alternativas mais frequentes. Permite dividir o valor em até 12 vezes, dependendo do acordo comercial entre a clínica e as operadoras de cartão.

**Pontos de atenção:**
- O valor integral do procedimento consome o limite total disponível no cartão
- Parcelamentos sem juros geralmente exigem prazos mais curtos
- O crédito rotativo do cartão apresenta juros elevados caso a fatura não seja paga integralmente
- Comprometer o limite pode afetar gastos essenciais do dia a dia

## Como funciona o financiamento externo?

No financiamento estruturado, uma instituição financeira autorizada efetua o repasse do valor do procedimento diretamente à clínica e o paciente assume o pagamento das parcelas mensais contratadas.

**O que considerar:**
- O Custo Efetivo Total (CET) deve ser consultado obrigatoriamente antes da contratação
- Prazos mais longos (até 36 ou 48 meses) reduzem a parcela mensal, mas aumentam o custo total pago
- A concessão está sujeita a análise de crédito individual
- A Benavera ajuda a identificar parceiros adequados, sem garantir aprovação prévia

## Comparação entre formas de pagamento

| Forma de Pagamento | Prazo Típico | Impacto no Limite do Cartão | Principal Ponto de Atenção |
|---|---|---|---|
| Parcelamento Direto | 3 a 10 parcelas | Nenhum | Exigência frequente de entrada |
| Cartão de Crédito | 1 a 12 parcelas | Compromete o valor total | Taxas e limite disponível |
| Financiamento Externo | 12 a 48 parcelas | Nenhum | CET e juros compostos |

## Quanto da renda comprometer com o tratamento?

De acordo com boas práticas de educação financeira e orientações do Banco Central, o conjunto das parcelas mensais de dívidas não deve ultrapassar 30% da renda líquida disponível. Antes de contratar:

- Calcule qual parcela cabe com folga no seu orçamento familiar
- Mantenha uma reserva financeira para despesas inesperadas
- Avalie se antecipar parcelas oferece desconto proporcional nos juros

## Perguntas frequentes

**Posso parcelar um implante dentário mesmo sem limite no cartão?**
Sim. Existem opções de financiamento bancário e parcelamento em boleto que não utilizam o limite do seu cartão de crédito. A concessão depende de análise de crédito.

**Preciso pagar entrada obrigatoriamente?**
Não em todos os casos. Muitas instituições permitem parcelar 100% do orçamento, embora dar uma entrada costume reduzir a taxa de juros e o valor da parcela mensal.

**O parcelamento afeta meu score de crédito?**
Manter as parcelas em dia contribui positivamente para o seu histórico de crédito. Atrasos podem gerar restrições cadastrais nos órgãos de proteção ao crédito.
`,

  'como-planejar-pagamento-tratamento-alto-valor': `
Tratamentos de alto valor — como próteses sobre implantes, reabilitação oral ou cirurgias especializadas — demandam planejamento financeiro consciente para evitar endividamento excessivo.

## Resposta rápida

Para planejar o pagamento de um tratamento de alto valor, inicie pelo diagnóstico da sua capacidade mensal de pagamento: defina uma parcela confortável (máximo 20% a 30% da renda livre), reserve uma entrada sem esgotar sua reserva de emergência e compare o Custo Efetivo Total (CET) das opções disponíveis.

## Passo 1: Entenda o valor total e o que está incluso

Solicite à clínica um orçamento descritivo completo:
- Procedimento cirúrgico ou clínico principal
- Honorários profissionais, materiais, próteses e implantes
- Exames de imagem (tomografias, radiografias panorâmicas)
- Consultas de retorno e eventuais manutenções preventivas

## Passo 2: Calcule sua parcela máxima confortável

Levante suas despesas fixas e variáveis dos últimos 3 meses:
- **Renda Líquida Familiar:** R$ 5.000
- **Despesas Essenciais (Moradia, Alimentação, Saúde):** R$ 3.400
- **Margem de Segurança Livre:** R$ 1.600
- **Parcela Recomendada:** R$ 400 a R$ 600 mensais

## Passo 3: Defina a entrada sem zerar sua reserva

Dar uma entrada é vantajoso porque reduz a base de cálculo dos juros. No entanto, preserve sempre o equivalente a no mínimo 3 meses de despesas básicas em uma aplicação de liquidez diária.

## Passo 4: Compare as alternativas de parcelamento

Ao analisar propostas de crédito ou parcelamento:
- Compare o **CET anual** e não apenas o valor nominal da parcela
- Verifique se a instituição permite amortização antecipada com dedução proporcional de juros (direito garantido pelo CDC)
- Entenda quais são os encargos em caso de atraso temporário

## Perguntas frequentes

**Devo adiar o tratamento para juntar dinheiro à vista?**
Se o procedimento for urgente ou envolver dor e saúde funcional, adiar pode agravar o quadro clínico e encarecer o tratamento futuro. Se for puramente eletivo, guardar parte do dinheiro para dar uma entrada maior pode ser vantajoso.

**Como a Benavera me ajuda nesse planejamento?**
A Benavera analisa suas informações de orçamento, entrada e parcela desejada para conectar você a opções de parcelamento compatíveis com seu momento financeiro.
`,

  'entrada-maior-ou-parcela-menor': `
Na hora de contratar o parcelamento de um tratamento de saúde, surge a dúvida clássica: vale mais a pena dar uma entrada expressiva e reduzir a parcela mensal ou preservar a liquidez financeira?

## Resposta rápida

Dar uma entrada maior diminui o montante financiado, reduzindo o valor dos juros totais e o risco de inadimplência mensal. Preservar o caixa faz sentido quando sua reserva de emergência for reduzida ou quando a diferença de taxa for pequena.

## Quando dar uma entrada maior é a melhor escolha

- Você possui reserva financeira de emergência preservada mesmo após pagar a entrada
- As taxas de juros do parcelamento são elevadas, gerando grande economia no custo total
- Você deseja manter o valor da parcela mensal reduzido para não comprometer o fluxo de caixa

## Quando preservar o caixa é mais prudente

- O pagamento da entrada consumiria toda a sua reserva de segurança
- Sua renda mensal é estável e a parcela cabe tranquilamente no orçamento
- O parcelamento oferecido possui condições promocionais sem juros ou com juros muito baixos

## Simulação comparativa hipotética

| Parâmetro | Cenário A (Entrada Maior) | Cenário B (Entrada Menor) |
|---|---|---|
| Valor do Tratamento | R$ 12.000 | R$ 12.000 |
| Entrada Inicial | R$ 4.000 | R$ 1.000 |
| Saldo Financiado | R$ 8.000 | R$ 11.000 |
| Prazo | 24 meses | 24 meses |
| Juros Totais Estimados | Proporcionalmente Menores | Proporcionalmente Maiores |
| Reserva Pessoal | Parcialmente Utilizada | Preservada |

## Perguntas frequentes

**Posso negociar o valor da entrada diretamente com a clínica?**
Sim. Em muitos casos, clínicas têm flexibilidade para combinar entradas parceladas ou valores personalizados de acordo com a etapa de realização do procedimento.
`,

  'como-comparar-formas-pagamento-tratamento': `
Comparar adequadamente as opções de pagamento disponíveis é essencial para não transformar a conquista de um tratamento de saúde em um problema orçamentário.

## Resposta rápida

O critério fundamental para comparar propostas financeiras é o Custo Efetivo Total (CET), que consolida juros, impostos (IOF) e tarifas administrativas. Além do CET, avalie a flexibilidade de prazos, o impacto no limite do cartão e as regras para quitação antecipada.

## O que compõe o Custo Efetivo Total (CET)?

O CET é a taxa anualizada que reflete o custo integral de uma operação de crédito no Brasil, conforme regulamentado pelo Banco Central (Resolução CMN nº 3.517/2007). Ele inclui:
1. **Taxa de Juros Nominal e Efetiva**
2. **IOF (Imposto sobre Operações Financeiras)**
3. **Tarifas de Cadastro ou Emissão**
4. **Seguros eventualmente agregados à operação**

## Roteiro prático para comparar duas propostas

1. Solicite a planilha de CET ou o resumo de encargos de cada instituição
2. Multiplique o número de parcelas pelo valor mensal e some a entrada para achar o **Custo Total Final**
3. Avalie se o vencimento das parcelas coincide com a data de recebimento do seu salário
4. Confirme se há desconto obrigatório por lei em caso de amortização ou quitação antecipada

## Perguntas frequentes

**Por que duas propostas com a mesma taxa de juros têm parcelas diferentes?**
Porque uma delas pode embutir tarifas administrativas, seguros adicionais ou alíquotas de IOF diferentes, elevando o CET final.
`,

  'por-que-pacientes-desistem-apos-orcamento': `
A perda de pacientes após a apresentação do plano de tratamento é uma das principais dores de gestão e faturamento em clínicas odontológicas e médicas particulares.

## Resposta rápida

Cerca de 70% dos abandonos de orçamento ocorrem não pela recusa clínica do procedimento, mas pela incompatibilidade das formas de pagamento oferecidas com a realidade financeira e o limite bancário do paciente.

## Principais fatores de desistência

1. **Incompatibilidade Financeira:** Parcelas altas demais ou falta de limite no cartão de crédito
2. **Insegurança e Falta de Transparência:** Dúvidas sobre custos extras durante o tratamento
3. **Falta de Alternativas de Pagamento:** Clínicas que só aceitam cartão em poucas vezes ou dinheiro à vista
4. **Ausência de Follow-up Humanizado:** Não acompanhar o paciente nos dias seguintes à consulta

## Como clínicas parceiras Benavera reduzem esse abandono

Ao disponibilizar a Benavera como alternativa de pagamento, a clínica oferece ao paciente a oportunidade de simular parcelamentos que cabem na sua renda, sem que a clínica assuma o risco de crédito ou dependa exclusivamente do limite do cartão.
`,

  'como-clinicas-melhorar-conversao-orcamentos': `
Melhorar a conversão de orçamentos odontológicos e médicos transforma a rentabilidade da clínica sem a necessidade de aumentar os gastos com atração de novos pacientes.

## Resposta rápida

Para elevar a conversão, a clínica deve estruturar a apresentação visual do orçamento, capacitar a recepção/comercial para acolhimento financeiro, oferecer alternativas viáveis de parcelamento e manter um fluxo de acompanhamento (follow-up) respeitoso em até 48 horas.

## Três pilares para aumentar o fechamento de tratamentos

### 1. Clareza na Apresentação Clínica
Explique os benefícios funcionais e estéticos do tratamento antes de falar em valores. O paciente precisa enxergar o valor do procedimento antes de avaliar o preço.

### 2. Diversificação de Formas de Pagamento
Não dependa apenas de maquininhas de cartão com taxas elevadas ou prazos curtos. Alternativas com parcelamentos estendidos viabilizam tratamentos para quem não possui limite alto.

### 3. Processo de Follow-up em 3 Etapas
- **Dia 1 pós-consulta:** Envio do resumo do plano de tratamento e mensagem de agradecimento
- **Dia 3:** Contato amigável para esclarecer dúvidas sobre valores ou condições
- **Dia 7:** Apresentação de alternativas facilitadas para viabilização
`,
};
