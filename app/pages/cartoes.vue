<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Meus Cartões</h1>
        <p class="text-sm text-gray-500 mt-1">Gerencie seus cartões de crédito</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        @click="openAddModal"
      >
        Novo Cartão
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-48 rounded-2xl" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="red"
      variant="soft"
      title="Erro ao carregar cartões"
      :description="error.message"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Empty State -->
    <div
      v-else-if="!cartoes || cartoes.length === 0"
      class="text-center py-20"
    >
      <div class="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-credit-card" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhum cartão cadastrado</h3>
      <p class="text-gray-400 text-sm mb-6">Adicione seus cartões para acompanhar as faturas</p>
      <UButton icon="i-heroicons-plus" color="primary" @click="openAddModal">
        Adicionar primeiro cartão
      </UButton>
    </div>

    <!-- Cards Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="cartao in cartoes"
        :key="cartao.id"
        class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <!-- Card visual header -->
        <div class="h-28 p-4 relative" :style="cardStyle(cartao)">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-white/70 text-xs font-medium">{{ cartao.banco }}</p>
              <p class="text-white text-lg font-bold mt-1">{{ cartao.nome }}</p>
            </div>
            <SharedBankLogo :bank="findBank(cartao.banco_key)" :size="36" class="rounded-lg opacity-90" />
          </div>
          <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div>
              <p class="text-white/60 text-xs">Limite</p>
              <p class="text-white text-sm font-semibold">{{ format(cartao.limite) }}</p>
            </div>
            <div class="text-right">
              <p class="text-white/60 text-xs">Vencimento</p>
              <p class="text-white text-sm font-semibold">Dia {{ cartao.vencimento }}</p>
            </div>
          </div>
        </div>

        <!-- Card body -->
        <div class="p-4 space-y-3">
          <!-- Barra de uso -->
          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-gray-500">Gasto este mês</span>
              <span class="font-medium" :class="usoPct(cartao) >= 90 ? 'text-red-500' : usoPct(cartao) >= 70 ? 'text-yellow-500' : 'text-gray-500'">
                {{ format(cartao.gasto_mes) }} / {{ format(cartao.limite) }}
              </span>
            </div>
            <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="usoPct(cartao) >= 90 ? 'bg-red-500' : usoPct(cartao) >= 70 ? 'bg-yellow-400' : 'bg-green-500'"
                :style="{ width: Math.min(usoPct(cartao), 100) + '%' }"
              />
            </div>
            <p class="text-right text-xs mt-1" :class="usoPct(cartao) >= 90 ? 'text-red-500' : 'text-gray-400'">
              {{ usoPct(cartao).toFixed(0) }}% utilizado
            </p>
          </div>

          <!-- Melhor data + Actions -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs text-gray-500">
              <UIcon name="i-heroicons-calendar-days" class="w-4 h-4" />
              <span>Melhor compra: dia {{ cartao.melhor_data_compra }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UButton
                icon="i-heroicons-pencil-square"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="openEditModal(cartao)"
              />
              <UButton
                icon="i-heroicons-trash"
                variant="ghost"
                color="red"
                size="xs"
                @click="confirmDelete(cartao)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <UModal v-model:open="showModal" :title="editingCartao ? 'Editar Cartão' : 'Novo Cartão'">
      <template #body>
        <CartoesCartaoForm
          :initial="editingCartao"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>

    <!-- Delete Confirm Modal -->
    <UModal v-model:open="showDeleteModal" title="Excluir Cartão">
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir o cartão
            <strong class="text-gray-900 dark:text-white">{{ deletingCartao?.nome }}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">
              Cancelar
            </UButton>
            <UButton color="red" :loading="deleting" @click="handleDelete">
              Excluir
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface Cartao {
  id: number
  nome: string
  banco: string
  banco_key: string
  limite: number
  melhor_data_compra: number
  vencimento: number
  gasto_mes: number
}

const { format } = useCurrency()
const { findBank } = useBanks()

function usoPct(cartao: Cartao) {
  if (!cartao.limite) return 0
  return (cartao.gasto_mes / cartao.limite) * 100
}

function cardStyle(cartao: Cartao) {
  const bank = findBank(cartao.banco_key)
  const color = bank?.color ?? '#6366f1'
  return {
    background: `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)`
  }
}

const { data: cartoes, pending, error, refresh } = await useFetch<Cartao[]>('/api/cartoes')

// Modal state
const showModal = ref(false)
const editingCartao = ref<Cartao | null>(null)
const saving = ref(false)

// Delete state
const showDeleteModal = ref(false)
const deletingCartao = ref<Cartao | null>(null)
const deleting = ref(false)

function openAddModal() {
  editingCartao.value = null
  showModal.value = true
}

function openEditModal(cartao: Cartao) {
  editingCartao.value = { ...cartao }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCartao.value = null
}

function confirmDelete(cartao: Cartao) {
  deletingCartao.value = cartao
  showDeleteModal.value = true
}

async function handleSubmit(data: Omit<Cartao, 'id'>) {
  saving.value = true
  try {
    if (editingCartao.value?.id) {
      await $fetch(`/api/cartoes/${editingCartao.value.id}`, {
        method: 'PUT',
        body: data
      })
    } else {
      await $fetch('/api/cartoes', {
        method: 'POST',
        body: data
      })
    }
    await refresh()
    closeModal()
  } catch (err) {
    console.error('Erro ao salvar cartão:', err)
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingCartao.value) return
  deleting.value = true
  try {
    await $fetch(`/api/cartoes/${deletingCartao.value.id}`, { method: 'DELETE' })
    await refresh()
    showDeleteModal.value = false
    deletingCartao.value = null
  } catch (err) {
    console.error('Erro ao excluir cartão:', err)
  } finally {
    deleting.value = false
  }
}

useHead({
  title: 'Cartões — Gestão Financeira'
})
</script>
