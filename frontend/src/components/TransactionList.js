import React, { useEffect, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";

const STORAGE_KEY = "transactions_v1";

export default function TransactionList({ limit = 10, showFilters = false }) {
  const { settings, convertCurrency } = useSettings();
  const [txs, setTxs] = useState([]);
  const [filteredTxs, setFilteredTxs] = useState([]);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [txs, dateFilter, categoryFilter]);

  const loadTransactions = () => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Sort by date descending
    stored.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    setTxs(stored);
  };

  // Convert transaction amount to current currency
  const getDisplayAmount = (tx) => {
    const amount = parseFloat(tx.amount) || 0;
    const txCurrency = tx.currency || 'USD';

    if (txCurrency === settings.currency) {
      return amount;
    }

    // Convert from transaction currency to current display currency
    return convertCurrency(amount, txCurrency, settings.currency);
  };

  const applyFilters = () => {
    let filtered = [...txs];
    const now = new Date();

    // Date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter(t => {
        const txDate = new Date(t.date || t.createdAt);

        switch (dateFilter) {
          case 'today':
            return txDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return txDate >= weekAgo;
          case 'month':
            return txDate.getMonth() === now.getMonth() &&
                   txDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    setFilteredTxs(filtered);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const categories = [...new Set(txs.map(t => t.category).filter(Boolean))];
  const displayTxs = filteredTxs.slice(0, limit);
  const totalFiltered = filteredTxs.reduce((sum, t) => sum + getDisplayAmount(t), 0);

  if (txs.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        <span style={{ fontSize: '32px' }}>📝</span>
        <p className="mt-2">No transactions yet. Add your first transaction above.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      {showFilters && (
        <div className="row g-2 mb-3">
          <div className="col-6">
            <select
              className="form-select form-select-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="col-6">
            <select
              className="form-select form-select-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Summary */}
      {showFilters && (
        <div className="d-flex justify-content-between align-items-center mb-2 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
          <small className="text-muted">{filteredTxs.length} transactions</small>
          <strong className="text-danger">{settings.currencySymbol}{totalFiltered.toLocaleString()}</strong>
        </div>
      )}

      {/* Transaction List */}
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th className="text-end">Amount</th>
            </tr>
          </thead>
          <tbody>
            {displayTxs.map((t) => {
              const displayAmount = getDisplayAmount(t);
              const wasConverted = t.currency && t.currency !== settings.currency;

              return (
                <tr key={t.id}>
                  <td className="text-muted small">{formatDate(t.date || t.createdAt)}</td>
                  <td>
                    <span className="badge bg-secondary">{t.category || 'Other'}</span>
                  </td>
                  <td className="text-truncate" style={{ maxWidth: '150px' }}>{t.description || '—'}</td>
                  <td className="text-end">
                    <span className="fw-bold text-danger">{settings.currencySymbol}{displayAmount.toLocaleString()}</span>
                    {wasConverted && (
                      <small className="text-muted d-block" style={{ fontSize: '10px' }}>
                        (was {t.currency} {t.amount})
                      </small>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredTxs.length > limit && (
        <div className="text-center py-2">
          <small className="text-muted">Showing {limit} of {filteredTxs.length} transactions</small>
        </div>
      )}
    </div>
  );
}