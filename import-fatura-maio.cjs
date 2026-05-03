const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const DB_PATH = path.join(__dirname, 'data', 'financeiro.db')
const BACKUP_PATH = path.join(__dirname, 'data', `financeiro_backup_pre_import_${Date.now()}.db`)

fs.copyFileSync(DB_PATH, BACKUP_PATH)
console.log(`✓ Backup criado: ${path.basename(BACKUP_PATH)}`)

const db = new Database(DB_PATH)
const CARTAO_ID = 2  // Bradesco Visa Infinity
const CUTOFF = 6     // melhor_data_compra

function titleCase(str) {
  return str.trim().replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const total = (y * 12 + m - 1) + n
  const newY = Math.floor(total / 12)
  const newM = (total % 12) + 1
  return `${newY}-${String(newM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function calcDataFim(dataInicio, parcelas) {
  const day = parseInt(dataInicio.slice(8, 10), 10)
  const offset = day >= CUTOFF ? parcelas : parcelas - 1
  return addMonths(dataInicio, offset)
}

// ─── 17 novas compras de abril ───────────────────────────────────────────────
// Já cadastrados manualmente (IDs 141–145): Catavento/Gasolina, Meli+,
// EC*Roland/Piano, HTM*Cozinhar/Curso culinária, EBN*Sony/DLC Ratchet — omitidos.
const newApril = [
  { data: '2026-04-29', desc: 'NOX EMPREENDIMENTOS',       valor: 23.00,  fixa: 0, parcelas: 0, cat: 'Bebida' },
  { data: '2026-04-29', desc: 'IFD*WALDIR JOSE DA SIL',    valor: 12.18,  fixa: 1, parcelas: 4, cat: null },
  { data: '2026-04-29', desc: 'ACAI NO GRAU',               valor: 27.70,  fixa: 0, parcelas: 0, cat: 'Jantar fora' },
  { data: '2026-04-29', desc: 'JIM.COM 65458802 MAYARA B',  valor: 26.00,  fixa: 0, parcelas: 0, cat: null },
  { data: '2026-04-21', desc: 'GOOGLE NBA LIVE GAMES',      valor: 54.99,  fixa: 0, parcelas: 0, cat: 'Assinatura' },
  { data: '2026-04-08', desc: 'ACM DISTRIBUIDORA DE A',     valor: 52.46,  fixa: 1, parcelas: 3, cat: null },
  { data: '2026-04-06', desc: 'PETROPARK VALET SERVIC',     valor: 8.00,   fixa: 0, parcelas: 0, cat: null },
  { data: '2026-04-06', desc: 'JOSEWILSONBEZERRA',          valor: 21.00,  fixa: 0, parcelas: 0, cat: null },
  { data: '2026-04-06', desc: 'NETFLIX ENTRETENIMENTO',     valor: 20.90,  fixa: 0, parcelas: 0, cat: 'Assinatura' },
  { data: '2026-04-05', desc: 'MP*PIRATALANCHES',           valor: 15.00,  fixa: 0, parcelas: 0, cat: 'Jantar fora' },
  { data: '2026-04-04', desc: 'CLINICA VETERINARIA VE',     valor: 125.00, fixa: 1, parcelas: 2, cat: 'Pet' },
  { data: '2026-04-04', desc: 'CLINICA VETERINARIA VE',     valor: 137.24, fixa: 1, parcelas: 6, cat: 'Pet' },
  { data: '2026-04-04', desc: 'ACM DISTRIBUIDORA DE A',     valor: 92.88,  fixa: 0, parcelas: 0, cat: null },
  { data: '2026-04-04', desc: 'CARREFOUR PETROLINA',        valor: 36.77,  fixa: 0, parcelas: 0, cat: 'Feira' },
  { data: '2026-04-04', desc: 'PLANETA ANIMAL',             valor: 61.00,  fixa: 0, parcelas: 0, cat: 'Pet' },
  { data: '2026-04-02', desc: 'CLINICA VETERINARIA VE',     valor: 137.00, fixa: 1, parcelas: 5, cat: 'Pet' },
  { data: '2026-04-02', desc: 'QOBUZ',                      valor: 25.90,  fixa: 0, parcelas: 0, cat: 'Assinatura' },
]

// ─── 26 parcelamentos em andamento (data_inicio ajustada para maio) ──────────
// Regra: dia >= 6 → data_inicio = "2026-04-DD"; dia < 6 → data_inicio = "2026-05-DD"
// parcelas = parcelas restantes a partir desta fatura
// Valores são o valor da parcela (valor unitário da fatura)
const ongoing = [
  // desc                           valor     data_inicio    parcelas  cat
  { desc: 'HAVAN PETROLINA',        valor:  50.00, dataInicio: '2026-05-05', parcelas: 4, cat: 'Wishlist' },
  { desc: 'CAMPINEIRA PET PR',      valor:  39.90, dataInicio: '2026-04-11', parcelas: 3, cat: 'Pet' },
  { desc: 'JIM.COM ROGERIO LIMA DA G', valor: 29.90, dataInicio: '2026-05-05', parcelas: 8, cat: null },
  { desc: 'FREITAS VAREJO',         valor: 181.54, dataInicio: '2026-04-30', parcelas: 8, cat: 'Eletrodoméstico' },
  { desc: 'FREITAS VAREJO',         valor:  56.98, dataInicio: '2026-04-30', parcelas: 3, cat: 'Eletrodoméstico' },
  { desc: 'CENTAURO CE178',         valor:  66.57, dataInicio: '2026-04-29', parcelas: 3, cat: 'Wishlist' },
  { desc: 'MERCADOLIVRE*7PRODUTOS', valor:  26.57, dataInicio: '2026-04-26', parcelas: 1, cat: null },
  { desc: 'MERCADOLIVRE*2PRODUTOS', valor:  45.80, dataInicio: '2026-04-14', parcelas: 2, cat: null },
  { desc: 'MDJ PETROLINA MOVEIS L', valor: 149.90, dataInicio: '2026-04-12', parcelas: 7, cat: 'Itens pra casa' },
  { desc: 'MP*MERCADOLIVRE',        valor:  29.90, dataInicio: '2026-04-09', parcelas: 7, cat: null },
  { desc: 'LIVELO',                 valor:  51.40, dataInicio: '2026-04-07', parcelas: 7, cat: 'Wishlist' },
  { desc: 'HAVAN PETROLINA',        valor:  50.00, dataInicio: '2026-04-06', parcelas: 2, cat: 'Wishlist' },
  { desc: 'MP*MERCADOLIVRE',        valor:  36.68, dataInicio: '2026-04-30', parcelas: 6, cat: null },
  { desc: 'MP*HARMONIAMUSIC',       valor:  24.90, dataInicio: '2026-04-29', parcelas: 6, cat: null },
  { desc: 'MP*MERCADOLIVRE',        valor:  55.80, dataInicio: '2026-04-29', parcelas: 6, cat: null },
  { desc: 'MDJ PETROLINA MOVEIS L', valor: 299.90, dataInicio: '2026-04-24', parcelas: 6, cat: 'Itens pra casa' },
  { desc: 'NAGEM',                  valor: 139.90, dataInicio: '2026-04-23', parcelas: 6, cat: 'Eletrodoméstico' },
  { desc: 'NATURA PAY',             valor:  57.75, dataInicio: '2026-04-23', parcelas: 4, cat: 'Presentes' },
  { desc: 'HAVAN PETROLINA',        valor:  50.00, dataInicio: '2026-04-20', parcelas: 1, cat: 'Wishlist' },
  { desc: 'PARAIBA MATERIAL DE CO', valor:  68.90, dataInicio: '2026-04-20', parcelas: 1, cat: 'Itens pra casa' },
  { desc: 'MERCADOLIVRE*2PRODUTOS', valor:  55.80, dataInicio: '2026-04-13', parcelas: 1, cat: null },
  { desc: 'FREITAS VAREJO',         valor:  56.98, dataInicio: '2026-04-10', parcelas: 1, cat: 'Eletrodoméstico' },
  { desc: 'GRAN EDUCACAO',          valor:  79.90, dataInicio: '2026-04-25', parcelas: 4, cat: 'Curso' },
  { desc: 'MP*IMBCOMERCIODEMAQUINASE', valor: 29.90, dataInicio: '2026-04-20', parcelas: 1, cat: null },
  { desc: 'MP*5PRODUTOS',           valor:  26.57, dataInicio: '2026-04-13', parcelas: 1, cat: null },
  { desc: 'HBL*HBLAGALEGO',         valor:  45.00, dataInicio: '2026-04-24', parcelas: 2, cat: null },
]

const totalNewApril = newApril.reduce((s, t) => s + t.valor, 0)
const totalOngoing  = ongoing.reduce((s, t) => s + t.valor, 0)
console.log(`\n17 novas compras de abril · R$ ${totalNewApril.toFixed(2)}`)
console.log(`26 parcelamentos em andamento · R$ ${totalOngoing.toFixed(2)} (parcela atual de cada)`)
console.log(`(+ 5 já cadastrados manualmente: Catavento, Meli+, EC*Roland, HTM*Cozinhar, EBN*Sony)\n`)

const stmt = db.prepare(`
  INSERT INTO transacoes (descricao, valor, tipo, categoria, data, pago, cartao_id, fixa, data_inicio, data_fim, conta_id, parcelas)
  VALUES (?, ?, 'despesa', ?, ?, 0, ?, ?, ?, ?, NULL, ?)
`)

const runImport = db.transaction(() => {
  const ids = []

  // Novas compras de abril
  console.log('── Novas compras de abril ──────────────────────────────────')
  for (const t of newApril) {
    const descricao  = titleCase(t.desc)
    const dataInicio = t.fixa ? t.data : null
    const dataFim    = t.fixa ? calcDataFim(t.data, t.parcelas) : null
    const result = stmt.run(descricao, t.valor, t.cat, t.data, CARTAO_ID, t.fixa, dataInicio, dataFim, t.parcelas)
    ids.push(Number(result.lastInsertRowid))
    const suffix = t.fixa ? ` [${t.parcelas}x · até ${dataFim}]` : ''
    const catStr = (t.cat ?? '—').padEnd(20)
    console.log(`  + #${result.lastInsertRowid} ${descricao.padEnd(32)} R$ ${String(t.valor.toFixed(2)).padStart(7)}  ${catStr}${suffix}`)
  }

  // Parcelamentos em andamento
  console.log('\n── Parcelamentos em andamento (ajustados para início em maio) ──')
  for (const t of ongoing) {
    const descricao = titleCase(t.desc)
    const dataFim   = calcDataFim(t.dataInicio, t.parcelas)
    const result = stmt.run(descricao, t.valor, t.cat, t.dataInicio, CARTAO_ID, 1, t.dataInicio, dataFim, t.parcelas)
    ids.push(Number(result.lastInsertRowid))
    const catStr = (t.cat ?? '—').padEnd(20)
    console.log(`  + #${result.lastInsertRowid} ${descricao.padEnd(32)} R$ ${String(t.valor.toFixed(2)).padStart(7)}  ${catStr} [${t.parcelas}x · até ${dataFim}]`)
  }

  return ids
})

let ids
try {
  ids = runImport()
} catch (err) {
  console.error('\n✗ Erro — rollback automático.')
  console.error(err.message)
  db.close()
  process.exit(1)
}

db.close()

const minId = Math.min(...ids), maxId = Math.max(...ids)
console.log(`\n✓ ${ids.length} lançamentos importados. IDs: ${minId} a ${maxId}`)
console.log(`\nPara reverter:`)
console.log(`  node -e "const db=require('better-sqlite3')('data/financeiro.db'); db.prepare('DELETE FROM transacoes WHERE id >= ${minId} AND id <= ${maxId}').run(); db.close(); console.log('Revertido.')"`)
console.log(`\nOu restaurar backup: copy data\\${path.basename(BACKUP_PATH)} data\\financeiro.db`)
