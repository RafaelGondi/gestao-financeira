import db from '../../db/index'

interface MetaRow {
  id: number
  nome: string
  valor_alvo: number
  prazo: string
  icone: string
  cor: string
  concluida: number
  created_at: string
}

interface AporteRow {
  id: number
  meta_id: number
  valor: number
  data: string
  notas: string | null
}

export default defineEventHandler(() => {
  const metas = db.prepare(`SELECT * FROM metas ORDER BY concluida ASC, prazo ASC`).all() as MetaRow[]
  const aportes = db.prepare(`SELECT * FROM meta_aportes ORDER BY data DESC`).all() as AporteRow[]

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return metas.map(meta => {
    const metaAportes = aportes.filter(a => a.meta_id === meta.id)
    const total = metaAportes.reduce((s, a) => s + a.valor, 0)
    const falta = Math.max(meta.valor_alvo - total, 0)
    const pct = meta.valor_alvo > 0 ? Math.min((total / meta.valor_alvo) * 100, 100) : 0

    // Meses restantes até o prazo
    const [py, pm] = meta.prazo.split('-').map(Number)
    const [ny, nm] = currentMonth.split('-').map(Number)
    const mesesRestantes = Math.max((py - ny) * 12 + (pm - nm), 0)

    // Necessário por mês para atingir no prazo
    const necessarioPorMes = mesesRestantes > 0 ? falta / mesesRestantes : null

    // Ritmo médio: agrupa aportes por mês e calcula média
    const porMes: Record<string, number> = {}
    for (const a of metaAportes) {
      const mes = a.data.slice(0, 7)
      porMes[mes] = (porMes[mes] ?? 0) + a.valor
    }
    const mesesComAporte = Object.values(porMes)
    const ritmoMedio = mesesComAporte.length > 0
      ? mesesComAporte.reduce((s, v) => s + v, 0) / mesesComAporte.length
      : null

    // Projeção: quando vai atingir no ritmo atual
    let projecao: string | null = null
    if (ritmoMedio && ritmoMedio > 0 && falta > 0) {
      const mesesParaConcluir = Math.ceil(falta / ritmoMedio)
      const d = new Date(now.getFullYear(), now.getMonth() + mesesParaConcluir, 1)
      projecao = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } else if (falta === 0) {
      projecao = currentMonth
    }

    return {
      ...meta,
      concluida: meta.concluida === 1,
      total,
      falta,
      pct,
      mesesRestantes,
      necessarioPorMes,
      ritmoMedio,
      projecao,
      aportes: metaAportes,
    }
  })
})
