// Plugin Nitro: auto-salva um snapshot de previsão uma vez por mês
// Roda na inicialização do servidor e verifica se já existe snapshot do mês atual.
// Se não existir, cria automaticamente.

export default defineNitroPlugin(async () => {
  // Importar lazily para garantir que o DB já foi inicializado
  const { default: db } = await import('../db/index')
  const { computeMonthTotals } = await import('../utils/month-totals')
  const { getSaldoBancarioTotal } = await import('../utils/getSaldoConta')

  try {
    const hoje = new Date()
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

    // Verifica se já existe snapshot automático deste mês
    const existente = db.prepare(`
      SELECT id FROM snapshots WHERE automatico = 1 AND criado_em LIKE ?
    `).get([`${mesAtual}-%`])

    if (existente) return // já salvo este mês

    const cartoes = db.prepare('SELECT id, melhor_data_compra FROM cartoes').all() as { id: number; melhor_data_compra: number }[]
    const r2 = (n: number) => Math.round(n * 100) / 100
    const currentYear = hoje.getFullYear()
    const currentMon = hoje.getMonth() + 1
    const todayStr = `${currentYear}-${String(currentMon).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

    let patrimonio = getSaldoBancarioTotal(todayStr)
    const mesesPt = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const nomeMes = mesesPt[currentMon - 1]
    const criado_em = todayStr
    const nome = `Auto — ${nomeMes}/${String(currentYear).slice(2)}`

    const forecast = []
    for (let i = 0; i < 18; i++) {
      let y = currentYear, m = currentMon + i
      while (m > 12) { m -= 12; y++ }
      const month = `${y}-${String(m).padStart(2, '0')}`
      const { totalReceitas: receitas, totalDespesas: despesas } = computeMonthTotals(y, m, cartoes)
      const saldo_mes = r2(receitas - despesas)
      patrimonio = r2(patrimonio + saldo_mes)
      forecast.push({ month, patrimonio, receitas, despesas, saldo_mes })
    }

    const insertSnapshot = db.prepare(`INSERT INTO snapshots (nome, criado_em, automatico) VALUES (?, ?, 1)`)
    const insertDado = db.prepare(`
      INSERT INTO snapshot_dados (snapshot_id, mes, patrimonio, receitas, despesas, saldo_mes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    db.transaction(() => {
      const info = insertSnapshot.run([nome, criado_em])
      const snapshotId = info.lastInsertRowid as number
      for (const d of forecast) {
        insertDado.run([snapshotId, d.month, d.patrimonio, d.receitas, d.despesas, d.saldo_mes])
      }
    })()

    console.log(`[snapshot] Auto-snapshot salvo: ${nome}`)
  } catch (e) {
    console.error('[snapshot] Erro no auto-save:', e)
  }
})
