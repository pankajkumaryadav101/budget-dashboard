import React, { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useSettings } from '../contexts/SettingsContext';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SALARY_KEY = 'user_salary_v1';
const MONTHLY_EXPENSES_KEY = 'monthly_expenses_v1';

export default function SalaryExpenseChart() {
  const { settings, formatCurrency, convertCurrency } = useSettings();
  const [salary, setSalary] = useState(0);
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [expenses, setExpenses] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [tempSalary, setTempSalary] = useState('');
  const [chartType, setChartType] = useState('doughnut');

  useEffect(() => {
    loadData();
  }, [settings.currency]); // Reload when currency changes

  const loadData = () => {
    try {
      // Load salary with its currency
      const storedSalaryData = localStorage.getItem(SALARY_KEY);
      if (storedSalaryData) {
        try {
          const salaryData = JSON.parse(storedSalaryData);
          if (typeof salaryData === 'object' && salaryData.amount) {
            setSalary(parseFloat(salaryData.amount) || 0);
            setSalaryCurrency(salaryData.currency || 'USD');
            setTempSalary(salaryData.amount.toString());
          } else {
            // Legacy format - just a number
            setSalary(parseFloat(storedSalaryData) || 0);
            setTempSalary(storedSalaryData);
          }
        } catch {
          // Legacy format - just a number
          setSalary(parseFloat(storedSalaryData) || 0);
          setTempSalary(storedSalaryData);
        }
      }

      // Load this month's expenses with currency conversion
      const monthlyExpenses = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || '[]');
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const thisMonthTotal = monthlyExpenses.filter(e => {
        if (!e.date) return true; // Include expenses without date
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, e) => {
        let amount = parseFloat(e.amount) || 0;
        const expCurrency = e.currency || 'USD';
        if (expCurrency !== settings.currency) {
          amount = convertCurrency(amount, expCurrency, settings.currency);
        }
        return sum + amount;
      }, 0);

      setExpenses(thisMonthTotal);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const saveSalary = () => {
    const newSalary = parseFloat(tempSalary) || 0;
    setSalary(newSalary);
    setSalaryCurrency(settings.currency);
    // Save with currency info
    localStorage.setItem(SALARY_KEY, JSON.stringify({
      amount: newSalary,
      currency: settings.currency
    }));
    setShowInput(false);
  };

  // Convert salary to display currency if needed
  const displaySalary = salaryCurrency !== settings.currency
    ? convertCurrency(salary, salaryCurrency, settings.currency)
    : salary;

  const remaining = Math.max(0, displaySalary - expenses);
  const spentPercent = displaySalary > 0 ? Math.min((expenses / displaySalary) * 100, 100) : 0;
  const savingsPercent = displaySalary > 0 ? Math.max(0, ((displaySalary - expenses) / displaySalary) * 100) : 0;

  const doughnutData = {
    labels: ['Expenses', 'Remaining'],
    datasets: [
      {
        data: [expenses, remaining],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)', // Red for expenses
          'rgba(34, 197, 94, 0.8)', // Green for remaining
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
        cutout: '70%',
      },
    ],
  };

  const barData = {
    labels: ['Salary', 'Expenses', 'Remaining'],
    datasets: [
      {
        label: 'Amount',
        data: [displaySalary, expenses, remaining],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // Blue for salary
          'rgba(239, 68, 68, 0.8)', // Red for expenses
          'rgba(34, 197, 94, 0.8)', // Green for remaining
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(239, 68, 68)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const percent = displaySalary > 0 ? ((value / displaySalary) * 100).toFixed(1) : 0;
            return `${settings.currencySymbol}${value.toLocaleString()} (${percent}%)`;
          }
        }
      }
    },
  };

  const barOptions = {
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
            return settings.currencySymbol + (value / 1000).toFixed(0) + 'K';
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

  if (salary === 0 || showInput) {
    return (
      <div className="text-center py-4">
        <p className="text-muted mb-3">
          {salary === 0 ? 'Set your monthly salary to see the breakdown' : 'Update your monthly salary'}
        </p>
        <div className="row justify-content-center">
          <div className="col-8 col-md-6">
            <div className="input-group">
              <span className="input-group-text">{settings.currencySymbol}</span>
              <input
                type="number"
                className="form-control"
                placeholder="Monthly Salary"
                value={tempSalary}
                onChange={(e) => setTempSalary(e.target.value)}
              />
              <button className="btn btn-danger" onClick={saveSalary}>
                Save
              </button>
            </div>
          </div>
        </div>
        {showInput && (
          <button className="btn btn-link btn-sm mt-2" onClick={() => setShowInput(false)}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Chart Type Toggle */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-link btn-sm text-muted p-0"
          onClick={() => setShowInput(true)}
        >
          Salary: {settings.currencySymbol}{displaySalary.toLocaleString()} ✏️
        </button>
        <div className="btn-group btn-group-sm">
          <button
            className={`btn ${chartType === 'doughnut' ? 'btn-danger' : 'btn-outline-secondary'}`}
            onClick={() => setChartType('doughnut')}
          >
            Pie
          </button>
          <button
            className={`btn ${chartType === 'bar' ? 'btn-danger' : 'btn-outline-secondary'}`}
            onClick={() => setChartType('bar')}
          >
            Bar
          </button>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '200px', position: 'relative' }}>
        {chartType === 'doughnut' ? (
          <>
            <Doughnut data={doughnutData} options={doughnutOptions} />
            {/* Center text */}
            <div
              style={{
                position: 'absolute',
                top: '45%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div className="fs-5 fw-bold">{savingsPercent.toFixed(0)}%</div>
              <small className="text-muted">Saved</small>
            </div>
          </>
        ) : (
          <Bar data={barData} options={barOptions} />
        )}
      </div>

      {/* Summary Stats */}
      <div className="row g-2 mt-3 text-center">
        <div className="col-4">
          <div className="p-2 rounded bg-primary bg-opacity-10">
            <small className="text-muted d-block">Salary</small>
            <strong className="text-primary">{settings.currencySymbol}{(displaySalary / 1000).toFixed(0)}K</strong>
          </div>
        </div>
        <div className="col-4">
          <div className="p-2 rounded bg-danger bg-opacity-10">
            <small className="text-muted d-block">Spent</small>
            <strong className="text-danger">{settings.currencySymbol}{(expenses / 1000).toFixed(0)}K</strong>
          </div>
        </div>
        <div className="col-4">
          <div className="p-2 rounded bg-success bg-opacity-10">
            <small className="text-muted d-block">Remaining</small>
            <strong className="text-success">{settings.currencySymbol}{(remaining / 1000).toFixed(0)}K</strong>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="d-flex justify-content-between mb-1">
          <small>Monthly Budget Used</small>
          <small className={spentPercent > 80 ? 'text-danger' : spentPercent > 60 ? 'text-warning' : 'text-success'}>
            {spentPercent.toFixed(1)}%
          </small>
        </div>
        <div className="progress" style={{ height: '8px' }}>
          <div
            className={`progress-bar ${spentPercent > 80 ? 'bg-danger' : spentPercent > 60 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${spentPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
