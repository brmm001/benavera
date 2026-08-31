import type { ArticleFrontmatter, ArticleCategory } from '@/types';

// ============================================================
// ARTIGOS — CONTEÚDO EDITORIAL
// ============================================================

export const articles: ArticleFrontmatter[] = [
  {
    title: 'Como funciona o parcelamento de um tratamento odontológico?',
    slug: 'parcelamento-tratamento-odontologico',
    description:
      'Entenda como funciona o parcelamento de tratamentos odontológicos, quais são as formas disponíveis e o que considerar antes de escolher.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-08-31',
    author: 'Benavera',
    category: 'formas-de-pagamento',
    keywords: [
      'parcelamento tratamento odontológico',
      'como parcelar implante dentário',
      'tratamento odontológico parcelado',
      'financiamento odontológico',
    ],
    canonical: 'https://benavera.com.br/conteudos/parcelamento-tratamento-odontologico',
    relatedArticles: [
      'como-comparar-formas-pagamento-tratamento',
      'entrada-maior-ou-parcela-menor',
      'como-planejar-pagamento-tratamento-alto-valor',
    ],
    sources: [
      {
        title: 'Resolução CMN nº 4.966/2021 — Concessão de crédito',
        url: 'https://www.bcb.gov.br',
        organization: 'Banco Central do Brasil',
      },
    ],
  },
  {
    title: 'Como planejar o pagamento de um tratamento de alto valor?',
    slug: 'como-planejar-pagamento-tratamento-alto-valor',
    description:
      'Veja como se planejar financeiramente para pagar um tratamento caro, comparar opções e entender o que cabe no seu orçamento antes de contratar qualquer solução.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-08-31',
    author: 'Benavera',
    category: 'planejamento-financeiro',
    keywords: [
      'como pagar tratamento caro',
      'planejamento financeiro tratamento',
      'como pagar tratamento odontológico',
      'como financiar tratamento',
    ],
    canonical: 'https://benavera.com.br/conteudos/como-planejar-pagamento-tratamento-alto-valor',
    relatedArticles: [
      'parcelamento-tratamento-odontologico',
      'entrada-maior-ou-parcela-menor',
      'como-comparar-formas-pagamento-tratamento',
    ],
  },
  {
    title: 'Entrada maior ou parcela menor: o que considerar?',
    slug: 'entrada-maior-ou-parcela-menor',
    description:
      'Entenda quando faz sentido dar uma entrada maior e reduzir as parcelas, e quando é melhor preservar o caixa e distribuir o valor no tempo.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-08-31',
    author: 'Benavera',
    category: 'planejamento-financeiro',
    keywords: [
      'entrada maior ou parcela menor',
      'entrada para tratamento odontológico',
      'quanto dar de entrada tratamento',
      'parcela ou entrada financiamento',
    ],
    canonical: 'https://benavera.com.br/conteudos/entrada-maior-ou-parcela-menor',
    relatedArticles: [
      'como-planejar-pagamento-tratamento-alto-valor',
      'parcelamento-tratamento-odontologico',
    ],
  },
  {
    title: 'Como comparar formas de pagamento de um tratamento?',
    slug: 'como-comparar-formas-pagamento-tratamento',
    description:
      'Saiba quais critérios usar para comparar cartão de crédito, financiamento e outras formas de pagamento antes de contratar para seu tratamento.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-08-31',
    author: 'Benavera',
    category: 'formas-de-pagamento',
    keywords: [
      'cartão ou financiamento tratamento',
      'como comparar formas de pagamento',
      'comparar CET financiamento',
      'melhor forma pagar tratamento',
    ],
    canonical: 'https://benavera.com.br/conteudos/como-comparar-formas-pagamento-tratamento',
    relatedArticles: [
      'parcelamento-tratamento-odontologico',
      'entrada-maior-ou-parcela-menor',
    ],
    sources: [
      {
        title: 'O que é CET (Custo Efetivo Total)',
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
    updatedAt: '2026-08-31',
    author: 'Benavera',
    category: 'para-clinicas',
    keywords: [
      'paciente não fecha orçamento',
      'por que paciente desiste tratamento',
      'abandono de orçamento odontológico',
      'como recuperar paciente orçamento',
    ],
    canonical: 'https://benavera.com.br/conteudos/por-que-pacientes-desistem-apos-orcamento',
    relatedArticles: [
      'como-clinicas-melhorar-conversao-orcamentos',
    ],
  },
  {
    title: 'Como clínicas podem melhorar a conversão de orçamentos?',
    slug: 'como-clinicas-melhorar-conversao-orcamentos',
    description:
      'Estratégias práticas para clínicas odontológicas aumentarem a taxa de fechamento, reduzirem o abandono de orçamentos e melhorarem o processo comercial.',
    publishedAt: '2026-08-31',
    updatedAt: '2026-08-31',
    author: 'Benavera',
    category: 'para-clinicas',
    keywords: [
      'como aumentar conversão clínica odontológica',
      'como melhorar fechamento tratamentos',
      'reduzir abandono orçamento',
      'taxa de conversão odontológica',
    ],
    canonical: 'https://benavera.com.br/conteudos/como-clinicas-melhorar-conversao-orcamentos',
    relatedArticles: [
      'por-que-pacientes-desistem-apos-orcamento',
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
O parcelamento de tratamentos odontológicos funciona de formas distintas dependendo da opção escolhida: parcelamento direto na clínica, uso do cartão de crédito ou financiamento por meio de uma instituição financeira.

## Resposta rápida

O parcelamento de um tratamento odontológico pode acontecer de três formas principais: direto com a clínica (sem juros em alguns casos), via cartão de crédito (limitado ao seu limite disponível) ou por financiamento externo (geralmente com prazos maiores, mas com juros). As condições variam muito de acordo com o valor, a clínica e o perfil do paciente.

## Como funciona o parcelamento direto com a clínica?

Algumas clínicas oferecem parcelamento próprio, geralmente em menos parcelas e sem intermediários. As condições variam muito: algumas cobram entrada e parcelam o restante sem juros por 3 a 6 meses. Outras têm acordos com empresas de parcelamento especializadas para saúde.

**O que observar:**
- Número máximo de parcelas disponíveis
- Necessidade de entrada
- Se há ou não juros embutidos
- O que acontece em caso de inadimplência

## Como funciona o parcelamento no cartão de crédito?

O cartão de crédito é uma das formas mais usadas. Permite parcelar geralmente em até 12 vezes sem juros, dependendo do acordo entre a clínica e a operadora.

**Pontos de atenção:**
- O valor total do tratamento precisa caber no seu limite disponível
- Parcelamento sem juros muitas vezes tem prazo mais curto
- Se houver juros rotativos, o custo pode ser elevado
- Comprometer limite disponível pode afetar outros gastos

## Como funciona o financiamento externo?

O financiamento por instituição financeira envolve um terceiro que paga o valor à clínica e cobra o paciente em parcelas mensais, geralmente com prazos mais longos (12 a 60 meses).

**O que considerar:**
- O Custo Efetivo Total (CET) representa o custo real da operação
- Quanto maior o prazo, maior o total pago
- A aprovação depende de análise de crédito
- Condições variam entre instituições

## Comparação entre formas de pagamento

| Forma | Prazo típico | Principal ponto de atenção |
|-------|-------------|--------------------------|
| Parcelamento direto | 3 a 12 meses | Limites da clínica |
| Cartão de crédito | Até 12 meses | Limite disponível |
| Financiamento externo | 12 a 60 meses | Juros e CET |

## Quanto da renda devo comprometer?

Especialistas em finanças pessoais geralmente recomendam não comprometer mais de 30% da renda disponível com dívidas. Antes de parcelar, avalie:

- Qual parcela cabe no seu orçamento **com conforto**
- Se há outras dívidas em andamento
- Se existe alguma reserva para imprevistos

## Perguntas frequentes

**Posso parcelar um implante dentário?**
Sim. Implantes costumam ser parcelados via cartão, financiamento ou diretamente na clínica. O prazo e as condições variam.

**Preciso de entrada para financiar um tratamento?**
Depende da instituição. Algumas exigem entrada, o que reduz o valor financiado e pode melhorar as condições.

**O parcelamento afeta meu crédito?**
O parcelamento no cartão compromete seu limite. O financiamento gera uma dívida que aparece em consultas de crédito.

## Fontes e referências
`,

  'como-planejar-pagamento-tratamento-alto-valor': `
Tratamentos de alto valor exigem planejamento financeiro cuidadoso. Entender quanto você pode pagar por mês, qual entrada é possível e quais são as formas disponíveis ajuda a tomar uma decisão mais consciente.

## Resposta rápida

Para planejar o pagamento de um tratamento caro, comece pelo seu orçamento: defina qual parcela mensal é sustentável **com conforto**, calcule quanto consegue dar de entrada e só então avalie quais formas de pagamento se encaixam nessa realidade. Comprometer mais do que sua situação permite pode criar dificuldades financeiras maiores no futuro.

## Passo 1: Entenda o valor total do tratamento

Antes de qualquer coisa, tenha clareza sobre o valor completo:
- Valor do procedimento principal
- Consultas e exames incluídos ou não
- Possíveis complementações ou etapas adicionais
- Custos de manutenção após o tratamento

Peça um orçamento detalhado e entenda o que está incluído.

## Passo 2: Defina qual parcela cabe no orçamento

Calcule sua renda disponível após despesas essenciais e avalie o máximo que conseguiria pagar por mês sem comprometer outras necessidades.

**Exemplo:**
- Renda líquida: R$ 4.000
- Despesas fixas essenciais: R$ 2.500
- Margem disponível: R$ 1.500
- Parcela confortável: R$ 500 a R$ 700

## Passo 3: Avalie o que consegue dar de entrada

Uma entrada maior reduz o valor a ser financiado e pode melhorar as condições disponíveis. Mas evite comprometer toda sua reserva de emergência.

**Regra geral:**
Mantenha pelo menos 3 meses de despesas como reserva, mesmo depois de dar a entrada.

## Passo 4: Compare as alternativas disponíveis

Com o valor da parcela e da entrada em mente, avalie:
- Parcelamento direto na clínica
- Cartão de crédito
- Financiamento externo

Compare o Custo Efetivo Total (CET) de cada opção, não apenas a parcela.

## O que considerar antes de contratar

- **CET:** representa o custo real da operação, incluindo juros, tarifas e encargos
- **Prazo:** prazos maiores significam total pago maior
- **Condições de inadimplência:** o que acontece se não conseguir pagar
- **Antecipação:** é possível pagar antes do prazo? Há custo?

## Perguntas frequentes

**Devo esperar juntar o valor total ou financiar?**
Depende da urgência do tratamento, do custo de espera e das condições do financiamento. Não há resposta universal.

**Quanto tempo leva para aprovar um financiamento?**
Varia muito entre as instituições. Pode ser de horas a dias úteis.

**Posso renegociar as condições depois?**
Alguns contratos permitem renegociação ou antecipação. Verifique antes de contratar.

## Fontes e referências
`,

  'entrada-maior-ou-parcela-menor': `
Ao planejar o pagamento de um tratamento, uma das dúvidas mais comuns é se vale mais a pena dar uma entrada maior (reduzindo as parcelas) ou preservar o caixa e distribuir o valor ao longo do tempo.

## Resposta rápida

Dar uma entrada maior reduz o valor financiado, o que tende a diminuir os juros totais pagos. Mas comprometer toda a sua reserva financeira para isso pode ser arriscado. A decisão ideal depende das condições do financiamento, da sua reserva atual e da sua situação de fluxo de caixa mensal.

## Quando dar entrada maior pode fazer sentido

- Você tem reserva financeira além da entrada
- O financiamento tem juros relevantes e prazo longo
- Parcelas menores trariam mais conforto mensal
- Você não prevê necessidade do valor no curto prazo

## Quando preservar o caixa pode fazer mais sentido

- Sua reserva de emergência está comprometida
- A diferença de juros entre dar entrada e não dar é pequena
- Você teria dificuldade de repor a reserva depois
- Há outros compromissos financeiros relevantes nos próximos meses

## Exemplo prático

Tratamento: R$ 15.000

**Cenário A — Entrada de R$ 3.000:**
- Valor financiado: R$ 12.000
- Prazo: 24 meses
- Parcela estimada: varia conforme taxa (exemplo hipotético)

**Cenário B — Entrada de R$ 6.000:**
- Valor financiado: R$ 9.000
- Prazo: 24 meses
- Parcela estimada: proporcionalmente menor

*Os valores reais de parcela dependem das condições e taxas do parceiro financeiro.*

## O que comparar antes de decidir

| Fator | Entrada maior | Entrada menor |
|-------|--------------|---------------|
| Juros totais | Geralmente menor | Geralmente maior |
| Parcela mensal | Menor | Maior |
| Reserva disponível | Reduzida | Preservada |
| Risco de inadimplência | Menor | Depende da parcela |

## Perguntas frequentes

**Existe uma entrada mínima obrigatória?**
Depende da forma de pagamento. Alguns financiamentos exigem, outros não.

**Posso negociar a entrada com a clínica?**
Em muitos casos, sim. Vale perguntar diretamente.

## Fontes e referências
`,

  'como-comparar-formas-pagamento-tratamento': `
Ao planejar o pagamento de um tratamento, você provavelmente terá mais de uma opção disponível. Saber como compará-las com critérios objetivos evita contratar algo que pareça barato mas custe mais no longo prazo.

## Resposta rápida

Para comparar formas de pagamento de um tratamento, o principal critério é o Custo Efetivo Total (CET): ele representa o custo real da operação, incluindo juros, tarifas e encargos. Além disso, avalie o prazo, a necessidade de entrada, o impacto no seu fluxo de caixa e as condições em caso de atraso.

## O que é CET?

O Custo Efetivo Total (CET) é uma taxa que expressa o custo real anual de uma operação de crédito, considerando todos os encargos: juros, tarifas, seguros e outros custos obrigatórios.

Segundo o Banco Central do Brasil, todas as instituições financeiras são obrigadas a informar o CET antes da contratação.

**Por que o CET importa:**
Duas propostas com a mesma taxa de juros mensal podem ter CET diferente dependendo das tarifas cobradas. Compare sempre o CET, não apenas a parcela.

## Como comparar duas propostas

1. Solicite o CET anual de cada proposta
2. Compare o valor total a ser pago (parcela × número de parcelas + entrada)
3. Avalie o impacto da parcela mensal no seu orçamento
4. Verifique as condições de atraso e inadimplência
5. Cheque se há possibilidade de antecipação e qual o custo

## Comparação por forma de pagamento

| Forma | O que observar |
|-------|---------------|
| Cartão de crédito | Limite disponível, prazo sem juros disponível |
| Parcelamento direto | Condições da clínica, número de parcelas |
| Financiamento externo | CET, prazo, condições de aprovação |

## O que não comparar

Evite tomar decisões baseadas apenas na parcela mensal. Uma parcela menor com prazo muito longo pode significar um total pago muito maior.

**Exemplo:**
- R$ 500/mês por 12 meses = R$ 6.000 no total
- R$ 300/mês por 24 meses = R$ 7.200 no total

*Valores hipotéticos para ilustração. Condições reais dependem das taxas aplicadas.*

## Perguntas frequentes

**Cartão de crédito ou financiamento: qual é melhor?**
Depende do valor, do prazo disponível no cartão, do seu limite e das taxas de cada opção. Não há resposta universal.

**O que significa taxa mensal versus anual?**
A taxa anual é uma referência mais completa para comparação. Uma taxa mensal de 3% equivale a aproximadamente 42,6% ao ano (considerando capitalização composta).

**Posso negociar o CET com a instituição?**
Em alguns casos, sim. O perfil de crédito e a relação com a instituição podem influenciar as condições.

## Fontes e referências
`,

  'por-que-pacientes-desistem-apos-orcamento': `
A perda de pacientes após a apresentação do orçamento é um dos principais desafios comerciais de clínicas odontológicas. Entender os motivos reais ajuda a criar respostas mais eficazes.

## Resposta rápida

Os principais motivos que levam pacientes a não fechar tratamentos após receber um orçamento são: forma de pagamento incompatível com a realidade financeira, falta de clareza sobre as condições, necessidade de comparar alternativas e ausência de follow-up. Apenas uma pequena parte das desistências é por falta de interesse no tratamento em si.

## Os principais motivos de abandono

### 1. A forma de pagamento não funciona

É um dos motivos mais frequentes e menos discutidos abertamente. O paciente quer o tratamento, mas as opções disponíveis naquele momento não se encaixam na sua situação: limite do cartão insuficiente, parcelas acima do que consegue pagar ou necessidade de entrada que não tem disponível.

### 2. Insegurança sobre o valor total

Muitos pacientes saem da consulta sem entender exatamente o que estão pagando e o que está incluído. A incerteza gera hesitação.

### 3. Necessidade de comparar

É natural que o paciente queira comparar com outras clínicas. O problema é quando não há um motivo claro para voltar ou um processo de acompanhamento.

### 4. Ausência de follow-up

Sem contato após a consulta, muitos pacientes simplesmente esquecem ou procuram outra solução. O timing do follow-up é crítico.

### 5. Processo de decisão compartilhado

Em muitos casos, o paciente precisa consultar o cônjuge, familiar ou outro responsável antes de decidir. Clínicas que não consideram esse fator perdem oportunidades.

## O que as clínicas podem fazer

- Apresentar claramente as formas de pagamento disponíveis
- Ter um processo de follow-up estruturado
- Criar alternativas para quando a forma de pagamento é a objeção
- Entender o momento de decisão do paciente

## Perguntas frequentes

**Qual o prazo ideal para fazer follow-up?**
Varia, mas contato entre 24 e 72 horas após o orçamento costuma ser mais efetivo. Depois disso, a urgência percebida cai.

**Como abordar o paciente sem parecer invasivo?**
Com uma mensagem objetiva, mostrando que a clínica está disponível para esclarecer dúvidas ou apresentar alternativas. Sem pressão.

## Fontes e referências
`,

  'como-clinicas-melhorar-conversao-orcamentos': `
Aumentar a taxa de conversão de orçamentos é um dos caminhos mais diretos para melhorar a receita de uma clínica sem necessariamente atrair mais pacientes novos.

## Resposta rápida

Para melhorar a conversão de orçamentos, as clínicas precisam atuar em três frentes: apresentação clara do orçamento, processo estruturado de follow-up e alternativas para quando a forma de pagamento é a objeção principal. Pequenas melhorias em cada etapa têm impacto direto no resultado.

## Como calcular sua taxa de conversão atual

**Fórmula básica:**
Taxa de conversão = (Tratamentos fechados ÷ Orçamentos apresentados) × 100

**Exemplo:**
- 80 orçamentos apresentados no mês
- 28 tratamentos fechados
- Taxa de conversão: 35%

Saber esse número é o primeiro passo. Sem medir, não há como melhorar.

## Onde estão as maiores oportunidades?

### Na apresentação do orçamento

- O paciente entende o que está recebendo?
- As formas de pagamento estão claras?
- Há alguma alternativa quando a opção principal não funciona?

### No processo de follow-up

A maioria das clínicas não tem follow-up estruturado. Criar um fluxo simples — mesmo por WhatsApp — já diferencia da maioria.

### Na objeção financeira

Quando o paciente diz que "vai pensar" mas o real motivo é financeiro, ter uma alternativa disponível pode reabrir a conversa.

## Estrutura de follow-up simples

1. **Dia 1 após o orçamento:** mensagem agradecendo a visita e colocando-se à disposição para dúvidas
2. **Dia 3-5:** contato perguntando se há dúvidas sobre o orçamento ou as formas de pagamento
3. **Dia 10-15:** contato oferecendo alternativas ou nova consulta

## O que a Benavera pode fazer nesse contexto

A Benavera pode ser uma etapa adicional no processo: quando o paciente não fecha por causa da forma de pagamento, a clínica oferece o link da Benavera para que ele explore possibilidades. A clínica não precisa se tornar especialista em crédito.

## Perguntas frequentes

**Quantas vezes posso entrar em contato sem ser invasivo?**
Depende do canal e do tom. Duas a três tentativas bem espaçadas, com mensagens respeitosas, raramente são invasivas. A abordagem é mais importante do que a frequência.

**Como saber se o paciente desistiu ou só está pensando?**
Pergunte diretamente, com respeito: "Há alguma dúvida que posso esclarecer?" Isso abre espaço para o paciente revelar a real objeção.

## Fontes e referências
`,
};
