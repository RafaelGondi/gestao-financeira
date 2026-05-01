<template>
  <div class="space-y-5">
    <!-- Seletor de banco -->
    <UFormField label="Banco" required>
      <div class="grid grid-cols-4 gap-2 mb-2">
        <button
          v-for="bank in BANKS"
          :key="bank.key"
          type="button"
          class="flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all"
          :class="form.bancoKey === bank.key
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
          @click="selectBank(bank)"
        >
          <SharedBankLogo :bank="bank" :size="36" class="rounded-lg" />
          <span class="text-xs text-center leading-tight"
            :class="form.bancoKey === bank.key
              ? 'text-primary-700 dark:text-primary-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'">
            {{ bank.name }}
          </span>
        </button>
      </div>

      <div v-if="form.bancoKey === 'outro' || !form.bancoKey" class="mt-2">
        <UInput v-model="form.bancoCustom" placeholder="Nome do banco..." class="w-full" />
      </div>
    </UFormField>

    <UFormField label="Nome da conta" required>
      <UInput v-model="form.nome" placeholder="Ex: Conta corrente, Conta salário..." class="w-full" />
    </UFormField>

    <UFormField label="Saldo inicial" required>
      <SharedCurrencyInput v-model="form.saldo" />
      <p class="text-xs text-gray-400 mt-1">Saldo atual na conta no momento do cadastro</p>
    </UFormField>

    <div class="flex justify-end gap-3 pt-2">
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" @click="handleSubmit">
        {{ isEdit ? 'Salvar Alterações' : 'Adicionar Conta' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bank } from '~/composables/useBanks'

interface ContaInput {
  nome: string
  banco: string
  banco_key: string
  saldo_inicial: number
}

interface ContaFormData extends ContaInput {
  id?: number
}

const props = defineProps<{
  initial?: ContaFormData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: ContaInput]
  cancel: []
}>()

const { BANKS } = useBanks()
const isEdit = computed(() => !!props.initial?.id)

const form = reactive({
  nome: '',
  bancoKey: '',
  bancoCustom: '',
  saldo: 0,
})

watch(() => props.initial, (val) => {
  if (val) {
    form.nome = val.nome
    form.bancoKey = val.banco_key ?? ''
    form.bancoCustom = val.banco_key ? '' : val.banco
    form.saldo = val.saldo_inicial
  } else {
    form.nome = ''
    form.bancoKey = ''
    form.bancoCustom = ''
    form.saldo = 0
  }
}, { immediate: true })

function selectBank(bank: Bank) {
  form.bancoKey = bank.key
  form.bancoCustom = ''
}

function handleSubmit() {
  const bancoNome = form.bancoKey
    ? (BANKS.find(b => b.key === form.bancoKey)?.name ?? form.bancoKey)
    : form.bancoCustom.trim()

  if (!form.nome.trim() || !bancoNome) return

  emit('submit', {
    nome: form.nome.trim(),
    banco: bancoNome,
    banco_key: form.bancoKey || '',
    saldo_inicial: Number(form.saldo)
  })
}
</script>
