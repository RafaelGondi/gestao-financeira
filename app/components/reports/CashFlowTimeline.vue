<template>
  <div class="space-y-4">
    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-80 rounded-lg" />
    </div>

    <template v-else-if="data">
      <!-- Alerta de risco -->
      <div
        v-if="data.diasNegativos > 0"
        class="flex items-start gap-3 px-4 py-3 rounded-lg border"
        :class="data.saldoMinimo < 0
          ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'"
      >
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-5 h-5 flex-shrink-0 mt-0.5"
          :class="data.saldoMinimo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'"
        />
        <div>
          <p class="text-sm font-medium" :class="data.saldoMinimo < 0 ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'">
            {{ data.saldoMinimo < 0 ? 'Atenção: saldo negativo previsto' : 'Saldo baixo previsto' }}
          </p>
          <p class="text-xs mt-0.5" :class="data.saldoMinimo < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'">
            O pior momento é no dia {{ data.saldoMinimoDia }} ({{ fmtDate(data.saldoMinimoDate!) }}) com {{ format(data.saldoMinimo) }}.
            {{ data.diasNegativos === 1 ? '1 dia' : `${data.diasNegativos} dias` }} do mês ficam no vermelho.
          </p>
        </div>
      </div>

      <!-- Cards resumo -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Saldo inicial</p>
          <p class="text-base font-bold text-gray-800 dark:text-gray-100">{{ format(data.saldoInicial) }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">Dia 1</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">{{ isCurrentMonth ? 'Saldo hoje' : 'Saldo no fim' }}</p>
          <p class="text-base font-bold" :class="saldoClass(isCurrentMonth ? data.saldoAtual : data.saldoFinal)">
            {{ format(isCurrentMonth ? data.saldoAtual : data.saldoFinal) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Pior saldo</p>
          <p class="text-base font-bold" :class="saldoClass(data.saldoMinimo)">{{ format(data.saldoMinimo) }}</p>
          <p v-if="data.saldoMinimoDia" class="text-[10px] text-gray-400 mt-0.5">Dia {{ data.saldoMinimoDia }}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Saldo fim do mês</p>
          <p class="text-base font-bold" :class="saldoClass(data.saldoFimMes)">{{ format(data.saldoFimMes) }}</p>
          <p class="text-[10px] mt-0.5" :class="deltaFimMes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
            {{ deltaFimMes >= 0 ? '+' : '' }}{{ format(deltaFimMes) }} vs início
          </p>
        </div>
      </div>

      <!-- Gráfico -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 class="font-semibold text-gray-800 dark:text-gray-100">Saldo dia a dia</h2>
          <p class="text-xs text-gray-400 mt-0.5">
            Evolução do saldo bancário considerando entradas e saídas na data prevista de cada lançamento
          </p>
        </div>
        <div class="hidden sm:block px-5 py-5 h-72">
          <Line :key="month" :data="chartData" :options="chartOptions" :plugins="chartPlugins" />
        </div>
        <div class="sm:hidden px-2 py-5" style="height: 260px">
          <Line :key="month" :data="chartData" :options="chartOptionsMobile" :plugins="chartPlugins" />
        </div>
        <div class="px-5 pb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span class="flex items-center gap-1.5">
            <span class="w-6 h-0.5 bg-indigo-500 inline-block rounded" />
            Saldo acumulado
          </span>
          <span v-if="todayIndex >= 0" class="flex items-center gap-1.5">
            <span class="w-3 h-3 border-l-2 border-dashed border-gray-400 inline-block" />
            Hoje
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 inline-block rounded-sm" />
            Saldo negativo
          </span>
        </div>
      </div>

      <!-- Dias críticos + detalhe -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Dias com saldo negativo ou eventos grandes -->
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100">Dias críticos</h3>
            <p class="text-xs text-gray-400 mt-0.5">Dias em que o saldo fica negativo ou cai abaixo de R$ 500</p>
          </div>
          <div v-if="!diasCriticos.length" class="px-5 py-8 text-center text-sm text-gray-400">
            Nenhum dia crítico neste mês
          </div>
          <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <button
              v-for="dia in diasCriticos"
              :key="dia.date"
              type="button"
              class="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer text-left"
              :class="selectedDay?.date === dia.date ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''"
              @click="selectedDay = dia"
            >
              <div>
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
                  Dia {{ dia.day }} · {{ fmtShortDate(dia.date) }}
                  <span v-if="dia.isToday" class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">hoje</span>
                </p>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ dia.eventos.length }} movimentação{{ dia.eventos.length !== 1 ? 'ões' : '' }}
                </p>
              </div>
              <span class="text-sm font-semibold" :class="saldoClass(dia.saldo)">{{ format(dia.saldo) }}</span>
            </button>
          </div>
        </div>

        <!-- Detalhe do dia selecionado -->
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100">
              {{ selectedDay ? `Dia ${selectedDay.day} — ${fmtShortDate(selectedDay.date)}` : 'Detalhe do dia' }}
            </h3>
            <p v-if="selectedDay" class="text-xs text-gray-400 mt-0.5">
              Saldo ao fim do dia: <span class="font-medium" :class="saldoClass(selectedDay.saldo)">{{ format(selectedDay.saldo) }}</span>
            </p>
          </div>
          <div v-if="!selectedDay" class="px-5 py-8 text-center text-sm text-gray-400">
            Selecione um dia para ver as movimentações
          </div>
          <div v-else-if="!selectedDay.eventos.length" class="px-5 py-8 text-center text-sm text-gray-400">
            Nenhuma movimentação neste dia
          </div>
          <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <div
              v-for="(ev, i) in selectedDay.eventos"
              :key="i"
              class="flex items-center justify-between px-5 py-3"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  :class="ev.tipo === 'receita'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                    : 'bg-rose-100 dark:bg-rose-900/30'"
                >
                  <UIcon
                    :name="ev.tipo === 'receita' ? 'i-heroicons-arrow-down-circle' : 'i-heroicons-arrow-up-circle'"
                    class="w-4 h-4"
                    :class="ev.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                  />
                </div>
                <div class="min-w-0">
                  <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ ev.descricao }}</p>
                  <p class="text-xs text-gray-400">{{ ev.realizado ? 'Realizado' : 'Previsto' }}</p>
                </div>
              </div>
              <span
                class="text-sm font-medium flex-shrink-0 ml-3"
                :class="ev.tipo === 'receita' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'"
              >
                {{ ev.tipo === 'receita' ? '+' : '−' }}{{ format(ev.valor) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'

ChartJS.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface CashFlowEvent {
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'fatura'
  realizado: boolean
}

interface CashFlowDay {
  day: number
  date: string
  entradas: number
  saidas: number
  saldo: number
  eventos: CashFlowEvent[]
  isPast: boolean
  isToday: boolean
  isNegative: boolean
}

interface TimelineData {
  month: string
  saldoInicial: number
  saldoAtual: number
  saldoFinal: number
  saldoMinimo: number
  saldoMinimoDia: number | null
  saldoMinimoDate: string | null
  diasNegativos: number
  saldoFimMes: number
  dias: CashFlowDay[]
}

const props = defineProps<{ month: string }>()

const { format } = useCurrency()
const { localDateStr } = useLocalDate()

const { data, pending } = await useFetch<TimelineData>('/api/reports/cash-flow-timeline', {
  query: computed(() => ({ month: props.month })),
  watch: [() => props.month],
})

const selectedDay = ref<CashFlowDay | null>(null)

watch(data, (d) => {
  if (!d) return
  const critico = d.dias.find(day => day.isNegative) ?? d.dias.find(day => day.isToday) ?? d.dias[0]
  selectedDay.value = critico ?? null
}, { immediate: true })

const isCurrentMonth = computed(() => props.month === localDateStr().slice(0, 7))
const deltaFimMes = computed(() => (data.value?.saldoFimMes ?? 0) - (data.value?.saldoInicial ?? 0))

const diasCriticos = computed(() =>
  (data.value?.dias ?? []).filter(d => d.isNegative || d.saldo < 500)
)

const todayIndex = computed(() => (data.value?.dias ?? []).findIndex(d => d.isToday))

function saldoClass(val: number) {
  if (val < 0) return 'text-rose-700 dark:text-rose-400'
  if (val < 500) return 'text-amber-700 dark:text-amber-400'
  return 'text-emerald-700 dark:text-emerald-400'
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmtShortDate(d: string) {
  const [, m, day] = d.split('-')
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${Number(day)} ${meses[Number(m) - 1]}`
}

const pointColors = computed(() =>
  (data.value?.dias ?? []).map(d => {
    if (d.isToday) return 'rgba(99, 102, 241, 0.9)'
    if (d.isNegative) return 'rgba(239, 68, 68, 0.8)'
    return 'rgba(16, 185, 129, 0.7)'
  })
)

/** Escala Y: ancora em zero quando o saldo é positivo, evitando parecer "quase zero". */
const yScaleBounds = computed(() => {
  const saldos = data.value?.dias.map(d => d.saldo) ?? []
  if (!saldos.length) return { min: 0 as number | undefined, max: undefined as number | undefined }

  const min = Math.min(...saldos)
  const max = Math.max(...saldos)
  const range = max - min
  const padding = Math.max(range * 0.1, max * 0.02, 500)

  if (min >= 0) {
    return { min: 0, max: max + padding }
  }

  return { min: min - padding, max: max + padding }
})

const chartData = computed(() => ({
  labels: (data.value?.dias ?? []).map(d => String(d.day)),
  datasets: [
    {
      label: 'Saldo',
      data: (data.value?.dias ?? []).map(d => d.saldo),
      borderColor: 'rgba(99, 102, 241, 0.8)',
      backgroundColor: (ctx: any) => {
        const chart = ctx.chart
        const { ctx: c, chartArea } = chart
        if (!chartArea) return 'rgba(99, 102, 241, 0.06)'
        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.12)')
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)')
        return gradient
      },
      borderWidth: 2,
      pointRadius: (data.value?.dias ?? []).map(d => d.isToday ? 6 : 3),
      pointBackgroundColor: pointColors.value,
      pointBorderColor: pointColors.value,
      tension: 0.25,
      fill: true,
    },
  ],
}))

const todayLinePlugin = {
  id: 'todayLine',
  afterDraw(chart: any) {
    const idx = todayIndex.value
    if (idx < 0) return
    const { ctx, chartArea, scales } = chart
    const x = scales.x.getPixelForValue(idx)
    ctx.save()
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()
    ctx.restore()
  },
}

const zeroLinePlugin = {
  id: 'zeroLine',
  afterDraw(chart: any) {
    const { ctx, chartArea, scales } = chart
    const yZero = scales.y.getPixelForValue(0)
    if (yZero < chartArea.top || yZero > chartArea.bottom) return
    ctx.save()
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(chartArea.left, yZero)
    ctx.lineTo(chartArea.right, yZero)
    ctx.stroke()
    ctx.restore()
  },
}

const chartPlugins = [todayLinePlugin, zeroLinePlugin]

const tooltipConfig = {
  callbacks: {
    title: (items: any[]) => {
      const idx = items[0]?.dataIndex ?? 0
      const d = data.value?.dias[idx]
      if (!d) return items[0]?.label ?? ''
      return `Dia ${d.day}${d.isToday ? ' (hoje)' : ''}`
    },
    label: (ctx: any) => {
      const val = ctx.raw as number
      return ` Saldo: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    afterBody: (items: any[]) => {
      const idx = items[0]?.dataIndex ?? 0
      const d = data.value?.dias[idx]
      if (!d?.eventos.length) return []
      return d.eventos.slice(0, 3).map(e =>
        ` ${e.tipo === 'receita' ? '+' : '−'}${e.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${e.descricao}`
      )
    },
  },
}

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: tooltipConfig,
  },
  onClick: (_: any, elements: any[]) => {
    if (!elements.length || !data.value) return
    const idx = elements[0].index
    selectedDay.value = data.value.dias[idx] ?? null
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9ca3af', font: { size: 11 }, maxTicksLimit: 15 },
    },
    y: {
      min: yScaleBounds.value.min,
      max: yScaleBounds.value.max,
      grid: { color: 'rgba(156, 163, 175, 0.08)' },
      ticks: {
        color: '#9ca3af',
        font: { size: 11 },
        callback: (val: any) => `R$${(val / 1000).toFixed(1)}k`,
      },
    },
  },
}))

const chartOptionsMobile = computed(() => ({
  ...chartOptions.value,
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 }, maxTicksLimit: 10 } },
    y: {
      min: yScaleBounds.value.min,
      max: yScaleBounds.value.max,
      grid: { color: 'rgba(156, 163, 175, 0.08)' },
      ticks: { color: '#9ca3af', font: { size: 10 }, maxTicksLimit: 5, callback: (val: any) => `${(val / 1000).toFixed(0)}k` },
    },
  },
}))

</script>
