import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useSettings } from '../contexts/SettingsContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ExpenseComparisonChart({ thisMonth, lastMonth }) {
  const { settings } = useSettings();
  const difference = thisMonth - lastMonth;
  const percentChange = lastMonth > 0 ? ((difference / lastMonth) * 100).toFixed(1) : 0;

  const data = {
    labels: ['Last Month', 'This Month'],
    datasets: [
      {
        label: 'Expenses',
        data: [lastMonth, thisMonth],
        backgroundColor: [
          'rgba(156, 163, 175, 0.8)', // gray for last month
          thisMonth > lastMonth ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)', // red if more, green if less
        ],
        borderColor: [
          'rgb(156, 163, 175)',
          thisMonth > lastMonth ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${settings.currencySymbol}${context.raw.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return settings.currencySymbol + value.toLocaleString();
          }
        },
        grid: {
          color: 'rgba(128, 128, 128, 0.1)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  return (
    <div>
      <div style={{ height: '200px' }}>
        <Bar data={data} options={options} />
      </div>
      <div className="text-center mt-3">
        <span className={`fs-5 fw-bold ${difference > 0 ? 'text-danger' : 'text-success'}`}>
          {difference > 0 ? '↑' : '↓'} {settings.currencySymbol}{Math.abs(difference).toLocaleString()}
        </span>
        <span className="text-muted ms-2">
          ({difference > 0 ? '+' : ''}{percentChange}%)
        </span>
        <p className="text-muted small mt-1 mb-0">
          {difference > 0
            ? 'You spent more this month compared to last month'
            : difference < 0
              ? 'Great! You spent less this month'
              : 'Your spending is the same as last month'
          }
        </p>
      </div>
    </div>
  );
}
