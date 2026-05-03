import db from '../../../db/index'

export default defineEventHandler((event) => {
  const id = Number(event.context.params?.id)
  const cat = db.prepare(`SELECT nome FROM categorias WHERE id = ?`).get(id) as { nome: string } | undefined
  if (!cat) throw createError({ statusCode: 404, message: 'Categoria não encontrada' })

  const { count } = db.prepare(`SELECT COUNT(*) AS count FROM transacoes WHERE categoria = ?`).get(cat.nome) as { count: number }
  return { count }
})
