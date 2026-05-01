import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const g = globalThis as any

if (!g.__db) {
  const dataDir = join(process.cwd(), 'data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  const db = new Database(join(dataDir, 'financeiro.db'))

  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS contas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      banco TEXT NOT NULL,
      banco_key TEXT NOT NULL DEFAULT '',
      saldo_inicial REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cartoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      banco TEXT NOT NULL,
      limite REAL NOT NULL,
      melhor_data_compra INTEGER NOT NULL,
      vencimento INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
      categoria TEXT,
      data DATE NOT NULL,
      pago INTEGER DEFAULT 0,
      cartao_id INTEGER REFERENCES cartoes(id),
      fixa INTEGER DEFAULT 0,
      data_inicio DATE,
      data_fim DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cartao_id INTEGER NOT NULL REFERENCES cartoes(id),
      mes TEXT NOT NULL,
      pago INTEGER DEFAULT 0,
      conta_id INTEGER REFERENCES contas(id),
      data_pagamento DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cartao_id, mes)
    );

    CREATE TABLE IF NOT EXISTS transferencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT,
      valor REAL NOT NULL,
      conta_origem_id INTEGER NOT NULL REFERENCES contas(id),
      conta_destino_id INTEGER NOT NULL REFERENCES contas(id),
      data DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Migrações para bancos existentes
  const contaCols = db.prepare(`PRAGMA table_info(contas)`).all() as { name: string }[]
  const contaColNames = contaCols.map(c => c.name)
  if (!contaColNames.includes('banco_key')) db.exec(`ALTER TABLE contas ADD COLUMN banco_key TEXT NOT NULL DEFAULT ''`)

  const cols = db.prepare(`PRAGMA table_info(transacoes)`).all() as { name: string }[]
  const colNames = cols.map(c => c.name)
  if (!colNames.includes('fixa'))       db.exec(`ALTER TABLE transacoes ADD COLUMN fixa INTEGER DEFAULT 0`)
  if (!colNames.includes('data_inicio')) db.exec(`ALTER TABLE transacoes ADD COLUMN data_inicio DATE`)
  if (!colNames.includes('data_fim'))   db.exec(`ALTER TABLE transacoes ADD COLUMN data_fim DATE`)
  if (!colNames.includes('conta_id'))   db.exec(`ALTER TABLE transacoes ADD COLUMN conta_id INTEGER REFERENCES contas(id)`)
  if (!colNames.includes('parcelas'))   db.exec(`ALTER TABLE transacoes ADD COLUMN parcelas INTEGER DEFAULT 0`)

  const cartaoCols = db.prepare(`PRAGMA table_info(cartoes)`).all() as { name: string }[]
  const cartaoColNames = cartaoCols.map(c => c.name)
  if (!cartaoColNames.includes('banco_key')) db.exec(`ALTER TABLE cartoes ADD COLUMN banco_key TEXT NOT NULL DEFAULT ''`)

  const faturaCols = db.prepare(`PRAGMA table_info(faturas)`).all() as { name: string }[]
  const faturaColNames = faturaCols.map(c => c.name)
  if (!faturaColNames.includes('valor_ajuste')) db.exec(`ALTER TABLE faturas ADD COLUMN valor_ajuste REAL DEFAULT 0`)

  g.__db = db
}

export default g.__db as Database.Database
