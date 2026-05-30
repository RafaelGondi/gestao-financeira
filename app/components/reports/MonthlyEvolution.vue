<template>
  <div class="space-y-4">
    <!-- Summary stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-3 sm:p-4">
        <p class="text-xs text-gray-400 mb-1">Média de receitas</p>
        <p class="text-sm sm:text-lg font-bold text-emerald-900 dark:text-emerald-400 truncate">{{ format(avgIncome) }}</p>
        <p class="text-xs text-gray-400 mt-1">por mês</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-3 sm:p-4">
        <p class="text-xs text-gray-400 mb-1">Média de despesas</p>
        <p class="text-sm sm:text-lg font-bold text-rose-900 dark:text-rose-400 truncate">{{ format(avgExpenses) }}</p>
        <p class="text-xs text-gray-400 mt-1">por mês</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-3 sm:p-4">
        <p class="text-xs text-gray-400 mb-1">Saldo médio</p>
        <p class="text-sm sm:text-lg font-bold text-blue-900 dark:text-blue-400 truncate">{{ format(avgBalance) }}</p>
        <p class="text-xs text-gray-400 mt-1">por mês</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-3 sm:p-4">
        <p class="text-xs text-gray-400 mb-1">Taxa de poupança</p>
        <p
          class="text-sm sm:text-lg font-bold"
          :class="avgSavingsRate >= 0 ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400'"
        >
          {{ avgSavingsRate.toFixed(1) }}%
        </p>
        <p class="text-xs text-gray-400 mt-1">média dos meses com receita</p>
      </div>
    </div>

    <!-- Chart card -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">Evolução dos últimos 12 meses</h2>
            <p class="text-xs text-gray-400 mt-0.5">Receitas, despesas e saldo mês a mês</p>
          </div>
        </div>
        <!-- Legend -->
        <div class="flex items-center gap-4 pl-10 sm:pl-0">
          <div class="flex items-center gap-1.5">
            <div class="w-3 h-3 rounded-sm bg-emerald-500" />
            <span class="text-xs text-gray-400">Receitas</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-3 h-3 rounded-sm bg-rose-400" />
            <span class="text-xs text-gray-400">Despesas</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-3 h-0.5 bg-primary-400" />
            <span class="text-xs text-gray-400">Saldo</span>
          </div>
        </div>
      </div>

      <!-- Mobile: Y axis fixo + barras com scroll horizontal -->
      <div class="flex sm:hidden px-2 py-5" style="height: 320px">
        <div class="flex-shrink-0 w-14">
          <Bar :data="yAxisChartData" :options="yAxisOnlyOptions" />
        </div>
        <div ref="chartScroll" class="overflow-x-auto flex-1">
          <div class="h-full w-[600px]">
            <Bar :data="chartData" :options="chartOptionsMobile" />
          </div>
        </div>
      </div>
      <!-- Desktop: gráfico normal -->
      <div class="hidden sm:block px-5 py-5 h-72">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <!-- Month-by-month table -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Detalhes por mês</p>
      </div>
      <div class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="row in [...data].reverse()"
          :key="row.month"
          class="flex items-center px-3 sm:px-5 py-3 gap-2 sm:gap-4"
          :class="row.month === currentMonth ? 'bg-gray-50 dark:bg-gray-800/40' : ''"
        >
          <p class="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 w-14 sm:w-20 flex-shrink-0 capitalize">
            {{ formatMonthLabel(row.month) }}
            <span v-if="row.month === currentMonth" class="ml-1 text-xs text-gray-400 hidden sm:inline">(atual)</span>
          </p>
          <div class="flex-1 hidden sm:flex items-center min-w-0">
            <div
              class="h-1 rounded-full bg-emerald-400 dark:bg-emerald-500 flex-shrink-0"
              :style="{ width: barWidth(row.income, maxValue) }"
            />
          </div>
          <p class="text-xs sm:text-sm font-medium text-emerald-900 dark:text-emerald-400 w-20 sm:w-28 text-right flex-shrink-0">{{ format(row.income) }}</p>
          <div class="flex-1 hidden sm:flex items-center min-w-0">
            <div
              class="h-1 rounded-full bg-rose-300 dark:bg-rose-400 flex-shrink-0"
              :style="{ width: barWidth(row.expenses, maxValue) }"
            />
          </div>
          <p class="text-xs sm:text-sm font-medium text-rose-900 dark:text-rose-400 w-20 sm:w-28 text-right flex-shrink-0">{{ format(row.expenses) }}</p>
          <p class="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-400 w-20 sm:w-28 text-right flex-shrink-0">
            {{ format(row.balance) }}
          </p>
          <p
            class="text-xs sm:text-sm font-medium w-12 sm:w-16 text-right flex-shrink-0"
            :class="savingsRate(row) === null ? 'text-gray-300 dark:text-gray-600' : savingsRate(row)! >= 0 ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400'"
          >
            {{ savingsRate(row) === null ? '—' : savingsRate(row)!.toFixed(1) + '%' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  BarController,
  LineController,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(BarController, LineController, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface MonthData {
  month: string
  income: number
  expenses: number
  balance: number
}

const props = defineProps<{ data: MonthData[] }>()
const { format } = useCurrency()

const chartScroll = ref<HTMLElement | null>(null)
onMounted(() => {
  if (chartScroll.value) chartScroll.value.scrollLeft = chartScroll.value.scrollWidth
})

// Dados para o canvas do eixo Y (mesmo dataset mas invisível)
const yAxisChartData = computed(() => ({
  labels: props.data.map(d => formatMonthLabel(d.month)),
  datasets: chartData.value.datasets.map(ds => ({
    ...ds,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    pointBackgroundColor: 'transparent',
    pointBorderColor: 'transparent',
  })),
}))

const yAxisOnlyOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  layout: { padding: { top: 4, bottom: 28, left: 0, right: 0 } },
  scales: {
    x: { display: false },
    y: {
      grid: { color: 'rgba(156, 163, 175, 0.08)' },
      ticks: {
        color: '#9ca3af',
        font: { size: 10 },
        maxTicksLimit: 6,
        callback: (val: any) => `R$${(val / 1000).toFixed(0)}k`,
      },
    },
  },
} as const

const chartOptionsMobile = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  layout: { padding: { top: 4, bottom: 0, left: 0, right: 8 } },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.raw as number
          return ` ${ctx.dataset.label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9ca3af', font: { size: 11 } },
    },
    y: { display: false },
  },
} as const

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

function formatMonthLabel(monthStr: string) {
  const [year, mon] = monthStr.split('-').map(Number)
  const date = new Date(year, mon - 1, 1)
  const name = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${name}/${String(year).slice(2)}`
}

const avgIncome = computed(() => {
  const months = props.data.filter(d => d.income > 0 || d.expenses > 0)
  if (!months.length) return 0
  return months.reduce((s, d) => s + d.income, 0) / months.length
})

const avgExpenses = computed(() => {
  const months = props.data.filter(d => d.income > 0 || d.expenses > 0)
  if (!months.length) return 0
  return months.reduce((s, d) => s + d.expenses, 0) / months.length
})

const avgBalance = computed(() => avgIncome.value - avgExpenses.value)

function savingsRate(row: MonthData): number | null {
  if (row.income <= 0) return null
  return (row.balance / row.income) * 100
}

const avgSavingsRate = computed(() => {
  const months = props.data.filter(d => d.income > 0)
  if (!months.length) return 0
  return months.reduce((s, d) => s + (d.balance / d.income) * 100, 0) / months.length
})

const maxValue = computed(() => Math.max(...props.data.map(d => Math.max(d.income, d.expenses)), 1))

function barWidth(value: number, max: number) {
  return `${Math.max((value / max) * 100, 2)}%`
}

const chartData = computed(() => ({
  labels: props.data.map(d => formatMonthLabel(d.month)),
  datasets: [
    {
      type: 'bar' as const,
      label: 'Receitas',
      data: props.data.map(d => d.income),
      backgroundColor: 'rgba(52, 211, 153, 0.65)',
      borderColor: 'rgba(52, 211, 153, 0)',
      borderWidth: 0,
      borderRadius: 4,
      order: 2,
    },
    {
      type: 'bar' as const,
      label: 'Despesas',
      data: props.data.map(d => d.expenses),
      backgroundColor: 'rgba(251, 113, 133, 0.55)',
      borderColor: 'rgba(251, 113, 133, 0)',
      borderWidth: 0,
      borderRadius: 4,
      order: 2,
    },
    {
      type: 'line' as const,
      label: 'Saldo',
      data: props.data.map(d => d.balance),
      borderColor: 'rgba(99, 102, 241, 0.7)',
      backgroundColor: 'rgba(99, 102, 241, 0.04)',
      borderWidth: 1.5,
      pointRadius: 2.5,
      pointBackgroundColor: 'rgba(99, 102, 241, 0.7)',
      tension: 0.3,
      fill: false,
      order: 1,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.raw as number
          return ` ${ctx.dataset.label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#9ca3af', font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(156, 163, 175, 0.08)' },
      ticks: {
        color: '#9ca3af',
        font: { size: 11 },
        callback: (val: any) => `R$${(val / 1000).toFixed(0)}k`,
      },
    },
  },
}
</script>
