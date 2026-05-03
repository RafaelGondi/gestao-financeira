<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" to="/cartoes" />
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ data?.cartao.nome }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ data?.cartao.banco }} · Vence dia {{ data?.cartao.vencimento }}</p>
      </div>
    </div>

    <!-- Card visual -->
    <div v-if="data" class="h-32 rounded-lg p-5 relative" :style="cardStyle">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-white/70 text-xs font-medium">{{ data.cartao.banco }}</p>
          <p class="text-white text-xl font-bold mt-0.5">{{ data.cartao.nome }}</p>
        </div>
        <SharedBankLogo :bank="findBank(data.cartao.banco_key)" :size="40" class="rounded-lg opacity-90" />
      </div>
      <div class="absolute bottom-5 left-5 right-5 flex justify-between items-end">
        <div>
          <p class="text-white/60 text-xs">Limite</p>
          <p class="text-white text-sm font-semibold">{{ format(data.cartao.limite) }}</p>
        </div>
        <div class="text-right">
          <p class="text-white/60 text-xs">Melhor compra</p>
          <p class="text-white text-sm font-semibold">Dia {{ data.cartao.melhor_data_compra }}</p>
        </div>
      </div>
    </div>

    <!-- Projeção de quitação e faturas residuais -->
    <div v-if="projecao" class="grid grid-cols-2 gap-3">
      <div class="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p class="text-xs text-gray-400 mb-1">Quitação estimada</p>
        <p v-if="projecao.mes_quitacao" class="text-base font-semibold text-gray-900 dark:text-white">
          {{ fmtMonth(projecao.mes_quitacao) }}
        </p>
        <p v-else class="text-base font-semibold text-gray-400">Sem previsão</p>
        <p class="text-xs text-gray-400 mt-0.5">Mês da última fatura</p>
      </div>
      <div class="rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <p class="text-xs text-gray-400 mb-1">Faturas residuais a partir de</p>
        <p v-if="projecao.mes_inicio_residual" class="text-base font-semibold text-gray-900 dark:text-white">
          {{ fmtMonth(projecao.mes_inicio_residual) }}
        </p>
        <p v-else class="text-base font-semibold text-gray-400">—</p>
        <p class="text-xs text-gray-400 mt-0.5">≤ 15% da média ou &lt; R$ 150</p>
      </div>
    </div>

    <!-- Gráfico de projeção 12 meses -->
    <div v-if="projecao?.projecao12?.length" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">Projeção de faturas</p>
          <p class="text-xs text-gray-400 mt-0.5">Próximos 12 meses · barras claras = residuais</p>
        </div>
        <p class="text-xs text-gray-400">
          Total: <span class="font-medium text-gray-700 dark:text-gray-300">
            {{ format(projecao.projecao12.reduce((s, p) => s + p.valor, 0)) }}
          </span>
        </p>
      </div>
      <div class="h-52">
        <CartoesFaturaChart
          :dados="projecao.projecao12"
          :mes-residual="projecao.mes_inicio_residual"
          :card-color="data?.cartao.cor ?? findBank(data?.cartao.banco_key ?? '')?.color ?? '#6366f1'"
        />
      </div>
    </div>

    <!-- Month navigator -->
    <div class="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 border border-gray-100 dark:border-gray-800">
      <DashboardMonthNavigator v-model="currentMonth" />
    </div>

    <!-- Fatura do mês -->
    <div v-if="data" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-5">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-1">Fatura de {{ fmtMonth(currentMonth) }}</p>
          <p class="text-3xl font-bold" :class="data.fatura?.pago ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'">
            {{ format(valorFaturaPago) }}
          </p>
          <div v-if="data.fatura?.valor_ajuste" class="text-xs text-gray-400 mt-0.5">
            Calculado: {{ format(data.cartao.gasto_mes) }}
            <span :class="data.fatura.valor_ajuste > 0 ? 'text-red-500' : 'text-green-600'">
              {{ data.fatura.valor_ajuste > 0 ? '+' : '' }}{{ format(data.fatura.valor_ajuste) }}
            </span>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <UBadge
              :label="data.fatura?.pago ? 'Paga' : 'Em aberto'"
              :color="data.fatura?.pago ? 'success' : 'warning'"
              variant="soft"
            />
            <span v-if="data.fatura?.pago" class="text-xs text-gray-400">
              Paga em {{ fmtDate(data.fatura.data_pagamento) }} · {{ data.fatura.conta_nome }}
            </span>
          </div>
        </div>
        <div class="flex gap-2">
          <UButton
            v-if="!data.fatura?.pago"
            icon="i-heroicons-check-circle"
            color="primary"
            class="cursor-pointer"
            :disabled="data.cartao.gasto_mes === 0"
            @click="showPagarModal = true"
          >
            Pagar fatura
          </UButton>
          <UButton
            v-else
            icon="i-heroicons-x-circle"
            variant="soft"
            color="neutral"
            class="cursor-pointer"
            :loading="desfazendoPagamento"
            @click="desfazerPagamento"
          >
            Desfazer pagamento
          </UButton>
        </div>
      </div>

      <!-- Barra de limite -->
      <div class="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div class="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Limite comprometido</span>
          <span :class="usoPct >= 90 ? 'text-red-500 font-medium' : usoPct >= 70 ? 'text-yellow-500 font-medium' : ''">
            {{ format(data.cartao.gasto_total) }} / {{ format(data.cartao.limite) }} · {{ usoPct.toFixed(0) }}%
          </span>
        </div>
        <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full transition-all"
            :class="usoPct >= 90 ? 'bg-red-500' : usoPct >= 70 ? 'bg-yellow-400' : 'bg-green-500'"
            :style="{ width: Math.min(usoPct, 100) + '%' }"
          />
        </div>
        <p class="text-xs text-gray-400 mt-1">
          Disponível: <span class="font-medium text-gray-600 dark:text-gray-300">{{ format(disponivel) }}</span>
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
        <UIcon name="i-heroicons-credit-card" class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Nenhum lançamento neste mês</h3>
      <p class="text-gray-400 text-sm">Adicione despesas vinculadas a este cartão</p>
    </div>

    <!-- Lista de lançamentos -->
    <div v-else class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Lançamentos</p>
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ data?.lancamentos.length }} item(s)</p>
      </div>
      <div
        v-for="(lanc, i) in data.lancamentos"
        :key="`${lanc.id}-${lanc.fixa}`"
        class="flex items-center gap-4 px-5 py-4"
        :class="i < data.lancamentos.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
      >
        <!-- Ícone -->
        <div
          class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          :style="lanc.categoria_icone ? { background: lanc.categoria_cor } : {}"
          :class="lanc.categoria_icone ? '' : 'bg-gray-100 dark:bg-gray-800'"
        >
          <UIcon
            :name="lanc.categoria_icone ?? (lanc.parcelas > 0 ? 'i-heroicons-queue-list' : lanc.fixa ? 'i-heroicons-arrow-path' : 'i-heroicons-credit-card')"
            class="w-4 h-4"
            :class="lanc.categoria_icone ? 'text-white' : 'text-gray-400'"
          />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ lanc.descricao }}</p>
          <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span class="text-xs text-gray-400">{{ descricaoData(lanc) }}</span>
            <template v-if="lanc.categoria">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">{{ lanc.categoria }}</span>
            </template>
            <template v-if="lanc.parcelas > 0">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">{{ lanc.parcela_atual }}/{{ lanc.parcelas }}</span>
            </template>
            <template v-else-if="lanc.fixa">
              <span class="text-gray-300 dark:text-gray-700">·</span>
              <span class="text-xs text-gray-400">Fixa</span>
            </template>
          </div>
        </div>

        <!-- Valor -->
        <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">
          - {{ format(lanc.valor) }}
        </p>
      </div>
    </div>

    <!-- Modal pagar fatura -->
    <USlideover v-model:open="showPagarModal" title="Pagar fatura" :dismissible="false">
      <template #body>
        <div class="space-y-4">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
            <p class="text-xs text-gray-500 mb-0.5">Fatura de {{ fmtMonth(currentMonth) }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ format(valorModalFatura) }}</p>
            <p v-if="ajusteModal !== 0" class="text-xs mt-0.5" :class="ajusteModal > 0 ? 'text-red-500' : 'text-green-600'">
              Calculado {{ format(data?.cartao.gasto_mes ?? 0) }}
              {{ ajusteModal > 0 ? '+' : '' }}{{ format(ajusteModal) }} de ajuste
            </p>
          </div>

          <UFormField label="Conta debitada" required>
            <USelect
              v-model="pagamento.conta_id"
              :items="contaOptions"
              value-key="value"
              label-key="label"
              placeholder="Selecione a conta..."
              class="w-full"
            />
          </UFormField>

          <UFormField label="Data do pagamento" required>
            <UInput v-model="pagamento.data" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Ajuste (opcional)" hint="Use para corrigir diferenças de arredondamento. Pode ser negativo.">
            <UInput
              v-model="pagamento.ajuste"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-2">
            <UButton variant="ghost" color="neutral" @click="showPagarModal = false">Cancelar</UButton>
            <UButton color="primary" :loading="salvandoPagamento" :disabled="!pagamento.conta_id" @click="salvarPagamento">
              Confirmar pagamento
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
interface Lancamento {
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
}

