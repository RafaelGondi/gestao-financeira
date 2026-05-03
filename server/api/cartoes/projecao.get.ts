import db from '../../db/index'
import { calcProjecaoCartao } from '../../utils/projecao'

export default defineEventHandler(() => {
  const cartoes = db.prepare(`SELECT id FROM cartoes`).all() as { id: number }[]

  if (!cartoes.length) {
    return { mes_quitacao: null, mes_inicio_residual: null, projecao12: [] }
  }

  const results = cartoes.map(c => calcProjecaoCartao(c.id))

  // Aggregate projecao12: sum values for each month
  const monthMap = new Map<string, number>()
  for (const r of results) {
    for (const { mes, valor } of r.projecao12) {
      monthMap.set(mes, (monthMap.get(mes) ?? 0) + valor)
    }
  }

  const projecao12 = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ mes, valor }))

  // Aggregate mes_quitacao: null if any card has infinite recurring
  const hasInfinite = results.some(r => {
    if (r.mes_quitacao !== null) return false
    // null mes_quitacao means either infinite OR no future charges
    // check if there are non-zero future values
    return r.projecao12.some(p => p.valor > 0)
  })

  let mes_quitacao: string | null = null
  if (!hasInfinite) {
    const candidates = results.map(r => r.mes_quitacao).filter(Boolean) as string[]
    mes_quitacao = candidates.length ? candidates.sort().at(-1)! : null
  }

  // Recompute mes_inicio_residual from aggregated values
  const now = new Date()
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const futuros = projecao12.filter(p => p.mes >= thisMonthStr)

  let mes_inicio_residual: string | null = null
  const win: number[] = []
  for (const { mes, valor } of futuros) {
    if (win.length >= 3) {
      const ref = win.slice(-6)
      const avg = ref.reduce((a, b) => a + b, 0) / ref.length
      const isResidual = avg > 0 && (valor <= avg * 0.15 || valor < 150)
      if (isResidual && !mes_inicio_residual) mes_inicio_residual = mes
      else if (!isResidual && mes_inicio_residual) mes_inicio_residual = null
    }
    win.push(valor)
  }

  return { mes_quitacao, mes_inicio_residual, projecao12 }
})
