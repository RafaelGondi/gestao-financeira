<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Tipo</p>
        <select v-model="form.tipo" :disabled="!!item" @change="applyPreset"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer disabled:opacity-60">
          <option v-for="t in PATRIMONIO_TIPOS" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Nome</p>
        <input v-model="form.nome" type="text" placeholder="Ex: FGTS, Consórcio imóvel"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Saldo atual</p>
        <SharedCurrencyInput v-model="form.saldo_atual" />
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Valor alvo <span class="text-gray-400">(opcional)</span></p>
        <SharedCurrencyInput v-model="form.valor_alvo" />
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Aporte mensal</p>
        <select v-model="form.aporte_modo"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
          <option value="nenhum">Nenhum</option>
          <option value="fixo_mensal">Fixo mensal</option>
          <option value="manual">Manual (registrar movimentos)</option>
        </select>
      </div>
      <div v-if="form.aporte_modo === 'fixo_mensal'">
        <p class="text-xs text-gray-500 mb-1.5">Valor do aporte/mês</p>
        <SharedCurrencyInput v-model="form.aporte_valor" />
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Rendimento</p>
        <select v-model="form.rendimento_modo"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
          <option value="nenhum">Nenhum</option>
          <option value="taxa_anual">Taxa fixa anual (%)</option>
          <option value="cdi_pct">% do CDI (fixo)</option>
          <option value="cdi_faixas">CDI por faixas (cofrinhos agrupados)</option>
          <option value="tr_mais">TR + X% a.a.</option>
        </select>
      </div>
      <div v-if="form.rendimento_modo !== 'nenhum' && form.rendimento_modo !== 'cdi_faixas'">
        <p class="text-xs text-gray-500 mb-1.5">{{ rendimentoValorLabel }}</p>
        <input v-model="form.rendimento_valor" type="number" step="0.01" min="0"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div v-if="form.rendimento_modo === 'cdi_pct' || form.rendimento_modo === 'cdi_faixas'">
        <p class="text-xs text-gray-500 mb-1.5">Capitalização do CDI</p>
        <select v-model="form.cdi_dias_base"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
          <option value="uteis">Dias úteis (252/ano)</option>
          <option value="corridos">Dias corridos (365/ano)</option>
        </select>
      </div>
      <template v-if="form.rendimento_modo === 'cdi_faixas'">
        <div class="sm:col-span-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 p-3 space-y-3">
          <UButton size="xs" color="neutral" variant="soft" class="cursor-pointer" @click="applyMercadoPagoPreset">
            Regra Mercado Pago (120% até R$ 10 mil)
          </UButton>
          <p class="text-xs text-gray-500">
            Caixinhas da mesma instituição somam saldo para calcular a faixa de rendimento.
          </p>
        </div>
        <div class="sm:col-span-2">
          <p class="text-xs text-gray-500 mb-1.5">Instituição <span class="text-rose-500">*</span></p>
          <div class="grid grid-cols-4 gap-2 mb-2">
            <button
              v-for="bank in BANKS"
              :key="bank.key"
              type="button"
              class="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all cursor-pointer"
              :class="form.instituicaoKey === bank.key
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="selectInstituicao(bank.key)"
            >
              <SharedBankLogo :bank="bank" :size="32" class="rounded-lg" />
              <span class="text-[11px] text-center leading-tight"
                :class="form.instituicaoKey === bank.key
                  ? 'text-primary-700 dark:text-primary-400 font-medium'
                  : 'text-gray-500 dark:text-gray-400'">
                {{ bank.name }}
              </span>
            </button>
          </div>
          <div v-if="!form.instituicaoKey || form.instituicaoKey === 'outro'" class="mt-2">
            <input v-model="form.instituicaoCustom" type="text" placeholder="Nome da instituição..."
              class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2" />
            <p class="text-[11px] text-gray-400 mt-1">Use a lista acima quando possível — evita agrupar caixinhas erradas.</p>
          </div>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1.5">Teto da faixa</p>
          <SharedCurrencyInput v-model="form.cdi_faixa_teto" />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1.5">% CDI até o teto</p>
          <input v-model="form.cdi_pct_ate_teto" type="number" step="0.01" min="0"
            class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2" />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1.5">% CDI acima do teto</p>
          <input v-model="form.cdi_pct_acima" type="number" step="0.01" min="0"
            class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2" />
        </div>
      </template>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Data fim <span class="text-gray-400">(opcional)</span></p>
        <input v-model="form.data_fim" type="month"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2" />
      </div>
      <div class="sm:col-span-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="form.incluir_em_totais" type="checkbox" class="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
          <span class="text-sm text-gray-600 dark:text-gray-400">Incluir nos totais gerais</span>
        </label>
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Ícone</p>
        <div class="flex items-center gap-2 flex-wrap">
          <button v-for="ic in icones" :key="ic" type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            :class="form.icone === ic ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800'"
            @click="form.icone = ic">
            <UIcon :name="ic" class="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1.5">Cor</p>
        <div class="flex items-center gap-2 flex-wrap">
          <button v-for="c in cores" :key="c" type="button"
            class="w-6 h-6 rounded-full cursor-pointer"
            :class="form.cor === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''"
            :style="{ background: c }"
            @click="form.cor = c" />
        </div>
      </div>
      <div class="sm:col-span-2">
        <p class="text-xs text-gray-500 mb-1.5">Notas</p>
        <input v-model="form.notas" type="text" placeholder="Observações"
          class="w-full text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-3 py-2" />
      </div>
    </div>

    <div class="flex items-center justify-between gap-2 pt-1">
      <UButton v-if="item" size="sm" color="error" variant="ghost" class="cursor-pointer" :loading="deleting" @click="remove">
        Excluir item
      </UButton>
      <div v-else />
      <div class="flex items-center gap-2">
        <UButton size="sm" color="neutral" variant="ghost" class="cursor-pointer" @click="emit('cancel')">Cancelar</UButton>
        <UButton size="sm" color="primary" class="cursor-pointer" :loading="saving" @click="save">Salvar</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PATRIMONIO_TIPOS } from '~/utils/patrimonio-labels'
