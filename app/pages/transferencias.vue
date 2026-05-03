<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Transferências</h1>
        <p class="text-sm text-gray-500 mt-1">Movimentações entre contas</p>
      </div>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Nova Transferência
      </UButton>
    </div>

    <!-- Navegador de mês -->
    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Resumo -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard class="border-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Total transferido no mês</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">{{ format(totalMes) }}</p>
          </div>
        </div>
      </UCard>
      <UCard class="border-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <UIcon name="i-heroicons-queue-list" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-xs text-gray-500">Número de transferências</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">{{ transferencias?.length ?? 0 }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- Error -->
    <UAlert v-else-if="error" color="red" variant="soft" title="Erro ao carregar transferências"
      :description="error.message" icon="i-heroicons-exclamation-triangle" />

    <!-- Empty -->
    <div v-else-if="!transferencias?.length" class="text-center py-20">
      <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-arrows-right-left" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma transferência neste mês</h3>
      <p class="text-gray-400 text-sm mb-6">Registre movimentações entre suas contas</p>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Nova transferência
      </UButton>
    </div>

    <!-- Lista -->
    <div v-else class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div
        v-for="(tr, i) in transferencias"
        :key="tr.id"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < transferencias.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
      >
        <!-- Ícone -->
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ tr.conta_origem_nome }}</span>
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ tr.conta_destino_nome }}</span>
          </div>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-400">{{ fmtDate(tr.data) }}</span>
            <span v-if="tr.descricao" class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
              {{ tr.descricao }}
            </span>
          </div>
        </div>

        <!-- Valor -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <p class="text-base font-semibold text-blue-600 dark:text-blue-400">
            {{ format(tr.valor) }}
          </p>
        </div>

        <!-- Ações -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs"
            @click="openEditModal(tr)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs"
            @click="confirmDelete(tr)" />
        </div>
      </div>
    </div>

    <!-- Modal Add/Edit -->
    <USlideover v-model:open="showModal" :title="editingTransferencia ? 'Editar Transferência' : 'Nova Transferência'">
      <template #body>
        <TransferenciasTransferenciaForm
          :initial="editingTransferencia"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </template>
    </USlideover>

    <!-- Modal Delete -->
    <USlideover v-model:open="showDeleteModal" title="Excluir Transferência">
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir esta transferência de
            <strong class="text-gray-900 dark:text-white">{{ format(deletingTransferencia?.valor ?? 0) }}</strong>
            de <strong class="text-gray-900 dark:text-white">{{ deletingTransferencia?.conta_origem_nome }}</strong>
            para <strong class="text-gray-900 dark:text-white">{{ deletingTransferencia?.conta_destino_nome }}</strong>?
          </p>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancelar</UButton>
            <UButton color="red" :loading="deleting" @click="handleDelete">Excluir</UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
interface Transferencia {
  id: number
  descricao: string | null
  valor: number
  data: string
  conta_origem_id: number
  conta_destino_id: number
  conta_origem_nome: string
  conta_destino_nome: string
}

const { format } = useCurrency()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data: transferencias, pending, error, refresh } = await useFetch<Transferencia[]>('/api/transferencias', {
  query: computed(() => ({ month: currentMonth.value })),
  watch: [currentMonth]
})

const totalMes = computed(() => transferencias.value?.reduce((s, t) => s + t.valor, 0) ?? 0)

function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const showModal = ref(false)
const editingTransferencia = ref<Transferencia | null>(null)
const saving = ref(false)
const showDeleteModal = ref(false)
const deletingTransferencia = ref<Transferencia | null>(null)
const deleting = ref(false)

function openAddModal() { editingTransferencia.value = null; showModal.value = true }
function openEditModal(tr: Transferencia) { editingTransferencia.value = { ...tr }; showModal.value = true }
function closeModal() { showModal.value = false; editingTransferencia.value = null }
function confirmDelete(tr: Transferencia) { deletingTransferencia.value = tr; showDeleteModal.value = true }

async function handleSubmit(data: any) {
  saving.value = true
  try {
    if (editingTransferencia.value?.id)
      await $fetch(`/api/transferencias/${editingTransferencia.value.id}`, { method: 'PUT', body: data })
    else
      await $fetch('/api/transferencias', { method: 'POST', body: data })
    await refresh()
    closeModal()
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingTransferencia.value) return
  deleting.value = true
  try {
    await $fetch(`/api/transferencias/${deletingTransferencia.value.id}`, { method: 'DELETE' })
    await refresh()
    showDeleteModal.value = false
    deletingTransferencia.value = null
  } finally {
    deleting.value = false
  }
}

useHead({ title: 'Transferências — Gestão Financeira' })
</script>
