<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" to="/contas" />
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ data?.conta.nome }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ data?.conta.banco }}</p>
      </div>
      <UButton icon="i-heroicons-plus" color="primary" @click="abrirLancamentoModal">
        Novo Lançamento
      </UButton>
    </div>

    <!-- Card visual -->
    <div v-if="data" class="rounded-lg p-5 relative" :style="cardStyle">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-white/70 text-xs font-medium">{{ data.conta.banco }}</p>
          <p class="text-white text-lg font-bold mt-0.5">{{ data.conta.nome }}</p>
        </div>
        <SharedBankLogo :bank="findBank(data.conta.banco_key)" :size="40" class="rounded-lg opacity-90" />
      </div>
      <div class="mt-4">
        <p class="text-white/60 text-xs">Saldo atual</p>
        <p class="text-white text-3xl font-bold mt-0.5">{{ format(data.saldo_atual) }}</p>
      </div>
    </div>

    <!-- Month navigator -->
    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Resumo do mês -->
    <div v-if="data" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 px-6 py-4 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
      <div class="pr-6">
        <p class="text-xs text-gray-400 mb-1">Entradas</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(data.resumo.entradas) }}</p>
      </div>
      <div class="px-6">
        <p class="text-xs text-gray-400 mb-1">Saídas</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ format(data.resumo.saidas) }}</p>
      </div>
      <div class="pl-6">
        <p class="text-xs text-gray-400 mb-1">Saldo do mês</p>
        <p class="text-xl font-bold" :class="data.resumo.saldo_mes >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">
          {{ format(data.resumo.saldo_mes) }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- Error -->
    <UAlert v-else-if="error" color="red" variant="soft" title="Erro ao carregar lançamentos"
      :description="error.message" icon="i-heroicons-exclamation-triangle" />

    <!-- Empty -->
    <div v-else-if="!data?.lancamentos.length" class="text-center py-16">
      <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-building-library" class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Nenhum lançamento neste mês</h3>
      <p class="text-gray-400 text-sm">Adicione receitas ou despesas vinculadas a esta conta</p>
    </div>

    <!-- Lista de lançamentos -->
    <div v-else class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="px-5 pt-3 pb-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Lançamentos</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ busca ? `${lancamentosFiltrados.length} de ${data?.lancamentos.length}` : `${data?.lancamentos.length}` }} item(s)
          </p>
        </div>
        <UInput
          v-model="busca"
          placeholder="Buscar por descrição ou valor..."
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full"
          :trailing="busca ? true : false"
        >
          <template v-if="busca" #trailing>
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer" @click="busca = ''">
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </template>
        </UInput>
      </div>

      <!-- Sem resultados na busca -->
      <div v-if="busca && !lancamentosFiltrados.length" class="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
        <UIcon name="i-heroicons-magnifying-glass" class="w-8 h-8 text-gray-300" />
        <p class="text-sm">Nenhum lançamento encontrado para <strong class="text-gray-600 dark:text-gray-300">"{{ busca }}"</strong></p>
      </div>

      <div
        v-for="(lanc, i) in lancamentosFiltrados"
        v-else
        :key="`${lanc.tipo}-${lanc.id}`"
        class="flex items-center gap-4 px-5 py-4 transition-opacity"
        :class="[
          i < lancamentosFiltrados.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : '',
          lanc.pago && (lanc.tipo === 'receita' || lanc.tipo === 'despesa') ? 'opacity-60' : ''
        ]"
      >
        <!-- Ícone -->
        <div
          class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          :style="lanc.categoria_icone ? { background: lanc.categoria_cor } : {}"
          :class="lanc.categoria_icone ? '' : iconBg(lanc)"
        >
          <UIcon
            :name="lanc.categoria_icone ?? iconName(lanc)"
            class="w-4 h-4"
            :class="lanc.categoria_icone ? 'text-white' : iconColor(lanc)"
          />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate"
            :class="lanc.tipo === 'despesa' && lanc.pago ? 'line-through' : ''"
          >{{ lanc.descricao }}</p>
          <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-400">{{ descricaoData(lanc) }}</span>
            <template v-if="lanc.tipo === 'fatura' && lanc.mes">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">Fatura {{ fmtMonth(lanc.mes) }}</span>
            </template>
            <template v-if="lanc.tipo === 'transferencia'">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">
                {{ lanc.direcao === 'entrada' ? `De ${lanc.conta_origem_nome}` : `Para ${lanc.conta_destino_nome}` }}
              </span>
            </template>
            <template v-if="lanc.parcelas > 0">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">{{ lanc.parcela_atual }}/{{ lanc.parcelas }}</span>
            </template>
            <template v-else-if="lanc.fixa && lanc.tipo !== 'fatura'">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">Fixa</span>
            </template>
            <template v-if="lanc.categoria">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">{{ lanc.categoria }}</span>
            </template>
          </div>
          <p v-if="lanc.nome_fatura" class="text-xs text-gray-400 mt-0.5 truncate font-mono">{{ lanc.nome_fatura }}</p>
          <p v-if="lanc.notas" class="text-xs text-gray-400 mt-0.5 truncate italic">{{ lanc.notas }}</p>
        </div>

        <!-- Valor + pagar -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            v-if="lanc.tipo === 'receita'"
            class="text-xs px-2 py-0.5 rounded-full"
            :class="lanc.pago
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'"
          >{{ lanc.pago ? 'Recebido' : 'A receber' }}</span>
          <p class="text-sm font-medium" :class="isPositivo(lanc) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ isPositivo(lanc) ? '+' : '-' }} {{ format(lanc.valor) }}
          </p>
          <UButton
            v-if="lanc.tipo === 'despesa' && !lanc.pago"
            icon="i-heroicons-check-circle"
            size="xs"
            variant="ghost"
            color="neutral"
            class="text-gray-400 hover:text-green-600"
            title="Marcar como pago"
            @click="abrirPagarModal(lanc)"
          />
          <button
            v-else-if="lanc.tipo === 'despesa' && lanc.pago"
            class="text-green-500 hover:text-orange-400 transition-colors cursor-pointer flex-shrink-0"
            title="Clique para desmarcar pagamento"
            @click="despagarLanc(lanc)"
          >
            <UIcon name="i-heroicons-check-circle-solid" class="w-4 h-4" />
          </button>
          <UButton
            v-else-if="lanc.tipo === 'receita' && !lanc.pago"
            icon="i-heroicons-check-circle"
            size="xs"
            variant="ghost"
            color="neutral"
            class="text-gray-400 hover:text-emerald-600"
            title="Marcar como recebido"
            @click="abrirReceberModal(lanc)"
          />
          <UIcon
            v-else-if="lanc.tipo === 'receita' && lanc.pago"
            name="i-heroicons-check-circle-solid"
            class="w-4 h-4 text-emerald-500 flex-shrink-0"
          />
        </div>

        <!-- Ações: editar e excluir (não disponível para faturas) -->
        <div v-if="lanc.tipo !== 'fatura'" class="flex items-center gap-1 flex-shrink-0">
          <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs" @click="abrirEditModal(lanc)" />
          <UButton icon="i-heroicons-trash" variant="ghost" color="red" size="xs" @click="abrirDeleteModal(lanc)" />
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Marcar como pago -->
  <UModal v-model:open="showPagarModal">
    <template #content>
      <div class="p-6 space-y-5">
        <div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Marcar como pago</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ pagarLanc?.descricao }}
            <span v-if="pagarLanc?.fixa" class="text-gray-400"> · {{ fmtMonth(currentMonth) }}</span>
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Valor</span>
          <span class="text-sm font-semibold text-red-600 dark:text-red-400">- {{ format(pagarLanc?.valor ?? 0) }}</span>
        </div>

        <UFormField label="Data do pagamento">
          <UInput v-model="pagarData" type="date" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showPagarModal = false">Cancelar</UButton>
          <UButton color="primary" :loading="salvandoPagamento" @click="confirmarPagamento">
            Confirmar pagamento
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Modal: Marcar como recebido -->
  <UModal v-model:open="showReceberModal">
    <template #content>
      <div class="p-6 space-y-5">
        <div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Marcar como recebido</h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ receberLanc?.descricao }}
            <span v-if="receberLanc?.fixa" class="text-gray-400"> · {{ fmtMonth(currentMonth) }}</span>
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <span class="text-sm text-gray-600 dark:text-gray-400">Valor</span>
          <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+ {{ format(receberLanc?.valor ?? 0) }}</span>
        </div>

        <UFormField label="Data do recebimento">
          <UInput v-model="receberData" type="date" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showReceberModal = false">Cancelar</UButton>
          <UButton color="primary" :loading="salvandoRecebimento" @click="confirmarRecebimento">
            Confirmar recebimento
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Slideover: Editar Lançamento -->
  <USlideover v-model:open="showEditModal" :title="editTitle" :ui="{ width: 'sm:max-w-lg' }">
    <template #body>
      <div class="space-y-5 p-1">
        <TransferenciasTransferenciaForm
          v-if="editingLanc?.tipo === 'transferencia'"
          :initial="editTransferenciaInitial"
          :loading="salvandoEdit"
          @submit="handleEditSubmit"
          @cancel="showEditModal = false"
        />
        <ContasNovoLancamentoForm
          v-else-if="editingLanc"
          :key="`edit-${editingLanc.id}`"
          :conta-id="contaIdNum"
          :conta-nome="data?.conta.nome ?? ''"
          :conta-banco="data?.conta.banco ?? ''"
          :conta-banco-key="data?.conta.banco_key ?? ''"
          :tipo="editingLanc.tipo as 'receita' | 'despesa'"
          :initial="editingLanc"
          :loading="salvandoEdit"
          @submit="handleEditSubmit"
          @cancel="showEditModal = false"
        />
      </div>
    </template>
  </USlideover>

  <!-- Slideover: Excluir Lançamento -->
  <USlideover v-model:open="showDeleteModal" title="Excluir lançamento">
    <template #body>
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir
          <strong class="text-gray-900 dark:text-white">{{ deletingLanc?.descricao }}</strong>?
        </p>
        <template v-if="deletingLanc?.fixa">
          <div class="flex flex-col gap-2">
            <UButton
              variant="soft"
              color="neutral"
              :loading="deleting"
              icon="i-heroicons-calendar-days"
              class="w-full justify-start"
              @click="handleDelete('one')"
            >
              Remover só {{ deletingLanc.parcelas > 0 ? 'esta parcela' : 'este mês' }}
            </UButton>
            <UButton
              color="red"
              :loading="deleting"
              icon="i-heroicons-trash"
              class="w-full justify-start"
              @click="handleDelete('all')"
            >
              Remover {{ deletingLanc.parcelas > 0 ? 'todas as parcelas' : 'todos os meses' }}
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

  <!-- Slideover: Novo Lançamento -->
  <USlideover v-model:open="showLancamentoModal" title="Novo Lançamento" :ui="{ width: 'sm:max-w-lg' }">
    <template #body>
      <div class="space-y-5 p-1">
        <!-- Seletor de tipo -->
        <div class="flex gap-2">
          <button
            v-for="tab in lancamentoTabs"
            :key="tab.value"
            type="button"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors cursor-pointer"
            :class="lancamentoTipo === tab.value
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'"
            @click="lancamentoTipo = tab.value"
          >
            <UIcon :name="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <div v-if="!lancamentoTipo" class="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-1">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="w-8 h-8 mb-2 text-gray-300" />
          Selecione o tipo de lançamento acima
        </div>

        <ContasNovoLancamentoForm
          v-else
          :key="lancamentoTipo"
          :conta-id="contaIdNum"
          :conta-nome="data?.conta.nome ?? ''"
          :conta-banco="data?.conta.banco ?? ''"
          :conta-banco-key="data?.conta.banco_key ?? ''"
          :tipo="lancamentoTipo"
          :loading="salvandoLancamento"
          @submit="handleLancamentoSubmit"
          @cancel="showLancamentoModal = false"
        />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