import { findBankByName } from '~/utils/banks'

type PatrimonioTipo = 'fgts' | 'consorcio' | 'renda_fixa' | 'caixinha' | 'outro'

const props = defineProps<{
  item?: {
    id: number; nome: string; tipo: PatrimonioTipo; saldo_atual: number; valor_alvo: number | null
    incluir_em_totais: boolean; aporte_modo: string; aporte_valor: number | null
    rendimento_modo: string; rendimento_valor: number | null
    instituicao_key: string | null; grupo_rendimento: string | null; cdi_faixa_teto: number | null
    cdi_pct_ate_teto: number | null; cdi_pct_acima: number | null; cdi_dias_base: string | null
    data_fim: string | null; icone: string; cor: string; notas: string | null
  }
}>()

const emit = defineEmits<{ saved: []; cancel: []; deleted: [] }>()

const { BANKS } = useBanks()

const saving = ref(false)
const deleting = ref(false)

const PRESETS: Record<PatrimonioTipo, Partial<typeof form>> = {
  fgts: { icone: 'i-lucide-shield-check', cor: '#22c55e', aporte_modo: 'fixo_mensal', rendimento_modo: 'tr_mais', rendimento_valor: '3', incluir_em_totais: false },
  consorcio: { icone: 'i-lucide-users', cor: '#3b82f6', aporte_modo: 'fixo_mensal', rendimento_modo: 'nenhum', rendimento_valor: '', incluir_em_totais: false },
  renda_fixa: { icone: 'i-lucide-landmark', cor: '#6366f1', aporte_modo: 'manual', rendimento_modo: 'taxa_anual', rendimento_valor: '12', incluir_em_totais: false },
  caixinha: { icone: 'i-lucide-piggy-bank', cor: '#f97316', aporte_modo: 'manual', rendimento_modo: 'cdi_pct', rendimento_valor: '100', incluir_em_totais: false },
  outro: { icone: 'i-lucide-trending-up', cor: '#6366f1', aporte_modo: 'nenhum', rendimento_modo: 'nenhum', rendimento_valor: '', incluir_em_totais: false },
}

