/** SGS 432 — CDI acumulado no ano (% a.a.), série oficial do BCB. */
const CDI_SERIES = 432
const BCB_URL = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${CDI_SERIES}/dados/ultimos/1?formato=json`
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 h

const FALLBACK_CDI_AA = 14.5

let cache: { cdiAnual: number; dataReferencia: string; fetchedAt: number } | null = null

export interface CdiInfo {
  cdiAnual: number
  dataReferencia: string | null
  fonte: 'bcb' | 'fallback'
}

/** Busca a taxa CDI anual (% a.a.) mais recente no Banco Central. */
export async function fetchCdiAnual(): Promise<CdiInfo> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { cdiAnual: cache.cdiAnual, dataReferencia: cache.dataReferencia, fonte: 'bcb' }
  }

  try {
    const rows = await $fetch<{ data: string; valor: string }[]>(BCB_URL, { timeout: 8000 })
    const latest = rows?.[0]
    const cdiAnual = Number(latest?.valor?.replace(',', '.'))

    if (!Number.isFinite(cdiAnual) || cdiAnual <= 0 || cdiAnual > 100) {
      throw new Error('CDI inválido')
    }

    cache = { cdiAnual, dataReferencia: latest.data, fetchedAt: Date.now() }
    return { cdiAnual, dataReferencia: latest.data, fonte: 'bcb' }
  } catch {
    return { cdiAnual: FALLBACK_CDI_AA, dataReferencia: null, fonte: 'fallback' }
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100

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
