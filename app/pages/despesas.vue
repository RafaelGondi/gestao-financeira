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
    <div class="bg-white dark:bg-gray-900 rounded-2xl px-6 py-4 shadow-sm border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Resumo do mês -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard class="border-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-arrow-trending-down" class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Total do mês</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(totalGeral) }}</p>
          </div>
        </div>
      </UCard>
      <UCard class="border-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Já pago</p>
            <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ format(totalPago) }}</p>
          </div>
        </div>
      </UCard>
      <UCard class="border-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">A pagar</p>
            <p class="text-lg font-bold text-yellow-600 dark:text-yellow-400">{{ format(totalAPagar) }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" />
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

    <!-- Lista -->
    <div v-else class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div
        v-for="(despesa, i) in despesas"
        :key="`${despesa.id}-${despesa.fixa}`"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < despesas.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
      >
        <!-- Ícone -->
        <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" :class="iconBg(despesa)">
          <UIcon :name="iconName(despesa)" class="w-5 h-5" :class="iconColor(despesa)" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-medium text-gray-900 dark:text-white truncate">{{ despesa.descricao }}</p>
            <UBadge v-if="despesa.parcelas > 0" :label="`${despesa.parcela_atual}/${despesa.parcelas}`" color="purple" variant="soft" size="xs"
              icon="i-heroicons-queue-list" />
            <UBadge v-else-if="despesa.fixa" label="Fixa" color="info" variant="soft" size="xs"
              icon="i-heroicons-arrow-path" />
          </div>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-400">{{ descricaoData(despesa) }}</span>
            <span v-if="despesa.conta_nome"
              class="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <UIcon name="i-heroicons-building-library" class="w-3 h-3" />
              {{ despesa.conta_nome }}
            </span>
            <span v-if="despesa.categoria"
              class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
              {{ despesa.categoria }}
            </span>
          </div>
        </div>

        <!-- Valor e status -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <p class="text-base font-semibold text-red-600 dark:text-red-400">
            - {{ format(despesa.valor) }}
          </p>
          <UBadge :label="badgeLabel(despesa)" :color="badgeColor(despesa)" variant="soft" size="sm" />
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

    <!-- Modal Add/Edit -->
    <UModal v-model:open="showModal" :title="editingDespesa ? 'Editar Despesa' : 'Nova Despesa'">
      <template #body>
        <DespesasDespesaForm
          :initial="editingDespesa"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>

    <!-- Modal Delete -->
    <UModal v-model:open="showDeleteModal" title="Excluir Despesa">
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir
            <strong class="text-gray-900 dark:text-white">{{ deletingDespesa?.descricao }}</strong>?
            <span v-if="deletingDespesa?.fixa" class="block mt-1 text-sm text-orange-500">
              Esta é uma despesa fixa — será removida de todos os meses.
            </span>
          </p>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancelar</UButton>
            <UButton color="red" :loading="deleting" @click="handleDelete">Excluir</UButton>
          </div>
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
  fixa: number
  parcelas: number
  parcela_atual: number | null
  pago: number
  conta_id: number | null
  conta_nome: string | null
  banco_key: string | null
}

const { format } = useCurrency()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data: despesas, pending, error, refresh } = await useFetch<Despesa[]>('/api/despesas', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth]
})

const totalGeral = computed(() => despesas.value?.reduce((s, d) => s + d.valor, 0) ?? 0)
const totalPago = computed(() => despesas.value?.filter(d => d.pago === 1).reduce((s, d) => s + d.valor, 0) ?? 0)
const totalAPagar = computed(() => despesas.value?.filter(d => d.pago !== 1).reduce((s, d) => s + d.valor, 0) ?? 0)

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
    closeModal()
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingDespesa.value) return
  deleting.value = true
  try {
    await $fetch(`/api/despesas/${deletingDespesa.value.id}`, { method: 'DELETE' })
    await refresh()
    showDeleteModal.value = false
    deletingDespesa.value = null
  } finally {
    deleting.value = false
  }
}

useHead({ title: 'Despesas — Gestão Financeira' })
</script>
