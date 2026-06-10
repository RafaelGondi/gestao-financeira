import db from '../../../db/index'
import { getRouterParam, getQuery } from 'h3'
import { localDateStr } from '../../../utils/localDate'

function parcelaAtual(dataInicio: string, month: string): number {
  const [iy, im] = dataInicio.split('-').map(Number)
  const [y, m] = month.split('-').map(Number)
  return (y - iy) * 12 + (m - im) + 1
}

function faturaDateRange(mes: string, melhorDataCompra: number) {
  const [fy, fm] = mes.split('-').map(Number)
  if (melhorDataCompra <= 1) {
    const ld = new Date(fy, fm, 0).getDate()
    return {
      fStart: `${fy}-${String(fm).padStart(2,'0')}-01`,
      fEnd: `${fy}-${String(fm).padStart(2,'0')}-${String(ld).padStart(2,'0')}`,
    }
  }
  const py = fm === 1 ? fy - 1 : fy, pm = fm === 1 ? 12 : fm - 1
  return {
    fStart: `${py}-${String(pm).padStart(2,'0')}-${String(melhorDataCompra).padStart(2,'0')}`,
    fEnd:   `${fy}-${String(fm).padStart(2,'0')}-${String(melhorDataCompra - 1).padStart(2,'0')}`,
  }
}

