import db from '../../../db/index'
import { getRouterParam, getQuery } from 'h3'

function parcelaAtual(dataInicio: string, month: string): number {
  const [iy, im] = dataInicio.split('-').map(Number)
  const [y, m] = month.split('-').map(Number)
  return (y - iy) * 12 + (m - im) + 1
}

export default defineEventHandler((event) => {
  const contaId = Number(getRouterParam(event, 'id'))
  if (!contaId || isNaN(contaId))
    throw createError({ statusCode: 400, statusMessage: 'ID inválido' })

  const conta = db.prepare(`SELECT id, nome, banco, banco_key, saldo_inicial FROM contas WHERE id = ?`).get([contaId]) as any
  if (!conta)
    throw createError({ statusCode: 404, statusMessage: 'Conta não encontrada' })

  const query = getQuery(event)
  const now = new Date()
  const month = (query.month as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const today = now.toISOString().split('T')[0]

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  const lancamentos: any[] = []

  // Receitas avulsas
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data, 0 AS fixa, 0 AS parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    WHERE t.tipo = 'receita' AND t.conta_id = ? AND t.fixa = 0 AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([contaId, startDate, endDate]) as any[]) {
    lancamentos.push({ ...t, tipo: 'receita', pago: t.data <= today ? 1 : 0, data_inicio: null, data_fim: null })
  }

  // Receitas fixas
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data_inicio, t.data_fim, 1 AS fixa, t.parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    WHERE t.tipo = 'receita' AND t.conta_id = ? AND t.fixa = 1
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([contaId, endDate, startDate]) as any[]) {
    const data = month + '-' + t.data_inicio.slice(8, 10)
    lancamentos.push({
      ...t, tipo: 'receita', data,
      pago: data <= today ? 1 : 0,
      parcela_atual: t.parcelas > 0 ? parcelaAtual(t.data_inicio, month) : null
    })
  }

  // Despesas avulsas (não cartão)
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data, t.pago, 0 AS fixa, 0 AS parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    WHERE t.tipo = 'despesa' AND t.conta_id = ? AND t.cartao_id IS NULL AND t.fixa = 0
      AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([contaId, startDate, endDate]) as any[]) {
    lancamentos.push({ ...t, tipo: 'despesa', data_inicio: null, data_fim: null })
  }

  // Despesas fixas (não cartão)
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data_inicio, t.data_fim, 1 AS fixa, t.parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    WHERE t.tipo = 'despesa' AND t.conta_id = ? AND t.cartao_id IS NULL AND t.fixa = 1
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([contaId, endDate, startDate]) as any[]) {
    const data = month + '-' + t.data_inicio.slice(8, 10)
    lancamentos.push({
      ...t, tipo: 'despesa', data,
      pago: data <= today ? 1 : 0,
      parcela_atual: t.parcelas > 0 ? parcelaAtual(t.data_inicio, month) : null
    })
  }

  // Transferências
  for (const t of db.prepare(`
    SELECT tr.id, tr.descricao, tr.valor, tr.data,
      tr.conta_origem_id, tr.conta_destino_id,
      co.nome AS conta_origem_nome, cd.nome AS conta_destino_nome
    FROM transferencias tr
    JOIN contas co ON co.id = tr.conta_origem_id
    JOIN contas cd ON cd.id = tr.conta_destino_id
    WHERE (tr.conta_origem_id = ? OR tr.conta_destino_id = ?)
      AND tr.data >= ? AND tr.data <= ?
    ORDER BY tr.data DESC
  `).all([contaId, contaId, startDate, endDate]) as any[]) {
    const isEntrada = t.conta_destino_id === contaId
    lancamentos.push({
      id: t.id,
      descricao: t.descricao || (isEntrada
        ? `Transferência de ${t.conta_origem_nome}`
        : `Transferência para ${t.conta_destino_nome}`),
      valor: t.valor,
      tipo: 'transferencia',
      direcao: isEntrada ? 'entrada' : 'saida',
      data: t.data,
      conta_origem_nome: t.conta_origem_nome,
      conta_destino_nome: t.conta_destino_nome,
      fixa: 0, parcelas: 0, categoria: null, pago: 1
    })
  }

  // Faturas pagas neste mês debitadas desta conta
  for (const f of db.prepare(`
    SELECT f.id, f.mes, f.data_pagamento, COALESCE(f.valor_ajuste, 0) AS valor_ajuste,
      cr.id AS cartao_id, cr.nome AS cartao_nome, cr.melhor_data_compra
    FROM faturas f
    JOIN cartoes cr ON cr.id = f.cartao_id
    WHERE f.conta_id = ? AND f.pago = 1
      AND f.data_pagamento >= ? AND f.data_pagamento <= ?
  `).all([contaId, startDate, endDate]) as any[]) {
    const [fy, fm] = f.mes.split('-').map(Number)
    const { startDate: fStart, endDate: fEnd } = (() => {
      const c = f.melhor_data_compra as number
      if (c <= 1) {
        const ld = new Date(fy, fm, 0).getDate()
        return { startDate: `${fy}-${String(fm).padStart(2,'0')}-01`, endDate: `${fy}-${String(fm).padStart(2,'0')}-${String(ld).padStart(2,'0')}` }
      }
      const py = fm === 1 ? fy - 1 : fy, pm = fm === 1 ? 12 : fm - 1
      return {
        startDate: `${py}-${String(pm).padStart(2,'0')}-${String(c).padStart(2,'0')}`,
        endDate: `${fy}-${String(fm).padStart(2,'0')}-${String(c - 1).padStart(2,'0')}`
      }
    })()
    const row = db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM transacoes
      WHERE tipo = 'despesa' AND cartao_id = ?
        AND ((fixa = 0 AND data >= ? AND data <= ?)
          OR (fixa = 1 AND data_inicio <= ? AND (data_fim IS NULL OR data_fim >= ?)))
    `).get([f.cartao_id, fStart, fEnd, fEnd, fStart]) as { total: number }
    lancamentos.push({
      id: `fatura-${f.id}`,
      descricao: `Fatura ${f.cartao_nome}`,
      valor: row.total + f.valor_ajuste,
      tipo: 'fatura',
      data: f.data_pagamento,
      mes: f.mes,
      cartao_id: f.cartao_id,
      cartao_nome: f.cartao_nome,
      fixa: 0, parcelas: 0, categoria: null, pago: 1
    })
  }

  lancamentos.sort((a, b) => b.data.localeCompare(a.data))

  let entradas = 0, saidas = 0
  for (const l of lancamentos) {
    if (l.tipo === 'receita' && l.pago) entradas += l.valor
    else if (l.tipo === 'despesa' && l.pago) saidas += l.valor
    else if (l.tipo === 'transferencia') {
      if (l.direcao === 'entrada') entradas += l.valor
      else saidas += l.valor
    } else if (l.tipo === 'fatura') saidas += l.valor
  }

  return { conta, lancamentos, resumo: { entradas, saidas, saldo_mes: entradas - saidas } }
})
