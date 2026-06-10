import type { CdiContext } from './cdi'
import { cdiAmParaMesProjecao } from './cdi'
import { findBank } from './banks'
import { resolveInstituicaoGrupoKey } from './patrimonio-instituicao'

export type PatrimonioTipo = 'fgts' | 'consorcio' | 'renda_fixa' | 'caixinha' | 'outro'
export type AporteModo = 'nenhum' | 'fixo_mensal' | 'manual'
export type RendimentoModo = 'nenhum' | 'taxa_anual' | 'cdi_pct' | 'tr_mais' | 'cdi_faixas'
export type CdiDiasBase = 'uteis' | 'corridos'

export interface PatrimonioInput {
  id?: number
  saldo_atual: number
  valor_alvo: number | null
  aporte_modo: AporteModo
  aporte_valor: number | null
  rendimento_modo: RendimentoModo
  rendimento_valor: number | null
  instituicao_key: string | null
  grupo_rendimento: string | null
  cdi_faixa_teto: number | null
  cdi_pct_ate_teto: number | null
  cdi_pct_acima: number | null
  cdi_dias_base: CdiDiasBase | null
  data_fim: string | null
}

export interface FaixasDetalhe {
  grupo: string
  saldoGrupo: number
  rendendoAteTeto: number
  rendendoAcimaTeto: number
  pctAteTeto: number
  pctAcimaTeto: number
  teto: number
}

export interface PatrimonioProjecao {
  meses6: number
  meses12: number
  meses24: number
  taxaAnualEfetiva: number | null
  pctAlvo: number | null
  faixas?: FaixasDetalhe
}

