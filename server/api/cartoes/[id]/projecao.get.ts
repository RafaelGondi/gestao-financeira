import db from '../../../db/index'
import { getRouterParam } from 'h3'
import { transacaoFaturaMonth } from '../../../utils/fatura'

export default defineEventHandler((event) => {
  const cartaoId = Number(getRouterParam(event, 'id'))
  if (!cartaoId || isNaN(cartaoId))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const cartao = db.prepare(`SELECT melhor_data_compra FROM cartoes WHERE id = ?`).get([cartaoId]) as any
  if (!cartao) throw createError({ statusCode: 404, statusMessage: 'Cartão não encontrado' })

  const cutoff = cartao.melhor_data_compra as number
  const now = new Date()
  const nowY = now.getFullYear()
  const nowM = now.getMonth() + 1
  const thisMonthStr = `${nowY}-${String(nowM).padStart(2, '0')}`

  const mesesPagos = new Set<string>(
    (db.prepare(`SELECT mes FROM faturas WHERE cartao_id = ? AND pago = 1`).all([cartaoId]) as any[]).map((r: any) => r.mes)
  )

  const faturaMap = new Map<string, number>()

  function addToFatura(mes: string, valor: number) {
    if (!mesesPagos.has(mes)) {
      faturaMap.set(mes, (faturaMap.get(mes) ?? 0) + valor)
    }
  }

  // One-time purchases: fetch all and resolve to fatura month
  const avulsas = db.prepare(`
    SELECT valor, data FROM transacoes WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 0
  `).all([cartaoId]) as any[]

  for (const t of avulsas) {
    const mes = transacaoFaturaMonth(t.data, cutoff)
    if (mes >= thisMonthStr) addToFatura(mes, t.valor)
  }

  // Fixed/installment transactions
  let hasInfiniteRecurring = false
  const recorrentes = db.prepare(`
    SELECT valor, data_inicio, data_fim, parcelas FROM transacoes
    WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 1
  `).all([cartaoId]) as any[]

  for (const t of recorrentes) {
    const [iy, im, id_] = t.data_inicio.split('-').map(Number)
    const dayP = id_

    if (t.parcelas > 0) {
      for (let i = 0; i < t.parcelas; i++) {
        const iY = iy + Math.floor((im - 1 + i) / 12)
        const iM = ((im - 1 + i) % 12) + 1
        const installDate = `${iY}-${String(iM).padStart(2, '0')}-${String(dayP).padStart(2, '0')}`
        const faturaMes = transacaoFaturaMonth(installDate, cutoff)
        if (faturaMes >= thisMonthStr) addToFatura(faturaMes, t.valor)
      }
    } else if (t.data_fim) {
      let y = nowY, m = nowM
      while (true) {
        const installDate = `${y}-${String(m).padStart(2, '0')}-${String(dayP).padStart(2, '0')}`
        if (installDate > t.data_fim) break
        if (installDate >= t.data_inicio) addToFatura(transacaoFaturaMonth(installDate, cutoff), t.valor)
        m++; if (m > 12) { m = 1; y++ }
        if (y > nowY + 30) break
      }
    } else {
      // Infinite recurring: project 36 months for residual calc
      hasInfiniteRecurring = true
      let y = nowY, m = nowM
      for (let i = 0; i < 36; i++) {
        const installDate = `${y}-${String(m).padStart(2, '0')}-${String(dayP).padStart(2, '0')}`
        if (installDate >= t.data_inicio) addToFatura(transacaoFaturaMonth(installDate, cutoff), t.valor)
        m++; if (m > 12) { m = 1; y++ }
      }
    }
  }

  // Build the 12-month forward projection (always 12 entries, even if zero)
  const projecao12: { mes: string; valor: number }[] = []
  for (let i = 0; i < 12; i++) {
    const y = nowY + Math.floor((nowM - 1 + i) / 12)
    const m = ((nowM - 1 + i) % 12) + 1
    const mes = `${y}-${String(m).padStart(2, '0')}`
    projecao12.push({ mes, valor: faturaMap.get(mes) ?? 0 })
  }

  const meses = [...faturaMap.keys()].sort().filter(m => m >= thisMonthStr)
  const valoresFuturos = meses.map(m => ({ mes: m, valor: faturaMap.get(m) ?? 0 }))

  // Quitação: last future month with value > 0 (null if there are infinite subscriptions)
  const mes_quitacao = hasInfiniteRecurring
    ? null
    : (valoresFuturos.filter(v => v.valor > 0).at(-1)?.mes ?? null)

  // Faturas residuais: uses a 6-month sliding window average as reference
  // A month is residual when its value <= 15% of the window avg OR < R$ 150
  // mes_inicio_residual = first month from which ALL subsequent months are also residual
  let mes_inicio_residual: string | null = null
  const windowValues: number[] = []

  for (const { mes, valor } of valoresFuturos) {
    if (windowValues.length >= 3) {
      const ref = windowValues.slice(-6)
      const avg = ref.reduce((a, b) => a + b, 0) / ref.length
      const isResidual = avg > 0 && (valor <= avg * 0.15 || valor < 150)

      if (isResidual && !mes_inicio_residual) {
        mes_inicio_residual = mes
      } else if (!isResidual && mes_inicio_residual) {
        mes_inicio_residual = null // reset: went back above threshold
      }
    }
    windowValues.push(valor)
  }

  return { mes_quitacao, mes_inicio_residual, projecao12 }
})
