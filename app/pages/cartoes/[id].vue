<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" to="/cartoes" />
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ data?.cartao.nome }}</h1>
        <p class="text-sm text-gray-500 mt-0.5">{{ data?.cartao.banco }} · Vence dia {{ data?.cartao.vencimento }}</p>
      </div>
      <UButton icon="i-heroicons-plus" color="primary" @click="abrirNovaDespesaModal">
        Nova Despesa
      </UButton>
      <UButton
        v-if="data?.pode_reverter"
        icon="i-heroicons-arrow-uturn-left"
        variant="ghost"
        color="error"
        size="sm"
        @click="showReverterModal = true"
      >
        Reverter alteração
      </UButton>
      <UButton icon="i-heroicons-arrow-path" variant="ghost" color="neutral" @click="showAlterarCutoffModal = true">
        Alterar vencimento
      </UButton>
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
          <div v-if="data.fatura?.valor_ajuste || totalExtornos > 0" class="text-xs text-gray-400 mt-0.5 space-y-0.5">
            <div>
              Calculado: {{ format(data.cartao.gasto_mes) }}
              <span v-if="data.fatura?.valor_ajuste" :class="data.fatura.valor_ajuste > 0 ? 'text-red-500' : 'text-green-600'">
                {{ data.fatura.valor_ajuste > 0 ? '+' : '' }}{{ format(data.fatura.valor_ajuste) }} ajuste
              </span>
              <span v-if="totalExtornos > 0" class="text-emerald-600 dark:text-emerald-400">
                − {{ format(totalExtornos) }} extornos
              </span>
            </div>
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
            icon="i-heroicons-adjustments-horizontal"
            variant="soft"
            color="neutral"
            class="cursor-pointer"
            @click="abrirAjusteModal"
          >
            Ajuste
          </UButton>
          <UButton
            icon="i-heroicons-arrow-uturn-left"
            variant="soft"
            color="neutral"
            class="cursor-pointer"
            @click="abrirExtornoModal"
          >
            Extorno
          </UButton>
          <UButton
            v-if="!data.fatura?.pago"
            icon="i-heroicons-check-circle"
            color="primary"
            class="cursor-pointer"
            :disabled="data.cartao.gasto_mes === 0"
            @click="abrirPagarFaturaModal"
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

    <!-- Parcelas terminando este mês -->
    <div v-if="parcelasTerminando.length" class="bg-white dark:bg-gray-900 rounded-lg border border-amber-200/70 dark:border-amber-900/40 overflow-hidden">
      <button
        class="w-full flex items-center gap-2 px-5 py-3 bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50/60 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
        :class="parcelasExpandido ? 'border-b border-amber-200/70 dark:border-amber-900/40' : ''"
        @click="parcelasExpandido = !parcelasExpandido"
      >
        <UIcon name="i-heroicons-flag" class="w-4 h-4 text-amber-400 dark:text-amber-500 flex-shrink-0" />
        <p class="text-sm font-medium text-gray-700 dark:text-gray-200 flex-1 text-left">
          {{ parcelasTerminando.length === 1 ? '1 compra parcelada termina' : `${parcelasTerminando.length} compras parceladas terminam` }} neste mês
        </p>
        <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ format(totalParcelasTerminando) }}</span>
        <UIcon :name="parcelasExpandido ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      <template v-if="parcelasExpandido">
        <div
          v-for="(lanc, i) in parcelasTerminando"
          :key="lanc.id"
          class="flex items-center gap-3 px-5 py-3"
          :class="i < parcelasTerminando.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
        >
          <div
            class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            :style="lanc.categoria_icone ? { background: lanc.categoria_cor } : {}"
            :class="lanc.categoria_icone ? '' : 'bg-gray-100 dark:bg-gray-800'"
          >
            <UIcon :name="lanc.categoria_icone ?? 'i-heroicons-queue-list'" class="w-4 h-4" :class="lanc.categoria_icone ? 'text-white' : 'text-gray-400'" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ lanc.descricao }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Parcela {{ lanc.parcela_atual }} de {{ lanc.parcelas }} · última</p>
          </div>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">{{ format(lanc.valor) }}</p>
        </div>
      </template>
    </div>

    <!-- Gastos por categoria -->
    <div v-if="data?.lancamentos.length" class="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
      <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <p class="text-sm font-semibold text-gray-800 dark:text-gray-100">Gastos por categoria</p>
        <p class="text-xs text-gray-400 mt-0.5">{{ fmtMonth(currentMonth) }}</p>
      </div>
      <div class="flex items-center gap-6 px-5 py-4">
        <!-- Donut -->
        <div class="relative w-28 h-28 flex-shrink-0">
          <Doughnut :data="catChartData" :options="catChartOptions" />
          <div
            v-if="catTooltip.visible"
            class="absolute z-50 pointer-events-none bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg"
            :style="{ left: catTooltip.x + 'px', top: catTooltip.y + 'px', transform: 'translate(-50%, -110%)' }"
          >
            <p class="font-semibold mb-0.5">{{ catTooltip.label }}</p>
            <p class="text-gray-300">{{ format(catTooltip.value) }} &nbsp;({{ catTooltip.pct }}%)</p>
          </div>
        </div>
        <!-- Legend -->
        <div class="flex-1 space-y-1.5 min-w-0">
          <div
            v-for="cat in catExpandido ? gastosPorCategoria : gastosPorCategoria.slice(0, 6)"
            :key="cat.nome"
            class="flex items-center gap-2"
          >
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: cat.cor }" />
            <span class="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{{ cat.nome }}</span>
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">{{ format(cat.total) }}</span>
            <span class="text-xs text-gray-400 flex-shrink-0 w-9 text-right">{{ cat.pct.toFixed(0) }}%</span>
          </div>
          <button
            v-if="gastosPorCategoria.length > 6"
            class="flex items-center gap-2 w-full hover:opacity-70 transition-opacity cursor-pointer"
            @click="catExpandido = !catExpandido"
          >
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-300 dark:bg-gray-600" />
            <span class="text-xs text-gray-400 flex-1 text-left">
              {{ catExpandido ? 'Ver menos' : `+${gastosPorCategoria.length - 6} categorias` }}
            </span>
            <span v-if="!catExpandido" class="text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
              {{ format(gastosPorCategoria.slice(6).reduce((s, c) => s + c.total, 0)) }}
            </span>
            <span v-if="!catExpandido" class="text-xs text-gray-400 flex-shrink-0 w-9 text-right">
              {{ gastosPorCategoria.slice(6).reduce((s, c) => s + c.pct, 0).toFixed(0) }}%
            </span>
          </button>
        </div>
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
      <div class="px-5 pt-3 pb-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">Lançamentos</p>
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                v-for="op in sortOpcoes"
                :key="op.value"
                class="px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer"
                :class="sortMode === op.value ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
                @click="sortMode = op.value"
              >{{ op.label }}</button>
            </div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
              {{ busca ? `${lancamentosFiltrados.length} de ${data?.lancamentos.length}` : `${data?.lancamentos.length}` }} item(s)
            </p>
          </div>
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

      <!-- Modo: data ou valor (lista flat) -->
      <template v-else-if="sortMode !== 'categoria'">
        <!-- Ajuste de arredondamento -->
        <div
          v-if="!busca && data.fatura?.valor_ajuste && data.fatura.valor_ajuste < 0"
          class="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-green-50/50 dark:bg-green-900/10"
        >
          <div class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30">
            <UIcon name="i-heroicons-adjustments-horizontal" class="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-green-700 dark:text-green-400">Ajuste de arredondamento</p>
            <p class="text-xs text-green-600/70 dark:text-green-500/70 mt-0.5">Crédito aplicado à fatura</p>
          </div>
          <p class="text-sm font-semibold text-green-600 dark:text-green-400 flex-shrink-0">
            + {{ format(Math.abs(data.fatura.valor_ajuste)) }}
          </p>
        </div>

        <!-- Extornos -->
        <div
          v-for="ext in (!busca ? (data.extornos ?? []) : [])"
          :key="`ext-${ext.id}`"
          class="group flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-emerald-50/40 dark:bg-emerald-900/10"
        >
          <div class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
            <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">{{ ext.descricao || 'Extorno' }}</p>
            <p v-if="ext.transacao_descricao" class="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
              Ref: {{ ext.transacao_descricao }}
            </p>
            <p v-if="ext.notas" class="text-xs text-gray-400 mt-0.5 italic">{{ ext.notas }}</p>
          </div>
          <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            + {{ format(ext.valor) }}
          </p>
          <button
            class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 cursor-pointer"
            title="Remover extorno"
            @click="removerExtorno(ext.id)"
          >
            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
          </button>
        </div>

        <div
          v-for="(lanc, i) in lancamentosOrdenados"
          :key="`${lanc.id}-${lanc.fixa}`"
          class="group flex items-center gap-4 px-5 py-4"
          :class="i < lancamentosOrdenados.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
        >
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
            <p v-if="lanc.nome_fatura" class="text-xs text-gray-400 mt-0.5 truncate font-mono">{{ lanc.nome_fatura }}</p>
            <p v-if="lanc.notas" class="text-xs text-gray-400 mt-0.5 truncate italic">{{ lanc.notas }}</p>
          </div>
          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              title="Editar"
              @click="abrirEditarLancamento(lanc)"
            >
              <UIcon name="i-heroicons-pencil" class="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button
              class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors"
              title="Excluir"
              @click="confirmarDeletar(lanc)"
            >
              <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
            </button>
          </div>
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">
            - {{ format(lanc.valor) }}
          </p>
        </div>
      </template>

      <!-- Modo: categoria (agrupado) -->
      <template v-else>
        <div v-for="(grupo, gi) in lancamentosAgrupados" :key="grupo.categoria">
          <!-- Header do grupo -->
          <div
            class="flex items-center gap-3 px-5 py-3 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
            :class="gi > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''"
            @click="toggleGrupoCategoria(grupo.categoria)"
          >
            <div
              class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              :style="grupo.cor ? { background: grupo.cor } : {}"
              :class="grupo.cor ? '' : 'bg-gray-100 dark:bg-gray-800'"
            >
              <UIcon
                :name="grupo.icone ?? 'i-heroicons-tag'"
                class="w-3.5 h-3.5"
                :class="grupo.cor ? 'text-white' : 'text-gray-400'"
              />
            </div>
            <span class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{{ grupo.categoria }}</span>
            <span class="text-xs text-gray-400 mr-2">{{ grupo.itens.length }} item(s)</span>
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 mr-2">{{ format(grupo.total) }}</span>
            <UIcon
              :name="expandedCategorias.has(grupo.categoria) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-4 h-4 text-gray-400 flex-shrink-0"
            />
          </div>

          <!-- Itens do grupo -->
          <div v-if="expandedCategorias.has(grupo.categoria)" class="border-t border-gray-100 dark:border-gray-800">
            <div
              v-for="(lanc, li) in grupo.itens"
              :key="`${lanc.id}-${lanc.fixa}`"
              class="flex items-center gap-4 px-5 py-3 pl-16"
              :class="li < grupo.itens.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-800 dark:text-gray-100 truncate">{{ lanc.descricao }}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-xs text-gray-400">{{ descricaoData(lanc) }}</span>
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
              <p class="text-sm font-medium text-gray-800 dark:text-gray-100 flex-shrink-0">- {{ format(lanc.valor) }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Slideover: Nova / Editar Despesa -->
    <USlideover
      v-model:open="showNovaDespesaModal"
      :title="editandoLancamento ? 'Editar despesa' : 'Nova Despesa'"
      :ui="{ width: 'sm:max-w-lg' }"
    >
      <template #body>
        <div class="p-1">
          <CartoesNovaDespesaForm
            v-if="data"
            ref="novaDespesaFormRef"
            :cartao-id="cartaoIdNum"
            :cartao-nome="data.cartao.nome"
            :cartao-banco-key="data.cartao.banco_key"
            :loading="salvandoDespesa"
            :edit-mode="!!editandoLancamento"
            @submit="handleNovaDespesaSubmit"
            @cancel="showNovaDespesaModal = false"
          />
        </div>
      </template>
    </USlideover>

    <!-- Modal: confirmar exclusão -->
    <UModal v-model:open="showDeletarModal" title="Excluir lançamento" :dismissible="false">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir
            <span class="font-medium text-gray-800 dark:text-gray-100">{{ lancamentoDeletar?.descricao }}</span>?
          </p>
          <template v-if="lancamentoDeletar?.fixa">
            <p class="text-sm text-gray-500">Esta é uma despesa recorrente. O que deseja excluir?</p>
            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input v-model="deletarScope" type="radio" value="one" class="cursor-pointer" />
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-100">Somente este mês</p>
                  <p class="text-xs text-gray-400">Remove apenas a ocorrência de {{ fmtMonth(currentMonth) }}</p>
                </div>
              </label>
              <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input v-model="deletarScope" type="radio" value="all" class="cursor-pointer" />
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-100">Todos os meses</p>
                  <p class="text-xs text-gray-400">Remove a despesa completamente</p>
                </div>
              </label>
            </div>
          </template>
          <div class="flex justify-end gap-3 pt-1">
            <UButton variant="ghost" color="neutral" @click="showDeletarModal = false">Cancelar</UButton>
            <UButton color="error" :loading="deletandoLancamento" @click="executarDeletar">Excluir</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal ajuste de arredondamento -->
    <USlideover v-model:open="showAjusteModal" title="Ajuste de arredondamento" :dismissible="false">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Use para corrigir pequenas discrepâncias entre o valor calculado e o cobrado pela operadora. Valores negativos aparecem como crédito na fatura.
          </p>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 space-y-1">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Calculado</span>
              <span class="font-medium text-gray-800 dark:text-gray-100">{{ format(data?.cartao.gasto_mes ?? 0) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Ajuste</span>
              <span class="font-medium" :class="Number(ajusteEdicao) < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'">
                {{ Number(ajusteEdicao) < 0 ? '' : '+' }}{{ format(Number(ajusteEdicao) || 0) }}
              </span>
            </div>
            <div class="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
              <span class="font-medium text-gray-700 dark:text-gray-300">Total da fatura</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ format((data?.cartao.gasto_mes ?? 0) + (Number(ajusteEdicao) || 0)) }}</span>
            </div>
          </div>
          <p class="text-xs text-gray-400">Negativo = crédito (reduz a fatura) · Positivo = débito adicional</p>

          <UFormField label="Valor do ajuste">
            <UInput
              v-model="ajusteEdicao"
              type="number"
              step="0.01"
              placeholder="Ex: -0.02"
              class="w-full"
            />
          </UFormField>

          <div class="flex items-center justify-between gap-3 pt-2">
            <UButton
              v-if="data?.fatura?.id && data.fatura.valor_ajuste"
              variant="ghost"
              color="error"
              :loading="salvandoAjuste"
              @click="removerAjuste"
            >Remover</UButton>
            <div class="flex gap-3 ml-auto">
              <UButton variant="ghost" color="neutral" @click="showAjusteModal = false">Cancelar</UButton>
              <UButton color="primary" :loading="salvandoAjuste" @click="salvarAjuste">Aplicar</UButton>
            </div>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Modal extorno -->
    <USlideover v-model:open="showExtornoModal" title="Registrar extorno" :dismissible="false">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Use para registrar créditos da operadora como cancelamento de compra, contestação ou cashback avulso.
          </p>

          <UFormField label="Valor do extorno" required>
            <SharedCurrencyInput v-model="extornoForm.valor" />
          </UFormField>

          <UFormField label="Descrição">
            <UInput v-model="extornoForm.descricao" placeholder="Ex: Cancelamento Shopee, Contestação iFood..." class="w-full" />
          </UFormField>

          <UFormField label="Compra associada (opcional)">
            <USelect
              v-model="extornoForm.transacao_id"
              :items="lancamentoOptions"
              value-key="value"
              label-key="label"
              placeholder="Selecione uma compra..."
              class="w-full"
            />
          </UFormField>

          <UFormField label="Notas">
            <UTextarea v-model="extornoForm.notas" placeholder="Observações adicionais..." :rows="3" class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-3 pt-2">
            <UButton variant="ghost" color="neutral" @click="showExtornoModal = false">Cancelar</UButton>
            <UButton color="primary" :loading="salvandoExtorno" :disabled="!extornoForm.valor" @click="salvarExtorno">
              Registrar
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

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
            <div v-if="saldoConta !== null" class="mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
              :class="saldoInsuficiente ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
            >
              <span>{{ saldoInsuficiente ? 'Saldo insuficiente' : 'Saldo disponível' }}</span>
              <span class="font-medium">{{ format(saldoConta) }}</span>
            </div>
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
            <UButton color="primary" :loading="salvandoPagamento" :disabled="!pagamento.conta_id || saldoInsuficiente" @click="salvarPagamento">
              Confirmar pagamento
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Modal: Alterar vencimento / cutoff -->
    <UModal v-model:open="showAlterarCutoffModal" title="Alterar vencimento do cartão" :dismissible="false">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            O cartão atual será arquivado e um novo será criado com as novas datas. O histórico de faturas pagas é preservado. A operação pode ser revertida enquanto não houver faturas pagas no novo cartão.
          </p>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Nova melhor data de compra">
              <UInput v-model.number="cutoffForm.novo_melhor_data_compra" type="number" min="1" max="31" placeholder="Ex: 30" />
            </UFormField>
            <UFormField label="Novo vencimento">
              <UInput v-model.number="cutoffForm.novo_vencimento" type="number" min="1" max="31" placeholder="Ex: 8" />
            </UFormField>
          </div>

          <UFormField label="A partir de qual mês?">
            <UInput v-model="cutoffForm.a_partir_de" placeholder="YYYY-MM (ex: 2026-06)" />
          </UFormField>

          <UFormField label="Existe fatura de transição?">
            <div class="flex items-center gap-3 mt-1">
              <USwitch v-model="cutoffForm.tem_transicao" />
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ cutoffForm.tem_transicao ? 'Sim — informar janela abaixo' : 'Não' }}
              </span>
            </div>
          </UFormField>

          <template v-if="cutoffForm.tem_transicao">
            <div class="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <UFormField label="Início da janela">
                <UInput v-model="cutoffForm.janela_inicio" placeholder="YYYY-MM-DD" />
              </UFormField>
              <UFormField label="Fim da janela">
                <UInput v-model="cutoffForm.janela_fim" placeholder="YYYY-MM-DD" />
              </UFormField>
            </div>
          </template>

          <div class="flex gap-3 pt-2">
            <UButton variant="ghost" color="neutral" class="flex-1 justify-center" @click="showAlterarCutoffModal = false">Cancelar</UButton>
            <UButton color="primary" class="flex-1 justify-center" :loading="alterandoCutoff" @click="confirmarAlterarCutoff">
              Confirmar alteração
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal: Reverter alteração de vencimento -->
    <UModal v-model:open="showReverterModal" title="Reverter alteração de vencimento" :dismissible="false">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Isso irá restaurar o cartão anterior e desfazer todas as alterações feitas (faturas, despesas fixas migradas). Esta operação não pode ser desfeita.
          </p>
          <div class="flex gap-3 pt-2">
            <UButton variant="ghost" color="neutral" class="flex-1 justify-center" @click="showReverterModal = false">Cancelar</UButton>
            <UButton color="error" class="flex-1 justify-center" :loading="revertendoAlteracao" @click="confirmarReverter">
              Reverter
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

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
  notas?: string | null
  nome_fatura?: string | null
}

