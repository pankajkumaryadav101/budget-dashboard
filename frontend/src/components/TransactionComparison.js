import React, { useState, useEffect } from 'react';
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

const STORAGE_KEY = 'transactions_v1';

export default function TransactionComparison() {
  const { settings, convertCurrency } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [comparisonMode, setComparisonMode] = useState('month'); // 'day', 'week', 'month', 'year'
  const [selectedPeriod1, setSelectedPeriod1] = useState('');
  const [selectedPeriod2, setSelectedPeriod2] = useState('');
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, [settings.currency]); // Reload when currency changes

  useEffect(() => {
    if (transactions.length > 0) {
      setDefaultPeriods();
    }
  }, [transactions, comparisonMode]);

  useEffect(() => {
    if (selectedPeriod1 && selectedPeriod2) {
      calculateComparison();
    }
  }, [selectedPeriod1, selectedPeriod2, transactions, settings.currency]);

  const loadTransactions = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setTransactions(stored);
    } catch (e) {
      setTransactions([]);
    }
  };

  // Helper to get converted amount
  const getConvertedAmount = (tx) => {
    let amount = parseFloat(tx.amount) || 0;
    const txCurrency = tx.currency || 'USD';
    if (txCurrency !== settings.currency) {
      amount = convertCurrency(amount, txCurrency, settings.currency);
    }
    return amount;
  };

  const setDefaultPeriods = () => {
    const now = new Date();

    switch (comparisonMode) {
      case 'day':
        setSelectedPeriod1(now.toISOString().split('T')[0]);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        setSelectedPeriod2(yesterday.toISOString().split('T')[0]);
        break;
      case 'week':
        // Current week number
        const currentWeek = getWeekNumber(now);
        const lastWeek = currentWeek - 1;
        setSelectedPeriod1(`${now.getFullYear()}-W${String(currentWeek).padStart(2, '0')}`);
        setSelectedPeriod2(`${now.getFullYear()}-W${String(lastWeek).padStart(2, '0')}`);
        break;
      case 'month':
        setSelectedPeriod1(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        setSelectedPeriod2(`${lastMonthYear}-${String(lastMonth).padStart(2, '0')}`);
        break;
      case 'year':
        setSelectedPeriod1(now.getFullYear().toString());
        setSelectedPeriod2((now.getFullYear() - 1).toString());
        break;
    }
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Parse date string properly to avoid timezone issues
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  };

  const filterTransactionsByPeriod = (period) => {
    return transactions.filter(tx => {
      if (!tx.date) return false;
      const txDate = parseLocalDate(tx.date);
      if (!txDate || isNaN(txDate.getTime())) return false;

      switch (comparisonMode) {
        case 'day':
          // Compare as YYYY-MM-DD strings
          const txDateStr = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
          return txDateStr === period;
        case 'week':
          const [year, weekStr] = period.split('-W');
          const weekNum = parseInt(weekStr);
          const txWeek = getWeekNumber(txDate);
          return txDate.getFullYear() === parseInt(year) && txWeek === weekNum;
        case 'month':
          const [monthYear, month] = period.split('-');
          return txDate.getFullYear() === parseInt(monthYear) &&
                 (txDate.getMonth() + 1) === parseInt(month);
        case 'year':
          return txDate.getFullYear() === parseInt(period);
        default:
          return false;
      }
    });
  };

  const calculateComparison = () => {
    const period1Txs = filterTransactionsByPeriod(selectedPeriod1);
    const period2Txs = filterTransactionsByPeriod(selectedPeriod2);

    // Calculate totals with currency conversion
    const period1Total = period1Txs.reduce((sum, tx) => sum + getConvertedAmount(tx), 0);
    const period2Total = period2Txs.reduce((sum, tx) => sum + getConvertedAmount(tx), 0);

    // Calculate by category with currency conversion
    const categories = [...new Set([
      ...period1Txs.map(tx => tx.category),
      ...period2Txs.map(tx => tx.category)
    ])].filter(Boolean);

    const categoryData = categories.map(cat => ({
      category: cat,
      period1: period1Txs.filter(tx => tx.category === cat).reduce((sum, tx) => sum + getConvertedAmount(tx), 0),
      period2: period2Txs.filter(tx => tx.category === cat).reduce((sum, tx) => sum + getConvertedAmount(tx), 0)
    })).sort((a, b) => (b.period1 + b.period2) - (a.period1 + a.period2));

    const difference = period1Total - period2Total;
    const percentChange = period2Total > 0 ? ((difference / period2Total) * 100).toFixed(1) : 0;

    setComparisonData({
      period1Total,
      period2Total,
      difference,
      percentChange,
      period1Count: period1Txs.length,
      period2Count: period2Txs.length,
      categoryData: categoryData.slice(0, 6) // Top 6 categories
    });
  };

  const formatPeriodLabel = (period) => {
    if (!period) return '';

    switch (comparisonMode) {
      case 'day':
        return new Date(period).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      case 'week':
        const [year, week] = period.split('-W');
        return `Week ${week}, ${year}`;
      case 'month':
        const [y, m] = period.split('-');
        return new Date(y, parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'year':
        return period;
      default:
        return period;
    }
  };

  const chartData = comparisonData ? {
    labels: comparisonData.categoryData.map(d => d.category),
    datasets: [
      {
        label: formatPeriodLabel(selectedPeriod1),
        data: comparisonData.categoryData.map(d => d.period1),
        backgroundColor: 'rgba(229, 57, 53, 0.8)',
        borderColor: 'rgb(229, 57, 53)',
        borderWidth: 1,
      },
      {
        label: formatPeriodLabel(selectedPeriod2),
        data: comparisonData.categoryData.map(d => d.period2),
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${settings.currencySymbol}${context.raw.toLocaleString()}`;
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
        }
      }
    }
  };

  const renderPeriodSelector = (value, onChange, label) => {
    switch (comparisonMode) {
      case 'day':
        return (
          <div>
            <label className="form-label small text-muted">{label}</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        );
      case 'week':
        return (
          <div>
            <label className="form-label small text-muted">{label}</label>
            <input
              type="week"
              className="form-control form-control-sm"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        );
      case 'month':
        return (
          <div>
            <label className="form-label small text-muted">{label}</label>
            <input
              type="month"
              className="form-control form-control-sm"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        );
      case 'year':
        const years = [];
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= currentYear - 5; y--) {
          years.push(y);
        }
        return (
          <div>
            <label className="form-label small text-muted">{label}</label>
            <select
              className="form-select form-select-sm"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        );
    }
  };

  return (
    <div>
      {/* Comparison Mode Toggle */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="btn-group btn-group-sm">
          {['day', 'week', 'month', 'year'].map(mode => (
            <button
              key={mode}
              type="button"
              className={`btn ${comparisonMode === mode ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => setComparisonMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Period Selectors */}
      <div className="row g-3 mb-4">
        <div className="col-md-5">
          {renderPeriodSelector(selectedPeriod1, setSelectedPeriod1, 'Compare This')}
        </div>
        <div className="col-md-2 d-flex align-items-end justify-content-center">
          <span className="text-muted pb-2">vs</span>
        </div>
        <div className="col-md-5">
          {renderPeriodSelector(selectedPeriod2, setSelectedPeriod2, 'With This')}
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <>
          {/* Summary Cards */}
          <div className="row g-3 mb-4">
            <div className="col-4">
              <div className="p-3 rounded text-center h-100 d-flex flex-column justify-content-center" style={{ background: 'rgba(229, 57, 53, 0.1)' }}>
                <small className="text-muted d-block">{formatPeriodLabel(selectedPeriod1)}</small>
                <strong className="fs-5 text-danger">{settings.currencySymbol}{comparisonData.period1Total.toLocaleString()}</strong>
                <small className="text-muted d-block">{comparisonData.period1Count} transactions</small>
              </div>
            </div>
            <div className="col-4">
              <div className="p-3 rounded text-center h-100 d-flex flex-column justify-content-center" style={{ background: 'var(--bg-secondary)' }}>
                <small className="text-muted d-block">{formatPeriodLabel(selectedPeriod2)}</small>
                <strong className="fs-5">{settings.currencySymbol}{comparisonData.period2Total.toLocaleString()}</strong>
                <small className="text-muted d-block">{comparisonData.period2Count} transactions</small>
              </div>
            </div>
            <div className="col-4">
              <div className="p-3 rounded text-center h-100 d-flex flex-column justify-content-center" style={{ background: comparisonData.difference > 0 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)' }}>
                <small className="text-muted d-block">Difference</small>
                <strong className={`fs-5 ${comparisonData.difference > 0 ? 'text-danger' : 'text-success'}`}>
                  {comparisonData.difference > 0 ? '+' : ''}{settings.currencySymbol}{comparisonData.difference.toLocaleString()}
                </strong>
                <small className={comparisonData.difference > 0 ? 'text-danger' : 'text-success'}>
                  {comparisonData.difference > 0 ? '↑' : '↓'} {Math.abs(comparisonData.percentChange)}%
                </small>
              </div>
            </div>
          </div>

          {/* Category Comparison Chart */}
          {comparisonData.categoryData.length > 0 ? (
            <div style={{ height: '250px' }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <p>No transactions found for the selected periods</p>
            </div>
          )}

          {/* Insights */}
          <div className="mt-4 p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
            <h6 className="mb-2">💡 Insights</h6>
            {comparisonData.difference === 0 ? (
              <p className="mb-0 small text-muted">Spending is the same for both periods.</p>
            ) : comparisonData.difference > 0 ? (
              <p className="mb-0 small">
                You spent <span className="text-danger fw-bold">{settings.currencySymbol}{Math.abs(comparisonData.difference).toLocaleString()}</span> more
                in {formatPeriodLabel(selectedPeriod1)} compared to {formatPeriodLabel(selectedPeriod2)}.
                {comparisonData.categoryData[0] && (
                  <> Top spending category: <strong>{comparisonData.categoryData[0].category}</strong>.</>
                )}
              </p>
            ) : (
              <p className="mb-0 small">
                Great! You saved <span className="text-success fw-bold">{settings.currencySymbol}{Math.abs(comparisonData.difference).toLocaleString()}</span> in {formatPeriodLabel(selectedPeriod1)} compared to {formatPeriodLabel(selectedPeriod2)}! 🎉
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