const icones = [
  'i-lucide-shield-check', 'i-lucide-users', 'i-lucide-landmark', 'i-lucide-piggy-bank',
  'i-lucide-trending-up', 'i-lucide-banknote', 'i-lucide-home', 'i-lucide-building-2',
  'i-lucide-briefcase', 'i-lucide-gift', 'i-lucide-star', 'i-lucide-sparkles',
  'i-lucide-car', 'i-lucide-plane',
]
const cores = ['#6366f1', '#8b5cf6', '#22c55e', '#3b82f6', '#f97316', '#eab308', '#ec4899', '#14b8a6']

const form = reactive({
  nome: '', tipo: 'fgts' as PatrimonioTipo, saldo_atual: 0, valor_alvo: 0,
  incluir_em_totais: false, aporte_modo: 'fixo_mensal', aporte_valor: 0,
  rendimento_modo: 'tr_mais', rendimento_valor: '3', data_fim: '',
  instituicaoKey: '', instituicaoCustom: '',
  cdi_faixa_teto: 0, cdi_pct_ate_teto: '120', cdi_pct_acima: '100',
  cdi_dias_base: 'uteis' as 'uteis' | 'corridos',
  icone: 'i-lucide-shield-check', cor: '#22c55e', notas: '',
})

const rendimentoValorLabel = computed(() => {
  if (form.rendimento_modo === 'taxa_anual') return 'Taxa anual (%)'
  if (form.rendimento_modo === 'cdi_pct') return '% do CDI'
  if (form.rendimento_modo === 'tr_mais') return 'Adicional sobre TR (% a.a.)'
  return 'Valor'
})

function applyMercadoPagoPreset() {
  form.rendimento_modo = 'cdi_faixas'
  form.instituicaoKey = 'mercadopago'
  form.instituicaoCustom = ''
  form.cdi_faixa_teto = 10000
  form.cdi_pct_ate_teto = '120'
  form.cdi_pct_acima = '100'
  form.cdi_dias_base = 'corridos'
}

function selectInstituicao(key: string) {
  form.instituicaoKey = key
  form.instituicaoCustom = ''
}

function applyPreset() {
  if (props.item) return
  const p = PRESETS[form.tipo]
  if (p.aporte_modo) form.aporte_modo = p.aporte_modo
  if (p.rendimento_modo) form.rendimento_modo = p.rendimento_modo
  if (p.rendimento_valor !== undefined) form.rendimento_valor = p.rendimento_valor ?? ''
  if (p.icone) form.icone = p.icone
  if (p.cor) form.cor = p.cor
  if (p.incluir_em_totais !== undefined) form.incluir_em_totais = p.incluir_em_totais
}

function loadFromItem() {
  const item = props.item
  if (!item) {
    form.nome = ''; form.tipo = 'fgts'; form.saldo_atual = 0; form.valor_alvo = 0
    applyPreset()
    return
  }
  form.nome = item.nome
  form.tipo = item.tipo
  form.saldo_atual = item.saldo_atual
  form.valor_alvo = item.valor_alvo ?? 0
  form.incluir_em_totais = item.incluir_em_totais
  form.aporte_modo = item.aporte_modo
  form.aporte_valor = item.aporte_valor ?? 0
  form.rendimento_modo = item.rendimento_modo
  form.rendimento_valor = item.rendimento_valor != null ? String(item.rendimento_valor) : ''
  if (item.instituicao_key) {
    form.instituicaoKey = item.instituicao_key
    form.instituicaoCustom = ''
  } else if (item.grupo_rendimento) {
    const bank = findBankByName(item.grupo_rendimento)
    form.instituicaoKey = bank?.key ?? 'outro'
    form.instituicaoCustom = bank ? '' : item.grupo_rendimento
  } else {
    form.instituicaoKey = ''
    form.instituicaoCustom = ''
  }
  form.cdi_faixa_teto = item.cdi_faixa_teto ?? 0
  form.cdi_pct_ate_teto = item.cdi_pct_ate_teto != null ? String(item.cdi_pct_ate_teto) : '120'
  form.cdi_pct_acima = item.cdi_pct_acima != null ? String(item.cdi_pct_acima) : '100'
  form.cdi_dias_base = item.cdi_dias_base === 'corridos' ? 'corridos' : 'uteis'
  form.data_fim = item.data_fim ?? ''
  form.icone = item.icone
  form.cor = item.cor
  form.notas = item.notas ?? ''
}

