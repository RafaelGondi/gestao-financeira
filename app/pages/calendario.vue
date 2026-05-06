<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Calendário de gastos</h1>
      <p class="text-sm text-gray-500 mt-1">Visualize seus padrões de consumo ao longo do mês</p>
    </div>

    <!-- Month Navigator -->
    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-96 rounded-lg" />
    </div>

    <template v-else>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <!-- Card header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-800 dark:text-gray-100">{{ periodLabel }}</h2>
              <p class="text-xs text-gray-400 mt-0.5">Dias com gasto marcados em cor</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-400">Dias com gasto</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">
              {{ diasComGasto }} <span class="text-sm font-normal text-gray-400">/ {{ totalDiasMes }}</span>
            </p>
          </div>
        </div>

        <div class="px-5 py-4">
          <!-- Header dias da semana -->
          <div class="grid grid-cols-7 mb-2">
            <div v-for="d in ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']" :key="d"
              class="text-center text-xs text-gray-400 font-medium py-1">{{ d }}</div>
          </div>

          <!-- Grid do calendário -->
          <div class="grid grid-cols-7 gap-1.5 relative" ref="calendarRef">
            <!-- Células vazias de offset -->
            <div v-for="i in calendarOffset" :key="'offset-' + i" />

            <!-- Células dos dias -->
            <div
              v-for="day in totalDiasMes"
              :key="day"
              class="aspect-square rounded-lg flex flex-col items-start justify-start p-1.5 transition-transform hover:scale-105 cursor-default"
              :class="diasCalendario.has(day) ? '' : 'bg-gray-50 dark:bg-gray-800/30 border border-dashed border-gray-100 dark:border-gray-800'"
              :style="cellStyle(day)"
              @mouseenter="showCalTooltip(day, $event)"
              @mouseleave="calTooltip.visible = false"
            >
              <span
                class="text-xs leading-none font-medium"
                :class="diasCalendario.has(day) ? 'text-white' : 'text-gray-300 dark:text-gray-600'"
              >{{ day }}</span>
            </div>

            <!-- Tooltip -->
            <div
              v-if="calTooltip.visible"
              class="absolute z-50 bg-gray-900 dark:bg-gray-700 text-white rounded-lg px-3 py-2.5 pointer-events-none shadow-lg"
              style="min-width: 160px"
              :style="{ left: calTooltip.x + 'px', top: calTooltip.y + 'px', transform: 'translate(-50%, calc(-100% - 8px))' }"
            >
              <p class="text-xs text-gray-400 mb-1">{{ calTooltip.date }}</p>
              <p class="text-sm font-semibold mb-2">{{ format(calTooltip.total) }}</p>
              <div class="space-y-1">
                <div v-for="cat in calTooltip.categorias.slice(0, 4)" :key="cat.nome" class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: cat.cor }" />
                  <span class="text-xs text-gray-300 truncate flex-1">{{ cat.nome }}</span>
                  <span class="text-xs text-gray-400 flex-shrink-0">{{ format(cat.total) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div class="pr-4 text-center">
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ streakAtual }}</p>
              <p class="text-xs text-gray-400 mt-0.5">dias sem compra (atual)</p>
            </div>
            <div class="px-4 text-center">
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ maiorStreak }}</p>
              <p class="text-xs text-gray-400 mt-0.5">maior streak sem compra</p>
            </div>
            <div class="pl-4 text-center">
              <p class="text-xl font-bold text-gray-900 dark:text-white">{{ diaMaxGasto > 0 ? `Dia ${diaMaxGasto}` : '—' }}</p>
              <p class="text-xs text-gray-400 mt-0.5">dia com mais gasto</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { format } = useCurrency()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data: calData, pending } = await useFetch('/api/relatorios/calendario', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth],
})

const mesesPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const periodLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `1 de ${mesesPt[m - 1]} – ${lastDay} de ${mesesPt[m - 1]} ${y}`
})

const totalDiasMes = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  return new Date(y, m, 0).getDate()
})

const calendarOffset = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const dow = new Date(y, m - 1, 1).getDay()
  return dow === 0 ? 6 : dow - 1
})

const diasCalendario = computed(() => {
  const map = new Map<number, { total: number; cor: string; categorias: { nome: string; total: number; cor: string }[] }>()
  for (const d of calData.value?.dias ?? []) map.set(d.day, d)
  return map
})

const maxDayTotal = computed(() => {
  let max = 0
  for (const [, e] of diasCalendario.value) if (e.total > max) max = e.total
  return max
})

const diasComGasto = computed(() => diasCalendario.value.size)

function cellStyle(day: number) {
  const entry = diasCalendario.value.get(day)
  if (!entry || maxDayTotal.value === 0) return {}
  const opacity = 0.2 + (entry.total / maxDayTotal.value) * 0.75
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0')
  return { background: entry.cor + alpha }
}

const streakAtual = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m
  const endDay = isCurrentMonth ? today.getDate() : totalDiasMes.value
  let streak = 0
  for (let d = endDay; d >= 1; d--) {
    if (diasCalendario.value.has(d)) break
    streak++
  }
  return streak
})

const maiorStreak = computed(() => {
  let max = 0, cur = 0
  for (let d = 1; d <= totalDiasMes.value; d++) {
    if (!diasCalendario.value.has(d)) { cur++; max = Math.max(max, cur) }
    else cur = 0
  }
  return max
})

const diaMaxGasto = computed(() => {
  let maxDay = 0, maxTotal = 0
  for (const [day, entry] of diasCalendario.value) {
    if (entry.total > maxTotal) { maxTotal = entry.total; maxDay = day }
  }
  return maxDay
})

const calendarRef = ref<HTMLElement | null>(null)
const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const calTooltip = reactive({
  visible: false,
  date: '',
  total: 0,
  categorias: [] as { nome: string; total: number; cor: string }[],
  x: 0,
  y: 0,
})

function showCalTooltip(day: number, event: MouseEvent) {
  const entry = diasCalendario.value.get(day)
  if (!entry) return
  const target = event.currentTarget as HTMLElement
  const calEl = calendarRef.value
  if (!calEl) return
  const calRect = calEl.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const [y, m] = currentMonth.value.split('-').map(Number)
  const dow = new Date(y, m - 1, day).getDay()
  calTooltip.date = `${diasSemana[dow]}, ${day} de ${mesesPt[m - 1]}`
  calTooltip.total = entry.total
  calTooltip.categorias = entry.categorias
  calTooltip.x = targetRect.left - calRect.left + targetRect.width / 2
  calTooltip.y = targetRect.top - calRect.top
  calTooltip.visible = true
}

useHead({ title: 'Calendário de gastos — Gestão Financeira' })
</script>
