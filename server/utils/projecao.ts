import db from '../db/index'
import { transacaoFaturaMonth } from './fatura'

export interface ProjecaoMes { mes: string; valor: number }
export interface ProjecaoResult {
  mes_quitacao: string | null
  mes_inicio_residual: string | null
  projecao12: ProjecaoMes[]
}

export function calcProjecaoCartao(cartaoId: number): ProjecaoResult {
  const cartao = db.prepare(`SELECT melhor_data_compra FROM cartoes WHERE id = ?`).get([cartaoId]) as any
  if (!cartao) return { mes_quitacao: null, mes_inicio_residual: null, projecao12: [] }

  const cutoff = cartao.melhor_data_compra as number
  const now = new Date()
  const nowY = now.getFullYear()
  const nowM = now.getMonth() + 1
  const thisMonthStr = `${nowY}-${String(nowM).padStart(2, '0')}`

  const mesesPagos = new Set<string>(
    (db.prepare(`SELECT mes FROM faturas WHERE cartao_id = ? AND pago = 1`).all([cartaoId]) as any[]).map((r: any) => r.mes)
  )

  const faturaMap = new Map<string, number>()
  function add(mes: string, valor: number) {
    if (!mesesPagos.has(mes)) faturaMap.set(mes, (faturaMap.get(mes) ?? 0) + valor)
  }

  let hasInfinite = false

  for (const t of db.prepare(`SELECT valor, data FROM transacoes WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 0`).all([cartaoId]) as any[]) {
    const mes = transacaoFaturaMonth(t.data, cutoff)
    if (mes >= thisMonthStr) add(mes, t.valor)
  }

  for (const t of db.prepare(`SELECT valor, data_inicio, data_fim, parcelas FROM transacoes WHERE tipo = 'despesa' AND cartao_id = ? AND fixa = 1`).all([cartaoId]) as any[]) {
    const [iy, im, id_] = t.data_inicio.split('-').map(Number)
    const dayP = id_
    if (t.parcelas > 0) {
      for (let i = 0; i < t.parcelas; i++) {
        const iY = iy + Math.floor((im - 1 + i) / 12)
        const iM = ((im - 1 + i) % 12) + 1
        const d = `${iY}-${String(iM).padStart(2, '0')}-${String(dayP).padStart(2, '0')}`
        const fm = transacaoFaturaMonth(d, cutoff)
        if (fm >= thisMonthStr) add(fm, t.valor)
      }
    } else if (t.data_fim) {
      let y = nowY, m = nowM
      while (true) {
        const d = `${y}-${String(m).padStart(2, '0')}-${String(dayP).padStart(2, '0')}`
        if (d > t.data_fim) break
        if (d >= t.data_inicio) add(transacaoFaturaMonth(d, cutoff), t.valor)
        m++; if (m > 12) { m = 1; y++ }
        if (y > nowY + 30) break
      }
    } else {
      hasInfinite = true
      let y = nowY, m = nowM
      for (let i = 0; i < 36; i++) {
        const d = `${y}-${String(m).padStart(2, '0')}-${String(dayP).padStart(2, '0')}`
        if (d >= t.data_inicio) add(transacaoFaturaMonth(d, cutoff), t.valor)
        m++; if (m > 12) { m = 1; y++ }
      }
    }
  }

  const projecao12: ProjecaoMes[] = []
  for (let i = 0; i < 12; i++) {
    const y = nowY + Math.floor((nowM - 1 + i) / 12)
    const m = ((nowM - 1 + i) % 12) + 1
    const mes = `${y}-${String(m).padStart(2, '0')}`
    projecao12.push({ mes, valor: faturaMap.get(mes) ?? 0 })
  }

  const futuros = [...faturaMap.keys()].sort().filter(m => m >= thisMonthStr).map(m => ({ mes: m, valor: faturaMap.get(m)! }))
  const mes_quitacao = hasInfinite ? null : (futuros.filter(v => v.valor > 0).at(-1)?.mes ?? null)

  let mes_inicio_residual: string | null = null
  const win: number[] = []
  for (const { mes, valor } of futuros) {
    if (win.length >= 3) {
      const ref = win.slice(-6)
      const avg = ref.reduce((a, b) => a + b, 0) / ref.length
      const residual = avg > 0 && (valor <= avg * 0.15 || valor < 150)
      if (residual && !mes_inicio_residual) mes_inicio_residual = mes
      else if (!residual && mes_inicio_residual) mes_inicio_residual = null
    }
    win.push(valor)
  }

  return { mes_quitacao, mes_inicio_residual, projecao12 }
}