interface Fatura {
  id: number
  pago: number
  conta_id: number | null
  conta_nome: string | null
  data_pagamento: string | null
  valor_ajuste: number | null
}

interface Extorno {
  id: number
  valor: number
  descricao: string | null
  notas: string | null
  transacao_id: number | null
  transacao_descricao: string | null
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

const { data, pending, error, refresh } = await useFetch<{ cartao: CartaoDetalhe; lancamentos: Lancamento[]; fatura: Fatura | null; extornos: Extorno[] }>(
  `/api/cartoes/${route.params.id}/lancamentos`,
  { query: computed(() => ({ month: currentMonth.value })), watch: [currentMonth] }
)

const cardStyle = computed(() => {
  const cartao = data.value?.cartao
  const color = cartao?.cor ?? findBank(cartao?.banco_key ?? '')?.color ?? '#6366f1'
  return { background: `linear-gradient(135deg, ${color}dd 0%, ${color}88 100%)` }
})

const totalExtornos = computed(() =>
  (data.value?.extornos ?? []).reduce((s, e) => s + e.valor, 0)
)

const valorFaturaPago = computed(() => {
  const base = data.value?.cartao.gasto_mes ?? 0
  const ajuste = data.value?.fatura?.valor_ajuste ?? 0
  return base + ajuste - totalExtornos.value
})

const ajusteModal = computed(() => Number(pagamento.ajuste) || 0)
const valorModalFatura = computed(() => (data.value?.cartao.gasto_mes ?? 0) + ajusteModal.value - totalExtornos.value)

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

// --- Nova / Editar Despesa ---
const showNovaDespesaModal = ref(false)
const salvandoDespesa = ref(false)
const novaDespesaFormRef = ref<{ resetForm: () => void; fillForm: (l: any) => void } | null>(null)
const cartaoIdNum = computed(() => Number(route.params.id))
const toast = useToast()
const editandoLancamento = ref<Lancamento | null>(null)

function abrirNovaDespesaModal() {
  editandoLancamento.value = null
  novaDespesaFormRef.value?.resetForm()
  showNovaDespesaModal.value = true
}

function abrirEditarLancamento(lanc: Lancamento) {
  editandoLancamento.value = lanc
  showNovaDespesaModal.value = true
  nextTick(() => novaDespesaFormRef.value?.fillForm(lanc))
}

async function handleNovaDespesaSubmit(formData: any) {
  salvandoDespesa.value = true
  try {
    if (editandoLancamento.value) {
      await $fetch(`/api/despesas/${editandoLancamento.value.id}`, {
        method: 'PUT',
        body: { ...formData, cartao_id: cartaoIdNum.value },
      })
      toast.add({ title: 'Despesa atualizada', color: 'success', icon: 'i-heroicons-check-circle' })
    } else {
      await $fetch('/api/despesas', { method: 'POST', body: formData })
      toast.add({ title: 'Despesa adicionada', color: 'success', icon: 'i-heroicons-check-circle' })
    }
    showNovaDespesaModal.value = false
    editandoLancamento.value = null
    await refresh()
    refreshNuxtData()
  } catch (e: any) {
    toast.add({ title: 'Erro ao salvar', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    salvandoDespesa.value = false
  }
}

// --- Deletar Lancamento ---
const showDeletarModal = ref(false)
const lancamentoDeletar = ref<Lancamento | null>(null)
const deletarScope = ref<'one' | 'all'>('one')
const deletandoLancamento = ref(false)

function confirmarDeletar(lanc: Lancamento) {
  lancamentoDeletar.value = lanc
  deletarScope.value = 'one'
  showDeletarModal.value = true
}

async function executarDeletar() {
  if (!lancamentoDeletar.value) return
  deletandoLancamento.value = true
  try {
    const lanc = lancamentoDeletar.value
    const params = lanc.fixa && deletarScope.value === 'one'
      ? `?scope=one&month=${currentMonth.value}`
      : ''
    await $fetch(`/api/despesas/${lanc.id}${params}`, { method: 'DELETE' })
    showDeletarModal.value = false
    lancamentoDeletar.value = null
    await refresh()
    refreshNuxtData()
    toast.add({ title: 'Lançamento excluído', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao excluir', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    deletandoLancamento.value = false
  }
}

// Pagamento
const { data: contas } = await useFetch<{ id: number; nome: string; banco: string; saldo_atual: number }[]>('/api/contas')
const contaOptions = computed(() => (contas.value ?? []).map(c => ({ value: c.id, label: `${c.nome} — ${c.banco}` })))

const saldoConta = computed(() => {
  if (!pagamento.conta_id) return null
  return contas.value?.find(c => c.id === pagamento.conta_id)?.saldo_atual ?? null
})

const saldoInsuficiente = computed(() =>
  saldoConta.value !== null && valorModalFatura.value > 0 &&
  Math.round(valorModalFatura.value * 100) > Math.round(saldoConta.value * 100)
)

const showPagarModal = ref(false)
const salvandoPagamento = ref(false)
const desfazendoPagamento = ref(false)
const pagamento = reactive({
  conta_id: null as number | null,
  data: useLocalDate().localDateStr(),
  ajuste: '' as string
})

function abrirPagarFaturaModal() {
  // Pre-fill ajuste with any existing valor_ajuste stored in the fatura
  const ajusteExistente = data.value?.fatura?.valor_ajuste
  pagamento.ajuste = ajusteExistente != null && ajusteExistente !== 0
    ? String(ajusteExistente)
    : ''
  pagamento.data = useLocalDate().localDateStr()
  showPagarModal.value = true
}

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

// Extorno
const showExtornoModal = ref(false)
const salvandoExtorno = ref(false)
const extornoForm = reactive({ valor: 0, descricao: '', notas: '', transacao_id: null as number | null })

const lancamentoOptions = computed(() => [
  { value: null, label: 'Nenhuma' },
  ...(data.value?.lancamentos ?? []).map(l => ({ value: l.id, label: l.descricao }))
])

function abrirExtornoModal() {
  extornoForm.valor = 0
  extornoForm.descricao = ''
  extornoForm.notas = ''
  extornoForm.transacao_id = null
  showExtornoModal.value = true
}

async function salvarExtorno() {
  if (!extornoForm.valor) return
  salvandoExtorno.value = true
  try {
    await $fetch('/api/extornos', {
      method: 'POST',
      body: {
        cartao_id: cartaoIdNum.value,
        mes: currentMonth.value,
        valor: extornoForm.valor,
        descricao: extornoForm.descricao || null,
        notas: extornoForm.notas || null,
        transacao_id: extornoForm.transacao_id || null,
      }
    })
    showExtornoModal.value = false
    await refresh()
    toast.add({ title: 'Extorno registrado', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao salvar', description: e?.data?.message ?? e?.message, color: 'error' })
  } finally {
    salvandoExtorno.value = false
  }
}

async function removerExtorno(id: number) {
  try {
    await $fetch(`/api/extornos/${id}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Extorno removido', color: 'success', icon: 'i-heroicons-check-circle' })
  } catch (e: any) {
    toast.add({ title: 'Erro ao remover', description: e?.data?.message ?? e?.message, color: 'error' })
  }
}

// Ajuste de arredondamento
const showAjusteModal = ref(false)
const ajusteEdicao = ref('')
const salvandoAjuste = ref(false)

function abrirAjusteModal() {
  ajusteEdicao.value = String(data.value?.fatura?.valor_ajuste ?? '')
  showAjusteModal.value = true
}

async function salvarAjuste() {
  salvandoAjuste.value = true
  try {
    const ajuste = Number(ajusteEdicao.value) || 0
    if (data.value?.fatura?.id) {
      // Fatura já existe — só atualiza o ajuste
      await $fetch(`/api/faturas/${data.value.fatura.id}`, {
        method: 'PATCH',
        body: { valor_ajuste: ajuste }
      })
    } else {
      // Cria uma fatura não-paga apenas com o ajuste (sem conta/data obrigatórios)
      await $fetch('/api/faturas/ajuste', {
        method: 'POST',
        body: { cartao_id: route.params.id, mes: currentMonth.value, valor_ajuste: ajuste }
      })
    }
    await refresh()
    showAjusteModal.value = false
  } finally {
    salvandoAjuste.value = false
  }
}

async function removerAjuste() {
  if (!data.value?.fatura?.id) return
  salvandoAjuste.value = true
  try {
    await $fetch(`/api/faturas/${data.value.fatura.id}`, {
      method: 'PATCH',
      body: { valor_ajuste: 0 }
    })
    await refresh()
    showAjusteModal.value = false
  } finally {
    salvandoAjuste.value = false
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

const parcelasTerminando = computed(() =>
  (data.value?.lancamentos ?? []).filter(l => l.parcelas > 0 && l.parcela_atual === l.parcelas)
)
const totalParcelasTerminando = computed(() => parcelasTerminando.value.reduce((s, l) => s + l.valor, 0))
const parcelasExpandido = ref(false)

type SortMode = 'data' | 'valor' | 'categoria'
const sortMode = ref<SortMode>('data')
const sortOpcoes = [
  { value: 'data', label: 'Data' },
  { value: 'valor', label: 'Valor' },
  { value: 'categoria', label: 'Categoria' },
] as const

const busca = ref('')
watch(currentMonth, () => { busca.value = '' })

const lancamentosFiltrados = computed(() => {
  const list = data.value?.lancamentos ?? []
  const q = busca.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(l => {
    if (l.descricao.toLowerCase().includes(q)) return true
    // Busca por valor: tenta match no formato BR (ex: "13,45") e no valor bruto
    const valorBR = l.valor.toFixed(2).replace('.', ',')
    if (valorBR.includes(q)) return true
    // Remove símbolos e compara (ex: busca "r$ 13" ou "13.45")
    const valorFormatado = format(l.valor).toLowerCase().replace(/\s/g, '')
    if (valorFormatado.includes(q.replace(/\s/g, ''))) return true
    return false
  })
})

const lancamentosOrdenados = computed(() => {
  const list = [...lancamentosFiltrados.value]
  if (sortMode.value === 'valor') return list.sort((a, b) => b.valor - a.valor)
  return list.sort((a, b) => b.data.localeCompare(a.data))
})

const expandedCategorias = reactive(new Set<string>())

function toggleGrupoCategoria(cat: string) {
  if (expandedCategorias.has(cat)) expandedCategorias.delete(cat)
  else expandedCategorias.add(cat)
}

const lancamentosAgrupados = computed(() => {
  const map = new Map<string, { categoria: string; cor: string | null; icone: string | null; total: number; itens: typeof data.value.lancamentos }>()
  for (const l of lancamentosFiltrados.value) {
    const key = l.categoria ?? 'Sem categoria'
    if (!map.has(key)) map.set(key, { categoria: key, cor: l.categoria_cor ?? null, icone: l.categoria_icone ?? null, total: 0, itens: [] })
    const g = map.get(key)!
    g.total += l.valor
    g.itens.push(l)
  }
  return [...map.values()]
    .sort((a, b) => b.total - a.total)
    .map(g => ({ ...g, itens: [...g.itens].sort((a, b) => b.data.localeCompare(a.data)) }))
})

const gastosPorCategoria = computed(() => {
  const lancamentos = data.value?.lancamentos ?? []
  const totalGeral = lancamentos.reduce((s, l) => s + l.valor, 0)
  const map = new Map<string, { total: number; cor: string }>()
  for (const l of lancamentos) {
    const nome = l.categoria ?? 'Sem categoria'
    const cor = l.categoria_cor ?? '#6b7280'
    const entry = map.get(nome)
    if (entry) entry.total += l.valor
    else map.set(nome, { total: l.valor, cor })
  }
  return Array.from(map.entries())
    .map(([nome, { total, cor }]) => ({ nome, total, cor, pct: totalGeral > 0 ? (total / totalGeral) * 100 : 0 }))
    .sort((a, b) => b.total - a.total)
})

const catChartData = computed(() => ({
  labels: gastosPorCategoria.value.map(c => c.nome),
  datasets: [{
    data: gastosPorCategoria.value.map(c => c.total),
    backgroundColor: gastosPorCategoria.value.map(c => c.cor),
    borderWidth: 0,
    hoverOffset: 4,
  }]
}))

const catExpandido = ref(false)
const catTooltip = reactive({ visible: false, label: '', value: 0, pct: '0', x: 0, y: 0 })

const catChartOptions = computed(() => {
  const total = gastosPorCategoria.value.reduce((s, c) => s + c.total, 0)
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: (ctx: any) => {
          const { tooltip } = ctx
          if (tooltip.opacity === 0) { catTooltip.visible = false; return }
          const dp = tooltip.dataPoints?.[0]
          if (!dp) return
          const val = dp.parsed
          catTooltip.label = dp.label
          catTooltip.value = val
          catTooltip.pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0'
          const rect = ctx.chart.canvas.getBoundingClientRect()
          const canvasRect = ctx.chart.canvas.parentElement?.getBoundingClientRect()
          catTooltip.x = tooltip.caretX
          catTooltip.y = tooltip.caretY
          catTooltip.visible = true
        },
      },
    },
  }
})

useHead({ title: computed(() => `${data.value?.cartao.nome ?? 'Cartão'} — Gestão Financeira`) })

// ── Alterar vencimento / cutoff ──────────────────────────────────────────────

const showAlterarCutoffModal = ref(false)
const alterandoCutoff = ref(false)
const cutoffForm = reactive({
  novo_melhor_data_compra: null as number | null,
  novo_vencimento: null as number | null,
  a_partir_de: '',
  tem_transicao: false,
  janela_inicio: '',
  janela_fim: '',
})

async function confirmarAlterarCutoff() {
  if (!cutoffForm.novo_melhor_data_compra || !cutoffForm.novo_vencimento || !cutoffForm.a_partir_de) return
  alterandoCutoff.value = true
  try {
    const body: any = {
      novo_melhor_data_compra: cutoffForm.novo_melhor_data_compra,
      novo_vencimento: cutoffForm.novo_vencimento,
      a_partir_de: cutoffForm.a_partir_de,
    }
    if (cutoffForm.tem_transicao && cutoffForm.janela_inicio && cutoffForm.janela_fim) {
      body.fatura_transicao = {
        janela_inicio: cutoffForm.janela_inicio,
        janela_fim: cutoffForm.janela_fim,
      }
    }
    const result = await $fetch(`/api/cartoes/${cartaoIdNum.value}/alterar-cutoff`, { method: 'POST', body })
    showAlterarCutoffModal.value = false
    // Navega para o novo cartão
    await navigateTo(`/cartoes/${(result as any).novo_cartao_id}`)
  } finally {
    alterandoCutoff.value = false
  }
}

// ── Reverter alteração ───────────────────────────────────────────────────────

const showReverterModal = ref(false)
const revertendoAlteracao = ref(false)

async function confirmarReverter() {
  revertendoAlteracao.value = true
  try {
    const result = await $fetch(`/api/cartoes/${cartaoIdNum.value}/reverter-alteracao`, { method: 'POST' })
    showReverterModal.value = false
    await navigateTo(`/cartoes/${(result as any).cartao_restaurado_id}`)
  } finally {
    revertendoAlteracao.value = false
  }
}
</script>
