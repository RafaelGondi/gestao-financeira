import db from '../../../../db/index'
import { getRouterParam, readBody } from 'h3'
import { loadPatrimonioProjecaoSerie } from '../../../../utils/patrimonio-projecao-load'

export default defineEventHandler(async (event) => {
  const patrimonioId = Number(getRouterParam(event, 'id'))
  if (!patrimonioId) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event).catch(() => ({}))
  const nome = body?.nome?.trim() || null
  const automatico = body?.automatico ? 1 : 0
  const numMeses = Math.min(Math.max(Number(body?.meses) || 24, 6), 36)

  const loaded = await loadPatrimonioProjecaoSerie(patrimonioId, numMeses)
  if (!loaded) throw createError({ statusCode: 404, message: 'Item não encontrado' })

  const hoje = new Date()
  const criado_em = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  const insertSnapshot = db.prepare(`
    INSERT INTO patrimonio_snapshots (patrimonio_id, nome, criado_em, automatico, taxa_anual_efetiva)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertDado = db.prepare(`
    INSERT INTO patrimonio_snapshot_dados (snapshot_id, mes, saldo, month_index)
    VALUES (?, ?, ?, ?)
  `)

  return db.transaction(() => {
    const info = insertSnapshot.run([
      patrimonioId,
      nome,
      criado_em,
      automatico,
      loaded.projecao.taxaAnualEfetiva,
    ])
    const snapshotId = info.lastInsertRowid as number
    for (const d of loaded.meses) {
      insertDado.run([snapshotId, d.month, d.saldo, d.monthIndex])
    }
    return db.prepare('SELECT * FROM patrimonio_snapshots WHERE id = ?').get(snapshotId)
  })()
})