export interface PatrimonioMesSerie {
  month: string
  saldo: number
  monthIndex: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

const DIAS_ANO: Record<CdiDiasBase, number> = { uteis: 252, corridos: 365 }

export function resolveCdiDiasBase(base: CdiDiasBase | null | undefined): CdiDiasBase {
  return base === 'corridos' ? 'corridos' : 'uteis'
}

function taxaMensalDeAnual(taxaAnualPct: number): number {
  return Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1
}

/**
 * Taxa mensal equivalente do CDI com capitalização diária.
 * Dias úteis: 252 dias/ano · dias corridos: 365 dias/ano (inclui fim de semana e feriado).
 */
export function taxaMensalCdi(
  cdiAnualPct: number,
  pctDoCdi: number,
  diasBase: CdiDiasBase = 'uteis',
): number {
  const taxaAnualEfetiva = cdiAnualPct * (pctDoCdi / 100)
  const diasAno = DIAS_ANO[diasBase]
  const diasMes = diasAno / 12
  const taxaDiaria = Math.pow(1 + taxaAnualEfetiva / 100, 1 / diasAno) - 1
  return Math.pow(1 + taxaDiaria, diasMes) - 1
}

/**
 * Taxa de rendimento no mês a partir do CDI % a.m. do BCB (série 4391).
 * dias úteis: usa a taxa mensal oficial · dias corridos: escala 365/252.
 */
export function taxaMensalFromCdiAm(
  cdiAmPct: number,
  pctDoCdi: number,
  diasBase: CdiDiasBase = 'uteis',
): number {
  const fator = pctDoCdi / 100
  if (diasBase === 'corridos') {
    return Math.pow(1 + (cdiAmPct / 100) * fator, 365 / 252) - 1
  }
  return (cdiAmPct / 100) * fator
}

/** Taxa mensal efetiva a partir do modo de rendimento configurado (item isolado). */
export function taxaMensalEfetiva(
  rendimento_modo: RendimentoModo,
  rendimento_valor: number | null,
  cdi: CdiContext,
  cdiDiasBase: CdiDiasBase = 'uteis',
): { taxaMensal: number; taxaAnualEfetiva: number | null } {
  if (rendimento_modo === 'nenhum' || (rendimento_modo !== 'cdi_faixas' && rendimento_valor == null)) {
    return { taxaMensal: 0, taxaAnualEfetiva: null }
  }

  switch (rendimento_modo) {
    case 'taxa_anual': {
      const taxaAnualEfetiva = rendimento_valor!
      return { taxaMensal: taxaMensalDeAnual(taxaAnualEfetiva), taxaAnualEfetiva: r2(taxaAnualEfetiva) }
    }
    case 'cdi_pct': {
      const taxaAnualEfetiva = cdi.cdiAnual * (rendimento_valor! / 100)
      const cdiAm = cdiAmParaMesProjecao(cdi.mensal, 0)
      return {
        taxaMensal: taxaMensalFromCdiAm(cdiAm, rendimento_valor!, cdiDiasBase),
        taxaAnualEfetiva: r2(taxaAnualEfetiva),
      }
    }
    case 'tr_mais': {
      const trAa = 0.5
      const taxaAnualEfetiva = trAa + rendimento_valor!
      return { taxaMensal: taxaMensalDeAnual(taxaAnualEfetiva), taxaAnualEfetiva: r2(taxaAnualEfetiva) }
    }
    default:
      return { taxaMensal: 0, taxaAnualEfetiva: null }
  }
}

function mesesAteDataFim(dataFim: string | null, from: Date): number | null {
  if (!dataFim) return null
  const [y, m] = dataFim.split('-').map(Number)
  const end = new Date(y, m - 1, 1)
  const start = new Date(from.getFullYear(), from.getMonth(), 1)
  const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  return Math.max(diff, 0)
}

function limiteMesesItem(item: PatrimonioInput, numMeses: number, from: Date): number {
  const limite = mesesAteDataFim(item.data_fim, from)
  return limite != null ? Math.min(numMeses, limite) : numMeses
}

function aporteMensal(item: PatrimonioInput): number {
  return item.aporte_modo === 'fixo_mensal' ? (item.aporte_valor ?? 0) : 0
}

/** Juros mensais sobre saldo total com faixas de CDI (ex.: MP 120% até R$ 10k). */
export function jurosMensalCdiFaixas(
  saldoTotal: number,
  cdiAmPct: number,
  teto: number,
  pctAteTeto: number,
  pctAcimaTeto: number,
  diasBase: CdiDiasBase = 'uteis',
): number {
  if (saldoTotal <= 0) return 0

  const parteAte = Math.min(saldoTotal, teto)
  const parteAcima = Math.max(saldoTotal - teto, 0)
  const taxaAte = taxaMensalFromCdiAm(cdiAmPct, pctAteTeto, diasBase)
  const taxaAcima = taxaMensalFromCdiAm(cdiAmPct, pctAcimaTeto, diasBase)

  return r2(parteAte * taxaAte + parteAcima * taxaAcima)
}

export function taxaAnualEfetivaCdiFaixas(
  saldoTotal: number,
  cdi: CdiContext,
  teto: number,
  pctAteTeto: number,
  pctAcimaTeto: number,
): number | null {
  if (saldoTotal <= 0) return null
  const pctMedio = (Math.min(saldoTotal, teto) / saldoTotal) * pctAteTeto
    + (Math.max(saldoTotal - teto, 0) / saldoTotal) * pctAcimaTeto
  return r2(cdi.cdiAnual * (pctMedio / 100))
}

export function faixasDetalheAtual(
  item: PatrimonioInput,
  saldoGrupo: number,
): FaixasDetalhe | undefined {
  if (item.rendimento_modo !== 'cdi_faixas') return undefined
  const grupoNome = item.instituicao_key?.trim()
    ? (findBank(item.instituicao_key)?.name ?? item.instituicao_key)
    : item.grupo_rendimento?.trim()
  if (!grupoNome) return undefined
  const teto = item.cdi_faixa_teto ?? 0
  const pctAte = item.cdi_pct_ate_teto ?? 0
  const pctAcima = item.cdi_pct_acima ?? 0

  return {
    grupo: grupoNome,
    saldoGrupo: r2(saldoGrupo),
    rendendoAteTeto: r2(Math.min(saldoGrupo, teto)),
    rendendoAcimaTeto: r2(Math.max(saldoGrupo - teto, 0)),
    pctAteTeto: pctAte,
    pctAcimaTeto: pctAcima,
    teto,
  }
}

interface MembroGrupo {
  id: number
  item: PatrimonioInput
}

function chaveGrupo(item: PatrimonioInput): string | null {
  if (item.rendimento_modo !== 'cdi_faixas') return null
  return resolveInstituicaoGrupoKey(item)
}

function configFaixas(item: PatrimonioInput) {
  return {
    teto: item.cdi_faixa_teto ?? 0,
    pctAte: item.cdi_pct_ate_teto ?? 100,
    pctAcima: item.cdi_pct_acima ?? 100,
  }
}

/** Simula N meses para um grupo de cofrinhos com faixas compartilhadas. */
function projetarGrupoFaixas(
  membros: MembroGrupo[],
  numMeses: number,
  cdi: CdiContext,
  from: Date,
): Map<number, number> {
  const saldos = new Map<number, number>()
  for (const m of membros) {
    saldos.set(m.id, m.item.saldo_atual)
  }

  const ref = membros[0].item
  const { teto, pctAte, pctAcima } = configFaixas(ref)
  const diasBase = resolveCdiDiasBase(ref.cdi_dias_base)
  const meses = Math.min(
    numMeses,
    ...membros.map(m => limiteMesesItem(m.item, numMeses, from)),
  )

  for (let i = 0; i < meses; i++) {
    const total = [...saldos.values()].reduce((s, v) => s + v, 0)
    if (total > 0) {
      const cdiAm = cdiAmParaMesProjecao(cdi.mensal, i)
      const juros = jurosMensalCdiFaixas(total, cdiAm, teto, pctAte, pctAcima, diasBase)
      for (const [id, saldo] of saldos) {
        const share = saldo / total
        saldos.set(id, r2(saldo + juros * share))
      }
    }
    for (const m of membros) {
      const id = m.id
      saldos.set(id, r2((saldos.get(id) ?? 0) + aporteMensal(m.item)))
    }
  }

  return saldos
}

/** Projeção de saldo após N meses (juros compostos + aporte fixo mensal). */
export function projetarSaldo(
  item: PatrimonioInput,
  numMeses: number,
  cdi: CdiContext,
  from = new Date(),
): number {
  if (item.rendimento_modo === 'cdi_faixas') {
    const id = item.id ?? 0
    const map = projetarGrupoFaixas([{ id, item }], numMeses, cdi, from)
    return map.get(id) ?? item.saldo_atual
  }

  const meses = limiteMesesItem(item, numMeses, from)
  const diasBase = resolveCdiDiasBase(item.cdi_dias_base)
  const aporte = aporteMensal(item)
  const usaCdiMensal = item.rendimento_modo === 'cdi_pct' && item.rendimento_valor != null
  const taxaFixa = !usaCdiMensal
    ? taxaMensalEfetiva(item.rendimento_modo, item.rendimento_valor, cdi, diasBase).taxaMensal
    : 0

  let saldo = item.saldo_atual
  for (let i = 0; i < meses; i++) {
    if (saldo > 0) {
      let taxaMensal = taxaFixa
      if (usaCdiMensal) {
        const cdiAm = cdiAmParaMesProjecao(cdi.mensal, i)
        taxaMensal = taxaMensalFromCdiAm(cdiAm, item.rendimento_valor!, diasBase)
      }
      if (taxaMensal > 0) saldo = r2(saldo * (1 + taxaMensal))
    }
    saldo = r2(saldo + aporte)
  }
  return saldo
}

export function computePatrimonioProjecao(
  item: PatrimonioInput,
  cdi: CdiContext,
  opts?: { saldoGrupo?: number; projecaoGrupo?: Map<number, { m6: number; m12: number; m24: number }> },
): PatrimonioProjecao {
  const pctAlvo = item.valor_alvo && item.valor_alvo > 0
    ? Math.min((item.saldo_atual / item.valor_alvo) * 100, 100)
    : null

  if (item.rendimento_modo === 'cdi_faixas') {
    const saldoGrupo = opts?.saldoGrupo ?? item.saldo_atual
    const pg = item.id != null ? opts?.projecaoGrupo?.get(item.id) : undefined
    const { teto, pctAte, pctAcima } = configFaixas(item)
    return {
      meses6: pg?.m6 ?? projetarSaldo(item, 6, cdi),
      meses12: pg?.m12 ?? projetarSaldo(item, 12, cdi),
      meses24: pg?.m24 ?? projetarSaldo(item, 24, cdi),
      taxaAnualEfetiva: taxaAnualEfetivaCdiFaixas(saldoGrupo, cdi, teto, pctAte, pctAcima),
      pctAlvo: pctAlvo != null ? r2(pctAlvo) : null,
      faixas: faixasDetalheAtual(item, saldoGrupo),
    }
  }

  const { taxaAnualEfetiva } = taxaMensalEfetiva(
    item.rendimento_modo,
    item.rendimento_valor,
    cdi,
    resolveCdiDiasBase(item.cdi_dias_base),
  )

  return {
    meses6: projetarSaldo(item, 6, cdi),
    meses12: projetarSaldo(item, 12, cdi),
    meses24: projetarSaldo(item, 24, cdi),
    taxaAnualEfetiva,
    pctAlvo: pctAlvo != null ? r2(pctAlvo) : null,
  }
}

/** Calcula projeções considerando grupos de CDI por faixas (cofrinhos somados). */
export function computeAllPatrimonioProjecoes(
  itens: PatrimonioInput[],
  cdi: CdiContext,
  from = new Date(),
): Map<number, PatrimonioProjecao> {
  const result = new Map<number, PatrimonioProjecao>()
  const grupos = new Map<string, MembroGrupo[]>()

  for (const item of itens) {
    const chave = chaveGrupo(item)
    if (chave && item.id != null) {
      const lista = grupos.get(chave) ?? []
      lista.push({ id: item.id, item })
      grupos.set(chave, lista)
    }
  }

  const projecaoGrupo = new Map<number, { m6: number; m12: number; m24: number }>()
  const saldoGrupoPorItem = new Map<number, number>()

  for (const [, membros] of grupos) {
    const saldoGrupo = r2(membros.reduce((s, m) => s + m.item.saldo_atual, 0))
    const m6 = projetarGrupoFaixas(membros, 6, cdi, from)
    const m12 = projetarGrupoFaixas(membros, 12, cdi, from)
    const m24 = projetarGrupoFaixas(membros, 24, cdi, from)

    for (const m of membros) {
      saldoGrupoPorItem.set(m.id, saldoGrupo)
      projecaoGrupo.set(m.id, {
        m6: m6.get(m.id) ?? m.item.saldo_atual,
        m12: m12.get(m.id) ?? m.item.saldo_atual,
        m24: m24.get(m.id) ?? m.item.saldo_atual,
      })
    }
  }

  for (const item of itens) {
    if (item.id == null) continue
    result.set(item.id, computePatrimonioProjecao(item, cdi, {
      saldoGrupo: saldoGrupoPorItem.get(item.id),
      projecaoGrupo,
    }))
  }

  return result
}

function monthKey(from: Date, offset: number): string {
  const d = new Date(from.getFullYear(), from.getMonth() + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Série mensal de saldo projetado (mês 0 = saldo atual). */
export function computePatrimonioSerieMensal(
  item: PatrimonioInput,
  numMeses: number,
  cdi: CdiContext,
  opts?: { grupoMembros?: MembroGrupo[] },
  from = new Date(),
): PatrimonioMesSerie[] {
  const meses = Math.max(0, Math.min(numMeses, 36))
  const serie: PatrimonioMesSerie[] = []
  const membros = opts?.grupoMembros

  for (let i = 0; i <= meses; i++) {
    let saldo: number
    if (item.rendimento_modo === 'cdi_faixas' && membros && membros.length > 1 && item.id != null) {
      const map = projetarGrupoFaixas(membros, i, cdi, from)
      saldo = map.get(item.id) ?? item.saldo_atual
    } else {
      saldo = i === 0 ? item.saldo_atual : projetarSaldo(item, i, cdi, from)
    }
    serie.push({ month: monthKey(from, i), saldo: r2(saldo), monthIndex: i })
  }

  return serie
}

export const PRESETS_TIPO: Record<PatrimonioTipo, Partial<{
  icone: string
  cor: string
  aporte_modo: AporteModo
  rendimento_modo: RendimentoModo
  rendimento_valor: number
  grupo_rendimento: string
  cdi_faixa_teto: number
  cdi_pct_ate_teto: number
  cdi_pct_acima: number
  incluir_em_totais: boolean
}>> = {
  fgts: {
    icone: 'i-lucide-shield-check',
    cor: '#22c55e',
    aporte_modo: 'fixo_mensal',
    rendimento_modo: 'tr_mais',
    rendimento_valor: 3,
    incluir_em_totais: false,
  },
  consorcio: {
    icone: 'i-lucide-users',
    cor: '#3b82f6',
    aporte_modo: 'fixo_mensal',
    rendimento_modo: 'nenhum',
    incluir_em_totais: false,
  },
  renda_fixa: {
    icone: 'i-lucide-landmark',
    cor: '#6366f1',
    aporte_modo: 'manual',
    rendimento_modo: 'taxa_anual',
    rendimento_valor: 12,
    incluir_em_totais: false,
  },
  caixinha: {
    icone: 'i-lucide-piggy-bank',
    cor: '#f97316',
    aporte_modo: 'manual',
    rendimento_modo: 'cdi_pct',
    rendimento_valor: 100,
    incluir_em_totais: false,
  },
  outro: {
    icone: 'i-lucide-trending-up',
    cor: '#6366f1',
    aporte_modo: 'nenhum',
    rendimento_modo: 'nenhum',
    incluir_em_totais: false,
  },
}

export const PRESET_MERCADO_PAGO_FAIXAS = {
  rendimento_modo: 'cdi_faixas' as RendimentoModo,
  instituicao_key: 'mercadopago',
  grupo_rendimento: 'Mercado Pago',
  cdi_faixa_teto: 10000,
  cdi_pct_ate_teto: 120,
  cdi_pct_acima: 100,
  cdi_dias_base: 'corridos' as CdiDiasBase,
}
