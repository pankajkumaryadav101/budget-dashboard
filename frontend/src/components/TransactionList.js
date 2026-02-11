import React, { useEffect, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";

const STORAGE_KEY = "transactions_v1";
const MONTHLY_EXPENSES_KEY = "monthly_expenses_v1";

const CATEGORY_OPTIONS = [
  'Rent', 'Utilities', 'Car Insurance', 'Car EMI', 'Phone Bills', 'Internet Bill',
  'Groceries', 'Health', 'Child Education', 'Entertainment', 'Shopping', 'Travel',
  'Dining Out', 'Gas/Fuel', 'Gym', 'Subscriptions', 'Salary', 'Bonus', 'Investment', 'Other'
];

export default function TransactionList({ limit = 10, showFilters = false, refreshTrigger = 0, onUpdate, showAll = false }) {
  const { settings, convertCurrency } = useSettings();
  const [txs, setTxs] = useState([]);
  const [filteredTxs, setFilteredTxs] = useState([]);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingTx, setEditingTx] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(limit);
  const [viewMode, setViewMode] = useState(showAll ? 'all' : 'paginated'); // 'paginated' or 'all'
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    loadTransactions();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  useEffect(() => {
    applyFilters();
  }, [txs, dateFilter, categoryFilter, sortField, sortDir]);

  const loadTransactions = () => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Sort by date descending
    stored.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    setTxs(stored);
  };

  const deleteTransaction = (id) => {
    // Remove from transactions_v1
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = stored.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also remove from monthly_expenses_v1 if exists
    const monthlyExpenses = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || "[]");
    const updatedMonthly = monthlyExpenses.filter(t => t.id !== id);
    localStorage.setItem(MONTHLY_EXPENSES_KEY, JSON.stringify(updatedMonthly));

    // Update local state and close modal
    setShowDeleteConfirm(null);

    // Reload transactions to refresh the list
    loadTransactions();

    // Notify parent to refresh dashboard
    if (onUpdate) onUpdate();
  };

  const updateTransaction = (updatedTx) => {
    // Update in transactions_v1
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = stored.map(t => t.id === updatedTx.id ? { ...t, ...updatedTx } : t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also update in monthly_expenses_v1 if exists
    const monthlyExpenses = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || "[]");
    const updatedMonthly = monthlyExpenses.map(t => t.id === updatedTx.id ? { ...t, ...updatedTx } : t);
    localStorage.setItem(MONTHLY_EXPENSES_KEY, JSON.stringify(updatedMonthly));

    // Close modal
    setEditingTx(null);

    // Reload transactions to refresh the list
    loadTransactions();

    // Notify parent to refresh dashboard
    if (onUpdate) onUpdate();
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

    // Sort
    filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'amount') {
        return (getDisplayAmount(a) - getDisplayAmount(b)) * dir;
      }
      if (sortField === 'category') {
        return ((a.category || '')).localeCompare(b.category || '') * dir;
      }
      // default date
      return (new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)) * dir;
    });

    setFilteredTxs(filtered);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';

    // Parse date string properly to avoid timezone issues
    // If it's a YYYY-MM-DD format, parse as local date (not UTC)
    let date;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Parse as local date by adding time component
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return '—';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today - txDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7 && diffDays > 0) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const categories = [...new Set(txs.map(t => t.category).filter(Boolean))];

  // Calculate pagination
  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const displayTxs = viewMode === 'all'
    ? filteredTxs
    : filteredTxs.slice(startIndex, endIndex);

  // Always calculate total from ALL filtered transactions (for accurate analysis)
  const totalFiltered = filteredTxs.reduce((sum, t) => sum + getDisplayAmount(t), 0);

  if (txs.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        <span style={{ fontSize: '32px' }}>📝</span>
        <p className="mt-2">No transactions yet. Add your first transaction above.</p>
      </div>
    );
  }

  const renderSortIcon = (field) => {
    if (sortField !== field) return '⇅';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Filters */}
      {showFilters && (
        <div className="row g-2 mb-3">
          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-sm"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-sm"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-sm"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <div className="btn-group btn-group-sm w-100">
              <button
                className={`btn ${viewMode === 'paginated' ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('paginated')}
              >
                Pages
              </button>
              <button
                className={`btn ${viewMode === 'all' ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('all')}
              >
                All
              </button>
            </div>
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

      {/* Transaction List - Scrollable when showing all */}
      <div
        className="table-responsive"
        style={viewMode === 'all' && filteredTxs.length > 10 ? { maxHeight: '400px', overflowY: 'auto' } : {}}
      >
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th role="button" onClick={() => handleSort('date')}>Date {renderSortIcon('date')}</th>
              <th role="button" onClick={() => handleSort('category')}>Category {renderSortIcon('category')}</th>
              <th>Description</th>
              <th className="text-end" role="button" onClick={() => handleSort('amount')}>Amount {renderSortIcon('amount')}</th>
              <th className="text-center">Type</th>
              <th className="text-center">Actions</th>
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
                  <td className="text-center">
                    <span className={`badge rounded-pill ${t.type === 'income' ? 'bg-success' : 'bg-danger'}`}>
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-link btn-sm p-0 me-2 text-primary"
                      onClick={() => setEditingTx(t)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-link btn-sm p-0 text-danger"
                      onClick={() => setShowDeleteConfirm(t.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {viewMode === 'paginated' && totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center py-2 border-top mt-2">
          <small className="text-muted">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredTxs.length)} of {filteredTxs.length}
          </small>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  «
                </button>
              </li>
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
              </li>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}

              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
              </li>
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Show count when viewing all */}
      {viewMode === 'all' && (
        <div className="text-center py-2 border-top mt-2">
          <small className="text-muted">Showing all {filteredTxs.length} transactions</small>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title">Delete Transaction?</h6>
                <button type="button" className="btn-close btn-sm" onClick={() => setShowDeleteConfirm(null)}></button>
              </div>
              <div className="modal-body py-3">
                <p className="mb-0 small">Are you sure you want to delete this transaction? This cannot be undone.</p>
              </div>
              <div className="modal-footer py-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteTransaction(showDeleteConfirm)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title">Edit Transaction</h6>
                <button type="button" className="btn-close btn-sm" onClick={() => setEditingTx(null)}></button>
              </div>
              <div className="modal-body">
                <EditTransactionForm
                  transaction={editingTx}
                  onSave={updateTransaction}
                  onCancel={() => setEditingTx(null)}
                  currencySymbol={settings.currencySymbol}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Transaction Form Component
function EditTransactionForm({ transaction, onSave, onCancel, currencySymbol }) {
  const [formData, setFormData] = useState({
    date: transaction.date || transaction.transactionDate || new Date().toISOString().split('T')[0],
    amount: transaction.amount || '',
    category: transaction.category || '',
    description: transaction.description || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...transaction,
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label small">Date</label>
        <input
          type="date"
          className="form-control form-control-sm"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label small">Amount</label>
        <div className="input-group input-group-sm">
          <span className="input-group-text">{currencySymbol}</span>
          <input
            type="number"
            className="form-control"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label small">Category</label>
        <select
          className="form-select form-select-sm"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">Select...</option>
          {CATEGORY_OPTIONS.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label small">Description</label>
        <input
          type="text"
          className="form-control form-control-sm"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional note"
        />
      </div>
      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-danger btn-sm">Save Changes</button>
      </div>
    </form>
  );
}