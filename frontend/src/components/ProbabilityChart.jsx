import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function ProbabilityChart({ probabilities }) {
  // Filter out basis states with negligible probability to prevent chart clutter (especially for 8 qubits)
  // But make sure we always have at least the active states visible.
  const filteredStates = Object.entries(probabilities)
    .filter(([_, value]) => value > 0.005) // greater than 0.5%
    .sort((a, b) => b[1] - a[1]); // Sort descending for better presentation

  // If nothing is above threshold, show the state with maximum probability
  if (filteredStates.length === 0) {
    const maxState = Object.entries(probabilities).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
    filteredStates.push(maxState);
  }

  const labels = filteredStates.map(([state]) => `|${state}⟩`);
  const dataValues = filteredStates.map(([_, val]) => (val * 100).toFixed(1));

  const data = {
    labels,
    datasets: [
      {
        label: 'Probability (%)',
        data: dataValues,
        backgroundColor: '#33B1FF',
        borderColor: '#1982c4',
        borderWidth: 1,
        borderRadius: 4,
        barThickness: Math.min(60, 500 / Math.max(1, labels.length))
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#161616',
        titleFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        bodyFont: { size: 12 },
        borderColor: '#393939',
        borderWidth: 1,
        callbacks: {
          label: (context) => `Probability: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: '#393939',
          drawBorder: false
        },
        ticks: {
          color: '#8d8d8d',
          font: {
            family: "'IBM Plex Mono', monospace",
            size: 11
          },
          minRotation: 60,
          maxRotation: 60
        }
      },
      y: {
        grid: {
          color: '#393939',
          drawBorder: false
        },
        min: 0,
        max: 100,
        ticks: {
          color: '#8d8d8d',
          font: {
            size: 10
          },
          callback: (value) => `${value}%`
        }
      }
    }
  };

  return (
    <div className="h-[350px] bg-[#262626] border-t border-r border-[#393939] p-4 flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[13px] font-semibold tracking-wider text-gray-400 uppercase">
          Probability Distribution
        </h3>
        <span className="text-[11px] text-gray-500 font-mono-qasm">
          Threshold: &gt; 0.5%
        </span>
      </div>
      <div className="flex-1 relative min-h-0">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