interface Fatura {
  id: number
  pago: number
  conta_id: number | null
  conta_nome: string | null
  data_pagamento: string | null
  valor_ajuste: number | null
}

interface CartaoDetalhe {
  id: number
  nome: string
  banco: string
  banco_key: string
  limite: number
  melhor_data_compra: number
  vencimento: number
  gasto_mes: number
  gasto_total: number
  cor: string | null
}

const route = useRoute()
const { format } = useCurrency()
const { findBank } = useBanks()

const now = new Date()
const currentMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const { data, pending, error, refresh } = await useFetch<{ cartao: CartaoDetalhe; lancamentos: Lancamento[]; fatura: Fatura | null }>(
  `/api/cartoes/${route.params.id}/lancamentos`,
  { query: computed(() => ({ month: currentMonth.value })), watch: [currentMonth] }
)

const cardStyle = computed(() => {
  const cartao = data.value?.cartao
  const color = cartao?.cor ?? findBank(cartao?.banco_key ?? '')?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)` }
})

const valorFaturaPago = computed(() => {
  const base = data.value?.cartao.gasto_mes ?? 0
  const ajuste = data.value?.fatura?.valor_ajuste ?? 0
  return base + ajuste
})

const ajusteModal = computed(() => Number(pagamento.ajuste) || 0)
const valorModalFatura = computed(() => (data.value?.cartao.gasto_mes ?? 0) + ajusteModal.value)

const disponivel = computed(() => (data.value?.cartao.limite ?? 0) - (data.value?.cartao.gasto_total ?? 0))
const usoPct = computed(() => {
  const limite = data.value?.cartao.limite
  if (!limite) return 0
  return ((data.value?.cartao.gasto_total ?? 0) / limite) * 100
})

function fmtDate(d: string | null) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMonth(ym: string) {
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

const { data: projecao } = await useFetch<{
  mes_quitacao: string | null
  mes_inicio_residual: string | null
  projecao12: { mes: string; valor: number }[]
}>(
  `/api/cartoes/${route.params.id}/projecao`
)

// Pagamento
const { data: contas } = await useFetch<{ id: number; nome: string; banco: string }[]>('/api/contas')
const contaOptions = computed(() => (contas.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` })))