watch(() => props.item, loadFromItem, { immediate: true })

function instituicaoValida() {
  if (form.instituicaoKey && form.instituicaoKey !== 'outro') return true
  if (form.instituicaoCustom.trim()) return true
  if (props.item?.instituicao_key || props.item?.grupo_rendimento) return true
  return false
}

function buildBody() {
  const isFaixas = form.rendimento_modo === 'cdi_faixas'
  let instituicaoKey = isFaixas && form.instituicaoKey && form.instituicaoKey !== 'outro'
    ? form.instituicaoKey
    : null
  let instituicaoCustom = isFaixas && (!instituicaoKey || form.instituicaoKey === 'outro')
    ? form.instituicaoCustom.trim() || null
    : null

  // Preserva instituição legada ao editar sem reabrir o seletor
  if (isFaixas && !instituicaoKey && !instituicaoCustom && props.item) {
    if (props.item.instituicao_key) {
      instituicaoKey = props.item.instituicao_key
    } else if (props.item.grupo_rendimento) {
      const bank = findBankByName(props.item.grupo_rendimento)
      if (bank) instituicaoKey = bank.key
      else instituicaoCustom = props.item.grupo_rendimento
    }
  }

  return {
    nome: form.nome.trim(),
    tipo: form.tipo,
    saldo_atual: form.saldo_atual,
    valor_alvo: form.valor_alvo > 0 ? form.valor_alvo : null,
    incluir_em_totais: form.incluir_em_totais,
    aporte_modo: form.aporte_modo,
    aporte_valor: form.aporte_modo === 'fixo_mensal' && form.aporte_valor > 0 ? form.aporte_valor : null,
    rendimento_modo: form.rendimento_modo,
    rendimento_valor: !isFaixas && form.rendimento_modo !== 'nenhum' && form.rendimento_valor
      ? parseFloat(form.rendimento_valor) : null,
    instituicao_key: instituicaoKey,
    instituicao_custom: instituicaoCustom,
    cdi_faixa_teto: isFaixas && form.cdi_faixa_teto > 0 ? form.cdi_faixa_teto : null,
    cdi_pct_ate_teto: isFaixas && form.cdi_pct_ate_teto ? parseFloat(form.cdi_pct_ate_teto) : null,
    cdi_pct_acima: isFaixas && form.cdi_pct_acima ? parseFloat(form.cdi_pct_acima) : null,
    cdi_dias_base: isFaixas || form.rendimento_modo === 'cdi_pct' ? form.cdi_dias_base : 'uteis',
    data_fim: form.data_fim || null,
    icone: form.icone,
    cor: form.cor,
    notas: form.notas || null,
  }
}

async function save() {
  if (!form.nome.trim()) return
  if (form.rendimento_modo === 'cdi_faixas' && !instituicaoValida()) return
  saving.value = true
  try {
    const body = buildBody()
    if (props.item) {
      await $fetch(`/api/patrimonio/${props.item.id}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/patrimonio', { method: 'POST', body })
    }
    emit('saved')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.item) return
  deleting.value = true
  try {
    await $fetch(`/api/patrimonio/${props.item.id}`, { method: 'DELETE' })
    emit('deleted')
  } finally {
    deleting.value = false
  }
}
</script>
