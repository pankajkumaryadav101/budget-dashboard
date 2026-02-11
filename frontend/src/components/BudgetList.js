import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSettings } from "../contexts/SettingsContext";

const STORAGE_KEY = "budgets_v1";
const TRANSACTIONS_KEY = "transactions_v1";
const MONTHLY_EXPENSES_KEY = "monthly_expenses_v1";

// Available budget categories
const BUDGET_CATEGORIES = [
  { name: "Groceries", amount: 500 },
  { name: "Utilities", amount: 200 },
  { name: "Entertainment", amount: 150 },
  { name: "Dining Out", amount: 200 },
  { name: "Transportation", amount: 300 },
  { name: "Healthcare", amount: 100 },
  { name: "Shopping", amount: 200 },
  { name: "Subscriptions", amount: 50 },
  { name: "Rent", amount: 1500 },
  { name: "Gas/Fuel", amount: 150 },
];

export default function BudgetList({ onUpdate }) {
  const { settings, convertCurrency } = useSettings();
  const [budgets, setBudgets] = useState([]);
  const [spentByCategory, setSpentByCategory] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBudget, setNewBudget] = useState({ name: '', amount: '' });

  useEffect(() => {
    loadBudgets();
    calculateSpentFromTransactions();
  }, [settings.currency]); // Recalculate when currency changes

  const loadBudgets = () => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Remove duplicates by name and remove old 'spent' field
    const unique = stored
      .filter((b, index, self) => index === self.findIndex(t => t.name === b.name))
      .map(b => ({ id: b.id, name: b.name, amount: b.amount })); // Only keep id, name, amount

    if (unique.length !== stored.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    }
    setBudgets(unique);
  };

  const calculateSpentFromTransactions = () => {
    try {
      // Get transactions from both sources
      const transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      const monthlyExpenses = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || '[]');

      // Get current month/year
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Combine and filter for current month only
      const allExpenses = [...transactions, ...monthlyExpenses];
      const thisMonthExpenses = allExpenses.filter(tx => {
        if (!tx.date && !tx.createdAt) return false;
        const txDate = new Date(tx.date || tx.createdAt);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });

      // Calculate spent by category with currency conversion
      const categorySpent = {};
      thisMonthExpenses.forEach(tx => {
        const category = tx.category || 'Other';
        let amount = parseFloat(tx.amount) || 0;

        // Convert to current display currency if needed
        const txCurrency = tx.currency || 'USD';
        if (txCurrency !== settings.currency) {
          amount = convertCurrency(amount, txCurrency, settings.currency);
        }

        categorySpent[category] = (categorySpent[category] || 0) + amount;
      });

      setSpentByCategory(categorySpent);
    } catch (err) {
      console.error('Error calculating spent:', err);
      setSpentByCategory({});
    }
  };

  const addBudget = (budgetData) => {
    // Check if already exists
    if (budgets.find(b => b.name === budgetData.name)) {
      alert(`Budget "${budgetData.name}" already exists!`);
      return;
    }

    const newBud = {
      id: uuidv4(),
      name: budgetData.name,
      amount: parseFloat(budgetData.amount) || 0
      // Note: 'spent' is calculated dynamically from transactions, not stored
    };
    const next = [...budgets, newBud];
    setBudgets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (onUpdate) onUpdate();
  };

  const addCustomBudget = () => {
    if (!newBudget.name || !newBudget.amount) return;
    addBudget({
      name: newBudget.name,
      amount: parseFloat(newBudget.amount)
    });
    setNewBudget({ name: '', amount: '' });
    setShowAddForm(false);
  };

  const deleteBudget = (id) => {
    const next = budgets.filter(b => b.id !== id);
    setBudgets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (onUpdate) onUpdate();
  };

  const updateBudgetAmount = (id, newAmount) => {
    const next = budgets.map(b =>
      b.id === id ? { ...b, amount: parseFloat(newAmount) || 0 } : b
    );
    setBudgets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (onUpdate) onUpdate();
  };

  const getSpentForCategory = (categoryName) => {
    // Look for exact match or partial match
    const exactMatch = spentByCategory[categoryName];
    if (exactMatch !== undefined) return exactMatch;

    // Try to find partial matches (e.g., "Groceries" matches "Groceries - Walmart")
    let total = 0;
    Object.entries(spentByCategory).forEach(([cat, amount]) => {
      if (cat.toLowerCase().includes(categoryName.toLowerCase()) ||
          categoryName.toLowerCase().includes(cat.toLowerCase())) {
        total += amount;
      }
    });
    return total;
  };

  const getProgressClass = (spent, amount) => {
    const percent = (spent / amount) * 100;
    if (percent >= 90) return 'bg-danger';
    if (percent >= 70) return 'bg-warning';
    return 'bg-success';
  };

  // Available categories to add (those not already added)
  const availableCategories = BUDGET_CATEGORIES.filter(
    cat => !budgets.find(b => b.name === cat.name)
  );

  if (budgets.length === 0) {
    return (
      <div className="text-center py-4">
        <span style={{ fontSize: '32px' }}>📊</span>
        <p className="text-muted mb-3 mt-2">No budgets set. Create your first budget category.</p>

        <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
          {BUDGET_CATEGORIES.slice(0, 4).map(cat => (
            <button
              key={cat.name}
              onClick={() => addBudget(cat)}
              className="btn btn-outline-danger btn-sm"
            >
              + {cat.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-link btn-sm text-muted"
        >
          Or create custom budget...
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-column gap-3 mb-3">
        {budgets.map((b) => {
          // Get spent from actual transactions, not stored value
          const spent = getSpentForCategory(b.name);
          const amount = parseFloat(b.amount) || 1;
          const percent = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
          const remaining = amount - spent;

          return (
            <div key={b.id} className="p-3 rounded border">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>{b.name}</strong>
                <div className="d-flex align-items-center gap-2">
                  <span className={spent > amount ? 'text-danger' : percent >= 90 ? 'text-danger' : percent >= 70 ? 'text-warning' : 'text-success'}>
                    {spent > amount ? `${((spent / amount) * 100).toFixed(0)}%` : `${percent.toFixed(0)}%`}
                  </span>
                  <button
                    className="btn btn-link btn-sm text-danger p-0"
                    onClick={() => deleteBudget(b.id)}
                    title="Delete budget"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="progress mb-2" style={{ height: '8px' }}>
                <div
                  className={`progress-bar ${spent > amount ? 'bg-danger' : percent >= 90 ? 'bg-danger' : percent >= 70 ? 'bg-warning' : 'bg-success'}`}
                  role="progressbar"
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted">
                    Spent: <span className="fw-bold">{settings.currencySymbol}{spent.toLocaleString()}</span>
                  </small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted">Budget:</small>
                  <div className="input-group input-group-sm" style={{ width: '100px' }}>
                    <span className="input-group-text py-0">{settings.currencySymbol}</span>
                    <input
                      type="number"
                      className="form-control py-0"
                      value={amount}
                      onChange={(e) => updateBudgetAmount(b.id, e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-1">
                <small className={remaining >= 0 ? 'text-success' : 'text-danger'}>
                  {remaining >= 0
                    ? `${settings.currencySymbol}${remaining.toLocaleString()} left`
                    : `${settings.currencySymbol}${Math.abs(remaining).toLocaleString()} over budget!`
                  }
                </small>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Buttons */}
      {availableCategories.length > 0 && (
        <div className="mb-3">
          <small className="text-muted d-block mb-2">Quick add:</small>
          <div className="d-flex flex-wrap gap-2">
            {availableCategories.slice(0, 4).map(cat => (
              <button
                key={cat.name}
                onClick={() => addBudget(cat)}
                className="btn btn-outline-secondary btn-sm"
              >
                + {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Budget Form */}
      {showAddForm ? (
        <div className="p-3 border rounded bg-light">
          <div className="row g-2">
            <div className="col">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Category name"
                value={newBudget.name}
                onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
              />
            </div>
            <div className="col">
              <div className="input-group input-group-sm">
                <span className="input-group-text">{settings.currencySymbol}</span>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Budget"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="col-auto">
              <button onClick={addCustomBudget} className="btn btn-danger btn-sm">Add</button>
              <button onClick={() => setShowAddForm(false)} className="btn btn-link btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-outline-secondary btn-sm"
        >
          + Custom Budget
        </button>
      )}
    </div>
  );
}