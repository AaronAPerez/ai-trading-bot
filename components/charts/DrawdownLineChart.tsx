'use client'

import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function DrawdownLineChart({ data }: { data: { timestamp: string; pnl: number }[] }) {
  const chartData = {
    labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'P&L Over Time',
        data: data.map(d => d.pnl),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.2)',
        tension: 0.3,
        fill: true
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
      y: { beginAtZero: false },
      x: { ticks: { autoSkip: true, maxTicksLimit: 10 } }
    }
  }

  return <Line data={chartData} options={options} />
}