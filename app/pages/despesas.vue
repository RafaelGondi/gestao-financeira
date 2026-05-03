<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Despesas</h1>
        <p class="text-sm text-gray-500 mt-1">Saídas de dinheiro por mês</p>
      </div>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Nova Despesa
      </UButton>
    </div>

    <!-- Navegador de mês -->
    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Resumo do mês -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 px-6 py-4 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
      <div class="pr-6">
        <p class="text-xs text-gray-400 mb-1">Total do mês</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(totalGeral) }}</p>
      </div>
      <div class="px-6">
        <p class="text-xs text-gray-400 mb-1">Já pago</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(totalPago) }}</p>
      </div>
      <div class="pl-6">
        <p class="text-xs text-gray-400 mb-1">A pagar</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(totalAPagar) }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- Error -->
    <UAlert v-else-if="error" color="red" variant="soft" title="Erro ao carregar despesas"
      :description="error.message" icon="i-heroicons-exclamation-triangle" />

    <!-- Empty -->
    <div v-else-if="!despesas?.length" class="text-center py-20">
      <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-arrow-trending-down" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma despesa neste mês</h3>
      <p class="text-gray-400 text-sm mb-6">Adicione saídas ou navegue para outro mês</p>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Adicionar despesa
      </UButton>
    </div>

    <template v-else>
      <div class="space-y-2">
      <!-- Despesas normais (sem cartão) -->
      <div v-if="despesasNormais.length" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div
          v-for="(despesa, i) in despesasNormais"
          :key="`${despesa.id}-${despesa.fixa}`"
          class="flex items-center gap-4 px-5 py-4"
          :class="i < despesasNormais.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
        >
          <!-- Ícone -->
          <div
            class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            :style="despesa.categoria_icone ? { background: despesa.categoria_cor } : {}"
            :class="despesa.categoria_icone ? '' : 'bg-gray-100 dark:bg-gray-800'"
          >
            <UIcon
              :name="despesa.categoria_icone ?? iconName(despesa)"
              class="w-4 h-4"
              :class="despesa.categoria_icone ? 'text-white' : 'text-gray-400'"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ despesa.descricao }}</p>
            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span class="text-xs text-gray-400">{{ descricaoData(despesa) }}</span>
              <template v-if="despesa.conta_nome">
                <span class="text-gray-300 dark:text-gray-700">·</span>
                <span class="text-xs text-gray-400">{{ despesa.conta_nome }}</span>
              </template>
              <template v-if="despesa.parcelas > 0">
                <span class="text-gray-300 dark:text-gray-700">·</span>
                <span class="text-xs text-gray-400">{{ despesa.parcela_atual }}/{{ despesa.parcelas }}</span>
              </template>
              <template v-else-if="despesa.fixa">
                <span class="text-gray-300 dark:text-gray-700">·</span>
                <span class="text-xs text-gray-400">Fixa</span>
              </template>
            </div>
          </div>

          <!-- Valor e status -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ format(despesa.valor) }}</p>
            <span
              class="text-xs px-2 py-0.5 rounded-full"
              :class="despesa.pago === 1
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'"
            >
              {{ despesa.pago === 1 ? 'Pago' : 'A pagar' }}
            </span>
          </div>

          <!-- Ações -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs"
              @click="openEditModal(despesa)" />
            <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs"
              @click="confirmDelete(despesa)" />
          </div>
        </div>
      </div>

      <!-- Grupos de fatura (cartão) -->
      <div
        v-for="grupo in gruposCartao"
        :key="grupo.cartao_id"
        class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <!-- Header do grupo -->
        <div
          class="flex items-center gap-4 px-5 py-4 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
          @click="toggleGrupo(grupo.cartao_id)"
        >
          <div class="flex-shrink-0 w-10 h-7 rounded-lg flex items-center justify-center" :style="cartaoStyle(grupo)">
            <SharedBankLogo :bank="findBank(grupo.cartao_banco_key ?? '')" :size="22" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/cartoes/${grupo.cartao_id}`"
                class="font-medium text-gray-800 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                @click.stop
              >
                Fatura {{ grupo.cartao_nome }}
              </NuxtLink>
              <span
                class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                :class="grupo.fatura?.pago
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'"
              >
                {{ grupo.fatura?.pago ? 'Paga' : 'Em aberto' }}
              </span>
            </div>
            <p v-if="grupo.fatura?.pago" class="text-xs text-gray-400 mt-0.5">
              Paga em {{ fmtDate(grupo.fatura.data_pagamento) }} · {{ grupo.fatura.conta_nome }}
            </p>
            <p v-else class="text-xs text-gray-400 mt-0.5">
              {{ grupo.despesas.length }} lançamento(s)
            </p>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <p class="text-base font-medium text-gray-800 dark:text-gray-100">{{ format(grupo.total) }}</p>
            <UIcon
              :name="expandedGrupos.has(grupo.cartao_id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-4 h-4 text-gray-400"
            />
          </div>
        </div>

        <!-- Lançamentos expandidos -->
        <div v-if="expandedGrupos.has(grupo.cartao_id)" class="border-t border-gray-100 dark:border-gray-800">
          <div
            v-for="(despesa, i) in grupo.despesas"
            :key="`${despesa.id}-${despesa.fixa}`"
            class="flex items-center gap-4 px-5 py-3 pl-16"
            :class="i < grupo.despesas.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
          >
            <div
              class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              :style="despesa.categoria_icone ? { background: despesa.categoria_cor } : {}"
              :class="despesa.categoria_icone ? '' : 'bg-gray-100 dark:bg-gray-800'"
            >
              <UIcon
                :name="despesa.categoria_icone ?? (despesa.parcelas > 0 ? 'i-heroicons-queue-list' : despesa.fixa ? 'i-heroicons-arrow-path' : 'i-heroicons-credit-card')"
                class="w-3.5 h-3.5"
                :class="despesa.categoria_icone ? 'text-white' : 'text-gray-400'"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 dark:text-gray-100 truncate">{{ despesa.descricao }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-xs text-gray-400">{{ descricaoData(despesa) }}</span>
                <template v-if="despesa.parcelas > 0">
                  <span class="text-gray-300 dark:text-gray-700">·</span>
                  <span class="text-xs text-gray-400">{{ despesa.parcela_atual }}/{{ despesa.parcelas }}</span>
                </template>
                <template v-else-if="despesa.fixa">
                  <span class="text-gray-300 dark:text-gray-700">·</span>
                  <span class="text-xs text-gray-400">Fixa</span>
                </template>
              </div>
            </div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100 flex-shrink-0">{{ format(despesa.valor) }}</p>
            <div class="flex items-center gap-1 flex-shrink-0">
              <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs"
                @click="openEditModal(despesa)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs"
                @click="confirmDelete(despesa)" />
            </div>
          </div>
        </div>
      </div>

      </div>
    </template>

    <!-- Modal Add/Edit -->
    <USlideover v-model:open="showModal" :title="editingDespesa ? 'Editar Despesa' : 'Nova Despesa'" :dismissible="false">
      <template #body>
        <DespesasDespesaForm
          :initial="editingDespesa"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </template>
    </USlideover>

    <!-- Modal Delete -->
    <UModal v-model:open="showDeleteModal" title="Excluir Despesa">
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir
            <strong class="text-gray-900 dark:text-white">{{ deletingDespesa?.descricao }}</strong>?
          </p>
          <template v-if="deletingDespesa?.fixa">
            <div class="flex flex-col gap-2">
              <UButton
                variant="soft"
                color="neutral"
                :loading="deleting"
                icon="i-heroicons-calendar-days"
                class="w-full justify-start"
                @click="handleDelete('one')"
              >
                Remover só {{ deletingDespesa.parcelas > 0 ? 'esta parcela' : 'este mês' }}
              </UButton>
              <UButton
                color="red"
                :loading="deleting"
                icon="i-heroicons-trash"
                class="w-full justify-start"
                @click="handleDelete('all')"
              >
                Remover {{ deletingDespesa.parcelas > 0 ? 'todas as parcelas' : 'todos os meses' }}
              </UButton>
            </div>
            <UButton variant="ghost" color="neutral" class="w-full" @click="showDeleteModal = false">Cancelar</UButton>
          </template>
          <template v-else>
            <div class="flex justify-end gap-3">
              <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancelar</UButton>
              <UButton color="red" :loading="deleting" @click="handleDelete('all')">Excluir</UButton>
            </div>
          </template>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface Despesa {
  id: number
  descricao: string
  valor: number
  data: string
  data_inicio: string | null
  data_fim: string | null
  categoria: string | null
  categoria_cor: string | null
  categoria_icone: string | null
  fixa: number
  parcelas: number
  parcela_atual: number | null
  pago: number
  conta_id: number | null
  conta_nome: string | null
  banco_key: string | null
  cartao_id: number | null
  cartao_nome: string | null
  cartao_banco_key: string | null
  cartao_cor: string | null
}

interface Fatura {
  id: number
  cartao_id: number
  mes: string
  pago: number
  conta_id: number | null
  conta_nome: string | null
  data_pagamento: string | null
}

interface GrupoCartao {
  cartao_id: number
  cartao_nome: string
  cartao_banco_key: string | null
  cartao_cor: string | null
  total: number
  fatura: Fatura | null
  despesas: Despesa[]
}

const { format } = useCurrency()
const { findBank } = useBanks()

function cartaoStyle(grupo: GrupoCartao) {
  const color = grupo.cartao_cor ?? findBank(grupo.cartao_banco_key ?? '')?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)` }
}

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data: despesas, pending, error, refresh } = await useFetch<Despesa[]>('/api/despesas', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth]
})

