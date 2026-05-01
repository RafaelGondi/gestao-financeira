import db from '../../db/index'
import { getQuery } from 'h3'

interface Transacao {
  id: number
  descricao: string
  valor: number
  tipo: string
  categoria: string | null
  data: string
  pago: number
  cartao_id: number | null
  fixa: number
}

interface Cartao {
  id: number
  nome: string
  banco: string
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  let month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  // Transações avulsas do mês
  const avulsas = db.prepare(`
    SELECT id, descricao, valor, tipo, categoria, data, cartao_id, 0 AS fixa,
      CASE WHEN data <= date('now') THEN 1 ELSE 0 END AS pago
    FROM transacoes
    WHERE fixa = 0 AND data >= ? AND data <= ?
    ORDER BY data DESC
  `).all([startDate, endDate]) as Transacao[]

  // Receitas fixas ativas no mês — data efetiva = ano-mês-dia(data_inicio)
  const fixas = db.prepare(`
    SELECT id, descricao, valor, tipo, categoria, cartao_id, 1 AS fixa,
      ? || '-' || substr(data_inicio, 9, 2) AS data,
      CASE WHEN ? || '-' || substr(data_inicio, 9, 2) <= date('now') THEN 1 ELSE 0 END AS pago
    FROM transacoes
    WHERE fixa = 1 AND tipo = 'receita'
      AND data_inicio <= ?
      AND (data_fim IS NULL OR data_fim >= ?)
  `).all([month, month, endDate, startDate]) as Transacao[]

  const transacoes = [...avulsas, ...fixas]

  const receitas = transacoes.filter(t => t.tipo === 'receita')
  const despesas = transacoes.filter(t => t.tipo === 'despesa')

  const totalReceitas = receitas.reduce((sum, t) => sum + t.valor, 0)
  const totalDespesas = despesas.reduce((sum, t) => sum + t.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const contasPagarItems = despesas.filter(t => !t.pago)
  const contasPagarTotal = contasPagarItems.reduce((sum, t) => sum + t.valor, 0)

  const contasReceberItems = receitas.filter(t => !t.pago)
  const contasReceberTotal = contasReceberItems.reduce((sum, t) => sum + t.valor, 0)

  const cartoes = db.prepare('SELECT id, nome, banco FROM cartoes ORDER BY nome ASC').all() as Cartao[]

  const cartoesComFatura = cartoes.map(cartao => {
    const fatura = despesas
      .filter(t => t.cartao_id === cartao.id)
      .reduce((sum, t) => sum + t.valor, 0)
    return { id: cartao.id, nome: cartao.nome, banco: cartao.banco, fatura }
  })

  return {
    saldo,
    contasPagar: { total: contasPagarTotal, items: contasPagarItems },
    contasReceber: { total: contasReceberTotal, items: contasReceberItems },
    cartoes: cartoesComFatura,
    receitas: { total: totalReceitas, items: receitas },
    despesas: { total: totalDespesas, items: despesas }
  }
})
