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
        <p class="text-xs text-gray-400 mb-1">Já recebido</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(totalRecebido) }}</p>
      </div>
      <div class="pl-6">
        <p class="text-xs text-gray-400 mb-1">A receber</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(totalAReceber) }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
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
    <div v-else class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div
        v-for="(receita, i) in receitas"
        :key="`${receita.id}-${receita.fixa}`"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < receitas.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
      >
        <!-- Ícone -->
        <div
          class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          :style="receita.categoria_icone ? { background: receita.categoria_cor } : {}"
          :class="receita.categoria_icone ? '' : 'bg-gray-100 dark:bg-gray-800'"
        >
          <UIcon
            :name="receita.categoria_icone ?? iconName(receita)"
            class="w-4 h-4"
            :class="receita.categoria_icone ? 'text-white' : 'text-gray-400'"
          />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ receita.descricao }}</p>
          <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-400">{{ descricaoData(receita) }}</span>
            <template v-if="receita.conta_nome">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">{{ receita.conta_nome }}</span>
            </template>
            <template v-if="receita.parcelas > 0">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">{{ receita.parcela_atual }}/{{ receita.parcelas }}</span>
            </template>
            <template v-else-if="receita.fixa">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">Fixa</span>
            </template>
          </div>
        </div>

        <!-- Valor e status -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ format(receita.valor) }}</p>
          <span
            class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500"
          >
            {{ receita.recebido === 1 ? 'Recebido' : 'A receber' }}
          </span>
        </div>

        <!-- Ações -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs"
            @click="openEditModal(receita)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs"
            @click="confirmDelete(receita)" />
        </div>
      </div>
    </div>

    <!-- Modal Add/Edit -->
    <USlideover v-model:open="showModal" :title="editingReceita ? 'Editar Receita' : 'Nova Receita'" :dismissible="false">
      <template #body>
        <ReceitasReceitaForm
          :initial="editingReceita"
          :loading="saving"
          @submit="handleSubmit"
          @cancel="closeModal"
        />
      </template>
    </USlideover>

    <!-- Modal Delete -->
    <USlideover v-model:open="showDeleteModal" title="Excluir Receita">
      <template #body>
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir
            <strong class="text-gray-900 dark:text-white">{{ deletingReceita?.descricao }}</strong>?
          </p>
          <template v-if="deletingReceita?.fixa">
            <div class="flex flex-col gap-2">
              <UButton
                variant="soft"
                color="neutral"
                :loading="deleting"
                icon="i-heroicons-calendar-days"
                class="w-full justify-start"
                @click="handleDelete('one')"
              >
                Remover só {{ deletingReceita.parcelas > 0 ? 'esta parcela' : 'este mês' }}
              </UButton>
              <UButton
                color="red"
                :loading="deleting"
                icon="i-heroicons-trash"
                class="w-full justify-start"
                @click="handleDelete('all')"
              >
                Remover {{ deletingReceita.parcelas > 0 ? 'todas as parcelas' : 'todos os meses' }}
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
    </USlideover>
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
  categoria_cor: string | null
  categoria_icone: string | null
  fixa: number
  parcelas: number
  parcela_atual: number | null
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

function iconName(r: Receita) {
  if (r.fixa) return r.recebido === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-path'
  return r.recebido === 1 ? 'i-heroicons-check-circle' : 'i-heroicons-clock'
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

async function handleDelete(scope: 'one' | 'all') {
  if (!deletingReceita.value) return
  deleting.value = true
  try {
    const params: Record<string, string> = { scope }
    if (scope === 'one') params.month = currentMonth.value
    await $fetch(`/api/receitas/${deletingReceita.value.id}`, { method: 'DELETE', query: params })
    await refresh()
    showDeleteModal.value = false
    deletingReceita.value = null
  } finally {
    deleting.value = false
  }
}

useHead({ title: 'Receitas — Gestão Financeira' })
</script>
