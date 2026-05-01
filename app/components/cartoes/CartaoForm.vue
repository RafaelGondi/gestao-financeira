<template>
  <UForm :state="form" :schema="schema" @submit="handleSubmit" class="space-y-4">
    <UFormField label="Nome do Cartão" name="nome" required>
      <UInput
        v-model="form.nome"
        placeholder="Ex: Nubank Roxinho"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Banco / Emissor" name="banco" required>
      <UInput
        v-model="form.banco"
        placeholder="Ex: Nubank"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Limite" name="limite" required>
      <UInput
        v-model="form.limiteStr"
        placeholder="Ex: 5000,00"
        @blur="parseLimite"
        class="w-full"
      >
        <template #leading>
          <span class="text-gray-400 text-sm">R$</span>
        </template>
      </UInput>
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Melhor data p/ compra" name="melhor_data_compra" required>
        <UInput
          v-model.number="form.melhor_data_compra"
          type="number"
          :min="1"
          :max="31"
          placeholder="Dia (1-31)"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Vencimento" name="vencimento" required>
        <UInput
          v-model.number="form.vencimento"
          type="number"
          :min="1"
          :max="31"
          placeholder="Dia (1-31)"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="flex justify-end gap-3 pt-2">
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        @click="emit('cancel')"
      >
        Cancelar
      </UButton>
      <UButton
        type="submit"
        :loading="loading"
        color="primary"
      >
        {{ isEdit ? 'Salvar Alterações' : 'Adicionar Cartão' }}
      </UButton>
    </div>
  </UForm>
</template>

<script setup lang="ts">
import * as v from 'valibot'

interface CartaoInput {
  nome: string
  banco: string
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

const isEdit = computed(() => !!props.initial?.id)

const schema = v.object({
  nome: v.pipe(v.string(), v.minLength(1, 'Nome obrigatório')),
  banco: v.pipe(v.string(), v.minLength(1, 'Banco obrigatório')),
  limiteStr: v.pipe(v.string(), v.minLength(1, 'Limite obrigatório')),
  melhor_data_compra: v.pipe(v.number(), v.minValue(1), v.maxValue(31)),
  vencimento: v.pipe(v.number(), v.minValue(1), v.maxValue(31))
})

const form = reactive({
  nome: props.initial?.nome ?? '',
  banco: props.initial?.banco ?? '',
  limite: props.initial?.limite ?? 0,
  limiteStr: props.initial?.limite ? String(props.initial.limite).replace('.', ',') : '',
  melhor_data_compra: props.initial?.melhor_data_compra ?? 1,
  vencimento: props.initial?.vencimento ?? 1
})

watch(() => props.initial, (val) => {
  if (val) {
    form.nome = val.nome
    form.banco = val.banco
    form.limite = val.limite
    form.limiteStr = String(val.limite).replace('.', ',')
    form.melhor_data_compra = val.melhor_data_compra
    form.vencimento = val.vencimento
  } else {
    form.nome = ''
    form.banco = ''
    form.limite = 0
    form.limiteStr = ''
    form.melhor_data_compra = 1
    form.vencimento = 1
  }
})

function parseLimite() {
  const cleaned = form.limiteStr.replace(/\./g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  form.limite = isNaN(val) ? 0 : val
}

function handleSubmit() {
  parseLimite()
  emit('submit', {
    nome: form.nome,
    banco: form.banco,
    limite: form.limite,
    melhor_data_compra: form.melhor_data_compra,
    vencimento: form.vencimento
  })
}
</script>
