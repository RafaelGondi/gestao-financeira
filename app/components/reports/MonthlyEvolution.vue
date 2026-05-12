<template>
  <div class="space-y-4">
    <!-- Summary stats -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
        <p class="text-xs text-gray-400 mb-1">Média de receitas</p>
        <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ format(avgIncome) }}</p>
        <p class="text-xs text-gray-400 mt-1">por mês</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
        <p class="text-xs text-gray-400 mb-1">Média de despesas</p>
        <p class="text-lg font-bold text-red-600 dark:text-red-400">{{ format(avgExpenses) }}</p>
        <p class="text-xs text-gray-400 mt-1">por mês</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
        <p class="text-xs text-gray-400 mb-1">Saldo médio</p>
        <p class="text-lg font-bold" :class="avgBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'">
          {{ format(avgBalance) }}
        </p>
        <p class="text-xs text-gray-400 mt-1">por mês</p>
      </div>
    </div>

    <!-- Chart card -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">Evolução dos últimos 12 meses</h2>
            <p class="text-xs text-gray-400 mt-0.5">Receitas, despesas e saldo mês a mês</p>
          </div>
        </div>
        <!-- Legend -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5">
            <div class="w-3 h-3 rounded-sm bg-green-500" />
            <span class="text-xs text-gray-500">Receitas</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-3 h-3 rounded-sm bg-red-400" />
            <span class="text-xs text-gray-500">Despesas</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-3 h-0.5 bg-primary-500" />
            <span class="text-xs text-gray-500">Saldo</span>
          </div>
        </div>
      </div>

      <div class="px-5 py-5">
        <div class="h-72">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
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
          class="flex items-center px-5 py-3 gap-4"
          :class="row.month === currentMonth ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''"
        >
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 w-20 flex-shrink-0 capitalize">
            {{ formatMonthLabel(row.month) }}
            <span v-if="row.month === currentMonth" class="ml-1 text-xs text-primary-500">(atual)</span>
          </p>
          <div class="flex-1 flex items-center gap-1 min-w-0">
            <div
              class="h-1.5 rounded-full bg-green-500 flex-shrink-0"
              :style="{ width: barWidth(row.income, maxValue) }"
            />
          </div>
          <p class="text-sm font-medium text-green-600 dark:text-green-400 w-28 text-right flex-shrink-0">{{ format(row.income) }}</p>
          <div class="flex-1 flex items-center gap-1 min-w-0">
            <div
              class="h-1.5 rounded-full bg-red-400 flex-shrink-0"
              :style="{ width: barWidth(row.expenses, maxValue) }"
            />
          </div>
          <p class="text-sm font-medium text-red-600 dark:text-red-400 w-28 text-right flex-shrink-0">{{ format(row.expenses) }}</p>
          <p
            class="text-sm font-semibold w-28 text-right flex-shrink-0"
            :class="row.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'"
          >
            {{ format(row.balance) }}
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
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface MonthData {
  month: string
  income: number
  expenses: number
  balance: number
}

const props = defineProps<{ data: MonthData[] }>()
const { format } = useCurrency()

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
      backgroundColor: 'rgba(34, 197, 94, 0.7)',
      borderColor: 'rgba(34, 197, 94, 1)',
      borderWidth: 1.5,
      borderRadius: 4,
      order: 2,
    },
    {
      type: 'bar' as const,
      label: 'Despesas',
      data: props.data.map(d => d.expenses),
      backgroundColor: 'rgba(248, 113, 113, 0.7)',
      borderColor: 'rgba(248, 113, 113, 1)',
      borderWidth: 1.5,
      borderRadius: 4,
      order: 2,
    },
    {
      type: 'line' as const,
      label: 'Saldo',
      data: props.data.map(d => d.balance),
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: 'rgb(99, 102, 241)',
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
      grid: { color: 'rgba(156, 163, 175, 0.1)' },
      ticks: {
        color: '#9ca3af',
        font: { size: 11 },
        callback: (val: any) => `R$${(val / 1000).toFixed(0)}k`,
      },
    },
  },
}
</script>
