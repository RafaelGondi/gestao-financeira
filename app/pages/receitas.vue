<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Receitas</h1>
        <p class="text-sm text-gray-500 mt-1">Entradas de dinheiro por mês</p>
      </div>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Nova Receita
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
          <div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Total do mês</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(totalGeral) }}</p>
          </div>
        </div>
      </UCard>
      <UCard class="border-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Já recebido</p>
            <p class="text-lg font-bold text-green-600 dark:text-green-400">{{ format(totalRecebido) }}</p>
          </div>
        </div>
      </UCard>
      <UCard class="border-0 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">A receber</p>
            <p class="text-lg font-bold text-yellow-600 dark:text-yellow-400">{{ format(totalAReceber) }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" />
    </div>

    <!-- Error -->
    <UAlert v-else-if="error" color="red" variant="soft" title="Erro ao carregar receitas"
      :description="error.message" icon="i-heroicons-exclamation-triangle" />

    <!-- Empty -->
    <div v-else-if="!receitas?.length" class="text-center py-20">
      <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-banknotes" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma receita neste mês</h3>
      <p class="text-gray-400 text-sm mb-6">Adicione entradas ou navegue para outro mês</p>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Adicionar receita
      </UButton>
    </div>

    <!-- Lista -->
    <div v-else class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div
        v-for="(receita, i) in receitas"
        :key="`${receita.id}-${receita.fixa}`"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < receitas.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
      >
        <!-- Ícone -->
        <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" :class="iconBg(receita)">
          <UIcon :name="iconName(receita)" class="w-5 h-5" :class="iconColor(receita)" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-medium text-gray-900 dark:text-white truncate">{{ receita.descricao }}</p>
            <UBadge v-if="receita.fixa" label="Fixa" color="info" variant="soft" size="xs"
              icon="i-heroicons-arrow-path" />
          </div>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-400">{{ descricaoData(receita) }}</span>
            <span v-if="receita.conta_nome"
              class="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <UIcon name="i-heroicons-building-library" class="w-3 h-3" />
              {{ receita.conta_nome }}
            </span>
            <span v-if="receita.categoria"
              class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
              {{ receita.categoria }}
            </span>
          </div>
        </div>

        <!-- Valor e status -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <p class="text-base font-semibold text-green-600 dark:text-green-400">
            + {{ format(receita.valor) }}
          </p>
          <UBadge :label="badgeLabel(receita)" :color="badgeColor(receita)" variant="soft" size="sm" />
        </div>

        <!-- Ações (só para editar/deletar a receita original) -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs"
            @click="openEditModal(receita)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs"
            @click="confirmDelete(receita)" />
        </div>
      </div>
    </div>

    <!-- Modal Add/Edit -->
    <UModal v-model:open="showModal" :title="editingReceita ? 'Editar Receita' : 'Nova Receita'">
      <template #body>
        <ReceitasReceitaForm
          :initial="editingReceita"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>

    <!-- Modal Delete -->
    <UModal v-model:open="showDeleteModal" title="Excluir Receita">
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir
            <strong class="text-gray-900 dark:text-white">{{ deletingReceita?.descricao }}</strong>?
            <span v-if="deletingReceita?.fixa" class="block mt-1 text-sm text-orange-500">
              Esta é uma receita fixa — será removida de todos os meses.
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
interface Receita {
  id: number
  descricao: string
  valor: number
  data: string
  data_inicio: string | null
  data_fim: string | null
  categoria: string | null
  fixa: number
  recebido: number
  conta_id: number | null
  conta_nome: string | null
  banco_key: string | null
}

const { format } = useCurrency()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data: receitas, pending, error, refresh } = await useFetch<Receita[]>('/api/receitas', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth]
})

const totalGeral = computed(() => receitas.value?.reduce((s, r) => s + r.valor, 0) ?? 0)
const totalRecebido = computed(() => receitas.value?.filter(r => r.recebido === 1).reduce((s, r) => s + r.valor, 0) ?? 0)
const totalAReceber = computed(() => receitas.value?.filter(r => r.recebido !== 1).reduce((s, r) => s + r.valor, 0) ?? 0)

function fmtDate(d: string | null) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function descricaoData(r: Receita) {
  if (r.fixa) {
    const dia = r.data_inicio?.split('-')[2]
    return `Todo dia ${dia}${r.data_fim ? ' · até ' + fmtDate(r.data_fim) : ''}`
  }
  return fmtDate(r.data)
}

function badgeLabel(r: Receita) {
  if (r.recebido === 1) return 'Recebido'
  if (r.recebido === 2) return 'A receber'
  return 'A receber'
}

function badgeColor(r: Receita): any {
  return r.recebido === 1 ? 'success' : 'warning'
}

function iconName(r: Receita) {
  if (r.fixa) return r.recebido === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'
  return r.recebido === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-clock'
}

function iconBg(r: Receita) {
  return r.recebido === 1
    ? 'bg-green-100 dark:bg-green-900/30'
    : r.fixa
      ? 'bg-blue-100 dark:bg-blue-900/30'
      : 'bg-yellow-100 dark:bg-yellow-900/30'
}

function iconColor(r: Receita) {
  return r.recebido === 1
    ? 'text-green-600 dark:text-green-400'
    : r.fixa
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-yellow-600 dark:text-yellow-400'
}

const showModal = ref(false)
const editingReceita = ref<Receita | null>(null)
const saving = ref(false)
const showDeleteModal = ref(false)
const deletingReceita = ref<Receita | null>(null)
const deleting = ref(false)

function openAddModal() { editingReceita.value = null; showModal.value = true }
function openEditModal(r: Receita) { editingReceita.value = { ...r }; showModal.value = true }
function closeModal() { showModal.value = false; editingReceita.value = null }
function confirmDelete(r: Receita) { deletingReceita.value = r; showDeleteModal.value = true }

async function handleSubmit(data: any) {
  saving.value = true
  try {
    if (editingReceita.value?.id)
      await $fetch(`/api/receitas/${editingReceita.value.id}`, { method: 'PUT', body: data })
    else
      await $fetch('/api/receitas', { method: 'POST', body: data })
    await refresh()
    closeModal()
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingReceita.value) return
  deleting.value = true
  try {
    await $fetch(`/api/receitas/${deletingReceita.value.id}`, { method: 'DELETE' })
    await refresh()
    showDeleteModal.value = false
    deletingReceita.value = null
  } finally {
    deleting.value = false
  }
}

useHead({ title: 'Receitas — Gestão Financeira' })
</script>