function computeSaldoAtual(contaId: number, today: string, saldoInicial: number): number {
  let saldo = saldoInicial

  // Receitas avulsas: consideradas recebidas quando a data passa
  saldo += (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
    WHERE tipo='receita' AND conta_id=? AND fixa=0 AND data<=?
  `).get([contaId, today]) as any).t

  // Despesas avulsas: apenas pago=1
  saldo -= (db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS t FROM transacoes
    WHERE tipo='despesa' AND conta_id=? AND cartao_id IS NULL AND fixa=0 AND pago=1
  `).get([contaId]) as any).t

  // Transferências
  saldo += (db.prepare(`SELECT COALESCE(SUM(valor),0) AS t FROM transferencias WHERE conta_destino_id=? AND data<=?`).get([contaId, today]) as any).t
  saldo -= (db.prepare(`SELECT COALESCE(SUM(valor),0) AS t FROM transferencias WHERE conta_origem_id=? AND data<=?`).get([contaId, today]) as any).t

  // Faturas pagas debitadas desta conta
  for (const f of db.prepare(`
    SELECT f.cartao_id, f.mes, COALESCE(f.valor_ajuste,0) AS valor_ajuste, cr.melhor_data_compra
    FROM faturas f JOIN cartoes cr ON cr.id=f.cartao_id
    WHERE f.conta_id=? AND f.pago=1 AND f.data_pagamento<=?
  `).all([contaId, today]) as any[]) {
    const { fStart, fEnd } = faturaDateRange(f.mes, f.melhor_data_compra)
    const total = (db.prepare(`
      SELECT COALESCE(SUM(valor),0) AS t FROM transacoes
      WHERE tipo='despesa' AND cartao_id=?
        AND ((fixa=0 AND data>=? AND data<=?) OR (fixa=1 AND data_inicio<=? AND (data_fim IS NULL OR data_fim>=?)))
    `).get([f.cartao_id, fStart, fEnd, fEnd, fStart]) as any).t
    const extornos = (db.prepare(`
      SELECT COALESCE(SUM(valor),0) AS t FROM extornos WHERE cartao_id=? AND mes=?
    `).get([f.cartao_id, f.mes]) as any).t
    saldo -= total + f.valor_ajuste - extornos
  }

  // Fixas (receita e despesa, não cartão)
  for (const t of db.prepare(`
    SELECT id, tipo, valor, data_inicio, data_fim, parcelas FROM transacoes
    WHERE conta_id=? AND fixa=1 AND cartao_id IS NULL
  `).all([contaId]) as any[]) {
    const [iy, im] = t.data_inicio.split('-').map(Number)
    const todayMes = today.slice(0, 7)

    // Pagamentos/recebimentos antecipados (incluindo dentro do mês atual)
    const earlyFuture = new Set(
      (db.prepare(`SELECT mes FROM pagamentos_fixas WHERE transacao_id=? AND mes>=? AND nao_pago=0`).all([t.id, todayMes]) as any[])
        .map((r: any) => r.mes)
    )

    // Meses explicitamente marcados como não pagos (sobrepõe auto-pagamento)
    const naoPagoSet = new Set(
      (db.prepare(`SELECT mes FROM pagamentos_fixas WHERE transacao_id=? AND nao_pago=1`).all([t.id]) as any[])
        .map((r: any) => r.mes)
    )

    let count = 0
    let y = iy, m = im, idx = 0
    while (true) {
      if (t.parcelas > 0 && idx >= t.parcelas) break
      const mes = `${y}-${String(m).padStart(2,'0')}`
      const occDate = effectiveDate(mes, t.data_inicio)
      if (t.data_fim && occDate > t.data_fim) break

      if (naoPagoSet.has(mes)) {
        // explicitamente não pago — não conta
      } else if (occDate <= today) {
        count++ // ocorrência passada, conta como paga
      } else if (earlyFuture.has(mes)) {
        count++ // pago antecipadamente
      } else {
        break   // futuro não pago — encerra
      }

      idx++; m++; if (m > 12) { m = 1; y++ }
    }

    if (t.tipo === 'receita') saldo += count * t.valor
    else saldo -= count * t.valor
  }

  return saldo
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
  const today = localDateStr()

  const [year, mon] = month.split('-')
  const startDate = `${year}-${mon}-01`
  const lastDay = new Date(Number(year), Number(mon), 0).getDate()
  const endDate = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  const lancamentos: any[] = []

  // Receitas avulsas
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data, t.pago, t.data_pagamento, t.notas, t.nome_fatura, 0 AS fixa, 0 AS parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    WHERE t.tipo = 'receita' AND t.conta_id = ? AND t.fixa = 0 AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([contaId, startDate, endDate]) as any[]) {
    lancamentos.push({ ...t, tipo: 'receita', pago: (t.pago || t.data <= today) ? 1 : 0, data_inicio: null, data_fim: null })
  }

  // Receitas fixas
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data_inicio, t.data_fim, t.notas, t.nome_fatura, 1 AS fixa, t.parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone,
      pf.data_pagamento AS pago_data
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    LEFT JOIN pagamentos_fixas pf ON pf.transacao_id = t.id AND pf.mes = ?
    WHERE t.tipo = 'receita' AND t.conta_id = ? AND t.fixa = 1
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([month, contaId, endDate, startDate]) as any[]) {
    const data = effectiveDate(month, t.data_inicio)
    const pagoAntecipado = t.pago_data != null
    lancamentos.push({
      ...t, tipo: 'receita', data,
      pago: pagoAntecipado ? 1 : (data <= today ? 1 : 0),
      pago_antecipado: pagoAntecipado,
      parcela_atual: t.parcelas > 0 ? parcelaAtual(t.data_inicio, month) : null
    })
  }

  // Despesas avulsas (não cartão)
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data, t.pago, t.despago, t.data_pagamento, t.notas, t.nome_fatura, 0 AS fixa, 0 AS parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    WHERE t.tipo = 'despesa' AND t.conta_id = ? AND t.cartao_id IS NULL AND t.fixa = 0
      AND t.data >= ? AND t.data <= ?
    ORDER BY t.data DESC
  `).all([contaId, startDate, endDate]) as any[]) {
    const pago = t.despago ? 0 : (t.pago || t.data <= today) ? 1 : 0
    lancamentos.push({ ...t, tipo: 'despesa', pago, data_inicio: null, data_fim: null })
  }

  // Despesas fixas (não cartão)
  for (const t of db.prepare(`
    SELECT t.id, t.descricao, t.valor, t.categoria, t.data_inicio, t.data_fim, t.notas, t.nome_fatura, 1 AS fixa, t.parcelas,
      c.cor AS categoria_cor, c.icone AS categoria_icone,
      pf.data_pagamento AS pago_data, pf.nao_pago AS nao_pago
    FROM transacoes t
    LEFT JOIN categorias c ON c.nome = t.categoria
    LEFT JOIN pagamentos_fixas pf ON pf.transacao_id = t.id AND pf.mes = ?
    WHERE t.tipo = 'despesa' AND t.conta_id = ? AND t.cartao_id IS NULL AND t.fixa = 1
      AND t.data_inicio <= ? AND (t.data_fim IS NULL OR t.data_fim >= ?)
  `).all([month, contaId, endDate, startDate]) as any[]) {
    const data = effectiveDate(month, t.data_inicio)
    const pagoAntecipado = t.pago_data != null && !t.nao_pago
    const pago = t.nao_pago ? 0 : (pagoAntecipado ? 1 : (data <= today ? 1 : 0))
    lancamentos.push({
      ...t, tipo: 'despesa', data, pago,
      pago_antecipado: pagoAntecipado,
      parcela_atual: t.parcelas > 0 ? parcelaAtual(t.data_inicio, month) : null
    })
  }

  // Transferências
  for (const t of db.prepare(`
    SELECT tr.id, tr.descricao, tr.valor, tr.data,
      tr.conta_origem_id, tr.conta_destino_id,
      tr.patrimonio_destino_id, tr.patrimonio_origem_id,
      co.nome AS conta_origem_nome, cd.nome AS conta_destino_nome,
      pe.nome AS patrimonio_destino_nome,
      po.nome AS patrimonio_origem_nome
    FROM transferencias tr
    LEFT JOIN contas co ON co.id = tr.conta_origem_id
    LEFT JOIN contas cd ON cd.id = tr.conta_destino_id
    LEFT JOIN patrimonio_externo pe ON pe.id = tr.patrimonio_destino_id
    LEFT JOIN patrimonio_externo po ON po.id = tr.patrimonio_origem_id
    WHERE (tr.conta_origem_id = ? OR tr.conta_destino_id = ?)
      AND tr.data >= ? AND tr.data <= ?
    ORDER BY tr.data DESC
  `).all([contaId, contaId, startDate, endDate]) as any[]) {
    const isEntrada = t.conta_destino_id === contaId
    const destinoNome = t.patrimonio_destino_nome ?? t.conta_destino_nome
    const origemNome = t.patrimonio_origem_nome ?? t.conta_origem_nome
    lancamentos.push({
      id: t.id,
      descricao: t.descricao || (isEntrada
        ? (t.patrimonio_origem_nome
          ? `Saque de ${t.patrimonio_origem_nome}`
          : `Transferência de ${origemNome}`)
        : `Transferência para ${destinoNome}`),
      valor: t.valor,
      tipo: 'transferencia',
      direcao: isEntrada ? 'entrada' : 'saida',
      data: t.data,
      conta_origem_id: t.conta_origem_id,
      conta_destino_id: t.conta_destino_id,
      patrimonio_destino_id: t.patrimonio_destino_id,
      patrimonio_origem_id: t.patrimonio_origem_id,
      conta_origem_nome: origemNome,
      conta_destino_nome: destinoNome,
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
    const extornosFatura = (db.prepare(`
      SELECT COALESCE(SUM(valor), 0) AS total FROM extornos WHERE cartao_id = ? AND mes = ?
    `).get([f.cartao_id, f.mes]) as { total: number }).total
    lancamentos.push({
      id: `fatura-${f.id}`,
      descricao: `Fatura ${f.cartao_nome}`,
      valor: row.total + f.valor_ajuste - extornosFatura,
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

  const saldo_atual = computeSaldoAtual(contaId, today, conta.saldo_inicial)

  return { conta, lancamentos, resumo: { entradas, saidas, saldo_mes: entradas - saidas }, saldo_atual }
})
