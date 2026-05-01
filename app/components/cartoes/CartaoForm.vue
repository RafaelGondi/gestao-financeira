<template>
  <div class="space-y-4">
    <!-- Seletor de banco -->
    <UFormField label="Banco / Emissor" required>
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
        <UInput v-model="form.bancoCustom" placeholder="Nome do banco / emissor..." class="w-full" />
      </div>
    </UFormField>

    <UFormField label="Nome do Cartão" required>
      <UInput v-model="form.nome" placeholder="Ex: Nubank Roxinho, Inter Gold..." class="w-full" />
    </UFormField>

    <UFormField label="Limite" required>
      <SharedCurrencyInput v-model="form.limite" />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Melhor data p/ compra" required>
        <UInput v-model.number="form.melhor_data_compra" type="number" :min="1" :max="31" placeholder="Dia (1-31)" class="w-full" />
      </UFormField>
      <UFormField label="Vencimento" required>
        <UInput v-model.number="form.vencimento" type="number" :min="1" :max="31" placeholder="Dia (1-31)" class="w-full" />
      </UFormField>
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <UButton type="button" variant="ghost" color="neutral" @click="emit('cancel')">Cancelar</UButton>
      <UButton :loading="loading" color="primary" @click="handleSubmit">
        {{ isEdit ? 'Salvar Alterações' : 'Adicionar Cartão' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Bank } from '~/composables/useBanks'

interface CartaoInput {
  nome: string
  banco: string
  banco_key: string
  limite: number
  melhor_data_compra: number
  vencimento: number
}

interface CartaoFormData extends CartaoInput {
  id?: number
}

const props = defineProps<{
  initial?: CartaoFormData | null
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: CartaoInput]
  cancel: []
}>()

const { BANKS } = useBanks()
const isEdit = computed(() => !!props.initial?.id)

const form = reactive({
  nome: '',
  bancoKey: '',
  bancoCustom: '',
  limite: 0,
  melhor_data_compra: 1,
  vencimento: 1
})

watch(() => props.initial, (val) => {
  if (val) {
    form.nome = val.nome
    form.bancoKey = val.banco_key ?? ''
    form.bancoCustom = val.banco_key ? '' : val.banco
    form.limite = val.limite
    form.melhor_data_compra = val.melhor_data_compra
    form.vencimento = val.vencimento
  } else {
    form.nome = ''
    form.bancoKey = ''
    form.bancoCustom = ''
    form.limite = 0
    form.melhor_data_compra = 1
    form.vencimento = 1
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

  if (!form.nome.trim() || !bancoNome || form.limite <= 0) return

  emit('submit', {
    nome: form.nome.trim(),
    banco: bancoNome,
    banco_key: form.bancoKey || '',
    limite: Number(form.limite),
    melhor_data_compra: form.melhor_data_compra,
    vencimento: form.vencimento
  })
}
</script>
