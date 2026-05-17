<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Metas</h1>
        <p class="text-sm text-gray-500 mt-1">Acompanhe seus objetivos de economia</p>
      </div>
      <UButton
        v-if="!showForm"
        icon="i-heroicons-plus"
        size="sm"
        color="primary"
        variant="soft"
        class="cursor-pointer"
        @click="openForm()"
      >Nova meta</UButton>
    </div>

    <!-- Formulário de nova/editar meta -->
    <div v-if="showForm" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-5 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ editingMeta ? 'Editar meta' : 'Nova meta' }}</h2>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-1.5">Nome</p>
          <input v-model="form.nome" type="text" placeholder="Ex: Viagem para Europa"
            class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1.5">Valor alvo</p>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-400">R$</span>
            <input v-model="form.valor_alvo" type="number" step="0.01" min="0.01" placeholder="5000,00"
              class="flex-1 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1.5">Prazo</p>
          <select v-model="form.prazo"
            class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
            <option v-for="m in prazoOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1.5">Ícone</p>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="ic in icones" :key="ic"
              class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
              :class="form.icone === ic ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'"
              @click="form.icone = ic"
            >
              <UIcon :name="ic" class="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1.5">Cor</p>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="c in cores" :key="c"
              class="w-6 h-6 rounded-full transition-all cursor-pointer"
              :class="form.cor === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : ''"
              :style="{ background: c }"
              @click="form.cor = c"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-1">
        <UButton size="sm" color="primary" variant="soft" class="cursor-pointer" :loading="saving" @click="saveMeta">Salvar</UButton>
        <UButton size="sm" color="neutral" variant="ghost" class="cursor-pointer" @click="closeForm">Cancelar</UButton>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!pending && !data?.length && !showForm" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 py-16 flex flex-col items-center gap-3 text-center">
      <UIcon name="i-heroicons-flag" class="w-10 h-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-500">Nenhuma meta criada</p>
      <p class="text-xs text-gray-400 max-w-xs">Crie uma meta para acompanhar seu progresso em direção a um objetivo financeiro.</p>
    </div>

    <!-- Cards de metas -->
    <div v-if="data?.length" class="space-y-4">
      <!-- Ativas -->
      <div class="grid grid-cols-1 gap-4">
        <div
          v-for="meta in data"
          :key="meta.id"
          class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden"
          :class="meta.concluida ? 'opacity-60' : ''"
        >
          <!-- Card header -->
          <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :style="{ background: meta.cor }">
              <UIcon :name="meta.icone" class="w-5 h-5 text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-gray-800 dark:text-gray-100 truncate">{{ meta.nome }}</h3>
                <span v-if="meta.concluida" class="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Concluída</span>
                <span v-else-if="meta.mesesRestantes === 0" class="text-xs px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">Prazo encerrado</span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5">Prazo: {{ fmtMonth(meta.prazo) }}</p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-pencil" class="cursor-pointer" @click="openForm(meta)" />
              <UButton
                size="xs"
                :color="meta.concluida ? 'neutral' : 'success'"
                variant="ghost"
                :icon="meta.concluida ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-check'"
                class="cursor-pointer"
                @click="toggleConcluida(meta)"
              />
              <UButton size="xs" color="error" variant="ghost" icon="i-heroicons-trash" class="cursor-pointer" @click="deleteMeta(meta.id)" />
            </div>
          </div>

          <!-- Progresso -->
          <div class="px-5 py-4">
            <div class="flex items-end justify-between mb-2">
              <div>
                <p class="text-xs text-gray-400 mb-0.5">Aportado</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ format(meta.total) }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-400 mb-0.5">Meta</p>
                <p class="text-base font-semibold text-gray-500 dark:text-gray-400">{{ format(meta.valor_alvo) }}</p>
              </div>
            </div>

            <!-- Barra -->
            <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-1.5">
              <div
                class="h-2.5 rounded-full transition-all"
                :style="{ width: meta.pct + '%', background: meta.cor }"
              />
            </div>
            <div class="flex items-center justify-between">
              <p class="text-xs text-gray-400">{{ meta.pct.toFixed(0) }}% concluído</p>
              <p class="text-xs text-gray-400">faltam {{ format(meta.falta) }}</p>
            </div>
          </div>

          <!-- Insights -->
          <div v-if="!meta.concluida && (meta.necessarioPorMes || meta.ritmoMedio || meta.projecao)" class="grid grid-cols-3 gap-0 border-t border-gray-100 dark:border-gray-800">
            <div v-if="meta.mesesRestantes > 0" class="px-5 py-3 border-r border-gray-100 dark:border-gray-800">
              <p class="text-xs text-gray-400 mb-0.5">Necessário/mês</p>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {{ meta.necessarioPorMes ? format(meta.necessarioPorMes) : '—' }}
              </p>
            </div>
            <div class="px-5 py-3" :class="meta.mesesRestantes > 0 ? 'border-r border-gray-100 dark:border-gray-800' : ''">
              <p class="text-xs text-gray-400 mb-0.5">Ritmo médio</p>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {{ meta.ritmoMedio ? format(meta.ritmoMedio) + '/mês' : '—' }}
              </p>
            </div>
            <div class="px-5 py-3">
              <p class="text-xs text-gray-400 mb-0.5">Previsão de conclusão</p>
              <p class="text-sm font-semibold" :class="projecaoColor(meta)">
                {{ meta.projecao ? fmtMonth(meta.projecao) : '—' }}
              </p>
            </div>
          </div>

          <!-- Aportes -->
          <div class="border-t border-gray-100 dark:border-gray-800">
            <button
              class="w-full flex items-center justify-between px-5 py-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
              @click="toggleAportes(meta.id)"
            >
              <span>{{ meta.aportes.length }} aporte{{ meta.aportes.length !== 1 ? 's' : '' }}</span>
              <div class="flex items-center gap-2">
                <span class="text-primary-500 font-medium">+ Registrar aporte</span>
                <UIcon :name="expandedAportes === meta.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3.5 h-3.5" />
              </div>
            </button>

            <div v-if="expandedAportes === meta.id" class="border-t border-gray-100 dark:border-gray-800">
              <!-- Form aporte -->
              <div class="px-5 py-3 bg-gray-50 dark:bg-gray-800/40 flex items-end gap-3 flex-wrap">
                <div>
                  <p class="text-xs text-gray-500 mb-1">Valor</p>
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs text-gray-400">R$</span>
                    <input v-model="aporteForm.valor" type="number" step="0.01" min="0.01" placeholder="500,00"
                      class="w-28 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Data</p>
                  <input v-model="aporteForm.data" type="date"
                    class="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div class="flex-1 min-w-32">
                  <p class="text-xs text-gray-500 mb-1">Notas (opcional)</p>
                  <input v-model="aporteForm.notas" type="text" placeholder="Ex: depósito mensal"
                    class="w-full text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <UButton size="sm" color="primary" variant="soft" class="cursor-pointer" :loading="savingAporte === meta.id" @click="saveAporte(meta.id)">Salvar</UButton>
              </div>

              <!-- Lista de aportes -->
              <div v-if="meta.aportes.length" class="divide-y divide-gray-100 dark:divide-gray-800">
                <div v-for="a in meta.aportes" :key="a.id" class="flex items-center justify-between px-5 py-2.5">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ format(a.valor) }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ fmtDate(a.data) }}{{ a.notas ? ' · ' + a.notas : '' }}</p>
                  </div>
                  <UButton size="xs" color="error" variant="ghost" icon="i-heroicons-trash" class="cursor-pointer" @click="deleteAporte(meta.id, a.id)" />
                </div>
              </div>
              <div v-else class="px-5 py-4 text-xs text-gray-400 text-center">Nenhum aporte registrado ainda</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { format } = useCurrency()