const showPagarModal = ref(false)
const salvandoPagamento = ref(false)
const desfazendoPagamento = ref(false)
const pagamento = reactive({
  conta_id: null as number | null,
  data: new Date().toISOString().split('T')[0],
  ajuste: '' as string
})

async function salvarPagamento() {
  if (!pagamento.conta_id) return
  salvandoPagamento.value = true
  try {
    await $fetch('/api/faturas', {
      method: 'POST',
      body: {
        cartao_id: route.params.id,
        mes: currentMonth.value,
        conta_id: pagamento.conta_id,
        data_pagamento: pagamento.data,
        valor_ajuste: pagamento.ajuste !== '' ? Number(pagamento.ajuste) : 0
      }
    })
    await refresh()
    showPagarModal.value = false
    pagamento.conta_id = null
    pagamento.ajuste = ''
  } finally {
    salvandoPagamento.value = false
  }
}

async function desfazerPagamento() {
  if (!data.value?.fatura?.id) return
  desfazendoPagamento.value = true
  try {
    await $fetch(`/api/faturas/${data.value.fatura.id}`, { method: 'DELETE' })
    await refresh()
  } finally {
    desfazendoPagamento.value = false
  }
}

useHead({ title: computed(() => `${data.value?.cartao.nome ?? 'Cartão'} — Gestão Financeira`) })
</script>
