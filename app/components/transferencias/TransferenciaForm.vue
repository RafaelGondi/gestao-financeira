<template>
  <div class="space-y-4">
    <UFormField label="Tipo de destino">
      <div class="flex gap-2">
        <UButton
          size="sm"
          :variant="destinoTipo === 'conta' ? 'solid' : 'outline'"
          :color="destinoTipo === 'conta' ? 'primary' : 'neutral'"
          class="flex-1 justify-center"
          @click="setDestinoTipo('conta')"
        >Conta bancária</UButton>
        <UButton
          size="sm"
          :variant="destinoTipo === 'patrimonio' ? 'solid' : 'outline'"
          :color="destinoTipo === 'patrimonio' ? 'primary' : 'neutral'"
          class="flex-1 justify-center"
          @click="setDestinoTipo('patrimonio')"
        >Caixinha / renda fixa</UButton>
      </div>
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Conta de origem" required>
        <USelect
          v-model="form.conta_origem_id"
          :items="contaOrigem"
          value-key="value"
          label-key="label"
          placeholder="Selecione..."
          class="w-full"
        />
      </UFormField>
      <UFormField :label="destinoTipo === 'conta' ? 'Conta de destino' : 'Patrimônio de destino'" required>
        <USelect
          v-if="destinoTipo === 'conta'"
          v-model="form.conta_destino_id"
          :items="contaDestino"
          value-key="value"
          label-key="label"
          placeholder="Selecione..."
          class="w-full"
        />
        <USelect
          v-else
          v-model="form.patrimonio_destino_id"
          :items="patrimonioDestino"
          value-key="value"
          label-key="label"
          placeholder="Selecione..."
          class="w-full"
        />
      </UFormField>
    </div>

    <div v-if="destinoInvalido"
      class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600" />
      <span class="text-sm text-red-600 dark:text-red-400">Contas de origem e destino devem ser diferentes</span>
    </div>

    <div v-else-if="temDestinoSelecionado"
      class="flex items-center justify-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <span class="text-sm font-medium text-blue-700 dark:text-blue-400">{{ nomeOrigem }}</span>
      <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 text-blue-500" />
      <span class="text-sm font-medium text-blue-700 dark:text-blue-400">{{ nomeDestino }}</span>
    </div>

    <div v-if="form.conta_origem_id && saldoOrigem !== null"
      class="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
      :class="saldoInsuficiente
        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
    >
      <span class="flex items-center gap-1.5">
        <UIcon
          :name="saldoInsuficiente ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-banknotes'"
          class="w-4 h-4"
        />
        {{ saldoInsuficiente ? 'Saldo insuficiente' : 'Saldo disponível' }}
      </span>
      <span class="font-medium">{{ format(saldoOrigem) }}</span>
    </div>

    <UFormField label="Valor" required>
      <SharedCurrencyInput v-model="form.valor" />
    </UFormField>

    <UFormField label="Data" required>
      <UInput v-model="form.data" type="date" class="w-full" />
    </UFormField>

    <UFormField label="Descrição">
      <UInput v-model="form.descricao" placeholder="Ex: Aporte caixinha, Reserva..." class="w-full" />
    </UFormField>

    <p v-if="destinoTipo === 'conta' && contaOptions.length < 2" class="text-xs text-orange-500">
      Você precisa de pelo menos 2 contas cadastradas para transferir entre contas.
      <NuxtLink to="/contas" class="underline">Cadastre uma conta</NuxtLink>.
    </p>
    <p v-else-if="destinoTipo === 'patrimonio' && !contaOptions.length" class="text-xs text-orange-500">
      Cadastre uma conta de origem em
      <NuxtLink to="/contas" class="underline">Contas</NuxtLink>.
    </p>
    <p v-else-if="destinoTipo === 'patrimonio' && !patrimonioOptions.length" class="text-xs text-orange-500">
      Nenhum item de patrimônio cadastrado.
      <NuxtLink to="/patrimonio" class="underline">Cadastre em Patrimônio</NuxtLink>.
    </p>

    <div class="flex gap-3 pt-4">
      <UButton type="button" variant="ghost" color="neutral" size="lg" class="flex-1 justify-center" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" size="lg" class="flex-1 justify-center" :disabled="!canSubmit" @click="handleSubmit">
        {{ isEdit ? 'Salvar Alterações' : 'Transferir' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TransferenciaInput {
  descricao?: string
  valor: number
  conta_origem_id: number
  conta_destino_id?: number
  patrimonio_destino_id?: number
  data: string
}

interface TransferenciaFormData extends TransferenciaInput {
  id?: number
  patrimonio_destino_id?: number | null
  conta_destino_id?: number | null
}

const props = defineProps<{
  initial?: TransferenciaFormData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: TransferenciaInput]
  cancel: []
}>()

const isEdit = computed(() => !!props.initial?.id)
const today = useLocalDate().localDateStr()

const { format } = useCurrency()

const { data: contas } = await useFetch<{ id: number; nome: string; banco: string; saldo_atual: number }[]>('/api/contas')
const { data: patrimonioData } = await useFetch<{ itens: { id: number; nome: string; tipo: string }[] }>('/api/patrimonio')

const contaOptions = computed(() =>
  (contas.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` }))
)

const tipoPatrimonioLabel: Record<string, string> = {
  caixinha: 'Caixinha',
  renda_fixa: 'Renda fixa',
  fgts: 'FGTS',
  consorcio: 'Consórcio',
  outro: 'Outro',
}

const patrimonioOptions = computed(() =>
  (patrimonioData.value?.itens ?? []).map(p => ({
    value: p.id,
    label: `${p.nome} (${tipoPatrimonioLabel[p.tipo] ?? p.tipo})`,
  }))
)

const destinoTipo = ref<'conta' | 'patrimonio'>('conta')

const saldoOrigem = computed(() => {
  if (!form.conta_origem_id) return null
  return contas.value?.find(c => c.id === form.conta_origem_id)?.saldo_atual ?? null
})

const saldoInsuficiente = computed(() =>
  saldoOrigem.value !== null && form.valor > 0 &&
  Math.round(form.valor * 100) > Math.round(saldoOrigem.value * 100)
)

const form = reactive({
  conta_origem_id: null as number | null,
  conta_destino_id: null as number | null,
  patrimonio_destino_id: null as number | null,
  valor: 0,
  data: today,
  descricao: ''
})

watch(() => props.initial, (val) => {
  if (val) {
    destinoTipo.value = val.patrimonio_destino_id ? 'patrimonio' : 'conta'
    form.conta_origem_id = val.conta_origem_id
    form.conta_destino_id = val.conta_destino_id ?? null
    form.patrimonio_destino_id = val.patrimonio_destino_id ?? null
    form.valor = val.valor
    form.data = val.data
    form.descricao = val.descricao ?? ''
  } else {
    destinoTipo.value = 'conta'
    form.conta_origem_id = null
    form.conta_destino_id = null
    form.patrimonio_destino_id = null
    form.valor = 0
    form.data = today
    form.descricao = ''
  }
}, { immediate: true })

function setDestinoTipo(tipo: 'conta' | 'patrimonio') {
  destinoTipo.value = tipo
  form.conta_destino_id = null
  form.patrimonio_destino_id = null
}

const contaOrigem = computed(() => contaOptions.value)
const contaDestino = computed(() =>
  contaOptions.value.filter(c => c.value !== form.conta_origem_id)
)
const patrimonioDestino = computed(() => patrimonioOptions.value)

const nomeOrigem = computed(() => contaOptions.value.find(c => c.value === form.conta_origem_id)?.label ?? '')
const nomeDestino = computed(() => {
  if (destinoTipo.value === 'patrimonio') {
    return patrimonioOptions.value.find(p => p.value === form.patrimonio_destino_id)?.label ?? ''
  }
  return contaOptions.value.find(c => c.value === form.conta_destino_id)?.label ?? ''
})

const destinoInvalido = computed(() =>
  destinoTipo.value === 'conta' &&
  !!form.conta_origem_id &&
  !!form.conta_destino_id &&
  form.conta_origem_id === form.conta_destino_id
)

const temDestinoSelecionado = computed(() => {
  if (!form.conta_origem_id) return false
  if (destinoTipo.value === 'conta') return !!form.conta_destino_id
  return !!form.patrimonio_destino_id
})

const canSubmit = computed(() => {
  if (!form.valor || form.valor <= 0 || !form.conta_origem_id || !form.data || saldoInsuficiente.value) return false
  if (destinoTipo.value === 'conta') {
    return !!form.conta_destino_id && form.conta_origem_id !== form.conta_destino_id && contaOptions.value.length >= 2
  }
  return !!form.patrimonio_destino_id && contaOptions.value.length >= 1
})

function handleSubmit() {
  if (!canSubmit.value) return
  const base = {
    descricao: form.descricao.trim() || undefined,
    valor: Number(form.valor),
    conta_origem_id: form.conta_origem_id!,
    data: form.data,
  }
  if (destinoTipo.value === 'patrimonio') {
    emit('submit', { ...base, patrimonio_destino_id: form.patrimonio_destino_id! })
  } else {
    emit('submit', { ...base, conta_destino_id: form.conta_destino_id! })
  }
}
</script>
