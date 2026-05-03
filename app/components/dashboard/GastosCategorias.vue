<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">Gastos por Categoria</h3>
      </div>
      <NuxtLink to="/relatorios" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        Ver detalhes
      </NuxtLink>
    </div>

    <div v-if="!dados.length" class="text-center py-6 text-gray-400 text-sm">
      Nenhuma despesa registrada
    </div>

    <div v-else class="flex gap-5 items-center">
      <!-- Donut menor -->
      <div class="w-28 h-28 flex-shrink-0">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>

      <!-- Lista compacta: top 6 + outros -->
      <div class="flex-1 min-w-0 space-y-1.5">
        <div
          v-for="item in visivel"
          :key="item.nome"
          class="flex items-center gap-2"
        >
          <div
            class="w-2 h-2 rounded-full flex-shrink-0"
            :style="{ background: item.cor }"
          />
          <span class="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{{ item.nome }}</span>
          <span class="text-xs font-medium text-gray-800 dark:text-gray-200 flex-shrink-0">{{ format(item.total) }}</span>
          <span class="text-xs text-gray-400 w-7 text-right flex-shrink-0">{{ pct(item.total).toFixed(0) }}%</span>
        </div>
        <div v-if="outros > 0" class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
          <span class="text-xs text-gray-400 flex-1">+{{ dados.length - MAX }} categorias</span>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">{{ format(outros) }}</span>
          <span class="text-xs text-gray-400 w-7 text-right flex-shrink-0">{{ pct(outros).toFixed(0) }}%</span>
        </div>
        <div class="flex items-center gap-2 pt-1.5 border-t border-gray-100 dark:border-gray-800 mt-1">
          <span class="text-xs font-medium text-gray-500 flex-1">Total</span>
          <span class="text-xs font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">{{ format(totalGeral) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

interface Categoria {
  nome: string
  cor: string
  icone: string
  total: number
}

const props = defineProps<{ dados: Categoria[]; period: string }>()

const { format } = useCurrency()

const MAX = 6

const totalGeral = computed(() => props.dados.reduce((s, c) => s + c.total, 0))
const visivel = computed(() => props.dados.slice(0, MAX))
const outros = computed(() => props.dados.slice(MAX).reduce((s, c) => s + c.total, 0))

function pct(valor: number) {
  return totalGeral.value > 0 ? (valor / totalGeral.value) * 100 : 0
}

const chartData = computed(() => {
  const top = props.dados.slice(0, MAX)
  const rest = props.dados.slice(MAX)
  const items = outros.value > 0
    ? [...top, { nome: 'Outros', cor: '#d1d5db', total: outros.value }]
    : top
  return {
    labels: items.map(d => d.nome),
    datasets: [{
      data: items.map(d => d.total),
      backgroundColor: items.map(d => d.cor + 'cc'),
      borderColor: items.map(d => d.cor),
      borderWidth: 1,
      hoverOffset: 4,
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.raw as number
          const p = totalGeral.value > 0 ? ((val / totalGeral.value) * 100).toFixed(1) : '0'
          return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${p}%)`
        },
      },
    },
  },
}
</script>
