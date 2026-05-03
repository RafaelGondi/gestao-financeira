<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface Ponto { mes: string; valor: number }

const props = defineProps<{
  dados: Ponto[]
  mesResidual: string | null
  cardColor: string
}>()

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function fmtLabel(mes: string) {
  const [, m] = mes.split('-')
  return meses[Number(m) - 1]
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

const chartData = computed(() => {
  const rgb = hexToRgb(props.cardColor.length === 7 ? props.cardColor : '#6366f1')
  return {
    labels: props.dados.map(d => fmtLabel(d.mes)),
    datasets: [
      {
        label: 'Fatura',
        data: props.dados.map(d => d.valor),
        backgroundColor: props.dados.map(d =>
          props.mesResidual && d.mes >= props.mesResidual
            ? `rgba(${rgb}, 0.25)`
            : `rgba(${rgb}, 0.85)`
        ),
        borderColor: props.dados.map(d =>
          props.mesResidual && d.mes >= props.mesResidual
            ? `rgba(${rgb}, 0.4)`
            : `rgba(${rgb}, 1)`
        ),
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.raw as number
          return ` R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        },
        title: (items: any[]) => {
          const idx = items[0].dataIndex
          return props.dados[idx]?.mes.split('-').reverse().join('/')
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#9ca3af', font: { size: 12, family: 'Satoshi' } },
    },
    y: {
      grid: { color: '#f3f4f6' },
      border: { display: false, dash: [4, 4] },
      ticks: {
        color: '#9ca3af',
        font: { size: 11, family: 'Satoshi' },
        callback: (v: any) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      },
    },
  },
}))
</script>
