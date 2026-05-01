<template>
  <div class="space-y-4">
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
      <UFormField label="Conta de destino" required>
        <USelect
          v-model="form.conta_destino_id"
          :items="contaDestino"
          value-key="value"
          label-key="label"
          placeholder="Selecione..."
          class="w-full"
        />
      </UFormField>
    </div>

    <div v-if="form.conta_origem_id && form.conta_destino_id && form.conta_origem_id === form.conta_destino_id"
      class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600" />
      <span class="text-sm text-red-600 dark:text-red-400">Contas de origem e destino devem ser diferentes</span>
    </div>

    <div v-else-if="form.conta_origem_id && form.conta_destino_id"
      class="flex items-center justify-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <span class="text-sm font-medium text-blue-700 dark:text-blue-400">{{ nomeOrigem }}</span>
      <UIcon name="i-heroicons-arrow-right" class="w-5 h-5 text-blue-500" />
      <span class="text-sm font-medium text-blue-700 dark:text-blue-400">{{ nomeDestino }}</span>
    </div>

    <UFormField label="Valor" required>
      <SharedCurrencyInput v-model="form.valor" />
    </UFormField>

    <UFormField label="Data" required>
      <UInput v-model="form.data" type="date" class="w-full" />
    </UFormField>

    <UFormField label="Descrição">
      <UInput v-model="form.descricao" placeholder="Ex: Pagamento de fatura, Reserva..." class="w-full" />
    </UFormField>

    <p v-if="contaOptions.length < 2" class="text-xs text-orange-500">
      Você precisa de pelo menos 2 contas cadastradas para fazer uma transferência.
      <NuxtLink to="/contas" class="underline">Cadastre uma conta</NuxtLink>.
    </p>

    <div class="flex justify-end gap-3 pt-2">
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" :disabled="!canSubmit" @click="handleSubmit">
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
  conta_destino_id: number
  data: string
}

interface TransferenciaFormData extends TransferenciaInput {
  id?: number
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
const today = new Date().toISOString().split('T')[0]

const { data: contas } = await useFetch<{ id: number; nome: string; banco: string }[]>('/api/contas')
const contaOptions = computed(() =>
  (contas.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` }))
)

const form = reactive({
  conta_origem_id: null as number | null,
  conta_destino_id: null as number | null,
  valor: 0,
  data: today,
  descricao: ''
})

watch(() => props.initial, (val) => {
  if (val) {
    form.conta_origem_id = val.conta_origem_id
    form.conta_destino_id = val.conta_destino_id
    form.valor = val.valor
    form.data = val.data
    form.descricao = val.descricao ?? ''
  } else {
    form.conta_origem_id = null
    form.conta_destino_id = null
    form.valor = 0
    form.data = today
    form.descricao = ''
  }
}, { immediate: true })

const contaOrigem = computed(() => contaOptions.value)
const contaDestino = computed(() =>
  contaOptions.value.filter(c => c.value !== form.conta_origem_id)
)

const nomeOrigem = computed(() => contaOptions.value.find(c => c.value === form.conta_origem_id)?.label ?? '')
const nomeDestino = computed(() => contaOptions.value.find(c => c.value === form.conta_destino_id)?.label ?? '')

const canSubmit = computed(() =>
  form.valor > 0 &&
  form.conta_origem_id &&
  form.conta_destino_id &&
  form.conta_origem_id !== form.conta_destino_id &&
  !!form.data
)

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    descricao: form.descricao.trim() || undefined,
    valor: Number(form.valor),
    conta_origem_id: form.conta_origem_id!,
    conta_destino_id: form.conta_destino_id!,
    data: form.data
  })
}
</script>
