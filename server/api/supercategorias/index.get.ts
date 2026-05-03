import db from '../../db/index'

export default defineEventHandler(() => {
  return db.prepare(`SELECT id, nome, cor, icone FROM supercategorias ORDER BY nome ASC`).all()
})
