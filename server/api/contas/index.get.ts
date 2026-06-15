import db from '../../db/index'
import { getSaldoConta } from '../../utils/getSaldoConta'

interface Conta {
  id: number
  nome: string
  banco: string
  banco_key: string
  saldo_inicial: number
}

export default defineEventHandler(() => {
  const contas = db.prepare(`
    SELECT id, nome, banco, banco_key, saldo_inicial FROM contas ORDER BY COALESCE(ordem, 999), nome ASC
  `).all() as Conta[]

  return contas.map(conta => ({
    ...conta,
    saldo_atual: getSaldoConta(conta.id),
  }))
})
