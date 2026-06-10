/** SGS 432 — CDI acumulado no ano (% a.a.) · 4391 — CDI acumulado no mês (% a.m.). */
const CDI_ANUAL_SERIES = 432
const CDI_MENSAL_SERIES = 4391
const BCB_ANUAL_URL = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${CDI_ANUAL_SERIES}/dados/ultimos/1?formato=json`
const BCB_MENSAL_URL = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${CDI_MENSAL_SERIES}/dados/ultimos/24?formato=json`
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 h

const FALLBACK_CDI_AA = 14.5
const FALLBACK_CDI_AM = 1.15

const r2 = (n: number) => Math.round(n * 100) / 100

export interface CdiMensal {
  mes: string
  taxaAm: number
}

export interface CdiInfo {
  cdiAnual: number
  dataReferencia: string | null
  fonte: 'bcb' | 'fallback'
}

export interface CdiContext extends CdiInfo {
  mensal: CdiMensal[]
  mensalFonte: 'bcb' | 'fallback'
}

let cache: {
  context: CdiContext
  fetchedAt: number
} | null = null

function parseBcbNumber(val: string | undefined): number {
  return Number(val?.replace(',', '.'))
}

function parseBcbMes(data: string): string {
  const [d, m, y] = data.split('/')
  return `${y}-${m.padStart(2, '0')}`
}

function dedupeMensal(rows: CdiMensal[]): CdiMensal[] {
  const map = new Map<string, number>()
  for (const row of rows) map.set(row.mes, row.taxaAm)
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, taxaAm]) => ({ mes, taxaAm }))
}

function fallbackMensal(cdiAnual: number): CdiMensal[] {
  const taxaAm = Math.pow(1 + cdiAnual / 100, 1 / 12) - 1
  const now = new Date()
  const rows: CdiMensal[] = []
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    rows.push({ mes, taxaAm: r2(taxaAm * 100) })
  }
  return rows
}

/** Busca a taxa CDI anual (% a.a.) mais recente no Banco Central. */
export async function fetchCdiAnual(): Promise<CdiInfo> {
  const ctx = await fetchCdiContext()
  return {
    cdiAnual: ctx.cdiAnual,
    dataReferencia: ctx.dataReferencia,
    fonte: ctx.fonte,
  }
}

/** CDI anual + histórico mensal (% a.m., série 4391) para projeções mês a mês. */
export async function fetchCdiContext(): Promise<CdiContext> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.context
  }

  let cdiAnual = FALLBACK_CDI_AA
  let dataReferencia: string | null = null
  let fonte: CdiInfo['fonte'] = 'fallback'
  let mensal: CdiMensal[] = []
  let mensalFonte: CdiContext['mensalFonte'] = 'fallback'

  try {
    const [anualRows, mensalRows] = await Promise.all([
      $fetch<{ data: string; valor: string }[]>(BCB_ANUAL_URL, { timeout: 8000 }),
      $fetch<{ data: string; valor: string }[]>(BCB_MENSAL_URL, { timeout: 10000 }),
    ])

    const latest = anualRows?.[0]
    const parsedAnual = parseBcbNumber(latest?.valor)
    if (Number.isFinite(parsedAnual) && parsedAnual > 0 && parsedAnual <= 100) {
      cdiAnual = parsedAnual
      dataReferencia = latest.data
      fonte = 'bcb'
    }

    const parsedMensal = (mensalRows ?? [])
      .map(r => ({ mes: parseBcbMes(r.data), taxaAm: parseBcbNumber(r.valor) }))
      .filter(r => r.mes && Number.isFinite(r.taxaAm) && r.taxaAm > 0 && r.taxaAm < 20)

    const deduped = dedupeMensal(parsedMensal)
    if (deduped.length >= 3) {
      mensal = deduped
      mensalFonte = 'bcb'
    }
  } catch {
    // mantém fallbacks
  }

  if (!mensal.length) {
    mensal = fallbackMensal(cdiAnual)
    mensalFonte = 'fallback'
  }

  const context: CdiContext = {
    cdiAnual,
    dataReferencia,
    fonte,
    mensal,
    mensalFonte,
  }

  cache = { context, fetchedAt: Date.now() }
  return context
}

/** Taxa CDI % a.m. para o mês i da projeção (0 = mês mais recente do histórico). */
export function cdiAmParaMesProjecao(mensal: CdiMensal[], monthIndex: number): number {
  if (!mensal.length) return FALLBACK_CDI_AM
  const idx = mensal.length - 1 - (monthIndex % mensal.length)
  return mensal[idx].taxaAm
}

export interface MesForecast {
  saldoAnterior: number
  balance: number
}

/**
 * Projeção de patrimônio aplicando rendimento mensal composto sobre saldo positivo.
 * Taxa efetiva = CDI × multiplicador (ex.: 105% CDI → 1.05).
 */
export function computePatrimonioComRendimento(
  meses: MesForecast[],
  cdiAnualPct: number,
  multiplicadorCdi = 1.05,
): { patrimonios: number[]; taxaAnualEfetiva: number; taxaMensal: number } {
  const taxaAnualEfetiva = cdiAnualPct * multiplicadorCdi
  const taxaMensal = Math.pow(1 + taxaAnualEfetiva / 100, 1 / 12) - 1

  const patrimonios: number[] = []

  for (let i = 0; i < meses.length; i++) {
    let saldo = i === 0 ? meses[i].saldoAnterior : patrimonios[i - 1]
    if (saldo > 0) saldo = r2(saldo * (1 + taxaMensal))
    saldo = r2(saldo + meses[i].balance)
    patrimonios.push(saldo)
  }

  return { patrimonios, taxaAnualEfetiva: r2(taxaAnualEfetiva), taxaMensal }
}
