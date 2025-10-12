'use client'

import { Scatter } from 'react-chartjs-2'
import { Chart as ChartJS, PointElement, LinearScale, Tooltip, Legend } from 'chart.js'

ChartJS.register(PointElement, LinearScale, Tooltip, Legend)

export default function ConfidenceScatterPlot({ data }: { data: { confidence: number; pnl: number }[] }) {
  const chartData = {
    datasets: [
      {
        label: 'Confidence vs P&L',
        data: data.map(d => ({ x: d.confidence, y: d.pnl })),
        backgroundColor: '#f59e0b'
      }
    ]
  }

  const options = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Confidence Score' }, min: 0, max: 1 },
      y: { title: { display: true, text: 'P&L ($)' } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'nearest', intersect: false }
    }
  }

  return <Scatter data={chartData} options={options} />
}