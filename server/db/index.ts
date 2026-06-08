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
      ultimos_digitos TEXT,
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
  if (!contaColNames.includes('ordem')) {
    db.exec(`ALTER TABLE contas ADD COLUMN ordem INTEGER`)
    // Inicializa a ordem das contas existentes pela ordem alfabética atual
    const existentes = db.prepare(`SELECT id FROM contas ORDER BY nome ASC`).all() as { id: number }[]
    existentes.forEach((c, i) => db.prepare(`UPDATE contas SET ordem = ? WHERE id = ?`).run([i, c.id]))
  }

  const cols = db.prepare(`PRAGMA table_info(transacoes)`).all() as { name: string }[]
  const colNames = cols.map(c => c.name)
  if (!colNames.includes('fixa'))            db.exec(`ALTER TABLE transacoes ADD COLUMN fixa INTEGER DEFAULT 0`)
  if (!colNames.includes('data_inicio'))     db.exec(`ALTER TABLE transacoes ADD COLUMN data_inicio DATE`)
  if (!colNames.includes('data_fim'))        db.exec(`ALTER TABLE transacoes ADD COLUMN data_fim DATE`)
  if (!colNames.includes('conta_id'))        db.exec(`ALTER TABLE transacoes ADD COLUMN conta_id INTEGER REFERENCES contas(id)`)
  if (!colNames.includes('parcelas'))        db.exec(`ALTER TABLE transacoes ADD COLUMN parcelas INTEGER DEFAULT 0`)
  if (!colNames.includes('data_pagamento'))  db.exec(`ALTER TABLE transacoes ADD COLUMN data_pagamento DATE`)
  if (!colNames.includes('despago'))         db.exec(`ALTER TABLE transacoes ADD COLUMN despago INTEGER NOT NULL DEFAULT 0`)

  db.exec(`
    CREATE TABLE IF NOT EXISTS pagamentos_fixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transacao_id INTEGER NOT NULL REFERENCES transacoes(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      data_pagamento DATE,
      nao_pago INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(transacao_id, mes)
    )
  `)

  const pagFixasCols = db.prepare(`PRAGMA table_info(pagamentos_fixas)`).all() as { name: string }[]
  if (!pagFixasCols.map(c => c.name).includes('nao_pago'))
    db.exec(`ALTER TABLE pagamentos_fixas ADD COLUMN nao_pago INTEGER NOT NULL DEFAULT 0`)

  const cartaoCols = db.prepare(`PRAGMA table_info(cartoes)`).all() as { name: string }[]
  const cartaoColNames = cartaoCols.map(c => c.name)
  if (!cartaoColNames.includes('banco_key')) db.exec(`ALTER TABLE cartoes ADD COLUMN banco_key TEXT NOT NULL DEFAULT ''`)
  if (!cartaoColNames.includes('ultimos_digitos')) db.exec(`ALTER TABLE cartoes ADD COLUMN ultimos_digitos TEXT`)
  if (!cartaoColNames.includes('cor')) db.exec(`ALTER TABLE cartoes ADD COLUMN cor TEXT`)
  if (!cartaoColNames.includes('ordem')) {
    db.exec(`ALTER TABLE cartoes ADD COLUMN ordem INTEGER`)
    const existentes = db.prepare(`SELECT id FROM cartoes ORDER BY nome ASC`).all() as { id: number }[]
    existentes.forEach((c, i) => db.prepare(`UPDATE cartoes SET ordem = ? WHERE id = ?`).run([i, c.id]))
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS supercategorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      cor TEXT NOT NULL DEFAULT '#6366f1',
      icone TEXT NOT NULL DEFAULT 'i-heroicons-tag',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL DEFAULT 'despesa',
      cor TEXT NOT NULL DEFAULT '#6366f1',
      icone TEXT NOT NULL DEFAULT 'i-heroicons-tag',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Seed categorias from existing transacoes.categoria strings (runs once; IGNORE skips duplicates)
  db.exec(`
    INSERT OR IGNORE INTO categorias (nome, tipo)
    SELECT categoria, tipo FROM transacoes
    WHERE categoria IS NOT NULL AND categoria != ''
    GROUP BY categoria
  `)

  const categoriaCols = db.prepare(`PRAGMA table_info(categorias)`).all() as { name: string }[]
  if (!categoriaCols.map(c => c.name).includes('supercategoria_id'))
    db.exec(`ALTER TABLE categorias ADD COLUMN supercategoria_id INTEGER REFERENCES supercategorias(id) ON DELETE SET NULL`)

  const faturaCols = db.prepare(`PRAGMA table_info(faturas)`).all() as { name: string }[]
  const faturaColNames = faturaCols.map(c => c.name)
  if (!faturaColNames.includes('valor_ajuste')) db.exec(`ALTER TABLE faturas ADD COLUMN valor_ajuste REAL DEFAULT 0`)

  const limitesCols = db.prepare(`PRAGMA table_info(limites)`).all() as { name: string }[]
  if (limitesCols.length && !limitesCols.map(c => c.name).includes('recorrente'))
    db.exec(`ALTER TABLE limites ADD COLUMN recorrente INTEGER NOT NULL DEFAULT 0`)

  db.exec(`
    CREATE TABLE IF NOT EXISTS limites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('categoria', 'supercategoria')),
      referencia TEXT NOT NULL,
      mes TEXT NOT NULL,
      valor REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tipo, referencia, mes)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor_alvo REAL NOT NULL,
      prazo TEXT NOT NULL,
      icone TEXT NOT NULL DEFAULT 'i-heroicons-flag',
      cor TEXT NOT NULL DEFAULT '#6366f1',
      concluida INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meta_aportes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meta_id INTEGER NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
      valor REAL NOT NULL,
      data DATE NOT NULL,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS limite_global (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK(tipo IN ('fixo', 'porcentagem')),
      valor REAL NOT NULL,
      data_inicio TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS extornos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cartao_id INTEGER NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      valor REAL NOT NULL,
      descricao TEXT,
      notas TEXT,
      transacao_id INTEGER REFERENCES transacoes(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      criado_em TEXT NOT NULL,
      automatico INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS snapshot_dados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      patrimonio REAL,
      receitas REAL,
      despesas REAL,
      saldo_mes REAL
    )
  `)

  g.__db = db
}

export default g.__db as Database.Database