const { data: faturas, refresh: refreshFaturas } = await useFetch<Fatura[]>('/api/faturas', {
  query: computed(() => ({ mes: currentMonth.value })),
  watch: [currentMonth]
})

const expandedGrupos = reactive(new Set<number>())

function toggleGrupo(cartaoId: number) {
  if (expandedGrupos.has(cartaoId)) expandedGrupos.delete(cartaoId)
  else expandedGrupos.add(cartaoId)
}

const despesasNormais = computed(() =>
  (despesas.value ?? []).filter(d => !d.cartao_id)
)

const gruposCartao = computed<GrupoCartao[]>(() => {
  const map = new Map<number, GrupoCartao>()
  for (const d of despesas.value ?? []) {
    if (!d.cartao_id) continue
    if (!map.has(d.cartao_id)) {
      const fatura = (faturas.value ?? []).find(f => f.cartao_id === d.cartao_id) ?? null
      map.set(d.cartao_id, {
        cartao_id: d.cartao_id,
        cartao_nome: d.cartao_nome ?? `Cartão ${d.cartao_id}`,
        cartao_banco_key: d.cartao_banco_key,
        cartao_cor: d.cartao_cor,
        total: 0,
        fatura,
        despesas: []
      })
    }
    const grupo = map.get(d.cartao_id)!
    grupo.total += d.valor
    grupo.despesas.push(d)
  }
  return [...map.values()].map(g => ({
    ...g,
    despesas: [...g.despesas].sort((a, b) => b.data.localeCompare(a.data))
  }))
})

