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
      <!-- Card principal -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="px-5 pt-5 pb-4">
          <!-- Cabeçalho -->
          <div class="flex items-start justify-between mb-5">
            <div>
              <p class="text-xs text-gray-400 mb-0.5">Dia {{ data.daysElapsed }} de {{ data.daysTotal }} — {{ monthLabel }}</p>
              <h2 class="font-semibold text-gray-800 dark:text-gray-100">
                {{ data.limitType === 'porcentagem'
                  ? `Meta: poupar ${data.savingsPct}% da receita`
                  : 'Teto de gastos mensais' }}
              </h2>
            </div>
            <!-- Progresso dos dias -->
            <div class="text-right flex-shrink-0 ml-4">
              <p class="text-xs text-gray-400 mb-1.5">{{ data.daysPct.toFixed(0) }}% do mês</p>
              <div class="w-28 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div class="h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 transition-all" :style="{ width: data.daysPct + '%' }" />
              </div>
            </div>
          </div>

          <!-- Valores principais -->
          <div class="flex items-end gap-2 mb-4">
            <div>
              <p class="text-xs text-gray-400 mb-1">Gasto até hoje</p>
              <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ format(data.spent) }}</p>
            </div>
            <p class="text-lg text-gray-300 dark:text-gray-600 mb-0.5">de</p>
            <div class="mb-0.5">
              <p class="text-xl font-semibold text-gray-400 dark:text-gray-500">{{ format(data.limit!) }}</p>
            </div>
          </div>

          <!-- Barra de progresso de gastos -->
          <div class="mb-1.5">
            <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 relative overflow-hidden">
              <!-- Marcador do ritmo esperado (linha do dia) -->
              <div
                class="absolute top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600 z-10"
                :style="{ left: data.daysPct + '%' }"
              />
              <!-- Barra de gasto -->
              <div
                class="h-3 rounded-full transition-all"
                :class="barColor"
                :style="{ width: Math.min(data.spentPct!, 100) + '%' }"
              />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-xs" :class="statusTextColor">{{ statusLabel }}</p>
            <p class="text-xs text-gray-400">{{ data.spentPct!.toFixed(1) }}% do limite</p>
          </div>
        </div>
      </div>

      <!-- Cards de detalhe -->
      <div class="grid grid-cols-3 gap-4">
        <!-- Restante -->
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Saldo disponível</p>
          <p class="text-xl font-bold" :class="data.remaining! >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-900 dark:text-rose-400'">
            {{ data.remaining! >= 0 ? format(data.remaining!) : '−' + format(Math.abs(data.remaining!)) }}
          </p>
          <p class="text-xs text-gray-400 mt-1">para {{ data.daysRemaining }} dias restantes</p>
        </div>

        <!-- Ritmo diário disponível -->
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Pode gastar por dia</p>
          <p
            class="text-xl font-bold"
            :class="(data.dailyAllowance ?? 0) >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-900 dark:text-rose-400'"
          >
            {{ data.dailyAllowance !== null && data.dailyAllowance >= 0
              ? format(data.dailyAllowance)
              : data.daysRemaining === 0 ? '—' : 'Estourado' }}
          </p>
          <p class="text-xs text-gray-400 mt-1">nos dias restantes</p>
        </div>

        <!-- Ritmo vs esperado -->
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Ritmo de gasto</p>
          <p class="text-xl font-bold" :class="paceColor">
            {{ paceLabel }}
          </p>
          <p class="text-xs text-gray-400 mt-1">vs ritmo uniforme esperado</p>
        </div>
      </div>

      <!-- Info porcentagem -->
      <div v-if="data.limitType === 'porcentagem'" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <p class="text-xs text-gray-400 mb-1">Receita do mês</p>
          <p class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ format(data.income) }}</p>
        </div>
        <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        <div>
          <p class="text-xs text-gray-400 mb-1">Meta de poupança</p>
          <p class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ data.savingsPct }}%</p>
        </div>
        <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
        <div>
          <p class="text-xs text-gray-400 mb-1">Teto de gastos</p>
          <p class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ format(data.limit!) }}</p>
        </div>
        <div class="w-px h-8 bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
        <div>
          <p class="text-xs text-gray-400 mb-1">Poupança efetiva</p>
          <div class="flex items-baseline gap-1.5">
            <p class="text-base font-semibold" :class="actualSavingsPctColor">
              {{ actualSavingsPct !== null ? actualSavingsPct.toFixed(1) + '%' : '—' }}
            </p>
            <p v-if="actualSavingsPct !== null" class="text-xs" :class="actualSavingsPctColor">
              (meta: {{ data.savingsPct }}%)
            </p>
          </div>
          <p v-if="actualSavingsPct !== null" class="text-xs text-gray-400 mt-0.5">
            {{ format(data.income - data.spent) }} poupados até agora
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface BudgetData {
  month: string
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

// Cores e labels baseados em quanto do limite já foi consumido vs posição no mês
const barColor = computed(() => {
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'bg-rose-400 dark:bg-rose-600'
  if (pct > props.data.daysPct + 10) return 'bg-orange-300 dark:bg-orange-500'
  return 'bg-emerald-400 dark:bg-emerald-600'
})

const statusLabel = computed(() => {
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'Limite estourado'
  if (pct > props.data.daysPct + 10) return 'Acima do ritmo esperado'
  if (pct > props.data.daysPct) return 'Levemente acima do esperado'
  return 'Dentro do esperado'
})

const statusTextColor = computed(() => {
  const pct = props.data.spentPct ?? 0
  if (pct >= 100) return 'text-rose-900 dark:text-rose-400'
  if (pct > props.data.daysPct + 10) return 'text-orange-900 dark:text-orange-400'
  return 'text-emerald-900 dark:text-emerald-400'
})

const paceLabel = computed(() => {
  const p = props.data.pace
  if (p === null) return '—'
  if (Math.abs(p) < 2) return 'No ritmo'
  return (p > 0 ? '+' : '') + p.toFixed(1) + '%'
})

const actualSavingsPct = computed(() => {
  if (props.data.income <= 0) return null
  return ((props.data.income - props.data.spent) / props.data.income) * 100
})

const actualSavingsPctColor = computed(() => {
  const pct = actualSavingsPct.value
  if (pct === null) return 'text-gray-400'
  if (pct >= (props.data.savingsPct ?? 0)) return 'text-emerald-900 dark:text-emerald-400'
  if (pct >= 0) return 'text-orange-900 dark:text-orange-400'
  return 'text-rose-900 dark:text-rose-400'
})

const paceColor = computed(() => {
  const p = props.data.pace
  if (p === null || Math.abs(p) < 2) return 'text-gray-900 dark:text-white'
  if (p > 10) return 'text-rose-900 dark:text-rose-400'
  if (p > 0) return 'text-orange-900 dark:text-orange-400'
  return 'text-emerald-900 dark:text-emerald-400'
})
</script>