interface Aporte { id: number; valor: number; data: string; notas: string | null }
interface Meta {
  id: number; nome: string; valor_alvo: number; prazo: string
  icone: string; cor: string; concluida: boolean
  total: number; falta: number; pct: number
  mesesRestantes: number; necessarioPorMes: number | null
  ritmoMedio: number | null; projecao: string | null
  aportes: Aporte[]
}

const { data, pending, refresh } = await useFetch<Meta[]>('/api/metas')

// ── Opções ────────────────────────────────────────────────────
const icones = [
  // Objetivos gerais
  'i-lucide-flag', 'i-lucide-star', 'i-lucide-sparkles', 'i-lucide-rocket',
  // Casa e imóvel
  'i-lucide-home', 'i-lucide-building-2', 'i-lucide-wrench', 'i-lucide-key',
  // Veículos
  'i-lucide-car', 'i-lucide-truck', 'i-lucide-bike', 'i-lucide-plane',
  // Viagem
  'i-lucide-globe', 'i-lucide-map', 'i-lucide-map-pin', 'i-lucide-luggage',
  // Saúde e família
  'i-lucide-heart', 'i-lucide-users', 'i-lucide-shield-check', 'i-lucide-baby',
  // Educação e trabalho
  'i-lucide-graduation-cap', 'i-lucide-briefcase', 'i-lucide-book-open',
  // Tecnologia
  'i-lucide-smartphone', 'i-lucide-monitor', 'i-lucide-camera', 'i-lucide-tv',
  // Lazer e consumo
  'i-lucide-gift', 'i-lucide-shopping-bag', 'i-lucide-music', 'i-lucide-gamepad-2',
  'i-lucide-palette', 'i-lucide-dumbbell',
  // Finanças
  'i-lucide-banknote', 'i-lucide-bar-chart-2', 'i-lucide-trending-up', 'i-lucide-piggy-bank',
]

