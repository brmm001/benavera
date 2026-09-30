/**
 * Benavera - Motor de Simulacao Financeira para Clinicas
 * Todas as regras financeiras ficam aqui, separadas da interface.
 */

export type Modalidade = "clinica_absorve" | "taxa_repassada" | "sem_juros";
export type RiscoInadimplencia = "financeira" | "clinica";

export interface SimulatorConfig {
  taxa_minima: number;
  taxa_padrao: number;
  taxa_maxima: number;
  taxa_sem_juros: number;
  taxa_risco_financeira: number;
  taxa_risco_clinica: number;
  valor_minimo: number;
  valor_maximo: number;
  juros_6x: number;
  juros_12x: number;
  juros_18x: number;
  juros_24x: number;
  juros_30x: number;
  juros_36x: number;
  juros_48x: number;
  juros_60x: number;
  juros_72x: number;
  parcelas_ativas: number[];
  prazo_recebimento: number;
  custo_funding: number;
  custo_parceiro: number;
  spread_benavera: number;
  outros_custos: number;
}

export interface SimulacaoInput {
  valor_tratamento: number;
  parcelas: number;
  modalidade: Modalidade;
  risco: RiscoInadimplencia;
  taxa_personalizada?: number;
  juros_paciente_personalizado?: number;
}

export interface ResultadoPaciente {
  valor_tratamento: number;
  valor_financiado: number;
  parcelas: number;
  parcela_estimada: number;
  total_pago: number;
  total_juros: number;
  taxa_juros_mensal: number;
  taxa_juros_anual: number;
  juros_aparentes: number;
}

export interface ResultadoClinica {
  valor_tratamento: number;
  taxa_benavera: number;
  custo_operacao: number;
  valor_liquido: number;
  prazo_recebimento: number;
  quem_absorve_taxa: string;
}

export interface ResultadoInterno {
  receita_bruta: number;
  custo_financeiro: number;
  custo_parceiro: number;
  spread: number;
  receita_liquida: number;
  margem_percentual: number;
}

export interface ResultadoSimulacao {
  paciente: ResultadoPaciente;
  clinica: ResultadoClinica;
  interno?: ResultadoInterno;
  modalidade: Modalidade;
  risco: RiscoInadimplencia;
  taxa_total: number;
}

export const DEFAULT_CONFIG: SimulatorConfig = {
  taxa_minima: 3.5,
  taxa_padrao: 3.5,
  taxa_maxima: 7.0,
  taxa_sem_juros: 8.0,
  taxa_risco_financeira: 1.5,
  taxa_risco_clinica: 0.0,
  valor_minimo: 500,
  valor_maximo: 100000,
  juros_6x: 1.49,
  juros_12x: 1.79,
  juros_18x: 1.99,
  juros_24x: 2.19,
  juros_30x: 2.39,
  juros_36x: 2.49,
  juros_48x: 2.69,
  juros_60x: 2.89,
  juros_72x: 2.99,
  parcelas_ativas: [6, 12, 18, 24, 30, 36],
  prazo_recebimento: 2,
  custo_funding: 1.2,
  custo_parceiro: 0.5,
  spread_benavera: 1.8,
  outros_custos: 0.0,
};

export function getTaxaMensal(config: SimulatorConfig, parcelas: number): number {
  const map: Record<number, number> = {
    6: config.juros_6x,
    12: config.juros_12x,
    18: config.juros_18x,
    24: config.juros_24x,
    30: config.juros_30x,
    36: config.juros_36x,
    48: config.juros_48x,
    60: config.juros_60x,
    72: config.juros_72x,
  };
  return (map[parcelas] ?? config.juros_12x) / 100;
}

export function calcularPMT(pv: number, i: number, n: number): number {
  if (i === 0) return pv / n;
  const fator = Math.pow(1 + i, n);
  return pv * (i * fator) / (fator - 1);
}

