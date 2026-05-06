<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" to="/contas" />
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ data?.conta.nome }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ data?.conta.banco }}</p>
      </div>
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
      <div class="mt-3">
        <p class="text-white/50 text-xs">Saldo inicial: {{ format(data.conta.saldo_inicial) }}</p>
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
      <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Lançamentos</p>
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ data?.lancamentos.length }} item(s)</p>
      </div>
      <div
        v-for="(lanc, i) in data.lancamentos"
        :key="`${lanc.tipo}-${lanc.id}`"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < data.lancamentos.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
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
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ lanc.descricao }}</p>
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
        </div>

        <!-- Valor + pagar -->
        <div class="flex items-center gap-2 flex-shrink-0">
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
          <UIcon
            v-else-if="lanc.tipo === 'despesa' && lanc.pago"
            name="i-heroicons-check-circle-solid"
            class="w-4 h-4 text-green-500 flex-shrink-0"
          />
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
  conta_origem_nome?: string
  conta_destino_nome?: string
  cartao_nome?: string
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

// --- Marcar como pago ---
const showPagarModal = ref(false)
const pagarLanc = ref<Lancamento | null>(null)
const pagarData = ref('')
const salvandoPagamento = ref(false)
const toast = useToast()

function abrirPagarModal(lanc: Lancamento) {
  pagarLanc.value = lanc
  pagarData.value = new Date().toISOString().split('T')[0]
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
