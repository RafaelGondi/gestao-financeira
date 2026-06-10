<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Patrimônio</h1>
        <p class="text-sm text-gray-500 mt-1">FGTS, consórcio, investimentos e reservas fora do fluxo de caixa</p>
      </div>
      <UButton
        v-if="!showForm"
        icon="i-heroicons-plus"
        size="sm"
        color="primary"
        variant="soft"
        class="cursor-pointer"
        @click="openForm()"
      >Novo item</UButton>
    </div>

    <!-- CDI -->
    <div v-if="data?.cdi && temItemComCdi" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs text-gray-400 mb-1">CDI usado nas projeções</p>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {{ data.cdi.anual.toFixed(2) }}% a.a.
            <span class="text-gray-400 font-normal">
              · {{ data.cdi.fonte === 'bcb' ? 'BCB' : 'estimativa' }}
              <template v-if="data.cdi.dataReferencia"> ({{ data.cdi.dataReferencia }})</template>
            </span>
          </p>
          <p class="text-xs text-gray-500 mt-1.5">
            Projeções CDI usam a taxa mensal real do BCB (série 4391), mês a mês — {{ data.cdi.mensalMeses }} meses de histórico, repetidos no futuro.
          </p>
        </div>
        <div v-if="data.cdi.mensalHistorico.length" class="text-xs text-gray-500">
          <p class="text-gray-400 mb-1">Últimos meses (% a.m.)</p>
          <div class="flex flex-wrap gap-x-3 gap-y-0.5">
            <span v-for="m in data.cdi.mensalHistorico" :key="m.mes">
              {{ fmtMonth(m.mes) }}: {{ m.taxaAm.toFixed(2) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Totais -->
    <div v-if="data?.itens.length" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
        <p class="text-xs text-gray-400 mb-1">Saldo atual (todos)</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(data.totais.atual) }}</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
        <p class="text-xs text-gray-400 mb-1">Projeção em 12 meses</p>
        <p class="text-xl font-bold text-emerald-700 dark:text-emerald-400">{{ format(data.totais.projecao12) }}</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-4">
        <p class="text-xs text-gray-400 mb-1">Incluídos nos totais gerais</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(data.totais.incluidoTotais) }}</p>
        <p class="text-xs text-gray-400 mt-1">Itens marcados entram nos totais de dashboard e relatórios</p>
      </div>
    </div>

    <!-- Formulário novo item -->
    <div v-if="showForm" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-5">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Novo item</h2>
      <PatrimonioItemForm @saved="onItemCreated" @cancel="showForm = false" />
    </div>

    <!-- Empty -->
    <div v-if="!pending && !data?.itens.length && !showForm" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 py-16 flex flex-col items-center gap-3 text-center">
      <UIcon name="i-lucide-landmark" class="w-10 h-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-500">Nenhum item registrado</p>
      <p class="text-xs text-gray-400 max-w-sm">Cadastre FGTS, consórcio ou investimentos externos. Por padrão não entram no fluxo de caixa nem nos relatórios existentes.</p>
    </div>

    <!-- Cards -->
    <div v-if="data?.itens.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="item in data.itens"
        :key="item.id"
        :to="`/patrimonio/${item.id}`"
        class="group block bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" :style="{ background: item.cor }">
            <UIcon :name="item.icone" class="w-5 h-5 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">{{ item.nome }}</h3>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{{ tipoLabel(item.tipo) }}</span>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">{{ format(item.saldo_atual) }}</p>
            <div class="flex items-center justify-between mt-3 gap-2">
              <p class="text-xs text-gray-400">
                12m: <span class="text-emerald-600 dark:text-emerald-400 font-medium">{{ format(item.projecao.meses12) }}</span>
              </p>
              <p class="text-xs text-gray-400">{{ item.movimentos.length }} mov.</p>
            </div>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-1" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { tipoLabel, fmtPatrimonioMonth } from '~/utils/patrimonio-labels'

const { format } = useCurrency()

interface PatrimonioItem {
  id: number; nome: string; tipo: string; saldo_atual: number
  icone: string; cor: string; rendimento_modo: string
  movimentos: unknown[]
  projecao: { meses12: number }
}

interface PatrimonioResponse {
  cdi: {
    anual: number
    dataReferencia: string | null
    fonte: 'bcb' | 'fallback'
    mensalHistorico: { mes: string; taxaAm: number }[]
    mensalMeses: number
  }
  totais: { atual: number; incluidoTotais: number; projecao12: number }
  itens: PatrimonioItem[]
}

const { data, pending, refresh } = await useFetch<PatrimonioResponse>('/api/patrimonio')

const temItemComCdi = computed(() =>
  data.value?.itens.some(i => i.rendimento_modo === 'cdi_pct' || i.rendimento_modo === 'cdi_faixas') ?? false,
)

const showForm = ref(false)

function openForm() {
  showForm.value = true
}

async function onItemCreated() {
  showForm.value = false
  await refresh()
  refreshNuxtData()
}

function fmtMonth(ym: string) {
  return fmtPatrimonioMonth(ym)
}

useHead({ title: 'Patrimônio — Gestão Financeira' })
</script>