export function resolverTaxa(
  config: SimulatorConfig,
  modalidade: Modalidade,
  risco: RiscoInadimplencia,
  taxaPersonalizada?: number,
): number {
  const base =
    modalidade === "sem_juros"
      ? config.taxa_sem_juros
      : (taxaPersonalizada ?? config.taxa_padrao);
  const adicionalRisco =
    risco === "financeira" ? config.taxa_risco_financeira : config.taxa_risco_clinica;
  return base + adicionalRisco;
}

export function grossUp(valorLiquido: number, taxaPercentual: number): number {
  const taxa = taxaPercentual / 100;
  if (taxa >= 1) throw new Error("Taxa invalida para gross-up");
  return valorLiquido / (1 - taxa);
}

export function simular(
  input: SimulacaoInput,
  config: SimulatorConfig,
  incluirInterno = false,
): ResultadoSimulacao {
  const { valor_tratamento, parcelas, modalidade, risco, taxa_personalizada, juros_paciente_personalizado } = input;
  const taxa_total = resolverTaxa(config, modalidade, risco, taxa_personalizada);
  const taxa_decimal = taxa_total / 100;
  
  // Taxa de juros mensal para o paciente
  const taxa_mensal = modalidade === "sem_juros"
    ? 0
    : (juros_paciente_personalizado !== undefined
        ? juros_paciente_personalizado / 100
        : getTaxaMensal(config, parcelas));

  let valor_financiado: number;
  let custo_operacao: number;
  let valor_liquido_clinica: number;
  let juros_aparentes = 0;
  let quem_absorve_taxa: string;

  switch (modalidade) {
    case "clinica_absorve": {
      valor_financiado = valor_tratamento;
      custo_operacao = valor_financiado * taxa_decimal;
      valor_liquido_clinica = valor_financiado - custo_operacao;
      quem_absorve_taxa = "Clinica";
      break;
    }
    case "taxa_repassada": {
      custo_operacao = valor_tratamento * taxa_decimal;
      valor_financiado = valor_tratamento + custo_operacao;
      valor_liquido_clinica = valor_tratamento;
      quem_absorve_taxa = "Paciente (via financiamento)";
      break;
    }
    case "sem_juros": {
      valor_financiado = valor_tratamento;
      custo_operacao = valor_financiado * taxa_decimal;
      valor_liquido_clinica = valor_financiado - custo_operacao;
      quem_absorve_taxa = "Clinica";
      break;
    }
    default: {
      valor_financiado = valor_tratamento;
      custo_operacao = 0;
      valor_liquido_clinica = valor_tratamento;
      quem_absorve_taxa = "Clinica";
    }
  }

  let parcela_estimada: number;
  if (modalidade === "sem_juros" || taxa_mensal === 0) {
    parcela_estimada = valor_financiado / parcelas;
  } else {
    parcela_estimada = calcularPMT(valor_financiado, taxa_mensal, parcelas);
  }

  const total_pago =
    (modalidade === "sem_juros" || taxa_mensal === 0) ? valor_financiado : parcela_estimada * parcelas;

  const total_juros = Math.max(0, total_pago - valor_financiado);
  const taxa_juros_mensal = taxa_mensal * 100;
  const taxa_juros_anual = taxa_mensal > 0 ? (Math.pow(1 + taxa_mensal, 12) - 1) * 100 : 0;

  let interno: ResultadoInterno | undefined;
  if (incluirInterno) {
    const receita_bruta = custo_operacao;
    const custo_financeiro = valor_financiado * (config.custo_funding / 100);
    const custo_parceiro_valor = valor_financiado * (config.custo_parceiro / 100);
    const outros = valor_financiado * (config.outros_custos / 100);
    const receita_liquida = receita_bruta - custo_financeiro - custo_parceiro_valor - outros;
    const margem_percentual =
      receita_bruta > 0 ? (receita_liquida / receita_bruta) * 100 : 0;

    interno = {
      receita_bruta,
      custo_financeiro,
      custo_parceiro: custo_parceiro_valor,
      spread: valor_financiado * (config.spread_benavera / 100),
      receita_liquida,
      margem_percentual,
    };
  }

  return {
    paciente: {
      valor_tratamento,
      valor_financiado,
      parcelas,
      parcela_estimada,
      total_pago,
      total_juros,
      taxa_juros_mensal,
      taxa_juros_anual,
      juros_aparentes,
    },
    clinica: {
      valor_tratamento,
      taxa_benavera: taxa_total,
      custo_operacao,
      valor_liquido: valor_liquido_clinica,
      prazo_recebimento: config.prazo_recebimento,
      quem_absorve_taxa,
    },
    interno,
    modalidade,
    risco,
    taxa_total,
  };
}

