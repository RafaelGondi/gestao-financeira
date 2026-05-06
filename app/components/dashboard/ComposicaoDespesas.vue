<template>
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800" :class="compact ? 'p-5' : 'overflow-hidden'">
    <!-- Header -->
    <div
      class="flex items-center justify-between"
      :class="compact ? 'mb-4' : 'px-5 py-4 border-b border-gray-100 dark:border-gray-800'"
    >
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <h2 class="font-semibold text-gray-800 dark:text-gray-100">Composição das despesas</h2>
      </div>
      <!-- compact: link no topo; detalhado: total no topo -->
      <NuxtLink
        v-if="compact"
        to="/relatorios?aba=composicao"
        class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >Ver detalhes</NuxtLink>
      <div v-else class="text-right">
        <p class="text-xs text-gray-400">Total do mês</p>
        <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(total) }}</p>
      </div>
    </div>

    <div v-if="total === 0" class="text-center text-gray-400 text-sm" :class="compact ? 'py-6' : 'py-12'">
      Nenhuma despesa registrada neste mês
    </div>

    <template v-else>
      <!-- Donut + breakdown -->
      <div
        class="flex gap-5 items-center"
        :class="compact ? '' : 'px-5 py-5 border-b border-gray-100 dark:border-gray-800'"
      >
        <div class="w-36 h-36 flex-shrink-0">
          <Doughnut :data="chartData" :options="chartOptions" />
        </div>

        <!-- grid com barras (ambos os modos) -->
        <div class="flex-1 grid grid-cols-2 gap-x-8 gap-y-3">
          <div v-for="item in segmentos" :key="item.key" class="flex items-center gap-3 min-w-0">
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: item.cor }" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-1">
                <span class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ item.label }}</span>
                <span class="text-xs text-gray-400 flex-shrink-0">{{ pct(item.total).toFixed(0) }}%</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full transition-all" :style="{ width: pct(item.total) + '%', background: item.cor }" />
                </div>
                <span class="text-xs font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0 w-20 text-right">{{ format(item.total) }}</span>
              </div>
            </div>
          </div>
          <!-- Total no rodapé (modo compact) -->
          <div v-if="compact" class="col-span-2 flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span class="text-xs font-medium text-gray-500 flex-1">Total</span>
            <span class="text-xs font-semibold text-gray-800 dark:text-gray-100">{{ format(total) }}</span>
          </div>
        </div>
      </div>

      <!-- Accordion por segmento (modo detalhado) -->
      <template v-if="!compact">
        <div v-for="item in segmentos" :key="item.key">
          <button
            class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-t border-gray-100 dark:border-gray-800"
            @click="toggle(item.key)"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: item.cor }">
              <UIcon :name="item.icone" class="w-4 h-4 text-white" />
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">{{ item.label }}</span>
            <div class="w-full max-w-[160px] bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 hidden sm:block">
              <div class="h-1.5 rounded-full" :style="{ width: pct(item.total) + '%', background: item.cor }" />
            </div>
            <span class="text-xs text-gray-400 w-10 text-right flex-shrink-0">{{ pct(item.total).toFixed(0) }}%</span>
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 w-28 text-right flex-shrink-0">{{ format(item.total) }}</span>
            <UIcon
              :name="expanded === item.key ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-4 h-4 text-gray-400 flex-shrink-0"
            />
          </button>

          <div v-if="expanded === item.key" class="bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
            <div
              v-for="(lanc, i) in item.itens"
              :key="i"
              class="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0"
            >
              <div class="min-w-0">
                <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ lanc.descricao }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ fmtDate(lanc.data) }} · {{ lanc.origem }}<template v-if="lanc.categoria"> · {{ lanc.categoria }}</template></p>
              </div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-100 flex-shrink-0 ml-6">{{ format(lanc.valor) }}</p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

interface Item { descricao: string; valor: number; data: string; origem: string; categoria: string | null }
interface SegData { total: number; itens: Item[] }

const props = defineProps<{
  contaAvulso: SegData
  cartaoAvulso: SegData
  contaParcelado: SegData
  cartaoParcelado: SegData
  contaRecorrente: SegData
  cartaoRecorrente: SegData
  total: number
  period: string
  compact?: boolean
}>()

const { format } = useCurrency()

const segmentos = computed(() => [
  { key: 'contaAvulso',      label: 'Conta avulso',      total: props.contaAvulso.total,      itens: props.contaAvulso.itens,      cor: '#3b82f6', icone: 'i-heroicons-building-library' },
  { key: 'cartaoAvulso',     label: 'Cartão avulso',     total: props.cartaoAvulso.total,     itens: props.cartaoAvulso.itens,     cor: '#8b5cf6', icone: 'i-heroicons-credit-card' },
  { key: 'contaParcelado',   label: 'Conta parcelado',   total: props.contaParcelado.total,   itens: props.contaParcelado.itens,   cor: '#06b6d4', icone: 'i-heroicons-queue-list' },
  { key: 'cartaoParcelado',  label: 'Cartão parcelado',  total: props.cartaoParcelado.total,  itens: props.cartaoParcelado.itens,  cor: '#f59e0b', icone: 'i-heroicons-squares-2x2' },
  { key: 'contaRecorrente',  label: 'Conta recorrente',  total: props.contaRecorrente.total,  itens: props.contaRecorrente.itens,  cor: '#10b981', icone: 'i-heroicons-arrow-path' },
  { key: 'cartaoRecorrente', label: 'Cartão recorrente', total: props.cartaoRecorrente.total, itens: props.cartaoRecorrente.itens, cor: '#f43f5e', icone: 'i-heroicons-arrow-path-rounded-square' },
])

function pct(valor: number) {
  return props.total > 0 ? (valor / props.total) * 100 : 0
}

const expanded = ref<string | null>(null)
function toggle(key: string) {
  expanded.value = expanded.value === key ? null : key
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

const chartData = computed(() => ({
  labels: segmentos.value.map(s => s.label),
  datasets: [{
    data: segmentos.value.map(s => s.total),
    backgroundColor: segmentos.value.map(s => s.cor + 'cc'),
    borderColor: segmentos.value.map(s => s.cor),
    borderWidth: 1.5,
    hoverOffset: 6,
  }],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.raw as number
          const p = props.total > 0 ? ((val / props.total) * 100).toFixed(1) : '0'
          return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${p}%)`
        },
      },
    },
  },
}
</script>
