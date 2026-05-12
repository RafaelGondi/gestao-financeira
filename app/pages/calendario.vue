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
      <div class="flex gap-5 items-start">
        <!-- Calendário -->
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden min-w-0 flex-1">
          <!-- Card header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <h2 class="font-semibold text-gray-800 dark:text-gray-100">{{ periodLabel }}</h2>
                <p class="text-xs text-gray-400 mt-0.5">Clique em um dia para ver os detalhes</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <!-- Filtro de tipo -->
              <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  v-for="op in filtroOpcoes"
                  :key="op.value"
                  class="px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer"
                  :class="filtroTipo === op.value
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                  @click="filtroTipo = op.value"
                >{{ op.label }}</button>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-400">Dias com gasto</p>
                <p class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ diasComGasto }} <span class="text-sm font-normal text-gray-400">/ {{ totalDiasMes }}</span>
                </p>
              </div>
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
                class="aspect-square rounded-lg flex flex-col items-start justify-start p-1.5 transition-transform hover:scale-105"
                :class="[
                  diasCalendario.has(day)
                    ? 'cursor-pointer'
                    : isFuture(day)
                      ? 'bg-gray-50/40 dark:bg-gray-800/10 border border-dashed border-gray-100 dark:border-gray-800/50 cursor-pointer opacity-40'
                      : streakDays.has(day)
                        ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 cursor-pointer'
                        : 'bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 cursor-pointer',
                  selectedDay === day ? 'ring-2 ring-offset-1 ring-gray-900 dark:ring-white' : isToday(day) ? 'ring-2 ring-offset-1 ring-primary-500' : '',
                ]"
                :style="cellStyle(day)"
                @click="selectDay(day)"
                @mouseenter="showCalTooltip(day, $event)"
                @mouseleave="calTooltip.visible = false"
              >
                <div class="flex items-center gap-1">
                  <span
                    class="text-xs leading-none font-bold"
                    :class="diasCalendario.has(day) ? 'text-white' : isToday(day) ? 'text-primary-600 dark:text-primary-400' : isFuture(day) ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'"
                  >{{ day }}</span>
                  <span
                    v-if="isToday(day)"
                    class="text-[9px] leading-none font-medium"
                    :class="diasCalendario.has(day) ? 'text-white/50' : 'text-gray-400 dark:text-gray-500'"
                  >hoje</span>
                  <UIcon
                    v-if="streakDays.has(day) && !diasCalendario.has(day)"
                    name="i-lucide-leaf"
                    class="w-2.5 h-2.5 text-amber-400 dark:text-amber-500"
                  />
                </div>
              </div>

              <!-- Tooltip hover -->
              <div
                v-if="calTooltip.visible && selectedDay === null"
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
                <p class="text-xl font-bold" :class="streakAtual > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-900 dark:text-white'">{{ streakAtual }}</p>
                <p class="text-xs mt-0.5" :class="streakAtual > 0 ? 'text-amber-400/80 dark:text-amber-600' : 'text-gray-400'">dias sem compra (atual)</p>
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

        <!-- Painel de detalhes do dia selecionado -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 translate-x-4"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 translate-x-4"
        >
          <div
            v-if="selectedDay && selectedEntry"
            class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden w-80 flex-shrink-0 sticky top-24 self-start"
          >
            <!-- Header do painel -->
            <div class="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  :style="{ background: selectedEntry.cor + '33' }"
                >
                  <span class="text-sm font-bold" :style="{ color: selectedEntry.cor }">{{ selectedDay }}</span>
                </div>
                <div>
                  <h3 class="font-semibold text-sm text-gray-800 dark:text-gray-100">{{ selectedDayLabel }}</h3>
                  <p class="text-xs text-gray-400 mt-0.5">{{ selectedEntry.itens.length }} {{ selectedEntry.itens.length === 1 ? 'transação' : 'transações' }}</p>
                </div>
              </div>
              <button
                class="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                @click="selectedDay = null"
              >
                <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Total -->
            <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <p class="text-xs text-gray-400">Total do dia</p>
              <p class="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{{ format(selectedEntry.total) }}</p>
            </div>

            <!-- Lista de transações -->
            <div class="divide-y divide-gray-100 dark:divide-gray-800 max-h-96 overflow-y-auto">
              <div
                v-for="(item, i) in selectedEntry.itens"
                :key="i"
                class="flex items-center gap-3 px-4 py-3"
              >
                <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: item.cor }">
                  <UIcon :name="item.icone" class="w-4 h-4 text-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ item.descricao }}</p>
                  <p class="text-xs text-gray-400 mt-0.5 truncate">{{ item.categoria }} · {{ item.origem }}</p>
                </div>
                <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0 ml-2">{{ format(item.valor) }}</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { format } = useCurrency()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

