'use client'

import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function SymbolHeatmap({ data }: { data: { symbol: string; total_pnl: number }[] }) {
  const chartData = {
    labels: data.map(d => d.symbol),
    datasets: [
      {
        label: 'Symbol P&L',
        data: data.map(d => d.total_pnl),
        backgroundColor: data.map(d => d.total_pnl >= 0 ? '#10b981' : '#ef4444')
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