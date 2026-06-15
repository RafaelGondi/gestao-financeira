<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2 sm:gap-4">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" to="/patrimonio" />
      <div class="flex-1 min-w-0">
        <h1 class="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{{ item?.nome }}</h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{{ item ? tipoLabel(item.tipo) : '' }}</p>
      </div>
      <UButton icon="i-heroicons-pencil" color="neutral" variant="ghost" class="shrink-0" @click="showEdit = true">
        <span class="hidden sm:inline">Editar</span>
      </UButton>
      <UButton icon="i-heroicons-plus" color="primary" class="shrink-0" @click="abrirMovimento">
        <span class="hidden sm:inline">Nova operação</span>
      </UButton>
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-32 rounded-lg" />
      <USkeleton class="h-80 rounded-lg" />
      <USkeleton v-for="i in 3" :key="i" class="h-16 rounded-lg" />
    </div>

    <UAlert v-else-if="error" color="red" variant="soft" title="Erro ao carregar item"
      :description="error.message" icon="i-heroicons-exclamation-triangle" />

    <template v-else-if="item">
      <!-- Hero card -->
      <div class="rounded-lg p-5 relative overflow-hidden" :style="{ background: `linear-gradient(135deg, ${item.cor} 0%, ${item.cor}cc 100%)` }">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-white/80 text-xs font-medium">{{ tipoLabel(item.tipo) }}</span>
              <span v-if="item.incluir_em_totais" class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white">Nos totais</span>
            </div>
            <p class="text-white text-lg font-bold mt-1 truncate">{{ item.nome }}</p>
          </div>
          <div class="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <UIcon :name="item.icone" class="w-5 h-5 text-white" />
          </div>
        </div>
        <div class="mt-4 flex items-end justify-between gap-4">
          <div>
            <p class="text-white/60 text-xs">Saldo atual</p>
            <p class="text-white text-3xl font-bold mt-0.5">{{ format(item.saldo_atual) }}</p>
          </div>
          <div v-if="item.valor_alvo" class="text-right">
            <p class="text-white/60 text-xs">Alvo</p>
            <p class="text-white text-base font-semibold">{{ format(item.valor_alvo) }}</p>
          </div>
        </div>
        <div v-if="item.valor_alvo && item.projecao.pctAlvo != null" class="mt-4">
          <div class="w-full bg-white/20 rounded-full h-1.5">
            <div class="h-1.5 rounded-full bg-white transition-all" :style="{ width: item.projecao.pctAlvo + '%' }" />
          </div>
          <p class="text-white/70 text-xs mt-1">{{ item.projecao.pctAlvo.toFixed(0) }}% do alvo</p>
        </div>
      </div>

      <!-- Resumo -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 px-3 sm:px-6 py-3 sm:py-4 grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800">
        <div class="pr-3 sm:pr-6 min-w-0">
          <p class="text-xs text-gray-400 mb-1">Em 6 meses</p>
          <p class="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">{{ format(item.projecao.meses6) }}</p>
        </div>
        <div class="px-3 sm:px-6 min-w-0">
          <p class="text-xs text-gray-400 mb-1">Em 12 meses</p>
          <p class="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 truncate">{{ format(item.projecao.meses12) }}</p>
        </div>
        <div class="px-3 sm:px-6 min-w-0 col-span-2 sm:col-span-1">
          <p class="text-xs text-gray-400 mb-1">Rendimento</p>
          <p class="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
            {{ item.projecao.taxaAnualEfetiva != null ? `${item.projecao.taxaAnualEfetiva.toFixed(2)}% a.a.` : '—' }}
          </p>
        </div>
        <div class="pl-3 sm:pl-6 min-w-0 hidden sm:block">
          <p class="text-xs text-gray-400 mb-1">Aporte</p>
          <p class="text-sm font-bold text-gray-900 dark:text-white truncate">
            {{ item.aporte_modo === 'fixo_mensal' && item.aporte_valor ? `${format(item.aporte_valor)}/mês` : 'Manual' }}
          </p>
        </div>
      </div>

      <div v-if="grupoMembros?.length" class="text-xs text-gray-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 rounded-lg px-4 py-3 flex items-start gap-3">
        <SharedBankLogo v-if="instituicaoBank" :bank="instituicaoBank" :size="28" class="rounded-md shrink-0 mt-0.5" />
        <p>
          Instituição <strong>{{ instituicaoNome }}</strong> · projeção considera saldo somado com
          {{ grupoMembros.filter(g => g.id !== item.id).map(g => g.nome).join(', ') }}
        </p>
      </div>

      <!-- Gráfico -->
      <PatrimonioProjecaoChart
        ref="chartRef"
        :patrimonio-id="item.id"
        :accent-color="item.cor"
        :enable-snapshots="item.rendimento_modo !== 'nenhum'"
      />

      <!-- Movimentos -->
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="px-5 pt-3 pb-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">Movimentações</h2>
            <p class="text-xs text-gray-400">{{ movimentosFiltrados.length }} registro(s)</p>
          </div>
          <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 w-fit">
            <button
              v-for="op in filtroOpcoes"
              :key="op.value"
              class="px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap"
              :class="filtroTipo === op.value
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="filtroTipo = op.value"
            >{{ op.label }}</button>
          </div>
        </div>

        <div v-if="!item.movimentos.length" class="text-center py-14 px-4">
          <UIcon name="i-heroicons-arrows-right-left" class="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p class="text-sm text-gray-500">Nenhuma movimentação registrada</p>
          <UButton size="sm" color="primary" variant="soft" class="mt-4 cursor-pointer" @click="abrirMovimento">Registrar operação</UButton>
        </div>

        <div v-else-if="!movimentosFiltrados.length" class="py-10 text-center text-sm text-gray-400">
          Nenhum registro neste filtro
        </div>

        <div
          v-for="(m, i) in movimentosFiltrados"
          v-else
          :key="m.id"
          class="flex items-start sm:items-center gap-3 px-3 sm:px-5 py-3 sm:py-4"
          :class="i < movimentosFiltrados.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
        >
          <div
            class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            :class="m.tipo === 'retirada' ? 'bg-rose-100 dark:bg-rose-900/30' : m.tipo === 'aporte' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'"
          >
            <UIcon
              :name="m.tipo === 'retirada' ? 'i-heroicons-arrow-up-right' : m.tipo === 'aporte' ? 'i-heroicons-arrow-down-left' : 'i-heroicons-adjustments-horizontal'"
              class="w-4 h-4"
              :class="m.tipo === 'retirada' ? 'text-rose-600' : m.tipo === 'aporte' ? 'text-emerald-600' : 'text-gray-500'"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ movDesc(m, format) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ fmtPatrimonioDate(m.data) }}{{ m.notas ? ' · ' + m.notas : '' }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <p class="text-sm font-semibold" :class="m.tipo === 'retirada' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-gray-100'">
              {{ m.tipo === 'retirada' ? '−' : m.tipo === 'aporte' ? '+' : '' }}{{ format(m.valor) }}
            </p>
            <UButton size="xs" color="error" variant="ghost" icon="i-heroicons-trash" class="cursor-pointer" @click="deleteMov(m.id)" />
          </div>
        </div>
      </div>
    </template>

    <!-- Nova operação -->
    <USlideover v-model:open="showMovimento" title="Nova operação">
      <template #body>
        <PatrimonioMovimentoForm
          v-if="item"
          ref="movFormRef"
          :patrimonio-id="item.id"
          :saldo-atual="item.saldo_atual"
          :aporte-modo="item.aporte_modo"
          :contas="contas"
          @saved="onMovimentoSaved"
          @cancel="showMovimento = false"
        />
      </template>
    </USlideover>

    <!-- Editar item -->
    <USlideover v-model:open="showEdit" title="Editar item">
      <template #body>
        <PatrimonioItemForm
          v-if="item && showEdit"
          :item="item"
          :loading="savingEdit"
          @saved="onItemSaved"
          @cancel="showEdit = false"
          @deleted="onItemDeleted"
        />
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { tipoLabel, movDesc, fmtPatrimonioDate } from '~/utils/patrimonio-labels'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { format } = useCurrency()

interface Movimento { id: number; tipo: string; valor: number; data: string; notas: string | null; transferencia_id?: number | null }
interface PatrimonioDetail {
  item: {
    id: number; nome: string; tipo: string; saldo_atual: number; valor_alvo: number | null
    incluir_em_totais: boolean; aporte_modo: string; aporte_valor: number | null
    rendimento_modo: string
    instituicao_key: string | null; grupo_rendimento: string | null; icone: string; cor: string
    projecao: { meses6: number; meses12: number; taxaAnualEfetiva: number | null; pctAlvo: number | null }
    movimentos: Movimento[]
  }
  grupoMembros?: { id: number; nome: string; saldo_atual: number }[]
}

const { data, pending, error, refresh } = await useFetch<PatrimonioDetail>(() => `/api/patrimonio/${id.value}`, {
  watch: [id],
})

const { data: contasData } = await useFetch<{ id: number; nome: string; banco: string }[]>('/api/contas')
const contas = computed(() => contasData.value ?? [])

const item = computed(() => data.value?.item)
const grupoMembros = computed(() => data.value?.grupoMembros)
const { findBank } = useBanks()
const instituicaoBank = computed(() => {
  const key = item.value?.instituicao_key
  return key ? findBank(key) : undefined
})
const instituicaoNome = computed(() => {
  if (instituicaoBank.value) return instituicaoBank.value.name
  return item.value?.grupo_rendimento ?? 'Instituição'
})

const chartRef = ref<{ refresh: () => void } | null>(null)
const movFormRef = ref<{ reset: (t?: 'ajuste' | 'aporte' | 'retirada') => void } | null>(null)
const showMovimento = ref(false)
const showEdit = ref(false)
const savingEdit = ref(false)

const filtroTipo = ref<'todos' | 'aporte' | 'retirada' | 'ajuste'>('todos')
const filtroOpcoes = [
  { value: 'todos' as const, label: 'Todos' },
  { value: 'aporte' as const, label: 'Aportes' },
  { value: 'retirada' as const, label: 'Saques' },
  { value: 'ajuste' as const, label: 'Ajustes' },
]

const movimentosFiltrados = computed(() => {
  const list = item.value?.movimentos ?? []
  if (filtroTipo.value === 'todos') return list
  return list.filter(m => m.tipo === filtroTipo.value)
})

function abrirMovimento() {
  showMovimento.value = true
  nextTick(() => movFormRef.value?.reset())
}

async function onMovimentoSaved() {
  showMovimento.value = false
  await refresh()
  chartRef.value?.refresh()
  refreshNuxtData()
}

async function onItemSaved() {
  savingEdit.value = true
  try {
    showEdit.value = false
    await refresh()
    chartRef.value?.refresh()
    refreshNuxtData()
  } finally {
    savingEdit.value = false
  }
}

async function onItemDeleted() {
  await navigateTo('/patrimonio')
}

async function deleteMov(movimentoId: number) {
  await $fetch(`/api/patrimonio/movimentos/${movimentoId}`, { method: 'DELETE' })
  await refresh()
  chartRef.value?.refresh()
  refreshNuxtData()
}

watch(item, (val) => {
  if (val) useHead({ title: `${val.nome} — Patrimônio` })
}, { immediate: true })
</script>
