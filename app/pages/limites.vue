<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Limite de Gastos</h1>
      <p class="text-sm text-gray-500 mt-1">Defina limites mensais por categoria ou supercategoria</p>
    </div>

    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Limite Global -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <UIcon name="i-heroicons-flag" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 class="font-semibold text-gray-800 dark:text-gray-100">Limite Global</h2>
            <p class="text-xs text-gray-400 mt-0.5">Teto de gastos mensais ou meta de poupança</p>
          </div>
        </div>
        <button
          v-if="!editingGlobal"
          class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          @click="startEditGlobal"
        >{{ limiteGlobal?.active ? 'Alterar' : 'Definir' }}</button>
      </div>

      <!-- Estado atual -->
      <div v-if="!editingGlobal" class="px-5 py-4">
        <template v-if="limiteGlobal?.active">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-gray-400 mb-1">{{ limiteGlobal.active.tipo === 'fixo' ? 'Valor fixo mensal' : 'Meta de poupança' }}</p>
              <p class="text-lg font-bold text-gray-900 dark:text-white">
                {{ limiteGlobal.active.tipo === 'fixo'
                  ? format(limiteGlobal.active.valor)
                  : limiteGlobal.active.valor + '% da receita' }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">Vigente desde {{ fmtMonth(limiteGlobal.active.data_inicio) }}</p>
            </div>
            <button
              class="text-xs text-gray-300 dark:text-gray-600 hover:text-rose-400 dark:hover:text-rose-500 transition-colors cursor-pointer"
              @click="deleteGlobal(limiteGlobal.active.id)"
            >
              <UIcon name="i-heroicons-trash" class="w-4 h-4" />
            </button>
          </div>

          <!-- Histórico -->
          <template v-if="limiteGlobal.history.length > 1">
            <button
              class="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors cursor-pointer"
              @click="showHistory = !showHistory"
            >
              <UIcon :name="showHistory ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3.5 h-3.5" />
              {{ showHistory ? 'Ocultar histórico' : 'Ver histórico de alterações' }}
            </button>
            <div v-if="showHistory" class="mt-2 space-y-1.5">
              <div
                v-for="entry in limiteGlobal.history"
                :key="entry.id"
                class="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-800"
              >
                <div class="flex items-center gap-3">
                  <p class="text-xs text-gray-500">{{ fmtMonth(entry.data_inicio) }}</p>
                  <p class="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {{ entry.tipo === 'fixo' ? format(entry.valor) : entry.valor + '% da receita' }}
                  </p>
                </div>
                <button
                  class="text-xs text-gray-300 dark:text-gray-600 hover:text-rose-400 dark:hover:text-rose-500 transition-colors cursor-pointer"
                  @click="deleteGlobal(entry.id)"
                >
                  <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </template>
        </template>
        <p v-else class="text-sm text-gray-400">Nenhum limite global definido</p>
      </div>

      <!-- Formulário de edição -->
      <div v-else class="px-5 py-4 space-y-4">
        <!-- Toggle tipo -->
        <div>
          <p class="text-xs text-gray-500 mb-2">Tipo de limite</p>
          <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 w-fit">
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer"
              :class="newGlobal.tipo === 'fixo' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="newGlobal.tipo = 'fixo'"
            >Valor fixo</button>
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer"
              :class="newGlobal.tipo === 'porcentagem' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="newGlobal.tipo = 'porcentagem'"
            >% da receita</button>
          </div>
        </div>

        <!-- Valor -->
        <div class="flex items-end gap-4 flex-wrap">
          <div>
            <p class="text-xs text-gray-500 mb-1.5">
              {{ newGlobal.tipo === 'fixo' ? 'Teto de gastos mensais' : 'Percentual a poupar' }}
            </p>
            <div class="flex items-center gap-2">
              <span v-if="newGlobal.tipo === 'fixo'" class="text-sm text-gray-400">R$</span>
              <input
                v-model="newGlobal.valor"
                type="number"
                :step="newGlobal.tipo === 'fixo' ? '0.01' : '1'"
                :min="newGlobal.tipo === 'fixo' ? '0.01' : '1'"
                :max="newGlobal.tipo === 'porcentagem' ? '99' : undefined"
                :placeholder="newGlobal.tipo === 'fixo' ? '8000,00' : '25'"
                class="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 w-32 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span v-if="newGlobal.tipo === 'porcentagem'" class="text-sm text-gray-400">%</span>
            </div>
            <p v-if="newGlobal.tipo === 'porcentagem'" class="text-xs text-gray-400 mt-1">
              O limite de gastos = receitas do mês × {{ 100 - (Number(newGlobal.valor) || 0) }}%
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500 mb-1.5">Vigente a partir de</p>
            <select
              v-model="newGlobal.data_inicio"
              class="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
        </div>

        <!-- Ações -->
        <div class="flex items-center gap-2">
          <UButton size="sm" color="primary" variant="soft" :loading="savingGlobal" @click="saveGlobal">Salvar</UButton>
          <UButton size="sm" color="neutral" variant="ghost" @click="editingGlobal = false">Cancelar</UButton>
        </div>
      </div>
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton class="h-64 rounded-lg" />
    </div>

    <template v-else-if="data">
      <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        <!-- Card header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <!-- Título -->
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-800 dark:text-gray-100">Limites de Gastos</h2>
              <p class="text-xs text-gray-400 mt-0.5">{{ periodLabel }}</p>
            </div>
          </div>
          <!-- Toggle + Gasto/Limite -->
          <div class="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                class="px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer"
                :class="modo === 'categoria' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                @click="setModo('categoria')"
              >Categoria</button>
              <button
                class="px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer"
                :class="modo === 'supercategoria' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                @click="setModo('supercategoria')"
              >Supercategoria</button>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-gray-400">Gasto / Limite</p>
              <p class="text-base sm:text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                {{ format(data.totalGastoLimitado) }}
                <span class="text-xs sm:text-sm font-normal text-gray-400"> / {{ format(data.totalLimitado) }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Total progress bar -->
        <div v-if="data.totalLimitado > 0" class="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs text-gray-500">Total limitado</span>
            <span class="text-xs font-medium" :class="data.totalGastoLimitado > data.totalLimitado ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'">
              {{ totalPct.toFixed(0) }}%
            </span>
          </div>
          <div class="w-full h-2 rounded-full" :class="data.totalGastoLimitado > data.totalLimitado ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'">
            <div
              class="h-2 rounded-full transition-all"
              :class="data.totalGastoLimitado > data.totalLimitado ? 'bg-red-500' : 'bg-primary-500'"
              :style="{ width: Math.min(totalPct, 100) + '%' }"
            />
          </div>
        </div>

        <!-- Empty -->
        <div v-if="!data.itens.length" class="text-center py-12 text-gray-400 text-sm">
          Nenhuma categoria encontrada
        </div>

        <!-- Items -->
        <div v-for="(item, idx) in data.itens" :key="item.referencia">
          <div
            class="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            :class="idx > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''"
          >
            <!-- Icon -->
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              :style="{ background: item.cor }"
            >
              <UIcon :name="item.icone" class="w-5 h-5 text-white" />
            </div>

            <!-- Name -->
            <span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{{ item.referencia }}</span>

            <!-- Inline editing -->
            <template v-if="editingReferencia === item.referencia">
              <div class="flex items-center gap-2 flex-wrap justify-end">
                <input
                  v-model="editingValor"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  class="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-1.5 w-28 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  @keydown.enter="saveLimit(item)"
                  @keydown.escape="cancelEdit"
                />
                <label class="flex items-center gap-1.5 cursor-pointer select-none flex-shrink-0">
                  <input type="checkbox" v-model="editingRecorrente" class="rounded accent-primary-500" />
                  <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Repetir todo mês</span>
                </label>
                <UButton size="xs" color="primary" variant="soft" icon="i-heroicons-check" :loading="saving" @click="saveLimit(item)" />
                <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="cancelEdit" />
              </div>
            </template>

            <!-- Normal view -->
            <template v-else>
              <!-- Badge recorrente -->
              <span
                v-if="item.limite !== null && item.recorrente"
                class="hidden sm:inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex-shrink-0"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-3 h-3" />
                Todo mês
              </span>

              <!-- Progress bar (hidden on small screens) -->
              <div v-if="item.limite !== null" class="hidden sm:flex items-center gap-2 w-40">
                <div class="flex-1 h-1.5 rounded-full" :class="item.gasto > item.limite ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'">
                  <div
                    class="h-1.5 rounded-full transition-all"
                    :class="item.gasto > item.limite ? 'bg-red-500' : ''"
                    :style="{ width: Math.min((item.gasto / item.limite) * 100, 100) + '%', background: item.gasto > item.limite ? '' : item.cor }"
                  />
                </div>
              </div>

              <!-- Amount display -->
              <div class="text-right flex-shrink-0">
                <template v-if="item.limite !== null">
                  <span
                    class="text-sm font-medium"
                    :class="item.gasto > item.limite ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'"
                  >{{ format(item.gasto) }}</span>
                  <span class="text-xs text-gray-400"> de {{ format(item.limite) }}</span>
                </template>
                <template v-else>
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ format(item.gasto) }}</span>
                </template>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <template v-if="item.limite !== null">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil"
                    @click="startEdit(item)"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    :loading="deletingId === item.limiteId"
                    @click="deleteLimit(item)"
                  />
                </template>
                <template v-else>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-plus"
                    @click="startEdit(item)"
                  />
                </template>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const { format } = useCurrency()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const modo = ref<'categoria' | 'supercategoria'>('categoria')

