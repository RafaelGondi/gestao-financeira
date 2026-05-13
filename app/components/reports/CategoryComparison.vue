<template>
  <div class="space-y-4">
    <!-- Seletores de mês -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center gap-4 flex-wrap">
      <span class="text-sm text-gray-500 flex-shrink-0">Comparar</span>
      <select
        v-model="monthA"
        class="text-sm font-medium text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 border-0 cursor-pointer"
      >
        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <span class="text-sm text-gray-400 flex-shrink-0">com</span>
      <select
        v-model="monthB"
        class="text-sm font-medium text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 border-0 cursor-pointer"
      >
        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-24 rounded-lg" />
      <USkeleton class="h-96 rounded-lg" />
    </div>

    <template v-else-if="data">
      <!-- Summary cards -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">{{ labelA }}</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(data.total_a) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">{{ labelB }}</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(data.total_b) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Variação total</p>
          <div class="flex items-baseline gap-2">
            <p class="text-lg font-bold" :class="diffClass(data.total_a - data.total_b)">
              {{ diffSign(data.total_a - data.total_b) }}{{ format(Math.abs(data.total_a - data.total_b)) }}
            </p>
            <p v-if="data.total_b > 0" class="text-sm font-medium" :class="diffClass(data.total_a - data.total_b)">
              {{ diffPctLabel((data.total_a - data.total_b) / data.total_b * 100) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tabela de categorias -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <!-- Header -->
        <div class="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Categoria</span>
            <div class="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-0.5">
              <button
                class="px-2.5 py-0.5 text-xs font-medium rounded transition-all cursor-pointer"
                :class="apenasComparaveis ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'"
                @click="apenasComparaveis = false"
              >Todas</button>
              <button
                class="px-2.5 py-0.5 text-xs font-medium rounded transition-all cursor-pointer"
                :class="apenasComparaveis ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
                @click="apenasComparaveis = true"
              >Só comparáveis</button>
            </div>
          </div>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide w-28 text-right">{{ labelA }}</span>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide w-28 text-right">{{ labelB }}</span>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide w-24 text-right">Variação</span>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wide w-16 text-right">%</span>
          <span class="w-12 flex-shrink-0" />
        </div>

        <!-- Linhas -->
        <div
          v-for="row in visibleRows"
          :key="row.nome"
          class="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
        >
          <!-- Categoria -->
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: row.cor }">
              <UIcon :name="row.icone" class="w-4 h-4 text-white" />
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{{ row.nome }}</span>
          </div>

          <!-- Mês A -->
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100 w-28 text-right flex-shrink-0">
            {{ row.total_a > 0 ? format(row.total_a) : '—' }}
          </p>

          <!-- Mês B -->
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100 w-28 text-right flex-shrink-0">
            {{ row.total_b > 0 ? format(row.total_b) : '—' }}
          </p>

          <!-- Variação R$ -->
          <p
            class="text-sm font-medium w-24 text-right flex-shrink-0"
            :class="row.total_a === 0 && row.total_b === 0 ? 'text-gray-300 dark:text-gray-600' : diffClass(row.diff)"
          >
            {{ row.total_a === 0 && row.total_b === 0 ? '—' : diffSign(row.diff) + format(Math.abs(row.diff)) }}
          </p>

          <!-- % -->
          <p
            class="text-sm font-medium w-16 text-right flex-shrink-0"
            :class="row.diff_pct === null ? 'text-gray-300 dark:text-gray-600' : diffClass(row.diff)"
          >
            {{ row.diff_pct === null ? '—' : diffPctLabel(row.diff_pct) }}
          </p>

          <!-- Sparkline -->
          <svg width="48" height="18" class="flex-shrink-0 w-12">
            <polyline
              :points="sparkPoints(row.trend)"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              :class="sparkColor(row.trend)"
            />
          </svg>
        </div>

        <!-- Empty -->
        <div v-if="!visibleRows.length" class="text-center py-12 text-gray-400 text-sm">
          {{ data.rows.length ? 'Nenhuma categoria aparece nos dois meses' : 'Nenhuma despesa nos dois meses selecionados' }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { format } = useCurrency()

const now = new Date()

function monthStr(year: number, mon: number) {
  return `${year}-${String(mon).padStart(2, '0')}`
}

const currentMonthDefault = monthStr(now.getFullYear(), now.getMonth() + 1)
const prevMonthDefault = now.getMonth() === 0
  ? monthStr(now.getFullYear() - 1, 12)
  : monthStr(now.getFullYear(), now.getMonth())

const monthA = ref(currentMonthDefault)
const monthB = ref(prevMonthDefault)

// Gera opções dos últimos 24 meses
const monthOptions = computed(() => {
  const opts = []
  let y = now.getFullYear(), m = now.getMonth() + 1
  for (let i = 0; i < 24; i++) {
    const val = monthStr(y, m)
    const date = new Date(y, m - 1, 1)
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    m--
    if (m === 0) { m = 12; y-- }
  }
  return opts
})

function fmtMonthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const date = new Date(y, mo - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const labelA = computed(() => fmtMonthLabel(monthA.value))
const labelB = computed(() => fmtMonthLabel(monthB.value))

const { data, pending } = useFetch('/api/reports/category-comparison', {
  query: computed(() => ({ month: monthA.value, compareMonth: monthB.value })),
  watch: [monthA, monthB],
})

const apenasComparaveis = ref(false)

const visibleRows = computed(() => {
  if (!data.value) return []
  if (!apenasComparaveis.value) return data.value.rows
  return data.value.rows.filter(r => r.total_a > 0 && r.total_b > 0)
})

// diff positivo = gastou mais no mês A → vermelho (despesa aumentou = ruim)
// diff negativo = gastou menos no mês A → verde
function diffClass(diff: number) {
  if (diff > 0) return 'text-rose-900 dark:text-rose-400'
  if (diff < 0) return 'text-emerald-900 dark:text-emerald-400'
  return 'text-gray-400'
}

function diffSign(diff: number) {
  return diff > 0 ? '+' : ''
}

function diffPctLabel(pct: number) {
  return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%'
}

function sparkTrimmed(values: number[]) {
  // Remove zeros do início (categoria ainda não existia nesses meses)
  const first = values.findIndex(v => v > 0)
  return first >= 0 ? values.slice(first) : []
}

function sparkColor(values: number[]) {
  const pts = sparkTrimmed(values)
  if (pts.length < 2) return 'text-gray-300 dark:text-gray-600'
  const first = pts[0], last = pts[pts.length - 1]
  if (last > first) return 'text-rose-300 dark:text-rose-700'
  if (last < first) return 'text-emerald-300 dark:text-emerald-700'
  return 'text-gray-300 dark:text-gray-600'
}

function sparkPoints(values: number[]) {
  const pts = sparkTrimmed(values)
  if (pts.length < 2) return ''
  const max = Math.max(...pts, 1)
  const W = 46, H = 16, pad = 2
  return pts.map((v, i) => {
    const x = pad + (i / (pts.length - 1)) * (W - pad * 2)
    const y = H - pad - (v / max) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}
</script>