const cores = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#64748b', '#78716c',
]

const now = new Date()
const prazoOptions = computed(() => {
  const opts = []
  let y = now.getFullYear(), m = now.getMonth() + 1
  for (let i = 0; i < 36; i++) {
    const val = `${y}-${String(m).padStart(2, '0')}`
    const date = new Date(y, m - 1, 1)
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    m++; if (m === 13) { m = 1; y++ }
  }
  return opts
})

// ── Form meta ────────────────────────────────────────────────
const showForm = ref(false)
const saving = ref(false)
const editingMeta = ref<Meta | null>(null)
const form = reactive({
  nome: '', valor_alvo: '', prazo: prazoOptions.value[1]?.value ?? '',
  icone: 'i-lucide-flag', cor: '#6366f1',
})

function openForm(meta?: Meta) {
  editingMeta.value = meta ?? null
  if (meta) {
    form.nome = meta.nome; form.valor_alvo = String(meta.valor_alvo)
    form.prazo = meta.prazo; form.icone = meta.icone; form.cor = meta.cor
  } else {
    form.nome = ''; form.valor_alvo = ''; form.prazo = prazoOptions.value[1]?.value ?? ''
    form.icone = 'i-lucide-flag'; form.cor = '#6366f1'
  }
  showForm.value = true
}

function closeForm() { showForm.value = false; editingMeta.value = null }

async function saveMeta() {
  if (!form.nome.trim() || !form.valor_alvo || !form.prazo) return
  saving.value = true
  try {
    const body = { nome: form.nome.trim(), valor_alvo: parseFloat(form.valor_alvo), prazo: form.prazo, icone: form.icone, cor: form.cor }
    if (editingMeta.value) {
      await $fetch(`/api/metas/${editingMeta.value.id}`, { method: 'PUT', body: { ...body, concluida: editingMeta.value.concluida } })
    } else {
      await $fetch('/api/metas', { method: 'POST', body })
    }
    closeForm(); await refresh()
  } finally { saving.value = false }
}

async function deleteMeta(id: number) {
  await $fetch(`/api/metas/${id}`, { method: 'DELETE' })
  await refresh()
}

async function toggleConcluida(meta: Meta) {
  await $fetch(`/api/metas/${meta.id}`, {
    method: 'PUT',
    body: { nome: meta.nome, valor_alvo: meta.valor_alvo, prazo: meta.prazo, icone: meta.icone, cor: meta.cor, concluida: !meta.concluida },
  })
  await refresh()
}

// ── Aportes ──────────────────────────────────────────────────
const expandedAportes = ref<number | null>(null)
const savingAporte = ref<number | null>(null)
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const aporteForm = reactive({ valor: '', data: todayStr, notas: '' })

function toggleAportes(id: number) {
  expandedAportes.value = expandedAportes.value === id ? null : id
  aporteForm.valor = ''; aporteForm.data = todayStr; aporteForm.notas = ''
}

async function saveAporte(metaId: number) {
  const valor = parseFloat(aporteForm.valor)
  if (isNaN(valor) || valor <= 0 || !aporteForm.data) return
  savingAporte.value = metaId
  try {
    await $fetch(`/api/metas/${metaId}/aportes`, { method: 'POST', body: { valor, data: aporteForm.data, notas: aporteForm.notas } })
    aporteForm.valor = ''; aporteForm.notas = ''
    await refresh()
  } finally { savingAporte.value = null }
}

async function deleteAporte(metaId: number, aporteId: number) {
  await $fetch(`/api/metas/aportes/${aporteId}`, { method: 'DELETE' })
  await refresh()
}

// ── Helpers ──────────────────────────────────────────────────
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function projecaoColor(meta: Meta) {
  if (!meta.projecao || !meta.prazo) return 'text-gray-800 dark:text-gray-100'
  if (meta.projecao <= meta.prazo) return 'text-emerald-900 dark:text-emerald-400'
  return 'text-rose-900 dark:text-rose-400'
}

useHead({ title: 'Metas — Gestão Financeira' })
</script>
