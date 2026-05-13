import db from '../../db/index'
import { getQuery } from 'h3'

interface LimiteGlobalRow {
  id: number
  tipo: 'fixo' | 'porcentagem'
  valor: number
  data_inicio: string
  created_at: string
}

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const now = new Date()
  const month = (query.month as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const active = db.prepare(`
    SELECT * FROM limite_global
    WHERE data_inicio <= ?
    ORDER BY data_inicio DESC
    LIMIT 1
  `).get(month) as LimiteGlobalRow | undefined

  const history = db.prepare(`
    SELECT * FROM limite_global
    ORDER BY data_inicio DESC
  `).all() as LimiteGlobalRow[]

  return { active: active ?? null, history }
})
