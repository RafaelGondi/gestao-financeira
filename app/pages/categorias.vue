<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie categorias e supercategorias</p>
      </div>
      <UButton leading-icon="i-heroicons-plus" @click="abaAtiva === 'categorias' ? openCreate() : openCreateSuper()">
        {{ abaAtiva === 'categorias' ? 'Nova Categoria' : 'Nova Supercategoria' }}
      </UButton>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200 dark:border-gray-800">
      <button
        v-for="aba in abas"
        :key="aba.value"
        type="button"
        class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="abaAtiva === aba.value
          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="abaAtiva = aba.value"
      >
        {{ aba.label }}
        <span class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
          {{ aba.value === 'categorias' ? (categorias?.length ?? 0) : (supercategorias?.length ?? 0) }}
        </span>
      </button>
    </div>

    <!-- ABA: CATEGORIAS -->
    <template v-if="abaAtiva === 'categorias'">
      <!-- Busca -->
      <UInput
        v-model="busca"
        placeholder="Buscar categoria..."
        leading-icon="i-heroicons-magnifying-glass"
        :trailing="busca ? true : false"
        class="max-w-xs"
      >
        <template v-if="busca" #trailing>
          <button type="button" @click="busca = ''">
            <UIcon name="i-heroicons-x-mark" class="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </template>
      </UInput>

      <!-- Filtros por tipo + toggle de visualização -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-2">
          <button
            v-for="f in filtros"
            :key="f.value"
            type="button"
            class="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
            :class="filtroAtivo === f.value
              ? 'border-transparent text-white'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'"
            :style="filtroAtivo === f.value ? { background: f.color } : {}"
            @click="filtroAtivo = f.value"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 flex-shrink-0">
          <button
            type="button"
            class="p-1.5 rounded-md transition-all"
            :class="viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
            @click="viewMode = 'grid'"
          >
            <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 rounded-md transition-all"
            :class="viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
            @click="viewMode = 'list'"
          >
            <UIcon name="i-heroicons-list-bullet" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div v-if="pendingCat" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-400 animate-spin" />
      </div>

      <div v-else-if="categoriasFiltradas.length === 0" class="flex flex-col items-center gap-2 py-16 text-gray-400">
        <UIcon name="i-heroicons-tag" class="w-10 h-10" />
        <p class="text-sm">Nenhuma categoria encontrada</p>
      </div>

      <!-- Grade -->
      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        <div
          v-for="cat in categoriasFiltradas"
          :key="cat.id"
          class="relative rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col items-center gap-3 group"
        >
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="{ background: cat.cor }"
          >
            <UIcon :name="cat.icone" class="w-6 h-6 text-white" />
          </div>

          <div class="text-center">
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{{ cat.nome }}</p>
            <span
              class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
              :style="{ background: tipoColor(cat.tipo) + '22', color: tipoColor(cat.tipo) }"
            >
              {{ tipoLabel(cat.tipo) }}
            </span>
            <div v-if="cat.supercategoria_nome" class="mt-1.5 flex items-center justify-center gap-1">
              <span
                class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                :style="{ background: cat.supercategoria_cor }"
              >
                <UIcon :name="cat.supercategoria_icone" class="w-2.5 h-2.5" />
                {{ cat.supercategoria_nome }}
              </span>
            </div>
          </div>

          <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
              @click="openEdit(cat)"
            >
              <UIcon name="i-heroicons-pencil" class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              @click="confirmDelete(cat)"
            >
              <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Lista -->
      <div v-else class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div
          v-for="cat in categoriasFiltradas"
          :key="cat.id"
          class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 group hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
        >
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="{ background: cat.cor }"
          >
            <UIcon :name="cat.icone" class="w-5 h-5 text-white" />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ cat.nome }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span
                class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                :style="{ background: tipoColor(cat.tipo) + '22', color: tipoColor(cat.tipo) }"
              >
                {{ tipoLabel(cat.tipo) }}
              </span>
              <span v-if="cat.supercategoria_nome" class="text-gray-300 dark:text-gray-600 text-xs">·</span>
              <span
                v-if="cat.supercategoria_nome"
                class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                :style="{ background: cat.supercategoria_cor }"
              >
                <UIcon :name="cat.supercategoria_icone" class="w-2.5 h-2.5" />
                {{ cat.supercategoria_nome }}
              </span>
            </div>
          </div>

          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
              @click="openEdit(cat)"
            >
              <UIcon name="i-heroicons-pencil" class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              @click="confirmDelete(cat)"
            >
              <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ABA: SUPERCATEGORIAS -->
    <template v-else>
      <div v-if="pendingSuper" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-400 animate-spin" />
      </div>

      <div v-else-if="!supercategorias?.length" class="flex flex-col items-center gap-2 py-16 text-gray-400">
        <UIcon name="i-heroicons-squares-2x2" class="w-10 h-10" />
        <p class="text-sm">Nenhuma supercategoria cadastrada</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="sc in supercategorias"
          :key="sc.id"
          class="relative rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-4 group"
        >
          <div
            class="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            :style="{ background: sc.cor }"
          >
            <UIcon :name="sc.icone" class="w-6 h-6 text-white" />
          </div>

          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ sc.nome }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ categoriasDaSuper(sc.id).length }} categoria{{ categoriasDaSuper(sc.id).length !== 1 ? 's' : '' }}
            </p>
            <div class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="cat in categoriasDaSuper(sc.id).slice(0, 4)"
                :key="cat.id"
                class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md text-white"
                :style="{ background: cat.cor }"
              >
                <UIcon :name="cat.icone" class="w-2.5 h-2.5" />
                {{ cat.nome }}
              </span>
              <span v-if="categoriasDaSuper(sc.id).length > 4" class="text-xs text-gray-400 px-1.5 py-0.5">
                +{{ categoriasDaSuper(sc.id).length - 4 }}
              </span>
            </div>
          </div>

          <div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              class="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
              @click="openEditSuper(sc)"
            >
              <UIcon name="i-heroicons-pencil" class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              class="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              @click="confirmDeleteSuper(sc)"
            >
              <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal criar/editar CATEGORIA -->
    <USlideover v-model:open="modalOpen">
      <template #content>
        <div class="p-5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-5">
            {{ editando ? 'Editar Categoria' : 'Nova Categoria' }}
          </h2>
          <CategoriaFormComp
            :initial="editando"
            :loading="saving"
            @submit="handleSubmit"
            @cancel="modalOpen = false"
          />
        </div>
      </template>
    </USlideover>

    <!-- Modal criar/editar SUPERCATEGORIA -->
    <USlideover v-model:open="modalSuperOpen">
      <template #content>
        <div class="p-5">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white mb-5">
            {{ editandoSuper ? 'Editar Supercategoria' : 'Nova Supercategoria' }}
          </h2>
          <SuperCategoriaFormComp
            :initial="editandoSuper"
            :loading="savingSuper"
            @submit="handleSubmitSuper"
            @cancel="modalSuperOpen = false"
          />
        </div>
      </template>
    </USlideover>

    <!-- Modal confirmar exclusão CATEGORIA -->
    <UModal v-model:open="deleteModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900/30 flex-shrink-0">
              <UIcon name="i-heroicons-trash" class="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Excluir categoria</h2>
              <p class="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
          <UAlert
            v-if="deletandoTxCount > 0"
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="`${deletandoTxCount} transaç${deletandoTxCount === 1 ? 'ão vinculada' : 'ões vinculadas'}`"
            :description="`As transações que usam esta categoria ficarão sem categoria após a exclusão.`"
          />
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Tem certeza que deseja excluir <strong>{{ deletando?.nome }}</strong>?
          </p>
          <div class="flex justify-end gap-3 pt-1">
            <UButton variant="ghost" color="neutral" @click="deleteModalOpen = false">Cancelar</UButton>
            <UButton color="error" :loading="deleting" @click="handleDelete">Excluir</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal confirmar exclusão SUPERCATEGORIA -->
    <UModal v-model:open="deleteSuperModalOpen" :ui="{ width: 'sm:max-w-md' }">
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900/30 flex-shrink-0">
              <UIcon name="i-heroicons-trash" class="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">Excluir supercategoria</h2>
              <p class="text-sm text-gray-500">As categorias vinculadas ficarão sem supercategoria.</p>
            </div>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Tem certeza que deseja excluir <strong>{{ deletandoSuper?.nome }}</strong>?
          </p>
          <div class="flex justify-end gap-3 pt-1">
            <UButton variant="ghost" color="neutral" @click="deleteSuperModalOpen = false">Cancelar</UButton>
            <UButton color="error" :loading="deletingSuper" @click="handleDeleteSuper">Excluir</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import CategoriaFormComp from '~/components/categorias/CategoriaForm.vue'