interface Lancamento {
  id: number | string
  descricao: string
  valor: number
  tipo: 'receita' | 'despesa' | 'transferencia' | 'fatura'
  direcao?: 'entrada' | 'saida'
  data: string
  data_inicio: string | null
  data_fim: string | null
  data_pagamento?: string | null
  pago_antecipado?: boolean
  mes?: string
  categoria: string | null
  categoria_cor: string | null
  categoria_icone: string | null
  fixa: number
  parcelas: number
  parcela_atual: number | null
  pago: number
  conta_origem_id?: number
  conta_destino_id?: number
  conta_origem_nome?: string
  conta_destino_nome?: string
  cartao_nome?: string
  notas?: string | null
  nome_fatura?: string | null
}

interface Resumo { entradas: number; saidas: number; saldo_mes: number }

interface ContaDetalhe { id: number; nome: string; banco: string; banco_key: string; saldo_inicial: number }

const route = useRoute()
const { format } = useCurrency()
const { findBank } = useBanks()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data, pending, error, refresh } = await useFetch<{ conta: ContaDetalhe; lancamentos: Lancamento[]; resumo: Resumo; saldo_atual: number }>(
  `/api/contas/${route.params.id}/lancamentos`,
  { query: computed(() => ({ month: currentMonth.value })), watch: [currentMonth] }
)

