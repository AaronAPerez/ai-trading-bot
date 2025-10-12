'use client'

import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function StrategyBarChart({ data }: { data: { strategy: string; total_pnl: number }[] }) {
  const chartData = {
    labels: data.map(d => d.strategy),
    datasets: [
      {
        label: 'Total P&L by Strategy',
        data: data.map(d => d.total_pnl),
        backgroundColor: '#3b82f6'
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: { beginAtZero: true },
      x: { ticks: { autoSkip: false } }
    }
  }

  return <Bar data={chartData} options={options} />
}