interface CalItem { descricao: string; valor: number; categoria: string; cor: string; icone: string; origem: string; tipo: string }
interface CalDay {
  day: number
  total: number
  cor: string
  categorias: { nome: string; total: number; cor: string }[]
  itens: CalItem[]
}

const { data: calData, pending } = await useFetch<{ dias: CalDay[]; totalDias: number }>('/api/relatorios/calendario', {
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

type FiltroTipo = 'tudo' | 'avulsa' | 'parcelada' | 'fixa'
const filtroTipo = ref<FiltroTipo>('tudo')
watch(currentMonth, () => { filtroTipo.value = 'tudo' })

const filtroOpcoes: { value: FiltroTipo; label: string }[] = [
  { value: 'tudo',      label: 'Tudo' },
  { value: 'avulsa',    label: 'Avulso' },
  { value: 'parcelada', label: 'Parcelas' },
  { value: 'fixa',      label: 'Fixo' },
]

const diasCalendario = computed(() => {
  const map = new Map<number, CalDay>()
  for (const d of calData.value?.dias ?? []) {
    if (filtroTipo.value === 'tudo') {
      map.set(d.day, d)
      continue
    }
    const itensFiltrados = d.itens.filter(i => i.tipo === filtroTipo.value)
    if (!itensFiltrados.length) continue

    // Reconstrói totais e categorias com os itens filtrados
    const totalFiltrado = itensFiltrados.reduce((s, i) => s + i.valor, 0)
    const catMap = new Map<string, { total: number; cor: string }>()
    for (const i of itensFiltrados) {
      if (!catMap.has(i.categoria)) catMap.set(i.categoria, { total: 0, cor: i.cor })
      catMap.get(i.categoria)!.total += i.valor
    }
    const categorias = [...catMap.entries()]
      .map(([nome, { total, cor }]) => ({ nome, total, cor }))
      .sort((a, b) => b.total - a.total)

    map.set(d.day, { ...d, itens: itensFiltrados, total: totalFiltrado, categorias, cor: categorias[0].cor })
  }
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

// Seleção de dia
const selectedDay = ref<number | null>(null)
const selectedEntry = computed(() => selectedDay.value ? diasCalendario.value.get(selectedDay.value) ?? null : null)
const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  const [y, m] = currentMonth.value.split('-').map(Number)
  const dow = new Date(y, m - 1, selectedDay.value).getDay()
  return `${diasSemana[dow]}, ${selectedDay.value} de ${mesesPt[m - 1]}`
})

function selectDay(day: number) {
  if (!diasCalendario.value.has(day)) return
  selectedDay.value = selectedDay.value === day ? null : day
  calTooltip.visible = false
}

watch(currentMonth, () => { selectedDay.value = null })

const todayStr = new Date().toISOString().split('T')[0]
function isToday(day: number) {
  const [y, m] = currentMonth.value.split('-')
  return `${y}-${m}-${String(day).padStart(2, '0')}` === todayStr
}
function isFuture(day: number) {
  const [y, m] = currentMonth.value.split('-')
  return `${y}-${m}-${String(day).padStart(2, '0')}` > todayStr
}

// Stats
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

const streakDays = computed(() => {
  const set = new Set<number>()
  if (streakAtual.value === 0) return set
  const [y, m] = currentMonth.value.split('-').map(Number)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m
  const endDay = isCurrentMonth ? today.getDate() : totalDiasMes.value
  for (let d = endDay; d > endDay - streakAtual.value; d--) {
    if (d >= 1) set.add(d)
  }
  return set
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

// Tooltip hover
const calendarRef = ref<HTMLElement | null>(null)
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