import SuperCategoriaFormComp from '~/components/categorias/SuperCategoriaForm.vue'

interface Categoria {
  id: number
  nome: string
  tipo: string
  cor: string
  icone: string
  supercategoria_id: number | null
  supercategoria_nome: string | null
  supercategoria_cor: string | null
  supercategoria_icone: string | null
}

interface Supercategoria {
  id: number
  nome: string
  cor: string
  icone: string
}

const { data: categorias, pending: pendingCat, refresh: refreshCat } = await useFetch<Categoria[]>('/api/categorias')
const { data: supercategorias, pending: pendingSuper, refresh: refreshSuper } = await useFetch<Supercategoria[]>('/api/supercategorias')

const abaAtiva = ref<'categorias' | 'supercategorias'>('categorias')
const abas = [
  { value: 'categorias',     label: 'Categorias' },
  { value: 'supercategorias', label: 'Supercategorias' },
]

const viewMode = ref<'grid' | 'list'>('grid')
const filtroAtivo = ref('todos')
const busca = ref('')
const filtros = [
  { value: 'todos',         label: 'Todos',          color: '#6B7280' },
  { value: 'despesa',       label: 'Despesas',        color: '#EF4444' },
  { value: 'receita',       label: 'Receitas',        color: '#22C55E' },
  { value: 'transferencia', label: 'Transferências',  color: '#6366F1' },
]

