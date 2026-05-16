<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Contas</h1>
        <p class="text-sm text-gray-500 mt-1">Suas contas bancárias</p>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="reordenando">
          <UButton variant="ghost" color="neutral" @click="cancelarReordenacao">Cancelar</UButton>
          <UButton icon="i-heroicons-check" color="primary" :loading="salvandoOrdem" @click="salvarOrdem">Salvar ordem</UButton>
        </template>
        <template v-else>
          <UButton v-if="contas && contas.length > 1" icon="i-heroicons-arrows-up-down" variant="ghost" color="neutral" @click="iniciarReordenacao">
            Reordenar
          </UButton>
          <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
            Nova Conta
          </UButton>
        </template>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-36 rounded-lg" />
    </div>

    <!-- Error -->
    <UAlert v-else-if="error" color="red" variant="soft" title="Erro ao carregar contas"
      :description="error.message" icon="i-heroicons-exclamation-triangle" />

    <!-- Empty -->
    <div v-else-if="!contas?.length" class="text-center py-20">
      <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-building-library" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma conta cadastrada</h3>
      <p class="text-gray-400 text-sm mb-6">Adicione suas contas bancárias para controlar seu saldo</p>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Adicionar primeira conta
      </UButton>
    </div>

    <!-- Cards -->
    <div v-else>
      <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-5 mb-4 text-white">
        <p class="text-sm font-medium text-primary-100">Saldo total em contas</p>
        <p class="text-3xl font-bold mt-1">{{ format(saldoTotal) }}</p>
        <p class="text-xs text-primary-200 mt-1">{{ contas.length }} conta{{ contas.length !== 1 ? 's' : '' }} cadastrada{{ contas.length !== 1 ? 's' : '' }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(conta, index) in contasOrdenadas"
          :key="conta.id"
          class="bg-white dark:bg-gray-900 rounded-lg border overflow-hidden transition-all"
          :class="reordenando
            ? 'border-primary-200 dark:border-primary-800 shadow-sm'
            : 'border-gray-100 dark:border-gray-800'"
        >
          <!-- Header -->
          <div class="flex items-center gap-3 p-5" :class="!reordenando && 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'">
            <!-- Setas de reordenação -->
            <div v-if="reordenando" class="flex flex-col gap-0.5 flex-shrink-0">
              <button
                class="p-0.5 rounded text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                :disabled="index === 0"
                @click="moverCima(index)"
              >
                <UIcon name="i-heroicons-chevron-up" class="w-4 h-4" />
              </button>
              <button
                class="p-0.5 rounded text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                :disabled="index === contasOrdenadas.length - 1"
                @click="moverBaixo(index)"
              >
                <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
              </button>
            </div>

            <NuxtLink
              v-if="!reordenando"
              :to="`/contas/${conta.id}`"
              class="flex items-center gap-3 flex-1 min-w-0"
            >
              <SharedBankLogo :bank="findBank(conta.banco_key)" :size="44" class="rounded-lg flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 dark:text-white truncate">{{ conta.nome }}</p>
                <p class="text-xs text-gray-400">{{ conta.banco }}</p>
              </div>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 flex-shrink-0" />
            </NuxtLink>

            <div v-else class="flex items-center gap-3 flex-1 min-w-0">
              <SharedBankLogo :bank="findBank(conta.banco_key)" :size="44" class="rounded-lg flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 dark:text-white truncate">{{ conta.nome }}</p>
                <p class="text-xs text-gray-400">{{ conta.banco }}</p>
              </div>
            </div>
          </div>

          <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400">Saldo atual</p>
              <p class="text-xl font-bold"
                :class="conta.saldo_atual >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ format(conta.saldo_atual) }}
              </p>
            </div>
            <div v-if="!reordenando" class="flex gap-1">
              <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs"
                @click.prevent="openEditModal(conta)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs"
                @click.prevent="confirmDelete(conta)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add/Edit -->
    <USlideover v-model:open="showModal" :title="editingConta ? 'Editar Conta' : 'Nova Conta'" :ui="{ width: 'sm:max-w-xl' }">
      <template #body>
        <ContasContaForm
          :initial="editingConta"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </template>
    </USlideover>

    <!-- Modal Delete -->
    <USlideover v-model:open="showDeleteModal" title="Excluir Conta">
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir a conta
            <strong class="text-gray-900 dark:text-white">{{ deletingConta?.nome }}</strong>?
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
interface Conta {
  id: number
  nome: string
  banco: string
  banco_key: string
  saldo_inicial: number
  saldo_atual: number
}

const { format } = useCurrency()
const { findBank } = useBanks()

const { data: contas, pending, error, refresh } = await useFetch<Conta[]>('/api/contas')

const saldoTotal = computed(() => contas.value?.reduce((s, c) => s + c.saldo_atual, 0) ?? 0)

// --- Reordenação ---
const reordenando = ref(false)
const contasOrdenadas = ref<Conta[]>([])
const salvandoOrdem = ref(false)

watch(contas, (val) => {
  if (val) contasOrdenadas.value = [...val]
}, { immediate: true })

function iniciarReordenacao() {
  contasOrdenadas.value = [...(contas.value ?? [])]
  reordenando.value = true
}

function cancelarReordenacao() {
  contasOrdenadas.value = [...(contas.value ?? [])]
  reordenando.value = false
}

function moverCima(index: number) {
  if (index === 0) return
  const arr = [...contasOrdenadas.value]
  ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
  contasOrdenadas.value = arr
}

function moverBaixo(index: number) {
  if (index === contasOrdenadas.value.length - 1) return
  const arr = [...contasOrdenadas.value]
  ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
  contasOrdenadas.value = arr
}

async function salvarOrdem() {
  salvandoOrdem.value = true
  try {
    await $fetch('/api/contas/ordem', {
      method: 'PATCH',
      body: { ids: contasOrdenadas.value.map(c => c.id) },
    })
    await refresh()
    reordenando.value = false
    useToast().add({ title: 'Ordem salva', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    useToast().add({ title: 'Erro ao salvar ordem', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    salvandoOrdem.value = false
  }
}

const showModal = ref(false)
const editingConta = ref<Conta | null>(null)
const saving = ref(false)
const showDeleteModal = ref(false)
const deletingConta = ref<Conta | null>(null)
const deleting = ref(false)

function openAddModal() { editingConta.value = null; showModal.value = true }
function openEditModal(c: Conta) { editingConta.value = { ...c }; showModal.value = true }
function closeModal() { showModal.value = false; editingConta.value = null }
function confirmDelete(c: Conta) { deletingConta.value = c; showDeleteModal.value = true }

async function handleSubmit(data: any) {
  saving.value = true
  try {
    if (editingConta.value?.id)
      await $fetch(`/api/contas/${editingConta.value.id}`, { method: 'PUT', body: data })
    else
      await $fetch('/api/contas', { method: 'POST', body: data })
    await refresh()
    closeModal()
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingConta.value) return
  deleting.value = true
  try {
    await $fetch(`/api/contas/${deletingConta.value.id}`, { method: 'DELETE' })
    await refresh()
    showDeleteModal.value = false
    deletingConta.value = null
  } finally {
    deleting.value = false
  }
}

useHead({ title: 'Contas — Gestão Financeira' })
</script>
