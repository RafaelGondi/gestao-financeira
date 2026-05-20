<template>
  <div class="space-y-4">

    <!-- Sem limite definido -->
    <div v-if="!data.limit && data.limitType === null" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 px-5 py-12 flex flex-col items-center gap-3 text-center">
      <UIcon name="i-heroicons-flag" class="w-8 h-8 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Nenhum limite global definido</p>
      <p class="text-xs text-gray-400 max-w-xs">Defina um teto de gastos ou uma meta de poupança na página de Limites para ver a análise aqui.</p>
      <NuxtLink to="/limites" class="text-xs text-primary-500 hover:text-primary-600 transition-colors mt-1">
        Definir limite →
      </NuxtLink>
    </div>

    <!-- Sem receita cadastrada (só se for porcentagem) -->
    <div v-else-if="data.limitType === 'porcentagem' && data.income === 0" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 px-5 py-12 flex flex-col items-center gap-3 text-center">
      <UIcon name="i-heroicons-banknotes" class="w-8 h-8 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Nenhuma receita registrada este mês</p>
      <p class="text-xs text-gray-400 max-w-xs">O limite por porcentagem depende da receita do mês para calcular o teto de gastos.</p>
    </div>

    <template v-else>
      <!-- Card único unificado -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">

        <!-- Seção 1: Cabeçalho + valores + barra -->
        <div class="px-5 pt-5 pb-5">

          <!-- Cabeçalho -->
          <div class="flex items-center justify-between mb-5">
            <div>
              <p class="text-xs text-gray-400 mb-0.5">{{ monthLabel }} · Dia {{ data.daysElapsed }} de {{ data.daysTotal }}</p>
              <h2 class="font-semibold text-gray-800 dark:text-gray-100">
                {{ data.limitType === 'porcentagem'
                  ? `Meta: poupar ${data.savingsPct}% da receita`
                  : 'Teto de gastos mensais' }}
              </h2>
            </div>
            <div class="text-right flex-shrink-0 ml-4">
              <p class="text-xs text-gray-400 mb-1">{{ data.daysPct.toFixed(0) }}% do mês</p>
              <div class="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div class="h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 transition-all" :style="{ width: data.daysPct + '%' }" />
              </div>
            </div>
          </div>

          <!-- Valores: gasto em destaque + limite/receita como referência -->
          <div class="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 mb-5">
            <!-- Gasto principal -->
            <div>
              <p class="text-xs text-gray-400 mb-1">
                {{ data.isCurrentMonth ? 'Gasto até hoje' : data.daysElapsed === data.daysTotal ? 'Total gasto' : 'Previsão de gasto' }}
              </p>
              <p class="text-3xl font-bold" :class="spentColor">{{ format(data.spent) }}</p>
            </div>
            <!-- Limite + Receita -->
            <div class="flex items-center gap-3 sm:mb-1">
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Limite</p>
                <p class="text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400">{{ format(data.limit!) }}</p>
              </div>
              <template v-if="isBullet">
                <span class="text-gray-200 dark:text-gray-700">·</span>
                <div>
                  <p class="text-xs text-gray-400 mb-0.5">Receita</p>
                  <p class="text-sm sm:text-base font-semibold text-gray-500 dark:text-gray-400">{{ format(data.income) }}</p>
                </div>
              </template>
            </div>
          </div>

          <!-- Bullet chart (tipo porcentagem com receita) -->
          <div v-if="isBullet" class="mb-2">
            <!-- Wrapper sem overflow-hidden para tooltips aparecerem -->
            <div class="relative h-4">
              <!-- Fills dentro de overflow-hidden (para respeitar border-radius) -->
              <div class="absolute inset-0 rounded-lg overflow-hidden">
                <!-- Fundo: zona de gastos (0 → limite) -->
                <div class="absolute top-0 left-0 h-full bg-gray-100 dark:bg-gray-800"
                  :style="{ width: limitPct + '%' }" />
                <!-- Fundo: zona de poupança (limite → receita) -->
                <div class="absolute top-0 right-0 h-full bg-gray-50 dark:bg-gray-700/40"
                  :style="{ width: (100 - limitPct) + '%' }" />
                <!-- Barra de gasto -->
                <div class="absolute top-1 bottom-1 left-0 rounded-md transition-all"
                  :class="spentBarBg"
                  :style="{ width: spentBulletWidth + '%' }" />
              </div>
              <!-- Marcadores fora do overflow-hidden (tooltips não cortados) -->
              <!-- Marcador do limite (área de hover larga, linha fina visual) -->
              <div class="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-10 group/limit cursor-default flex items-stretch justify-center"
                :style="{ left: limitPct + '%' }">
                <div class="w-0.5 bg-gray-400 dark:bg-gray-500 h-full" />
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 dark:bg-gray-700 text-white text-xs whitespace-nowrap opacity-0 group-hover/limit:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  Limite de gastos · {{ format(data.limit!) }} ({{ limitPct.toFixed(0) }}% da receita)
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
                </div>
              </div>
              <!-- Marcador do dia (área de hover larga, linha fina visual) -->
              <div v-if="data.isCurrentMonth"
                class="absolute top-0 bottom-0 w-5 -translate-x-1/2 z-20 group/day cursor-default flex items-stretch justify-center"
                :style="{ left: dayMarkerBullet + '%' }">
                <div class="w-px bg-blue-400 dark:bg-blue-500 h-full" />
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 dark:bg-gray-700 text-white text-xs whitespace-nowrap opacity-0 group-hover/day:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                  Hoje · Dia {{ data.daysElapsed }} de {{ data.daysTotal }} ({{ data.daysPct.toFixed(0) }}% do mês)
                  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-700" />
                </div>
              </div>
            </div>
            <!-- Labels da barra -->
            <div class="flex items-center justify-between mt-1.5 text-xs text-gray-400">
              <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                <p :class="statusTextColor">{{ statusLabel }}</p>
                <span class="hidden sm:flex items-center gap-1">
                  <span class="inline-block w-0.5 h-3 bg-gray-400 dark:bg-gray-500" />
                  Limite ({{ limitPct.toFixed(0) }}%)
                </span>
                <span v-if="data.isCurrentMonth" class="hidden sm:flex items-center gap-1">
                  <span class="inline-block w-px h-3 bg-blue-400 dark:bg-blue-500" />
                  Hoje
                </span>
              </div>
              <span class="shrink-0">{{ spentOfIncomePct.toFixed(1) }}% da receita</span>
            </div>
          </div>

          <!-- Barra simples (tipo fixo) -->
          <div v-else class="mb-2">
            <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 relative overflow-hidden">
              <div v-if="data.isCurrentMonth"
                class="absolute top-0 bottom-0 w-0.5 bg-white/60 dark:bg-gray-900/60 z-10"
                :style="{ left: data.daysPct + '%' }" />
              <div class="h-3 rounded-full transition-all" :class="barColor"
                :style="{ width: Math.min(data.spentPct!, 100) + '%' }" />
            </div>
            <div class="flex items-center justify-between mt-1.5 text-xs">
              <p :class="data.isCurrentMonth ? statusTextColor : 'text-gray-400'">
                {{ data.isCurrentMonth ? statusLabel : (data.daysElapsed === data.daysTotal ? 'Mês encerrado' : 'Mês futuro') }}
              </p>
              <p class="text-gray-400">{{ data.spentPct!.toFixed(1) }}% do limite</p>
            </div>
          </div>

        </div>

        <!-- Seção 2: Saldo disponível · Gasto/dia · Ritmo -->
        <div class="border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
          <!-- Saldo disponível -->
          <div class="p-3 sm:p-4">
            <p class="text-xs text-gray-400 mb-1">Disponível para gastar</p>
            <p class="text-base sm:text-xl font-bold" :class="data.remaining! >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'">
              {{ data.remaining! >= 0 ? format(data.remaining!) : '−' + format(Math.abs(data.remaining!)) }}
            </p>
            <p class="text-xs text-gray-400 mt-1 hidden sm:block">para {{ data.daysRemaining }} dias restantes</p>
            <p class="text-xs text-gray-400 mt-1 sm:hidden">{{ data.daysRemaining }}d restantes</p>
          </div>

          <!-- Gasto/dia -->
          <div class="p-3 sm:p-4">
            <p class="text-xs text-gray-400 mb-1">Gasto/dia</p>
            <p class="text-base sm:text-xl font-bold"
              :class="(data.dailyAllowance ?? 0) >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'">
              {{ data.dailyAllowance !== null && data.dailyAllowance >= 0
                ? format(data.dailyAllowance)
                : data.daysRemaining === 0 ? '—' : 'Estourado' }}
            </p>
            <p class="text-xs text-gray-400 mt-1 hidden sm:block">nos dias restantes</p>
            <p class="text-xs text-gray-400 mt-1 sm:hidden">disponível/dia</p>
          </div>

          <!-- Ritmo / Resultado / Projeção -->
          <div class="p-3 sm:p-4">
            <p class="text-xs text-gray-400 mb-1">
              {{ data.isCurrentMonth
                ? ((data.spentPct ?? 0) >= 100 ? 'Resultado' : 'Ritmo')
                : data.daysElapsed === data.daysTotal ? 'Resultado' : 'Projeção' }}
            </p>
            <p class="text-base sm:text-xl font-bold" :class="paceColor">{{ paceLabel }}</p>
            <p class="text-xs text-gray-400 mt-1 hidden sm:block">
              {{ data.isCurrentMonth
                ? ((data.spentPct ?? 0) >= 100 ? 'do orçamento do mês' : 'vs ritmo uniforme esperado')
                : data.daysElapsed === data.daysTotal ? 'do orçamento do mês' : 'do limite do mês' }}
            </p>
          </div>
        </div>

        <!-- Seção 3: Poupança efetiva + Receita → Meta → Teto (só tipo porcentagem) -->
        <div v-if="data.limitType === 'porcentagem'" class="border-t border-gray-100 dark:border-gray-800 px-4 sm:px-5 py-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <!-- Poupança efetiva (esquerda) -->
            <div>
              <p class="text-xs text-gray-400 mb-1">Poupança efetiva</p>
              <div class="flex items-baseline gap-1.5">
                <p class="text-xl font-bold" :class="actualSavingsPctColor">
                  {{ actualSavingsPct !== null ? actualSavingsPct.toFixed(1) + '%' : '—' }}
                </p>
                <p v-if="actualSavingsPct !== null" class="text-xs" :class="actualSavingsPctColor">
                  (meta: {{ data.savingsPct }}%)
                </p>
              </div>
              <p v-if="actualSavingsPct !== null" class="text-sm font-medium text-gray-600 dark:text-gray-300 mt-0.5">
                {{ format(data.income - data.spent) }} poupados até agora
              </p>
            </div>

            <!-- Divider -->
            <div class="hidden sm:block w-px h-8 bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
            <div class="sm:hidden h-px bg-gray-100 dark:bg-gray-800" />

            <!-- Receita → Meta → Teto (direita) -->
            <div class="flex items-center gap-3 sm:gap-4">
              <div>
                <p class="text-xs text-gray-400 mb-1">Receita</p>
                <p class="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">{{ format(data.income) }}</p>
              </div>
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
              <div>
                <p class="text-xs text-gray-400 mb-1">Meta poupança</p>
                <p class="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">{{ data.savingsPct }}%</p>
              </div>
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
              <div>
                <p class="text-xs text-gray-400 mb-1">A poupar</p>
                <p class="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">{{ format(data.income * (data.savingsPct! / 100)) }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface BudgetData {
  month: string
  isCurrentMonth: boolean
  daysElapsed: number
  daysTotal: number
  daysRemaining: number
  daysPct: number
  spent: number
  income: number
  limit: number | null
  limitType: 'fixo' | 'porcentagem' | null
  savingsPct: number | null
  remaining: number | null
  spentPct: number | null
  pace: number | null
  dailyAllowance: number | null
}

const props = defineProps<{ data: BudgetData }>()
const { format } = useCurrency()

const mesesPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const monthLabel = computed(() => {
  const [y, m] = props.data.month.split('-').map(Number)
  return `${mesesPt[m - 1]} de ${y}`
})

// Bullet chart: só quando tipo=porcentagem e há receita
const isBullet = computed(() => props.data.limitType === 'porcentagem' && props.data.income > 0)

// Percentuais relativos à receita (para bullet chart)
const limitPct = computed(() =>
  props.data.income > 0 ? (props.data.limit! / props.data.income) * 100 : 100
)
const spentBulletWidth = computed(() =>
  Math.min((props.data.spent / props.data.income) * 100, 100)
)
const spentOfIncomePct = computed(() =>
  props.data.income > 0 ? (props.data.spent / props.data.income) * 100 : 0
)
// Marcador do dia dentro da zona de gastos (0 → limite)
const dayMarkerBullet = computed(() =>
  (props.data.daysPct / 100) * limitPct.value
)

// Cor do valor gasto principal — só destaca quando estourar
const spentColor = computed(() => {
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'text-rose-600 dark:text-rose-400'
  return 'text-gray-900 dark:text-white'
})

// Cor da barra de gasto no bullet chart — primária normalmente, vermelha se estourar
const spentBarBg = computed(() => {
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'bg-rose-400 dark:bg-rose-500'
  return 'bg-primary-400 dark:bg-primary-500'
})

// Cor da barra simples (tipo fixo)
const barColor = computed(() => {
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'bg-rose-400 dark:bg-rose-500'
  return 'bg-primary-400 dark:bg-primary-500'
})

const statusLabel = computed(() => {
  if (!props.data.isCurrentMonth) {
    return props.data.daysElapsed === props.data.daysTotal ? 'Mês encerrado' : 'Mês futuro'
  }
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'Limite estourado'
  if (pct > props.data.daysPct + 15) return 'Acima do ritmo esperado'
  if (pct > props.data.daysPct) return 'Levemente acima do esperado'
  return 'Dentro do esperado'
})

const statusTextColor = computed(() => {
  if (!props.data.isCurrentMonth) return 'text-gray-400'
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'text-rose-600 dark:text-rose-400'
  if (pct > props.data.daysPct + 15) return 'text-orange-600 dark:text-orange-400'
  return 'text-gray-500 dark:text-gray-400'
})

const paceLabel = computed(() => {
  const { pace, isCurrentMonth, daysElapsed, daysTotal, spentPct } = props.data
  if (isCurrentMonth) {
    if (spentPct !== null && spentPct >= 100) return 'Limite estourado'
    if (pace === null) return '—'
    if (Math.abs(pace) < 2) return 'No ritmo'
    return (pace > 0 ? '+' : '') + pace.toFixed(1) + '%'
  }
  if (daysElapsed === daysTotal) {
    if (spentPct === null) return '—'
    if (spentPct >= 100) return 'Estourou ' + (spentPct - 100).toFixed(0) + '%'
    return 'Dentro do limite'
  }
  if (spentPct === null) return '—'
  return spentPct.toFixed(0) + '% previsto'
})

const paceColor = computed(() => {
  const { pace, isCurrentMonth, daysElapsed, daysTotal, spentPct } = props.data
  if (isCurrentMonth) {
    if (spentPct !== null && spentPct >= 100) return 'text-rose-600 dark:text-rose-400'
    if (pace === null || Math.abs(pace) < 2) return 'text-gray-900 dark:text-white'
    if (pace > 15) return 'text-rose-600 dark:text-rose-400'
    return 'text-gray-900 dark:text-white'
  }
  if (daysElapsed === daysTotal) {
    if (spentPct === null) return 'text-gray-400'
    if (spentPct >= 100) return 'text-rose-600 dark:text-rose-400'
    return 'text-gray-900 dark:text-white'
  }
  if (spentPct === null) return 'text-gray-400'
  if (spentPct >= 95) return 'text-orange-600 dark:text-orange-400'
  return 'text-gray-900 dark:text-white'
})

const actualSavingsPct = computed(() => {
  if (props.data.income <= 0) return null
  return ((props.data.income - props.data.spent) / props.data.income) * 100
})

const actualSavingsPctColor = computed(() => {
  const pct = actualSavingsPct.value
  if (pct === null) return 'text-gray-400'
  if (pct >= (props.data.savingsPct ?? 0)) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 0) return 'text-orange-600 dark:text-orange-400'
  return 'text-rose-600 dark:text-rose-400'
})
</script>