const totalGeral = computed(() => (despesas.value ?? []).reduce((s, d) => s + d.valor, 0))

const totalPago = computed(() => {
  const normalPago = despesasNormais.value.filter(d => d.pago === 1).reduce((s, d) => s + d.valor, 0)
  const faturasPago = gruposCartao.value.filter(g => g.fatura?.pago).reduce((s, g) => s + g.total, 0)
  return normalPago + faturasPago
})

const totalAPagar = computed(() => Math.round((totalGeral.value - totalPago.value) * 100) / 100)

function fmtDate(d: string | null) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function descricaoData(d: Despesa) {
  if (d.fixa) {
    const dia = d.data_inicio?.split('-')[2]
    return `Todo dia ${dia}${d.data_fim ? ' · até ' + fmtDate(d.data_fim) : ''}`
  }
  return fmtDate(d.data)
}

function badgeLabel(d: Despesa) {
  return d.pago === 1 ? 'Pago' : 'A pagar'
}

function badgeColor(d: Despesa): any {
  return d.pago === 1 ? 'success' : 'warning'
}

function iconName(d: Despesa) {
  if (d.fixa) return d.pago === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'
  return d.pago === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-clock'
}

function iconBg(d: Despesa) {
  return d.pago === 1
    ? 'bg-green-100 dark:bg-green-900/30'
    : d.fixa
      ? 'bg-blue-100 dark:bg-blue-900/30'
      : 'bg-yellow-100 dark:bg-yellow-900/30'
}

function iconColor(d: Despesa) {
  return d.pago === 1
    ? 'text-green-600 dark:text-green-400'
    : d.fixa
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-yellow-600 dark:text-yellow-400'
}

const showModal = ref(false)
const editingDespesa = ref<Despesa | null>(null)
const saving = ref(false)
const showDeleteModal = ref(false)
const deletingDespesa = ref<Despesa | null>(null)
const deleting = ref(false)

function openAddModal() { editingDespesa.value = null; showModal.value = true }
function openEditModal(d: Despesa) { editingDespesa.value = { ...d }; showModal.value = true }
function closeModal() { showModal.value = false; editingDespesa.value = null }
function confirmDelete(d: Despesa) { deletingDespesa.value = d; showDeleteModal.value = true }

async function handleSubmit(data: any) {
  saving.value = true
  try {
    if (editingDespesa.value?.id)
      await $fetch(`/api/despesas/${editingDespesa.value.id}`, { method: 'PUT', body: data })
    else
      await $fetch('/api/despesas', { method: 'POST', body: data })
    await refresh()
    await refreshFaturas()
    closeModal()
  } finally {
    saving.value = false
  }
}

async function handleDelete(scope: 'one' | 'all') {
  if (!deletingDespesa.value) return
  deleting.value = true
  try {
    const params: Record<string, string> = { scope }
    if (scope === 'one') params.month = currentMonth.value
    await $fetch(`/api/despesas/${deletingDespesa.value.id}`, { method: 'DELETE', query: params })
    await refresh()
    await refreshFaturas()
    showDeleteModal.value = false
    deletingDespesa.value = null
  } finally {
    deleting.value = false
  }
}

useHead({ title: 'Despesas — Gestão Financeira' })
</script>