export interface SimuladorReversoInput {
  valor_liquido_desejado: number;
  modalidade: Modalidade;
  risco: RiscoInadimplencia;
  parcelas: number;
}

export function simularReverso(
  input: SimuladorReversoInput,
  config: SimulatorConfig,
): { valor_tratamento: number; resultado: ResultadoSimulacao } {
  const { valor_liquido_desejado, modalidade, risco, parcelas } = input;
  const taxa_total = resolverTaxa(config, modalidade, risco);
  const valor_tratamento = grossUp(valor_liquido_desejado, taxa_total);
  const resultado = simular(
    { valor_tratamento, parcelas, modalidade, risco },
    config,
  );
  return { valor_tratamento, resultado };
}

export interface AlternativaPrazo {
  parcelas: number;
  parcela_estimada: number;
  total_pago: number;
  taxa_mensal: number;
}

export function calcularPrazosPorParcela(
  valor_tratamento: number,
  parcela_maxima: number,
  modalidade: Modalidade,
  risco: RiscoInadimplencia,
  config: SimulatorConfig,
): AlternativaPrazo[] {
  const alternativas: AlternativaPrazo[] = [];
  for (const parcelas of config.parcelas_ativas) {
    const resultado = simular({ valor_tratamento, parcelas, modalidade, risco }, config);
    const { parcela_estimada, total_pago } = resultado.paciente;
    if (parcela_estimada <= parcela_maxima * 1.1) {
      alternativas.push({
        parcelas,
        parcela_estimada,
        total_pago,
        taxa_mensal: getTaxaMensal(config, parcelas) * 100,
      });
    }
  }
  return alternativas;
}

export interface ComparativoModalidades {
  clinica_absorve: ResultadoSimulacao;
  taxa_repassada: ResultadoSimulacao;
  sem_juros: ResultadoSimulacao;
}

export function compararModalidades(
  valor_tratamento: number,
  parcelas: number,
  risco: RiscoInadimplencia,
  config: SimulatorConfig,
  juros_paciente_personalizado?: number,
): ComparativoModalidades {
  return {
    clinica_absorve: simular({ valor_tratamento, parcelas, modalidade: "clinica_absorve", risco, juros_paciente_personalizado }, config),
    taxa_repassada: simular({ valor_tratamento, parcelas, modalidade: "taxa_repassada", risco, juros_paciente_personalizado }, config),
    sem_juros: simular({ valor_tratamento, parcelas, modalidade: "sem_juros", risco }, config),
  };
}

export interface ParcelaDetalhe {
  numero: number;
  valorParcela: number;
  amortizacao: number;
  juros: number;
  saldoDevedor: number;
}

export function gerarTabelaAmortizacao(
  valorFinanciado: number,
  taxaMensalPercentual: number,
  parcelas: number,
): ParcelaDetalhe[] {
  const i = taxaMensalPercentual / 100;
  const pmt = i === 0 ? valorFinanciado / parcelas : calcularPMT(valorFinanciado, i, parcelas);
  let saldo = valorFinanciado;
  const cronograma: ParcelaDetalhe[] = [];

  for (let n = 1; n <= parcelas; n++) {
    const jurosParcela = i === 0 ? 0 : saldo * i;
    const amortizacao = pmt - jurosParcela;
    saldo = Math.max(0, saldo - amortizacao);
    cronograma.push({
      numero: n,
      valorParcela: pmt,
      amortizacao,
      juros: jurosParcela,
      saldoDevedor: saldo,
    });
  }

  return cronograma;
}