const cardStyle = computed(() => {
  const bank = findBank(data.value?.conta.banco_key ?? '')
  const color = bank?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)` }
})

function fmtDate(d: string | null) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMonth(ym: string | undefined) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${meses[Number(m) - 1]}/${y}`
}

function descricaoData(l: Lancamento) {
  if (l.fixa) {
    const dia = l.data_inicio?.split('-')[2]
    return `Todo dia ${dia}${l.data_fim ? ' · até ' + fmtDate(l.data_fim) : ''}`
  }
  return fmtDate(l.data)
}

function isPositivo(l: Lancamento) {
  if (l.tipo === 'receita') return true
  if (l.tipo === 'transferencia') return l.direcao === 'entrada'
  return false
}

function iconName(l: Lancamento) {
  if (l.tipo === 'receita') return l.fixa ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-down-circle'
  if (l.tipo === 'transferencia') return l.direcao === 'entrada' ? 'i-heroicons-arrow-right-circle' : 'i-heroicons-arrow-right-circle'
  if (l.tipo === 'fatura') return 'i-heroicons-credit-card'
  return l.fixa ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-up-circle'
}

function iconBg(l: Lancamento) {
  if (l.tipo === 'receita') return 'bg-green-100 dark:bg-green-900/30'
  if (l.tipo === 'transferencia') return l.direcao === 'entrada' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
  if (l.tipo === 'fatura') return 'bg-violet-100 dark:bg-violet-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

function iconColor(l: Lancamento) {
  if (l.tipo === 'receita') return 'text-green-600 dark:text-green-400'
  if (l.tipo === 'transferencia') return l.direcao === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
  if (l.tipo === 'fatura') return 'text-violet-600 dark:text-violet-400'
  return 'text-red-600 dark:text-red-400'
}

// --- Busca ---
const busca = ref('')
watch(currentMonth, () => { busca.value = '' })

const lancamentosFiltrados = computed(() => {
  const list = data.value?.lancamentos ?? []
  const q = busca.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(l => {
    if (l.descricao.toLowerCase().includes(q)) return true
    const valorBR = l.valor.toFixed(2).replace('.', ',')
    if (valorBR.includes(q)) return true
    const valorFormatado = format(l.valor).toLowerCase().replace(/\s/g, '')
    if (valorFormatado.includes(q.replace(/\s/g, ''))) return true
    return false
  })
})

// --- Novo Lançamento ---
const showLancamentoModal = ref(false)
const lancamentoTipo = ref<'receita' | 'despesa' | 'transferencia' | null>(null)
const salvandoLancamento = ref(false)
const contaIdNum = computed(() => Number(route.params.id))

const lancamentoTabs = [
  { value: 'receita',       label: 'Receita',       icon: 'i-heroicons-arrow-down-circle' },
  { value: 'despesa',       label: 'Despesa',        icon: 'i-heroicons-arrow-up-circle' },
  { value: 'transferencia', label: 'Transferência',  icon: 'i-heroicons-arrows-right-left' },
] as const

function abrirLancamentoModal() {
  lancamentoTipo.value = null
  showLancamentoModal.value = true
}

const apiMap = { receita: '/api/receitas', despesa: '/api/despesas', transferencia: '/api/transferencias' } as const
const toastMap = { receita: 'Receita adicionada', despesa: 'Despesa adicionada', transferencia: 'Transferência registrada' } as const

async function handleLancamentoSubmit(formData: any) {
  if (!lancamentoTipo.value) return
  salvandoLancamento.value = true
  try {
    await $fetch(apiMap[lancamentoTipo.value], { method: 'POST', body: formData })
    showLancamentoModal.value = false
    await refresh()
    refreshNuxtData() // invalida cache de dashboard, receitas, despesas etc.
    toast.add({ title: toastMap[lancamentoTipo.value!], color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao salvar', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    salvandoLancamento.value = false
  }
}

// --- Editar Lançamento ---
const showEditModal = ref(false)
const editingLanc = ref<Lancamento | null>(null)
const salvandoEdit = ref(false)

const editTitle = computed(() => {
  if (!editingLanc.value) return 'Editar'
  if (editingLanc.value.tipo === 'receita') return 'Editar Receita'
  if (editingLanc.value.tipo === 'despesa') return 'Editar Despesa'
  return 'Editar Transferência'
})

const editTransferenciaInitial = computed(() => {
  if (!editingLanc.value || editingLanc.value.tipo !== 'transferencia') return null
  return {
    id: editingLanc.value.id as number,
    valor: editingLanc.value.valor,
    data: editingLanc.value.data,
    descricao: editingLanc.value.descricao,
    conta_origem_id: editingLanc.value.conta_origem_id!,
    conta_destino_id: editingLanc.value.conta_destino_id!,
  }
})

function abrirEditModal(lanc: Lancamento) {
  editingLanc.value = lanc
  showEditModal.value = true
}

async function handleEditSubmit(formData: any) {
  if (!editingLanc.value) return
  salvandoEdit.value = true
  try {
    await $fetch(`${apiMap[editingLanc.value.tipo as keyof typeof apiMap]}/${editingLanc.value.id}`, {
      method: 'PUT',
      body: formData,
    })
    showEditModal.value = false
    editingLanc.value = null
    await refresh()
    refreshNuxtData()
    toast.add({ title: 'Lançamento atualizado', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao salvar', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    salvandoEdit.value = false
  }
}

// --- Excluir Lançamento ---
const showDeleteModal = ref(false)
const deletingLanc = ref<Lancamento | null>(null)
const deleting = ref(false)

function abrirDeleteModal(lanc: Lancamento) {
  deletingLanc.value = lanc
  showDeleteModal.value = true
}

async function handleDelete(scope: 'one' | 'all') {
  if (!deletingLanc.value) return
  deleting.value = true
  const tipo = deletingLanc.value.tipo as keyof typeof apiMap
  try {
    const params: Record<string, string> = {}
    if (tipo !== 'transferencia') {
      params.scope = scope
      if (scope === 'one') params.month = currentMonth.value
    }
    await $fetch(`${apiMap[tipo]}/${deletingLanc.value.id}`, {
      method: 'DELETE',
      query: Object.keys(params).length ? params : undefined,
    })
    showDeleteModal.value = false
    deletingLanc.value = null
    await refresh()
    refreshNuxtData()
    toast.add({ title: 'Lançamento excluído', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao excluir', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    deleting.value = false
  }
}

// --- Marcar como recebido ---
const showReceberModal = ref(false)
const receberLanc = ref<Lancamento | null>(null)
const receberData = ref('')
const salvandoRecebimento = ref(false)

function abrirReceberModal(lanc: Lancamento) {
  receberLanc.value = lanc
  receberData.value = useLocalDate().localDateStr()
  showReceberModal.value = true
}

async function confirmarRecebimento() {
  if (!receberLanc.value) return
  salvandoRecebimento.value = true
  try {
    const body: Record<string, string> = { data_recebimento: receberData.value }
    if (receberLanc.value.fixa) body.mes = currentMonth.value
    await $fetch(`/api/transacoes/${receberLanc.value.id}/receber`, {
      method: 'PATCH',
      body,
    })
    showReceberModal.value = false
    await refresh()
    toast.add({ title: 'Recebimento registrado', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao registrar recebimento', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    salvandoRecebimento.value = false
  }
}

// --- Desmarcar como pago ---
async function despagarLanc(lanc: Lancamento) {
  try {
    const body: Record<string, string> = {}
    if (lanc.fixa) body.mes = currentMonth.value
    await $fetch(`/api/transacoes/${lanc.id}/despagar`, { method: 'PATCH', body })
    await refresh()
    refreshNuxtData()
    toast.add({ title: 'Pagamento desmarcado', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao desmarcar', description: e?.data?.message ?? e?.message, color: 'error' })
  }
}

// --- Marcar como pago ---
const showPagarModal = ref(false)
const pagarLanc = ref<Lancamento | null>(null)
const pagarData = ref('')
const salvandoPagamento = ref(false)
const toast = useToast()

function abrirPagarModal(lanc: Lancamento) {
  pagarLanc.value = lanc
  pagarData.value = useLocalDate().localDateStr()
  showPagarModal.value = true
}

async function confirmarPagamento() {
  if (!pagarLanc.value) return
  salvandoPagamento.value = true
  try {
    const body: Record<string, string> = { data_pagamento: pagarData.value }
    if (pagarLanc.value.fixa) body.mes = currentMonth.value
    await $fetch(`/api/transacoes/${pagarLanc.value.id}/pagar`, {
      method: 'PATCH',
      body,
    })
    showPagarModal.value = false
    await refresh()
    toast.add({ title: 'Pagamento registrado', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao registrar pagamento', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    salvandoPagamento.value = false
  }
}

useHead({ title: computed(() => `${data.value?.conta.nome ?? 'Conta'} — Gestão Financeira`) })
</script>