// ── Limite Global ────────────────────────────────────────────────
interface LimiteGlobalEntry {
  id: number
  tipo: 'fixo' | 'porcentagem'
  valor: number
  data_inicio: string
}

const { data: limiteGlobal, refresh: refreshGlobal } = await useFetch('/api/limite-global')

const editingGlobal = ref(false)
const savingGlobal = ref(false)
const showHistory = ref(false)
const newGlobal = reactive({ tipo: 'fixo' as 'fixo' | 'porcentagem', valor: '', data_inicio: currentMonth.value })

const monthOptions = computed(() => {
  const opts = []
  let y = now.getFullYear(), m = now.getMonth() + 1
  for (let i = 0; i < 24; i++) {
    const val = `${y}-${String(m).padStart(2, '0')}`
    const date = new Date(y, m - 1, 1)
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    m--
    if (m === 0) { m = 12; y-- }
  }
  return opts
})

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function startEditGlobal() {
  const active = limiteGlobal.value?.active
  newGlobal.tipo = active?.tipo ?? 'fixo'
  newGlobal.valor = active ? String(active.valor) : ''
  newGlobal.data_inicio = currentMonth.value
  editingGlobal.value = true
}

async function saveGlobal() {
  const valor = parseFloat(newGlobal.valor)
  if (isNaN(valor) || valor <= 0) return
  savingGlobal.value = true
  try {
    await $fetch('/api/limite-global', {
      method: 'POST',
      body: { tipo: newGlobal.tipo, valor, data_inicio: newGlobal.data_inicio },
    })
    editingGlobal.value = false
    await refreshGlobal()
  } finally {
    savingGlobal.value = false
  }
}

