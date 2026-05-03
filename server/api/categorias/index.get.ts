import db from '../../db/index'

export default defineEventHandler(() => {
  return db.prepare(`
    SELECT c.id, c.nome, c.tipo, c.cor, c.icone, c.supercategoria_id,
           s.nome AS supercategoria_nome, s.cor AS supercategoria_cor, s.icone AS supercategoria_icone
    FROM categorias c
    LEFT JOIN supercategorias s ON s.id = c.supercategoria_id
    ORDER BY c.nome ASC
  `).all()
})
