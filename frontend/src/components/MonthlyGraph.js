import React, { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useSettings } from '../contexts/SettingsContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MONTHLY_EXPENSES_KEY = 'monthly_expenses_v1';
const SALARY_KEY = 'user_salary_v1';

const MonthlyGraph = () => {
  const { settings, convertCurrency } = useSettings();
  const [chartType, setChartType] = useState('line');
  const [monthlyExpenses, setMonthlyExpenses] = useState(Array(12).fill(0));
  const [monthlyBudget, setMonthlyBudget] = useState(Array(12).fill(0));

  useEffect(() => {
    loadLocalData();
  }, [settings.currency]); // Reload when currency changes

  const loadLocalData = () => {
    try {
      // Load expenses from localStorage
      const expenses = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || '[]');

      // Load salary with currency info
      const storedSalaryData = localStorage.getItem(SALARY_KEY);
      let salary = 0;
      let salaryCurrency = 'USD';

      if (storedSalaryData) {
        try {
          const salaryData = JSON.parse(storedSalaryData);
          if (typeof salaryData === 'object' && salaryData.amount) {
            salary = parseFloat(salaryData.amount) || 0;
            salaryCurrency = salaryData.currency || 'USD';
          } else {
            salary = parseFloat(storedSalaryData) || 0;
          }
        } catch {
          salary = parseFloat(storedSalaryData) || 0;
        }
      }

      // Convert salary to display currency if needed
      if (salaryCurrency !== settings.currency) {
        salary = convertCurrency(salary, salaryCurrency, settings.currency);
      }

      // Group expenses by month with currency conversion
      const currentYear = new Date().getFullYear();
      const expensesByMonth = Array(12).fill(0);

      expenses.forEach(expense => {
        if (expense.date) {
          const date = new Date(expense.date);
          if (date.getFullYear() === currentYear) {
            const month = date.getMonth();
            let amount = parseFloat(expense.amount) || 0;

            // Convert to display currency if needed
            const expCurrency = expense.currency || 'USD';
            if (expCurrency !== settings.currency) {
              amount = convertCurrency(amount, expCurrency, settings.currency);
            }

            expensesByMonth[month] += amount;
          }
        }
      });

      setMonthlyExpenses(expensesByMonth);

      // Set budget as monthly salary for each month
      if (salary > 0) {
        setMonthlyBudget(Array(12).fill(salary));
      }
    } catch (err) {
      console.error('Error loading local data:', err);
    }
  };

  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        label: "Expenses",
        data: monthlyExpenses,
        borderColor: "#e53935",
        backgroundColor: chartType === 'bar' ? 'rgba(229, 57, 53, 0.8)' : 'rgba(229, 57, 53, 0.2)',
        tension: 0.4,
        fill: chartType === 'line',
        pointRadius: 4,
        pointBackgroundColor: "#e53935",
      },
      {
        label: "Budget",
        data: monthlyBudget,
        borderColor: "#4caf50",
        backgroundColor: chartType === 'bar' ? 'rgba(76, 175, 80, 0.8)' : 'rgba(76, 175, 80, 0.2)',
        tension: 0.4,
        fill: false,
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: "#4caf50",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 15,
        }
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (val) {
            return settings.currencySymbol + val.toLocaleString();
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
      <div className="d-flex justify-content-end mb-2">
        <div className="btn-group btn-group-sm" role="group">
          <input
            type="radio"
            className="btn-check"
            name="chartType"
            id="typeLine"
            checked={chartType==='line'}
            onChange={() => setChartType('line')}
          />
          <label className={`btn ${chartType === 'line' ? 'btn-danger' : 'btn-outline-secondary'}`} htmlFor="typeLine">
            Line
          </label>

          <input
            type="radio"
            className="btn-check"
            name="chartType"
            id="typeBar"
            checked={chartType==='bar'}
            onChange={() => setChartType('bar')}
          />
          <label className={`btn ${chartType === 'bar' ? 'btn-danger' : 'btn-outline-secondary'}`} htmlFor="typeBar">
            Bar
          </label>
        </div>
      </div>

      <div style={{ height: '220px' }}>
        {chartType === 'line' ? <Line data={data} options={options} /> : <Bar data={data} options={options} />}
      </div>
    </div>
  );
};

export default MonthlyGraph;
