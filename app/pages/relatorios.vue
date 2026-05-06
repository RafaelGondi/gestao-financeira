<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
      <p class="text-sm text-gray-500 mt-1">Análise detalhada das suas finanças</p>
    </div>

    <!-- Month Navigator -->
    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Abas -->
    <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 w-fit">
      <button
        v-for="aba in abas"
        :key="aba.key"
        class="px-4 py-1.5 text-sm font-medium rounded-md transition-all"
        :class="abaAtiva === aba.key
          ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="abaAtiva = aba.key"
      >{{ aba.label }}</button>
    </div>

    <!-- Loading -->
    <div v-if="pending || pendingComposicao" class="space-y-3">
      <USkeleton class="h-64 rounded-lg" />
    </div>

    <!-- Aba: Por Categoria / Supercategoria -->
    <template v-else-if="abaAtiva === 'categoria' && data">
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <!-- Card header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <UIcon name="i-heroicons-chart-pie" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-800 dark:text-gray-100">Gastos por {{ modo === 'categoria' ? 'Categoria' : 'Supercategoria' }}</h2>
              <p class="text-xs text-gray-400 mt-0.5">{{ periodLabel }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                :class="modo === 'categoria' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                @click="setModo('categoria')"
              >Categoria</button>
              <button
                class="px-3 py-1 text-xs font-medium rounded-md transition-all"
                :class="modo === 'supercategoria' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                @click="setModo('supercategoria')"
              >Supercategoria</button>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400">Total do mês</p>
              <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(data.totalDespesas) }}</p>
            </div>
          </div>
        </div>

        <!-- Donut + totals -->
        <div v-if="dadosAtivos.length" class="flex gap-6 items-center px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div class="w-36 h-36 flex-shrink-0">
            <Doughnut :data="chartData" :options="chartOptions" />
          </div>
          <div class="flex-1 grid grid-cols-2 gap-x-6 gap-y-2">
            <div v-for="item in dadosAtivos.slice(0, 6)" :key="item.nome" class="flex items-center gap-2 min-w-0">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: item.cor }" />
              <span class="text-xs text-gray-500 truncate">{{ item.nome }}</span>
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300 ml-auto flex-shrink-0">{{ pct(item.total).toFixed(0) }}%</span>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!dadosAtivos.length" class="text-center py-12 text-gray-400 text-sm">
          Nenhuma despesa registrada neste mês
        </div>

        <!-- Accordion -->
        <div v-for="item in dadosAtivos" :key="item.nome">
          <button
            class="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-t border-gray-100 dark:border-gray-800 first:border-t-0"
            @click="toggle(item.nome)"
          >
            <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: item.cor }">
              <UIcon :name="item.icone" class="w-4 h-4 text-white" />
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">{{ item.nome }}</span>
            <div class="w-full max-w-[160px] bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 hidden sm:block">
              <div class="h-1.5 rounded-full" :style="{ width: pct(item.total) + '%', background: item.cor }" />
            </div>
            <span class="text-xs text-gray-400 w-10 text-right flex-shrink-0">{{ pct(item.total).toFixed(0) }}%</span>
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 w-28 text-right flex-shrink-0">{{ format(item.total) }}</span>
            <UIcon
              :name="expanded === item.nome ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-4 h-4 text-gray-400 flex-shrink-0"
            />
          </button>
          <div v-if="expanded === item.nome" class="bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
            <div
              v-for="lanc in item.itens"
              :key="lanc.id"
              class="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-0"
            >
              <div class="min-w-0">
                <p class="text-sm text-gray-700 dark:text-gray-300 truncate">{{ lanc.descricao }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ fmtDate(lanc.data) }} · {{ lanc.origem }}</p>
              </div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-100 flex-shrink-0 ml-6">{{ format(lanc.valor) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Aba: Composição -->
    <template v-else-if="abaAtiva === 'composicao' && composicaoData">
      <DashboardComposicaoDespesas
        :conta-avulso="composicaoData.contaAvulso"
        :cartao-avulso="composicaoData.cartaoAvulso"
        :conta-parcelado="composicaoData.contaParcelado"
        :cartao-parcelado="composicaoData.cartaoParcelado"
        :conta-recorrente="composicaoData.contaRecorrente"
        :cartao-recorrente="composicaoData.cartaoRecorrente"
        :total="composicaoData.total"
        :period="periodLabel"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

const { format } = useCurrency()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const abas = [
  { key: 'categoria',  label: 'Por Categoria' },
  { key: 'composicao', label: 'Composição' },
]
const route = useRoute()
const abaAtiva = ref<'categoria' | 'composicao'>(
  route.query.aba === 'composicao' ? 'composicao' : 'categoria'
)

const { data, pending } = await useFetch('/api/relatorios', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth],
})

const { data: composicaoData, pending: pendingComposicao } = await useFetch('/api/dashboard/composicao', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth],
})

const expanded = ref<string | null>(null)
const modo = ref<'categoria' | 'supercategoria'>('categoria')

function toggle(nome: string) {
  expanded.value = expanded.value === nome ? null : nome
}

function setModo(m: 'categoria' | 'supercategoria') {
  modo.value = m
  expanded.value = null
}

watch(currentMonth, () => { expanded.value = null })

const dadosAtivos = computed(() =>
  modo.value === 'categoria'
    ? (data.value?.gastosPorCategoria ?? [])
    : (data.value?.gastosPorSupercategoria ?? [])
)

const mesesPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const periodLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `1 de ${mesesPt[m - 1]} – ${lastDay} de ${mesesPt[m - 1]} ${y}`
})

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

const totalGeral = computed(() => data.value?.totalDespesas ?? 0)
function pct(valor: number) {
  return totalGeral.value > 0 ? (valor / totalGeral.value) * 100 : 0
}

const chartData = computed(() => {
  const items = dadosAtivos.value
  return {
    labels: items.map(d => d.nome),
    datasets: [{
      data: items.map(d => d.total),
      backgroundColor: items.map(d => d.cor + 'cc'),
      borderColor: items.map(d => d.cor),
      borderWidth: 1.5,
      hoverOffset: 6,
    }],
  }
})

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
          return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${pct(val).toFixed(1)}%)`
        },
      },
    },
  },
}

useHead({ title: 'Relatórios — Gestão Financeira' })
</script>
