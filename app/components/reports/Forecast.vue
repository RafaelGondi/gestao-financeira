<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-80 rounded-lg" />
    </div>

    <template v-else-if="data && data.length">
      <!-- Resumo -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Saldo hoje</p>
          <p class="text-base font-bold text-blue-900 dark:text-blue-400">{{ format(data[0].patrimonio - data[0].balance) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Em 6 meses</p>
          <p class="text-base font-bold" :class="data[5].patrimonio >= data[0].patrimonio ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400'">
            {{ format(data[5]?.patrimonio ?? 0) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4 col-span-2 sm:col-span-1">
          <p class="text-xs text-gray-400 mb-1">Em 12 meses</p>
          <p class="text-base font-bold" :class="data[11].patrimonio >= data[0].patrimonio ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400'">
            {{ format(data[11]?.patrimonio ?? 0) }}
          </p>
        </div>
      </div>

      <!-- Gráfico -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">Projeção do saldo</h2>
            <p class="text-xs text-gray-400 mt-0.5">Baseado apenas em lançamentos recorrentes e parcelamentos conhecidos</p>
          </div>
          <!-- Range selector -->
          <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
            <button
              v-for="opt in rangeOptions"
              :key="opt.value"
              type="button"
              class="px-3 py-1 text-xs rounded-md transition-all cursor-pointer"
              :class="range === opt.value
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
              @click="range = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <!-- Mobile -->
        <div class="flex sm:hidden px-2 py-5" style="height: 300px">
          <div class="flex-shrink-0 w-14">
            <Line :data="yAxisData" :options="yAxisOptions" />
          </div>
          <div class="overflow-x-auto flex-1">
            <div class="h-full" :style="{ width: visibleData.length * 56 + 'px', minWidth: '100%' }">
              <Line :data="chartData" :options="chartOptionsMobile" />
            </div>
          </div>
        </div>
        <!-- Desktop -->
        <div class="hidden sm:block px-5 py-5 h-80">
          <Line :data="chartData" :options="chartOptions" />
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

const { format } = useCurrency()

const { data, pending } = await useFetch('/api/reports/forecast')

const rangeOptions = [
  { label: '6m', value: 6 },
  { label: '12m', value: 12 },
  { label: '18m', value: 18 },
]
const range = ref(12)

const visibleData = computed(() => (data.value ?? []).slice(0, range.value))

function fmtMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const date = new Date(y, mo - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(y).slice(2)
}

// Cor de cada ponto: mês atual = azul, futuro = verde/vermelho dependendo da tendência
const pointColors = computed(() =>
  visibleData.value.map((d, i) => {
    if (i === 0) return 'rgba(99, 102, 241, 0.9)'
    return d.patrimonio >= (visibleData.value[i - 1]?.patrimonio ?? d.patrimonio)
      ? 'rgba(16, 185, 129, 0.8)'
      : 'rgba(239, 68, 68, 0.8)'
  })
)

const chartData = computed(() => ({
  labels: visibleData.value.map(d => fmtMonth(d.month)),
  datasets: [
    {
      label: 'Saldo projetado',
      data: visibleData.value.map(d => d.patrimonio),
      borderColor: 'rgba(16, 185, 129, 0.8)',
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      borderWidth: 2,
      pointRadius: visibleData.value.map((_, i) => i === 0 ? 5 : 4),
      pointBackgroundColor: pointColors.value,
      pointBorderColor: pointColors.value,
      tension: 0.3,
      fill: true,
    },
  ],
}))

const yAxisData = computed(() => ({
  labels: visibleData.value.map(d => fmtMonth(d.month)),
  datasets: chartData.value.datasets.map(ds => ({
    ...ds,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    pointBackgroundColor: 'transparent',
  })),
}))

const tooltipConfig = {
  callbacks: {
    label: (ctx: any) => {
      const val = ctx.raw as number
      return ` Saldo projetado: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    title: (items: any[]) => {
      const idx = items[0]?.dataIndex ?? 0
      const d = visibleData.value[idx]
      if (!d) return items[0]?.label ?? ''
      const prefix = idx === 0 ? '📍 Atual — ' : ''
      return prefix + fmtMonth(d.month)
    },
  },
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: tooltipConfig,
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
        callback: (val: any) => `R$${(val / 1000).toFixed(1)}k`,
      },
    },
  },
}

const chartOptionsMobile = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: { legend: { display: false }, tooltip: tooltipConfig },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    y: { display: false },
  },
}

const yAxisOptions = {
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
        callback: (val: any) => `R$${(val / 1000).toFixed(1)}k`,
      },
    },
  },
} as const
</script>
