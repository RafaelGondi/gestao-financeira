import db from '../../db/index'
import { readBody } from 'h3'
import { computeMonthTotals } from '../../utils/month-totals'
import { getSaldoBancarioTotal } from '../../utils/getSaldoConta'

interface Cartao { id: number; melhor_data_compra: number }

const r2 = (n: number) => Math.round(n * 100) / 100

function buildForecast(meses = 18, referenceDate?: string) {
  const cartoes = db.prepare('SELECT id, melhor_data_compra FROM cartoes').all() as Cartao[]
  const ref = referenceDate ? new Date(referenceDate + 'T12:00:00') : new Date()
  const currentYear = ref.getFullYear()
  const currentMon = ref.getMonth() + 1
  const refStr = referenceDate ?? `${currentYear}-${String(currentMon).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`

  let patrimonio = getSaldoBancarioTotal(refStr)
  const results = []

  for (let i = 0; i < meses; i++) {
    let y = currentYear, m = currentMon + i
    while (m > 12) { m -= 12; y++ }
    const month = `${y}-${String(m).padStart(2, '0')}`
    const { totalReceitas: receitas, totalDespesas: despesas } = computeMonthTotals(y, m, cartoes)
    const saldo_mes = r2(receitas - despesas)
    patrimonio = r2(patrimonio + saldo_mes)
    results.push({ month, patrimonio, receitas, despesas, saldo_mes })
  }

  return results
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const nome = body?.nome?.trim() || null
  const automatico = body?.automatico ? 1 : 0
  const meses = body?.meses ?? 18
  const referenceDate = body?.reference_date as string | undefined

  // Se reference_date fornecido, usa como criado_em (snapshot retroativo)
  const criado_em = referenceDate ?? (() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  })()

  const forecast = buildForecast(meses, referenceDate)

  const insertSnapshot = db.prepare(`
    INSERT INTO snapshots (nome, criado_em, automatico) VALUES (?, ?, ?)
  `)
  const insertDado = db.prepare(`
    INSERT INTO snapshot_dados (snapshot_id, mes, patrimonio, receitas, despesas, saldo_mes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const result = db.transaction(() => {
    const info = insertSnapshot.run([nome, criado_em, automatico])
    const snapshotId = info.lastInsertRowid as number
    for (const d of forecast) {
      insertDado.run([snapshotId, d.month, d.patrimonio, d.receitas, d.despesas, d.saldo_mes])
    }
    return db.prepare('SELECT * FROM snapshots WHERE id = ?').get([snapshotId]) as any
  })()

  return result
})
