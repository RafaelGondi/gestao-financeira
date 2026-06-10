<template>
  <div class="space-y-4">
    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-80 rounded-lg" />
    </div>

    <template v-else-if="meses.length">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Saldo hoje</p>
          <p class="text-base font-bold" :style="{ color: accentColor }">{{ format(meses[0]?.saldo ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Em 6 meses</p>
          <p class="text-base font-bold text-gray-800 dark:text-gray-100">{{ format(meses[6]?.saldo ?? meses[meses.length - 1]?.saldo ?? 0) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4 col-span-2 sm:col-span-1">
          <p class="text-xs text-gray-400 mb-1">Em 12 meses</p>
          <p class="text-base font-bold text-emerald-700 dark:text-emerald-400">{{ format(meses[12]?.saldo ?? meses[meses.length - 1]?.saldo ?? 0) }}</p>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">Projeção do saldo</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              Rendimento e aportes configurados
              <template v-if="taxaAnualEfetiva != null"> · ~{{ taxaAnualEfetiva.toFixed(2) }}% a.a.</template>
            </p>
          </div>
          <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5 shrink-0">
            <button
              v-for="opt in rangeOptions"
              :key="opt.value"
              type="button"
              class="px-2.5 py-1 min-h-8 text-xs rounded-md transition-all cursor-pointer"
              :class="range === opt.value
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm font-medium'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
              @click="range = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="flex sm:hidden px-2 py-5" style="height: 300px">
          <div class="shrink-0 w-14">
            <Line :data="yAxisData" :options="yAxisOptions" />
          </div>
          <div class="overflow-x-auto flex-1">
            <div class="h-full" :style="{ width: visibleData.length * 56 + 'px', minWidth: '100%' }">
              <Line :data="chartData" :options="chartOptionsMobile" />
            </div>
          </div>
        </div>
        <div class="hidden sm:block px-5 py-5 h-80">
          <Line :data="chartData" :options="chartOptions" />
        </div>

        <div class="px-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
          <span class="flex items-center gap-1.5">
            <span class="w-6 h-0.5 inline-block rounded" :style="{ background: accentColor }" />
            Projeção
          </span>
          <span v-if="valorAlvo" class="flex items-center gap-1.5">
            <span class="w-6 h-0.5 inline-block rounded border-t-2 border-dashed border-gray-400" style="height: 0" />
            Valor alvo
          </span>
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
import { fmtPatrimonioMonth } from '~/utils/patrimonio-labels'

ChartJS.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps<{
  patrimonioId: number
  accentColor?: string
}>()

const { format } = useCurrency()
const accentColor = computed(() => props.accentColor ?? '#10b981')

const rangeOptions = [
  { label: '6m', value: 6 },
  { label: '12m', value: 12 },
  { label: '24m', value: 24 },
]
const range = ref(12)

const { data, pending, refresh } = await useFetch<{
  meses: { month: string; saldo: number; monthIndex: number }[]
  valorAlvo: number | null
  taxaAnualEfetiva: number | null
}>(() => `/api/patrimonio/${props.patrimonioId}/projecao`, {
  query: computed(() => ({ meses: 24 })),
  watch: [() => props.patrimonioId],
})

defineExpose({ refresh: () => refresh() })

const meses = computed(() => data.value?.meses ?? [])
const valorAlvo = computed(() => data.value?.valorAlvo ?? null)
const taxaAnualEfetiva = computed(() => data.value?.taxaAnualEfetiva ?? null)
const visibleData = computed(() => meses.value.slice(0, range.value + 1))

const pointColors = computed(() =>
  visibleData.value.map((d, i) => {
    if (i === 0) return props.accentColor ?? 'rgba(99, 102, 241, 0.9)'
    return d.saldo >= (visibleData.value[i - 1]?.saldo ?? d.saldo)
      ? 'rgba(16, 185, 129, 0.8)'
      : 'rgba(239, 68, 68, 0.8)'
  }),
)

const chartData = computed(() => {
  const datasets: Record<string, unknown>[] = [
    {
      label: 'Projeção',
      data: visibleData.value.map(d => d.saldo),
      borderColor: accentColor.value,
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      borderWidth: 2,
      pointRadius: visibleData.value.map((_, i) => (i === 0 ? 5 : 4)),
      pointBackgroundColor: pointColors.value,
      pointBorderColor: pointColors.value,
      tension: 0.3,
      fill: true,
    },
  ]

  if (valorAlvo.value) {
    datasets.push({
      label: 'Valor alvo',
      data: visibleData.value.map(() => valorAlvo.value),
      borderColor: 'rgba(156, 163, 175, 0.7)',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: 0,
      tension: 0,
      fill: false,
    })
  }

  return {
    labels: visibleData.value.map(d => fmtPatrimonioMonth(d.month)),
    datasets,
  }
})

const yAxisData = computed(() => ({
  labels: visibleData.value.map(d => fmtPatrimonioMonth(d.month)),
  datasets: chartData.value.datasets.map(ds => ({
    ...ds,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    pointBackgroundColor: 'transparent',
  })),
}))

const tooltipConfig = {
  callbacks: {
    label: (ctx: { raw: number | null; dataset: { label?: string } }) => {
      const val = ctx.raw
      if (val === null || val === undefined) return ''
      return ` ${ctx.dataset.label ?? 'Saldo'}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    },
    title: (items: { dataIndex?: number; label?: string }[]) => {
      const idx = items[0]?.dataIndex ?? 0
      const d = visibleData.value[idx]
      if (!d) return items[0]?.label ?? ''
      return (idx === 0 ? 'Atual — ' : '') + fmtPatrimonioMonth(d.month)
    },
  },
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: { legend: { display: false }, tooltip: tooltipConfig },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    y: {
      grid: { color: 'rgba(156, 163, 175, 0.08)' },
      ticks: {
        color: '#9ca3af',
        font: { size: 11 },
        callback: (val: number | string) => `R$${(Number(val) / 1000).toFixed(1)}k`,
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
        callback: (val: number | string) => `R$${(Number(val) / 1000).toFixed(1)}k`,
      },
    },
  },
} as const
</script>
