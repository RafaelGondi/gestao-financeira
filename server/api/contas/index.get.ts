import db from '../../db/index'

interface Conta {
  id: number
  nome: string
  banco: string
  banco_key: string
  saldo_inicial: number
}

interface Transacao {
  valor: number
  tipo: string
  fixa: number
  data: string
  data_inicio: string | null
  data_fim: string | null
  pago: number
}

interface Transferencia {
  valor: number
  data: string
  conta_origem_id: number
  conta_destino_id: number
}

interface FaturaPaga {
  cartao_id: number
  mes: string
  conta_id: number
  data_pagamento: string
}

// Conta quantas ocorrências de uma receita fixa já foram recebidas até hoje
function countReceivedOccurrences(dataInicio: string, dataFim: string | null, today: Date): number {
  const inicio = new Date(dataInicio + 'T12:00:00')
  const fim = dataFim ? new Date(dataFim + 'T12:00:00') : null
  const end = fim && fim < today ? fim : today

  let count = 0
  let current = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())

  while (current <= end) {
    count++
    // Avança um mês mantendo o dia original
    current = new Date(inicio.getFullYear(), inicio.getMonth() + count, inicio.getDate())
  }

  return count
}

export default defineEventHandler(() => {
  const contas = db.prepare(`
    SELECT id, nome, banco, banco_key, saldo_inicial FROM contas ORDER BY nome ASC
  `).all() as Conta[]

  const today = new Date()
  today.setHours(23, 59, 59, 0)

  const transferencias = db.prepare(`
    SELECT valor, data, conta_origem_id, conta_destino_id FROM transferencias
  `).all() as Transferencia[]

  const faturasPagas = db.prepare(`
    SELECT cartao_id, mes, conta_id, data_pagamento FROM faturas WHERE pago = 1
  `).all() as FaturaPaga[]

  return contas.map(conta => {
    const transacoes = db.prepare(`
      SELECT valor, tipo, fixa, data, data_inicio, data_fim, pago
      FROM transacoes WHERE conta_id = ?
    `).all([conta.id]) as Transacao[]

    let movimentacao = 0

    for (const t of transacoes) {
      if (t.tipo === 'receita') {
        if (t.fixa) {
          const n = countReceivedOccurrences(t.data_inicio!, t.data_fim, today)
          movimentacao += t.valor * n
        } else if (new Date(t.data + 'T12:00:00') <= today) {
          movimentacao += t.valor
        }
      } else if (t.tipo === 'despesa') {
        if (t.fixa) {
          const n = countReceivedOccurrences(t.data_inicio!, t.data_fim, today)
          movimentacao -= t.valor * n
        } else if (new Date(t.data + 'T12:00:00') <= today) {
          movimentacao -= t.valor
        }
      }
    }

    for (const tr of transferencias) {
      if (new Date(tr.data + 'T12:00:00') > today) continue
      if (tr.conta_destino_id === conta.id) movimentacao += tr.valor
      if (tr.conta_origem_id === conta.id) movimentacao -= tr.valor
    }

    for (const f of faturasPagas) {
      if (f.conta_id !== conta.id) continue
      if (new Date(f.data_pagamento + 'T12:00:00') > today) continue
      const [year, mon] = f.mes.split('-')
      const startDate = `${year}-${mon}-01`
      const lastDay = new Date(Number(year), Number(mon), 0).getDate()
      const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`
      const row = db.prepare(`
        SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
        WHERE tipo = 'despesa' AND cartao_id = ?
          AND ((fixa = 0 AND data >= ? AND data <= ?)
            OR (fixa = 1 AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)))
      `).get([f.cartao_id, startDate, endDate, endDate, startDate]) as { total: number }
      movimentacao -= row.total
    }

    return {
      ...conta,
      saldo_atual: conta.saldo_inicial + movimentacao
    }
  })
})
