import db from '../../db/index'
import { getQuery } from 'h3'
import { faturaDateRange, calcFaturaMonth } from '../../utils/fatura'
import { getCartoesParaMes } from '../../utils/cartoes'
import { computeMonthTotals } from '../../utils/month-totals'
import { computeSaldoAnterior } from '../../utils/saldo-anterior'
import { localDateStr } from '../../utils/localDate'
import { getSaldoConta } from '../../utils/getSaldoConta'
import { getPatrimonioIncluidoTotal, lastDayOfPreviousMonth } from '../../utils/patrimonio-totais'
import { effectiveDate } from '../../utils/dateUtils'
import { collectFixasSemCartaoForMonth } from '../../utils/fixas-month-list'

interface Transacao {
  id: number
  descricao: string
  valor: number
  tipo: string
  categoria: string | null
  categoria_icone: string | null
  categoria_cor: string | null
  data: string
  pago: number
  cartao_id: number | null
  fixa: number
}

interface Cartao {
  id: number
  nome: string
  banco: string
  banco_key: string
  cor: string | null
  melhor_data_compra: number
  vencimento: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

export default defineEventHandler((event) => {
  const query = getQuery(event)
  let month = query.month as string | undefined

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date()
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [yearStr, monStr] = month.split('-')
  const year = Number(yearStr), mon = Number(monStr)
  const startDate = `${yearStr}-${monStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${yearStr}-${monStr}-${String(lastDay).padStart(2, '0')}`
  const todayStr = localDateStr()

  // Saldo bancário real hoje: soma dos saldos reais de cada conta (mesma lógica da página de Contas)
  const todasContas = db.prepare(`SELECT id FROM contas`).all() as { id: number }[]
  const saldoBancario = Math.round(todasContas.reduce((sum, c) => sum + getSaldoConta(c.id), 0) * 100) / 100
  const patrimonioExternoIncluido = getPatrimonioIncluidoTotal(todayStr)
  const saldoGeral = r2(saldoBancario + patrimonioExternoIncluido)

  // Cartões (necessário antes de computar saldoAnterior)
  const cartoes = getCartoesParaMes(month) as Cartao[]

  // Saldo do período anterior: acumulado teoricamente desde o início dos dados.
  // Garante saldoPrevisto(M) = saldoAnterior(M+1) para todo M.
  const prevYear = mon === 1 ? year - 1 : year
  const prevMon = mon === 1 ? 12 : mon - 1
  const saldoAnterior = computeSaldoAnterior(year, mon, cartoes)

  // Transações avulsas sem cartão
  const avulsasNormais = db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.tipo, t.categoria, t.data, t.cartao_id, 0 AS fixa,
      CASE WHEN t.despago = 1 THEN 0 WHEN t.pago = 1 OR t.data <= ? THEN 1 ELSE 0 END AS pago,
      cat.icone AS categoria_icone, cat.cor AS categoria_cor
    FROM transacoes t
    LEFT JOIN categorias cat ON cat.nome = t.categoria
    WHERE t.fixa = 0 AND t.cartao_id IS NULL AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([todayStr, startDate, endDate]) as Transacao[]

  const fixasNormais: Transacao[] = collectFixasSemCartaoForMonth({
    month,
    startDate,
    endDate,
    today: todayStr,
    includeLatePayments: true,
    latePaymentTipo: 'receita',
  }).map(t => ({
    id: t.id,
    descricao: t.descricao,
    valor: t.valor,
    tipo: t.tipo,
    categoria: t.categoria ?? null,
    cartao_id: t.cartao_id ?? null,
    fixa: 1,
    data: t.data,
    pago: t.liquidado ? 1 : 0,
    categoria_icone: t.categoria_icone ?? null,
    categoria_cor: t.categoria_cor ?? null,
  }))

  // Faturas pagas por cartão no mês selecionado
  const faturasPagasNoMes = new Set<number>(
    (db.prepare(`SELECT cartao_id FROM faturas WHERE mes = ? AND pago = 1`).all([month]) as any[])
      .map((r: any) => r.cartao_id)
  )

  // Despesas de cartão (avulsas) filtradas pelo mês de fatura correto
  const prevMonStr = `${prevYear}-${String(prevMon).padStart(2, '0')}`
  const cartaoAvulsas: Transacao[] = []
  for (const c of cartoes) {
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, c.melhor_data_compra)
    const rows = db.prepare(`
      SELECT id, descricao, valor, tipo, categoria, data, cartao_id, 0 AS fixa
      FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 0 AND cartao_id = ? AND data >= ? AND data <= ?
    `).all([c.id, fStart, fEnd]) as any[]
    const fatPago = faturasPagasNoMes.has(c.id) ? 1 : 0
    cartaoAvulsas.push(...rows.map((r: any) => ({ ...r, pago: fatPago })))
  }

  // Despesas de cartão fixas/parceladas
  const cartaoFixas: Transacao[] = []
  for (const c of cartoes) {
    const cutoff = c.melhor_data_compra
    const fatPago = faturasPagasNoMes.has(c.id) ? 1 : 0
    const { startDate: fStart, endDate: fEnd } = faturaDateRange(year, mon, cutoff)
    const rows = db.prepare(`
      SELECT id, descricao, valor, tipo, categoria, data_inicio, cartao_id, 1 AS fixa, parcelas,
        data_inicio, data_fim
      FROM transacoes
      WHERE tipo = 'despesa' AND fixa = 1 AND cartao_id = ?
        AND data_inicio <= ?
        AND (data_fim IS NULL OR data_fim >= ?)
    `).all([c.id, fEnd, fStart]) as any[]

    for (const t of rows) {
      const dayP = parseInt(t.data_inicio.slice(8, 10), 10)
      const calcMonth = calcFaturaMonth(t.data_inicio, cutoff, month, prevMonStr)
      const effDate = effectiveDate(calcMonth, t.data_inicio)
      if (effDate < t.data_inicio) continue
      if (t.data_fim && effDate > t.data_fim) continue
      cartaoFixas.push({
        id: t.id, descricao: t.descricao, valor: t.valor, tipo: 'despesa',
        categoria: t.categoria, data: effDate, cartao_id: t.cartao_id, fixa: 1,
        pago: fatPago,
      })
    }
  }

  const transacoes = [...avulsasNormais, ...fixasNormais, ...cartaoAvulsas, ...cartaoFixas]

  const receitas = transacoes.filter(t => t.tipo === 'receita')
  const despesas = transacoes.filter(t => t.tipo === 'despesa')

  // Extornos do mês reduzem o total de despesas de cartão
  const totalExtornos = r2(
    (db.prepare(`SELECT COALESCE(SUM(valor), 0) AS total FROM extornos WHERE mes = ?`).get([month]) as any).total
  )

  // Ajustes de faturas do mês (podem ser positivos ou negativos)
  const totalAjustes = r2(
    (db.prepare(`SELECT COALESCE(SUM(valor_ajuste), 0) AS total FROM faturas WHERE mes = ?`).get([month]) as any).total
  )

  const recebido = r2(receitas.filter(t => t.pago).reduce((sum, t) => sum + t.valor, 0))
  const aReceber = r2(receitas.filter(t => !t.pago).reduce((sum, t) => sum + t.valor, 0))
  // Previsto do mês: competência (alinha com saldoAnterior), não soma liquidações atrasadas já contadas no mês anterior
  const { totalReceitas: totalReceitasMes } = computeMonthTotals(year, mon, cartoes)
  const totalDespesas = r2(despesas.reduce((sum, t) => sum + t.valor, 0) + totalAjustes - totalExtornos)
  // For pago: include ajuste only for paid faturas
  const totalAjustesPagos = r2(
    (db.prepare(`SELECT COALESCE(SUM(valor_ajuste), 0) AS total FROM faturas WHERE mes = ? AND pago = 1`).get([month]) as any).total
  )
  const pago = r2(despesas.filter(t => t.pago).reduce((sum, t) => sum + t.valor, 0) + totalAjustesPagos - totalExtornos)
  const aPagar = r2(despesas.filter(t => !t.pago).reduce((sum, t) => sum + t.valor, 0) + (totalAjustes - totalAjustesPagos))

  const saldo = r2(totalReceitasMes - totalDespesas)
  const saldoDisponivel = saldoGeral
  // Previsão de fim do mês: só contas bancárias (receitas − despesas do mês).
  // Patrimônio incluído entra no saldo atual, mas não infla este previsto — evita
  // contar caixinha cadastrada manualmente como se fosse entrada extra no mês.
  const saldoPrevisto = r2(saldoAnterior + totalReceitasMes - totalDespesas)
  const prevMonthEnd = lastDayOfPreviousMonth(year, mon)
  const patrimonioInicioMes = getPatrimonioIncluidoTotal(prevMonthEnd)
  const saldoAnteriorTotal = r2(saldoAnterior + patrimonioInicioMes)
  const saldoPrevistoTotal = r2(saldoPrevisto + patrimonioExternoIncluido)

  const contasPagarItems = despesas
  const contasPagarTotal = despesas.reduce((sum, t) => sum + t.valor, 0)
  const contasReceberItems = receitas.filter(t => !t.pago)
  const contasReceberTotal = contasReceberItems.reduce((sum, t) => sum + t.valor, 0)

  const catMetaMap = new Map(
    (db.prepare(`SELECT nome, cor, icone FROM categorias`).all() as { nome: string; cor: string; icone: string }[])
      .map(c => [c.nome, c])
  )

  const catTotals = new Map<string, { cor: string; icone: string; total: number }>()
  for (const t of despesas) {
    const key = t.categoria ?? 'Sem categoria'
    const meta = t.categoria ? catMetaMap.get(t.categoria) : null
    if (!catTotals.has(key)) catTotals.set(key, { cor: meta?.cor ?? '#6b7280', icone: meta?.icone ?? 'i-heroicons-tag', total: 0 })
    catTotals.get(key)!.total += t.valor
  }
  const gastosPorCategoria = [...catTotals.entries()]
    .map(([nome, { cor, icone, total }]) => ({ nome, cor, icone, total }))
    .sort((a, b) => b.total - a.total)

  const cartoesComFatura = cartoes.map(cartao => {
    const fatura = despesas.filter(t => t.cartao_id === cartao.id).reduce((sum, t) => sum + t.valor, 0)
    const extornosCartao = r2(
      (db.prepare(`SELECT COALESCE(SUM(valor), 0) AS total FROM extornos WHERE cartao_id = ? AND mes = ?`).get([cartao.id, month]) as any).total
    )
    const ajusteRow = db.prepare(`SELECT COALESCE(valor_ajuste, 0) AS ajuste FROM faturas WHERE cartao_id = ? AND mes = ?`).get([cartao.id, month]) as { ajuste: number } | undefined
    const ajuste = ajusteRow?.ajuste ?? 0
    return { id: cartao.id, nome: cartao.nome, banco: cartao.banco, banco_key: cartao.banco_key, cor: cartao.cor ?? null, fatura: r2(fatura + ajuste - extornosCartao), vencimento: cartao.vencimento }
  })

  return {
    saldo,
    saldoBancario,
    saldoGeral,
    patrimonioExternoIncluido,
    patrimonioInicioMes,
    saldoAnterior: r2(saldoAnterior),
    saldoAnteriorTotal,
    saldoDisponivel,
    saldoPrevisto,
    saldoPrevistoTotal,
    receitas: { total: recebido, recebido, aReceber, items: receitas },
    despesas: { total: totalDespesas, pago, aPagar, items: despesas },
    gastosPorCategoria,
    contasPagar: { total: contasPagarTotal, items: contasPagarItems },
    contasReceber: { total: contasReceberTotal, items: contasReceberItems },
    cartoes: cartoesComFatura,
  }
})
