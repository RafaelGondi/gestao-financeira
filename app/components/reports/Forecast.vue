<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-16 rounded-lg" />
      <USkeleton class="h-80 rounded-lg" />
    </div>

    <template v-else-if="meses.length">
      <!-- Resumo -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Saldo hoje</p>
          <p class="text-base font-bold text-blue-900 dark:text-blue-400">{{ format(saldoHoje) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
          <p class="text-xs text-gray-400 mb-1">Em 6 meses</p>
          <p class="text-base font-bold" :class="meses[5].patrimonio >= meses[0].patrimonio ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400'">
            {{ format(meses[5]?.patrimonio ?? 0) }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4 col-span-2 sm:col-span-1">
          <p class="text-xs text-gray-400 mb-1">Em 12 meses</p>
          <p class="text-base font-bold" :class="meses[11].patrimonio >= meses[0].patrimonio ? 'text-emerald-900 dark:text-emerald-400' : 'text-rose-900 dark:text-rose-400'">
            {{ format(meses[11]?.patrimonio ?? 0) }}
          </p>
        </div>
      </div>

      <!-- Gráfico -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">Projeção do saldo</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              Baseado em lançamentos recorrentes e parcelamentos conhecidos
              <template v-if="rendimento">
                · Juros: 105% CDI ({{ rendimento.cdiAnual.toFixed(2) }}% a.a. → {{ rendimento.taxaAnualEfetiva.toFixed(2) }}% a.a.)
              </template>
            </p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
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
            <!-- Salvar snapshot -->
            <button
              type="button"
              :disabled="saving"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:opacity-50"
              :class="saveSuccess
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400'"
              @click="openSaveModal"
            >
              <UIcon :name="saveSuccess ? 'i-heroicons-check' : 'i-heroicons-camera'" class="w-3.5 h-3.5" />
              {{ saveSuccess ? 'Salvo!' : 'Snapshot' }}
            </button>
          </div>
        </div>

        <!-- Comparação com snapshot -->
        <div v-if="snapshots && snapshots.length" class="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <span class="text-xs text-gray-400 flex-shrink-0">Comparar com:</span>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="snap in snapshots"
              :key="snap.id"
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer"
              :class="selectedSnapshotId === snap.id
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="toggleSnapshot(snap.id)"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: selectedSnapshotId === snap.id ? '#818cf8' : '#9ca3af' }" />
              {{ snap.nome || fmtDate(snap.criado_em) }}
            </button>
            <!-- Botão limpar seleção -->
            <button
              v-if="selectedSnapshotId"
              type="button"
              class="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              @click="selectedSnapshotId = null"
            >✕ limpar</button>
          </div>
          <!-- Botão gerenciar (apagar) -->
          <button
            type="button"
            class="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 cursor-pointer"
            @click="showManage = !showManage"
          >
            {{ showManage ? 'fechar' : 'gerenciar' }}
          </button>
        </div>

        <!-- Gerenciar snapshots -->
        <div v-if="showManage && snapshots?.length" class="px-5 py-3 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Snapshots salvos</p>
          <div class="space-y-1.5">
            <div
              v-for="snap in snapshots"
              :key="snap.id"
              class="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400"
            >
              <span>
                <span class="font-medium">{{ snap.nome || 'Sem nome' }}</span>
                <span class="text-gray-400 ml-2">{{ fmtDate(snap.criado_em) }} · {{ snap.total_meses }} meses</span>
                <span v-if="snap.automatico" class="ml-1.5 px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 rounded text-gray-400">auto</span>
              </span>
              <button
                type="button"
                class="text-red-400 hover:text-red-600 cursor-pointer p-0.5"
                @click="deleteSnapshot(snap.id)"
              >
                <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
              </button>
            </div>
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

        <!-- Legenda -->
        <div class="px-5 pb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
          <span class="flex items-center gap-1.5">
            <span class="w-6 h-0.5 bg-emerald-500 inline-block rounded" />
            Previsão
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-6 h-0.5 inline-block rounded border-t-2 border-dashed border-amber-500" style="height: 0" />
            105% CDI
          </span>
          <span v-if="selectedSnapshotData" class="flex items-center gap-1.5">
            <span class="w-6 h-0.5 inline-block rounded border-t-2 border-dashed border-indigo-400" style="height: 0" />
            {{ selectedSnapshotData.nome || fmtDate(selectedSnapshotData.criado_em) }}
          </span>
        </div>
      </div>
    </template>

    <!-- Modal salvar snapshot -->
    <UModal v-model:open="showSaveModal" title="Salvar snapshot">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Salva uma foto da previsão atual para comparar com previsões futuras.
          </p>
          <UFormField label="Nome (opcional)">
            <UInput
              v-model="saveName"
              placeholder="Ex: Início do segundo semestre"
              class="w-full"
              @keyup.enter="saveSnapshot"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showSaveModal = false">Cancelar</UButton>
          <UButton color="primary" :loading="saving" @click="saveSnapshot">
            <UIcon name="i-heroicons-camera" class="w-4 h-4 mr-1" />
            Salvar
          </UButton>
        </div>
      </template>
    </UModal>
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
const toast = useToast()

interface RendimentoInfo {
  multiplicadorCdi: number
  cdiAnual: number
  taxaAnualEfetiva: number
  taxaMensal: number
  dataReferencia: string | null
  fonte: 'bcb' | 'fallback'
}

interface ForecastMonth {
  month: string
  patrimonio: number
  patrimonioComJuros: number
  balance: number
}

const { data, pending, refresh: refreshForecast } = await useFetch<{
  saldoHoje: number
  meses: ForecastMonth[]
  rendimento: RendimentoInfo
}>('/api/reports/forecast')
const { data: snapshots, refresh: refreshSnapshots } = await useFetch('/api/snapshots')

const saldoHoje = computed(() => data.value?.saldoHoje ?? 0)
const meses = computed(() => data.value?.meses ?? [])
const rendimento = computed(() => data.value?.rendimento ?? null)

const rangeOptions = [
  { label: '6m', value: 6 },
  { label: '12m', value: 12 },
  { label: '18m', value: 18 },
]
const range = ref(12)

const visibleData = computed(() => meses.value.slice(0, range.value))

// --- Snapshot state ---
const selectedSnapshotId = ref<number | null>(null)
const selectedSnapshotData = ref<any>(null)
const showManage = ref(false)
const showSaveModal = ref(false)
const saveName = ref('')
const saving = ref(false)
const saveSuccess = ref(false)

async function toggleSnapshot(id: number) {
  if (selectedSnapshotId.value === id) {
    selectedSnapshotId.value = null
    selectedSnapshotData.value = null
    return
  }
  selectedSnapshotId.value = id
  const snap = await $fetch(`/api/snapshots/${id}`)
  selectedSnapshotData.value = snap
}

function openSaveModal() {
  saveName.value = ''
  showSaveModal.value = true
}

async function saveSnapshot() {
  saving.value = true
  try {
    await $fetch('/api/snapshots', {
      method: 'POST',
      body: { nome: saveName.value || null },
    })
    showSaveModal.value = false
    saveSuccess.value = true
    await refreshSnapshots()
    toast.add({ title: 'Snapshot salvo!', description: saveName.value || 'Previsão atual registrada.', color: 'success', duration: 3000 })
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch {
    toast.add({ title: 'Erro ao salvar snapshot', color: 'error', duration: 3000 })
  } finally {
    saving.value = false
  }
}

async function deleteSnapshot(id: number) {
  await $fetch(`/api/snapshots/${id}`, { method: 'DELETE' })
  if (selectedSnapshotId.value === id) {
    selectedSnapshotId.value = null
    selectedSnapshotData.value = null
  }
  await refreshSnapshots()
}

// --- Formatação ---
function fmtMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  const date = new Date(y, mo - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(y).slice(2)
}

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}

// --- Cores dos pontos ---
const pointColors = computed(() =>
  visibleData.value.map((d, i) => {
    if (i === 0) return 'rgba(99, 102, 241, 0.9)'
    return d.patrimonio >= (visibleData.value[i - 1]?.patrimonio ?? d.patrimonio)
      ? 'rgba(16, 185, 129, 0.8)'
      : 'rgba(239, 68, 68, 0.8)'
  })
)

// Linha de overlay do snapshot selecionado
const snapshotOverlay = computed(() => {
  if (!selectedSnapshotData.value?.dados) return null
  const dadosMap = new Map(selectedSnapshotData.value.dados.map((d: any) => [d.mes, d.patrimonio]))
  return visibleData.value.map(d => dadosMap.has(d.month) ? dadosMap.get(d.month) : null)
})

const chartData = computed(() => {
  const datasets: any[] = [
    {
      label: 'Previsão',
      data: visibleData.value.map(d => d.patrimonio),
      borderColor: 'rgba(16, 185, 129, 0.8)',
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      borderWidth: 2,
      pointRadius: visibleData.value.map((_, i) => i === 0 ? 5 : 4),
      pointBackgroundColor: pointColors.value,
      pointBorderColor: pointColors.value,
      tension: 0.3,
      fill: true,
      order: 1,
    },
    {
      label: '105% CDI',
      data: visibleData.value.map(d => d.patrimonioComJuros),
      borderColor: 'rgba(245, 158, 11, 0.85)',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 3,
      pointBackgroundColor: 'rgba(245, 158, 11, 0.75)',
      pointBorderColor: 'rgba(245, 158, 11, 0.75)',
      tension: 0.3,
      fill: false,
      order: 3,
    },
  ]

  if (snapshotOverlay.value) {
    datasets.push({
      label: selectedSnapshotData.value?.nome || fmtDate(selectedSnapshotData.value?.criado_em),
      data: snapshotOverlay.value,
      borderColor: 'rgba(129, 140, 248, 0.7)',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 4],
      pointRadius: 3,
      pointBackgroundColor: 'rgba(129, 140, 248, 0.6)',
      pointBorderColor: 'rgba(129, 140, 248, 0.6)',
      tension: 0.3,
      fill: false,
      order: 2,
    })
  }

  return {
    labels: visibleData.value.map(d => fmtMonth(d.month)),
    datasets,
  }
})

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
      if (val === null || val === undefined) return ''
      const label = ctx.dataset.label || 'Saldo'
      return ` ${label}: R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
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
