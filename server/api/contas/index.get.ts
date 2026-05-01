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
        if (t.pago) movimentacao -= t.valor
      }
    }

    return {
      ...conta,
      saldo_atual: conta.saldo_inicial + movimentacao
    }
  })
})