async function deleteGlobal(id: number) {
  await $fetch(`/api/limite-global/${id}`, { method: 'DELETE' })
  await refreshGlobal()
}
// ────────────────────────────────────────────────────────────────

const editingReferencia = ref<string | null>(null)
const editingValor = ref<string>('')
const editingRecorrente = ref(false)
const saving = ref(false)
const deletingId = ref<number | null>(null)

const periodLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
})

const { data, pending, refresh } = await useFetch('/api/limites', {
  query: computed(() => ({ month: currentMonth.value, modo: modo.value })),
})

const totalPct = computed(() => {
  if (!data.value || data.value.totalLimitado === 0) return 0
  return (data.value.totalGastoLimitado / data.value.totalLimitado) * 100
})

function setModo(m: 'categoria' | 'supercategoria') {
  modo.value = m
  cancelEdit()
}

function startEdit(item: { referencia: string; limite: number | null; recorrente?: boolean }) {
  editingReferencia.value = item.referencia
  editingValor.value = item.limite !== null ? String(item.limite) : ''
  editingRecorrente.value = item.recorrente ?? false
}

function cancelEdit() {
  editingReferencia.value = null
  editingValor.value = ''
  editingRecorrente.value = false
}

async function saveLimit(item: { referencia: string; limite: number | null; limiteId: number | null; recorrente?: boolean }) {
  const valor = parseFloat(editingValor.value)
  if (isNaN(valor) || valor <= 0) return

  saving.value = true
  try {
    if (item.limiteId !== null) {
      await $fetch(`/api/limites/${item.limiteId}`, { method: 'PUT', body: { valor, recorrente: editingRecorrente.value } })
    } else {
      await $fetch('/api/limites', {
        method: 'POST',
        body: { tipo: modo.value, referencia: item.referencia, mes: currentMonth.value, valor, recorrente: editingRecorrente.value },
      })
    }
    cancelEdit()
    await refresh()
  } finally {
    saving.value = false
  }
}

async function deleteLimit(item: { limiteId: number | null }) {
  if (item.limiteId === null) return
  deletingId.value = item.limiteId
  try {
    await $fetch(`/api/limites/${item.limiteId}`, { method: 'DELETE' })
    await refresh()
  } finally {
    deletingId.value = null
  }
}
</script>
