import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { findBankByName } from '../utils/banks'

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
    CREATE TABLE IF NOT EXISTS patrimonio_externo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'outro' CHECK(tipo IN ('fgts', 'consorcio', 'renda_fixa', 'caixinha', 'outro')),
      saldo_atual REAL NOT NULL DEFAULT 0,
      valor_alvo REAL,
      incluir_em_totais INTEGER NOT NULL DEFAULT 0,
      aporte_modo TEXT NOT NULL DEFAULT 'nenhum' CHECK(aporte_modo IN ('nenhum', 'fixo_mensal', 'manual')),
      aporte_valor REAL,
      rendimento_modo TEXT NOT NULL DEFAULT 'nenhum' CHECK(rendimento_modo IN ('nenhum', 'taxa_anual', 'cdi_pct', 'tr_mais', 'cdi_faixas')),
      rendimento_valor REAL,
      grupo_rendimento TEXT,
      cdi_faixa_teto REAL,
      cdi_pct_ate_teto REAL,
      cdi_pct_acima REAL,
      cdi_dias_base TEXT NOT NULL DEFAULT 'uteis',
      data_fim TEXT,
      icone TEXT NOT NULL DEFAULT 'i-lucide-landmark',
      cor TEXT NOT NULL DEFAULT '#6366f1',
      notas TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patrimonio_movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patrimonio_id INTEGER NOT NULL REFERENCES patrimonio_externo(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK(tipo IN ('aporte', 'ajuste', 'retirada')),
      valor REAL NOT NULL,
      data DATE NOT NULL,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const patCols = db.prepare(`PRAGMA table_info(patrimonio_externo)`).all() as { name: string }[]
  const patColNames = patCols.map(c => c.name)
  if (patCols.length && !patColNames.includes('grupo_rendimento')) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN;
      CREATE TABLE patrimonio_externo_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'outro' CHECK(tipo IN ('fgts', 'consorcio', 'renda_fixa', 'caixinha', 'outro')),
        saldo_atual REAL NOT NULL DEFAULT 0,
        valor_alvo REAL,
        incluir_em_totais INTEGER NOT NULL DEFAULT 0,
        aporte_modo TEXT NOT NULL DEFAULT 'nenhum' CHECK(aporte_modo IN ('nenhum', 'fixo_mensal', 'manual')),
        aporte_valor REAL,
        rendimento_modo TEXT NOT NULL DEFAULT 'nenhum' CHECK(rendimento_modo IN ('nenhum', 'taxa_anual', 'cdi_pct', 'tr_mais', 'cdi_faixas')),
        rendimento_valor REAL,
        grupo_rendimento TEXT,
        cdi_faixa_teto REAL,
        cdi_pct_ate_teto REAL,
        cdi_pct_acima REAL,
        data_fim TEXT,
        icone TEXT NOT NULL DEFAULT 'i-lucide-landmark',
        cor TEXT NOT NULL DEFAULT '#6366f1',
        notas TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO patrimonio_externo_new (
        id, nome, tipo, saldo_atual, valor_alvo, incluir_em_totais,
        aporte_modo, aporte_valor, rendimento_modo, rendimento_valor,
        data_fim, icone, cor, notas, ativo, created_at
      )
      SELECT id, nome, tipo, saldo_atual, valor_alvo, incluir_em_totais,
        aporte_modo, aporte_valor, rendimento_modo, rendimento_valor,
        data_fim, icone, cor, notas, ativo, created_at
      FROM patrimonio_externo;
      DROP TABLE patrimonio_externo;
      ALTER TABLE patrimonio_externo_new RENAME TO patrimonio_externo;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `)
  }

  if (patCols.length && !patColNames.includes('cdi_dias_base')) {
    db.exec(`ALTER TABLE patrimonio_externo ADD COLUMN cdi_dias_base TEXT NOT NULL DEFAULT 'uteis'`)
  }

  const patCols2 = db.prepare(`PRAGMA table_info(patrimonio_externo)`).all() as { name: string }[]
  const patColNames2 = patCols2.map(c => c.name)
  if (patCols2.length && !patColNames2.includes('instituicao_key')) {
    db.exec(`ALTER TABLE patrimonio_externo ADD COLUMN instituicao_key TEXT`)
  }

  // Idempotente: converte grupo_rendimento legado em instituicao_key (deploy seguro em produção)
  const patBackfill = db.prepare(`
    SELECT id, grupo_rendimento FROM patrimonio_externo
    WHERE instituicao_key IS NULL AND grupo_rendimento IS NOT NULL AND trim(grupo_rendimento) != ''
  `).all() as { id: number; grupo_rendimento: string }[]
  const setInstituicaoKey = db.prepare(`UPDATE patrimonio_externo SET instituicao_key = ? WHERE id = ?`)
  for (const row of patBackfill) {
    const bank = findBankByName(row.grupo_rendimento)
    if (bank) setInstituicaoKey.run(bank.key, row.id)
  }

  const movCols = db.prepare(`PRAGMA table_info(patrimonio_movimentos)`).all() as { name: string }[]
  if (movCols.length && !movCols.map(c => c.name).includes('transferencia_id')) {
    db.exec(`ALTER TABLE patrimonio_movimentos ADD COLUMN transferencia_id INTEGER REFERENCES transferencias(id) ON DELETE SET NULL`)
  }

  const trCols = db.prepare(`PRAGMA table_info(transferencias)`).all() as { name: string }[]
  if (trCols.length && !trCols.map(c => c.name).includes('patrimonio_destino_id')) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN;
      CREATE TABLE transferencias_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT,
        valor REAL NOT NULL,
        conta_origem_id INTEGER NOT NULL REFERENCES contas(id),
        conta_destino_id INTEGER REFERENCES contas(id),
        patrimonio_destino_id INTEGER REFERENCES patrimonio_externo(id),
        data DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (conta_destino_id IS NOT NULL AND patrimonio_destino_id IS NULL)
          OR (conta_destino_id IS NULL AND patrimonio_destino_id IS NOT NULL)
        )
      );
      INSERT INTO transferencias_new (id, descricao, valor, conta_origem_id, conta_destino_id, data, created_at)
      SELECT id, descricao, valor, conta_origem_id, conta_destino_id, data, created_at FROM transferencias;
      DROP TABLE transferencias;
      ALTER TABLE transferencias_new RENAME TO transferencias;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `)
  }

  const trCols2 = db.prepare(`PRAGMA table_info(transferencias)`).all() as { name: string }[]
  if (trCols2.length && !trCols2.map(c => c.name).includes('patrimonio_origem_id')) {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      BEGIN;
      CREATE TABLE transferencias_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT,
        valor REAL NOT NULL,
        conta_origem_id INTEGER REFERENCES contas(id),
        conta_destino_id INTEGER REFERENCES contas(id),
        patrimonio_destino_id INTEGER REFERENCES patrimonio_externo(id),
        patrimonio_origem_id INTEGER REFERENCES patrimonio_externo(id),
        data DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (conta_origem_id IS NOT NULL AND patrimonio_origem_id IS NULL AND conta_destino_id IS NOT NULL AND patrimonio_destino_id IS NULL)
          OR (conta_origem_id IS NOT NULL AND patrimonio_origem_id IS NULL AND conta_destino_id IS NULL AND patrimonio_destino_id IS NOT NULL)
          OR (patrimonio_origem_id IS NOT NULL AND conta_origem_id IS NULL AND conta_destino_id IS NOT NULL AND patrimonio_destino_id IS NULL)
        )
      );
      INSERT INTO transferencias_new (id, descricao, valor, conta_origem_id, conta_destino_id, patrimonio_destino_id, data, created_at)
      SELECT id, descricao, valor, conta_origem_id, conta_destino_id, patrimonio_destino_id, data, created_at FROM transferencias;
      DROP TABLE transferencias;
      ALTER TABLE transferencias_new RENAME TO transferencias;
      COMMIT;
      PRAGMA foreign_keys=ON;
    `)
  }

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