const categoriasFiltradas = computed(() => {
  let lista = categorias.value ?? []
  if (filtroAtivo.value !== 'todos') lista = lista.filter(c => c.tipo === filtroAtivo.value)
  if (busca.value.trim()) {
    const q = busca.value.trim().toLowerCase()
    lista = lista.filter(c => c.nome.toLowerCase().includes(q))
  }
  return lista
})

function categoriasDaSuper(superId: number) {
  return (categorias.value ?? []).filter(c => c.supercategoria_id === superId)
}

function tipoColor(tipo: string) {
  return filtros.find(f => f.value === tipo)?.color ?? '#6B7280'
}
function tipoLabel(tipo: string) {
  return filtros.find(f => f.value === tipo)?.label?.replace(/s$/, '') ?? tipo
}

// --- Categorias CRUD ---
const modalOpen = ref(false)
const editando = ref<Categoria | null>(null)
const saving = ref(false)

function openCreate() { editando.value = null; modalOpen.value = true }
function openEdit(cat: Categoria) { editando.value = cat; modalOpen.value = true }

async function handleSubmit(data: Omit<Categoria, 'id' | 'supercategoria_nome' | 'supercategoria_cor' | 'supercategoria_icone'>) {
  saving.value = true
  try {
    if (editando.value) {
      await $fetch(`/api/categorias/${editando.value.id}`, { method: 'PUT', body: data })
    } else {
      await $fetch('/api/categorias', { method: 'POST', body: data })
    }
    modalOpen.value = false
    await refreshCat()
  } finally {
    saving.value = false
  }
}

const deleteModalOpen = ref(false)
const deletando = ref<Categoria | null>(null)
const deleting = ref(false)
const deletandoTxCount = ref(0)

async function confirmDelete(cat: Categoria) {
  deletando.value = cat
  deletandoTxCount.value = 0
  deleteModalOpen.value = true
  const { count } = await $fetch<{ count: number }>(`/api/categorias/${cat.id}/transacoes-count`)
  deletandoTxCount.value = count
}

async function handleDelete() {
  if (!deletando.value) return
  deleting.value = true
  try {
    await $fetch(`/api/categorias/${deletando.value.id}`, { method: 'DELETE' })
    deleteModalOpen.value = false
    await refreshCat()
  } finally {
    deleting.value = false
  }
}

// --- Supercategorias CRUD ---
const modalSuperOpen = ref(false)
const editandoSuper = ref<Supercategoria | null>(null)
const savingSuper = ref(false)

function openCreateSuper() { editandoSuper.value = null; modalSuperOpen.value = true }
function openEditSuper(sc: Supercategoria) { editandoSuper.value = sc; modalSuperOpen.value = true }

async function handleSubmitSuper(data: Omit<Supercategoria, 'id'>) {
  savingSuper.value = true
  try {
    if (editandoSuper.value) {
      await $fetch(`/api/supercategorias/${editandoSuper.value.id}`, { method: 'PUT', body: data })
    } else {
      await $fetch('/api/supercategorias', { method: 'POST', body: data })
    }
    modalSuperOpen.value = false
    await Promise.all([refreshSuper(), refreshCat()])
  } finally {
    savingSuper.value = false
  }
}

const deleteSuperModalOpen = ref(false)
const deletandoSuper = ref<Supercategoria | null>(null)
const deletingSuper = ref(false)

function confirmDeleteSuper(sc: Supercategoria) { deletandoSuper.value = sc; deleteSuperModalOpen.value = true }

async function handleDeleteSuper() {
  if (!deletandoSuper.value) return
  deletingSuper.value = true
  try {
    await $fetch(`/api/supercategorias/${deletandoSuper.value.id}`, { method: 'DELETE' })
    deleteSuperModalOpen.value = false
    await Promise.all([refreshSuper(), refreshCat()])
  } finally {
    deletingSuper.value = false
  }
}
</script>
