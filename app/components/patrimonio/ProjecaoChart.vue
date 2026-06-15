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
          <div class="flex items-center gap-2 shrink-0">
            <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
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
            <button
              v-if="enableSnapshots"
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

        <div v-if="enableSnapshots && snapshots && snapshots.length" class="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <span class="text-xs text-gray-400 shrink-0">Comparar com:</span>
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
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: selectedSnapshotId === snap.id ? '#818cf8' : '#9ca3af' }" />
              {{ snap.nome || fmtDate(snap.criado_em) }}
            </button>
            <button
              v-if="selectedSnapshotId"
              type="button"
              class="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
              @click="clearSnapshotSelection"
            >✕ limpar</button>
          </div>
          <button
            type="button"
            class="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0 cursor-pointer"
            @click="showManage = !showManage"
          >
            {{ showManage ? 'fechar' : 'gerenciar' }}
          </button>
        </div>

        <div v-if="enableSnapshots && showManage && snapshots?.length" class="px-5 py-3 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
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
          <span v-if="selectedSnapshotData" class="flex items-center gap-1.5">
            <span class="w-6 h-0.5 inline-block rounded border-t-2 border-dashed border-indigo-400" style="height: 0" />
            {{ selectedSnapshotData.nome || fmtDate(selectedSnapshotData.criado_em) }}
          </span>
        </div>
      </div>
    </template>

    <UModal v-if="enableSnapshots" v-model:open="showSaveModal" title="Salvar snapshot">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Salva uma foto da projeção atual para comparar com projeções futuras.
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
import { fmtPatrimonioMonth } from '~/utils/patrimonio-labels'

ChartJS.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface PatrimonioSnapshotListItem {
  id: number
  nome: string | null
  criado_em: string
  automatico: number
  taxa_anual_efetiva: number | null
  total_meses: number
}

interface PatrimonioSnapshotDado {
  mes: string
  saldo: number
  month_index: number
}

interface PatrimonioSnapshotDetail extends PatrimonioSnapshotListItem {
  dados: PatrimonioSnapshotDado[]
}

const props = defineProps<{
  patrimonioId: number
  accentColor?: string
  enableSnapshots?: boolean
}>()

const { format } = useCurrency()
const toast = useToast()
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

const snapshotsUrl = computed(() =>
  props.enableSnapshots ? `/api/patrimonio/${props.patrimonioId}/snapshots` : null,
)
const { data: snapshots, refresh: refreshSnapshots } = await useFetch<PatrimonioSnapshotListItem[]>(
  snapshotsUrl,
  { watch: [snapshotsUrl] },
)

defineExpose({ refresh: () => refresh() })

const meses = computed(() => data.value?.meses ?? [])
const valorAlvo = computed(() => data.value?.valorAlvo ?? null)
const taxaAnualEfetiva = computed(() => data.value?.taxaAnualEfetiva ?? null)
const visibleData = computed(() => meses.value.slice(0, range.value + 1))

const selectedSnapshotId = ref<number | null>(null)
const selectedSnapshotData = ref<PatrimonioSnapshotDetail | null>(null)
const showManage = ref(false)
const showSaveModal = ref(false)
const saveName = ref('')
const saving = ref(false)
const saveSuccess = ref(false)

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}

async function toggleSnapshot(id: number) {
  if (selectedSnapshotId.value === id) {
    clearSnapshotSelection()
    return
  }
  selectedSnapshotId.value = id
  const snap = await $fetch<PatrimonioSnapshotDetail>(
    `/api/patrimonio/${props.patrimonioId}/snapshots/${id}`,
  )
  selectedSnapshotData.value = snap
}

function clearSnapshotSelection() {
  selectedSnapshotId.value = null
  selectedSnapshotData.value = null
}

function openSaveModal() {
  saveName.value = ''
  showSaveModal.value = true
}

async function saveSnapshot() {
  saving.value = true
  try {
    await $fetch(`/api/patrimonio/${props.patrimonioId}/snapshots`, {
      method: 'POST',
      body: { nome: saveName.value || null, meses: 24 },
    })
    showSaveModal.value = false
    saveSuccess.value = true
    await refreshSnapshots()
    toast.add({
      title: 'Snapshot salvo!',
      description: saveName.value || 'Projeção atual registrada.',
      color: 'success',
      duration: 3000,
    })
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch {
    toast.add({ title: 'Erro ao salvar snapshot', color: 'error', duration: 3000 })
  } finally {
    saving.value = false
  }
}

async function deleteSnapshot(id: number) {
  await $fetch(`/api/patrimonio/${props.patrimonioId}/snapshots/${id}`, { method: 'DELETE' })
  if (selectedSnapshotId.value === id) clearSnapshotSelection()
  await refreshSnapshots()
}

const pointColors = computed(() =>
  visibleData.value.map((d, i) => {
    if (i === 0) return props.accentColor ?? 'rgba(99, 102, 241, 0.9)'
    return d.saldo >= (visibleData.value[i - 1]?.saldo ?? d.saldo)
      ? 'rgba(16, 185, 129, 0.8)'
      : 'rgba(239, 68, 68, 0.8)'
  }),
)

const snapshotOverlay = computed(() => {
  if (!selectedSnapshotData.value?.dados) return null
  const dadosMap = new Map(selectedSnapshotData.value.dados.map(d => [d.mes, d.saldo]))
  return visibleData.value.map(d => dadosMap.has(d.month) ? dadosMap.get(d.month) : null)
})

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
      order: 1,
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
      order: 3,
    })
  }

  if (snapshotOverlay.value) {
    datasets.push({
      label: selectedSnapshotData.value?.nome || fmtDate(selectedSnapshotData.value?.criado_em ?? ''),
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
        callback: (val: number | string) => {
          const n = Number(val)
          if (Math.abs(n) < 1000) return `R$${n.toFixed(0)}`
          return `R$${(n / 1000).toFixed(1)}k`
        },
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
        callback: (val: number | string) => {
          const n = Number(val)
          if (Math.abs(n) < 1000) return `R$${n.toFixed(0)}`
          return `R$${(n / 1000).toFixed(1)}k`
        },
      },
    },
  },
} as const
</script>
