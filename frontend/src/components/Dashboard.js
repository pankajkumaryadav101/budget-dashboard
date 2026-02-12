import React, { useState, useEffect } from "react";
import TransactionList from "./TransactionList";
import AddTransaction from "./AddTransaction";
import CurrencyRatesTable from "./CurrencyRatesTable";
import MonthlyGraph from "./MonthlyGraph";
import AddMonthlyExpense from "./AddMonthlyExpense";
import BudgetAnalyzer from "./BudgetAnalyzer";
import AssetList from "./AssetList";
import AddAssetForm from "./AddAssetForm";
import ReminderToast from "./ReminderToast";
import BudgetForm from "./BudgetForm";
import RecurringReminders from "./RecurringReminders";
import TaxReminders from "./TaxReminders";
import ExpenseComparisonChart from "./ExpenseComparisonChart";
import SalaryExpenseChart from "./SalaryExpenseChart";
import TransactionComparison from "./TransactionComparison";
import DataBackup from "./DataBackup";
import SavingsGoals from "./SavingsGoals";
import NotificationCenter from "./NotificationCenter";
import ReportGenerator from "./ReportGenerator";
import MultiCurrencyPortfolio from "./MultiCurrencyPortfolio";
import DocumentStorage from "./DocumentStorage";
import FamilyMode from "./FamilyMode";
import InvestmentTracker from "./InvestmentTracker";
import ThemeScheduler from "./ThemeScheduler";
import { useTranslation } from "react-i18next";
import { useSettings } from "../contexts/SettingsContext";
import { getDashboardSummary } from "../api/api";

// Storage keys for syncing data
const TRANSACTIONS_KEY = "transactions_v1";
const BUDGETS_KEY = "budgets_v1";
const MONTHLY_EXPENSES_KEY = "monthly_expenses_v1";
const RECURRING_KEY = "recurring_reminders_v1";

export default function Dashboard() {
  const { t } = useTranslation();
  const { settings, formatCurrency, getCurrentMonthLabel, getShortMonthLabel, convertCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [editAsset, setEditAsset] = useState(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Current month label
  const currentMonth = getCurrentMonthLabel();
  const shortMonth = getShortMonthLabel();

  // Synced local data
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadLocalData();
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      const data = await getDashboardSummary();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  };

  const loadLocalData = () => {
    try {
      // Load transactions and dedupe by ID
      const storedTxs = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      const seenTxIds = new Set();
      const uniqueTxs = storedTxs.filter(t => {
        if (!t.id) return true; // Keep items without ID
        if (seenTxIds.has(t.id)) return false;
        seenTxIds.add(t.id);
        return true;
      });
      if (uniqueTxs.length !== storedTxs.length) {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(uniqueTxs));
      }
      setTransactions(uniqueTxs);

      // Load monthly expenses and dedupe
      const storedMonthly = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || '[]');
      const seenMonthlyIds = new Set();
      const uniqueMonthly = storedMonthly.filter(t => {
        if (!t.id) return true;
        if (seenMonthlyIds.has(t.id)) return false;
        seenMonthlyIds.add(t.id);
        return true;
      });
      if (uniqueMonthly.length !== storedMonthly.length) {
        localStorage.setItem(MONTHLY_EXPENSES_KEY, JSON.stringify(uniqueMonthly));
      }
      setMonthlyExpenses(uniqueMonthly);

      // Load budgets and remove duplicates
      const storedBudgets = JSON.parse(localStorage.getItem(BUDGETS_KEY) || '[]');
      const uniqueBudgets = storedBudgets.filter((b, index, self) =>
        index === self.findIndex(t => t.name === b.name)
      );
      if (uniqueBudgets.length !== storedBudgets.length) {
        localStorage.setItem(BUDGETS_KEY, JSON.stringify(uniqueBudgets));
      }
      setBudgets(uniqueBudgets);

      setRecurringItems(JSON.parse(localStorage.getItem(RECURRING_KEY) || '[]'));
    } catch (err) {
      console.error('Failed to load local data:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAssetSave = () => {
    setShowAddAsset(false);
    setEditAsset(null);
    handleRefresh();
  };

  const handleEditAsset = (asset) => {
    setEditAsset(asset);
    setShowAddAsset(true);
  };

  // Normalize and dedupe expense items across different localStorage sources for a specific month
  const getExpenseItemsForMonth = (month, year) => {
    // Only treat rows as expenses if:
    // - explicit type is EXPENSE, OR
    // - record came from monthly_expenses storage (legacy), OR
    // - transactionType is EXPENSE
    const isExpense = (row, source) => {
      if (row?.type) return String(row.type).toUpperCase() === 'EXPENSE';
      if (row?.transactionType) return String(row.transactionType).toUpperCase() === 'EXPENSE';
      if (source === 'monthly') return true;
      // Default: if no type specified, treat as expense (legacy data)
      return true;
    };

    // Parse date properly to avoid timezone issues
    const parseLocalDate = (dateStr) => {
      if (!dateStr) return null;
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      return new Date(dateStr);
    };

    const inTargetMonth = (row) => {
      const rawDate = row?.date || row?.transactionDate || row?.createdAt;
      if (!rawDate) return false;
      const d = parseLocalDate(rawDate);
      if (!d || isNaN(d.getTime())) return false;
      return d.getMonth() === month && d.getFullYear() === year;
    };

    const normalize = (row, source) => {
      const rawDate = row?.date || row?.transactionDate || row?.createdAt;
      const d = parseLocalDate(rawDate);
      const dateIso = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
      const amount = parseFloat(row?.amount) || 0;
      const category = row?.category || 'Other';
      const description = row?.description || row?.name || '';
      const currency = row?.currency || 'USD';
      const id = row?.id || '';

      return {
        id,
        dateIso,
        amount,
        category,
        description,
        currency,
        source,
        raw: row,
      };
    };

    // Build list from sources - filter for target month and expenses only
    const txRows = (transactions || []).filter(r => inTargetMonth(r) && isExpense(r, 'tx'));
    const monthlyRows = (monthlyExpenses || []).filter(r => inTargetMonth(r) && isExpense(r, 'monthly'));

    // Convert to normalized rows
    const normalized = [
      ...txRows.map(r => normalize(r, 'tx')),
      ...monthlyRows.map(r => normalize(r, 'monthly')),
    ];

    // Dedupe by ID first, then by fingerprint as fallback
    const seenIds = new Set();
    const seenFingerprints = new Set();
    const deduped = [];

    for (const r of normalized) {
      // If we have an ID, use it for deduplication
      if (r.id && seenIds.has(r.id)) continue;
      if (r.id) seenIds.add(r.id);

      // Also dedupe by fingerprint (amount + date + category) for items without matching IDs
      const fingerprint = `${r.dateIso}__${r.category}__${r.amount}`;
      if (seenFingerprints.has(fingerprint)) continue;
      seenFingerprints.add(fingerprint);

      deduped.push(r);
    }

    return deduped;
  };

  // Get current month expense items (convenience wrapper)
  const getThisMonthExpenseItems = () => {
    const now = new Date();
    return getExpenseItemsForMonth(now.getMonth(), now.getFullYear());
  };

  // Calculate spent for each category from transactions (expenses only)
  const getSpentByCategory = () => {
    const items = getThisMonthExpenseItems();

    const categorySpent = {};
    items.forEach(item => {
      let amount = item.amount;
      if (item.currency !== settings.currency) {
        amount = convertCurrency(amount, item.currency, settings.currency);
      }
      categorySpent[item.category] = (categorySpent[item.category] || 0) + amount;
    });

    return categorySpent;
  };

  const getSpentForBudgetCategory = (categoryName, categorySpent) => {
    // Exact match
    if (categorySpent[categoryName] !== undefined) return categorySpent[categoryName];

    // Partial match (e.g., "Groceries" matches "Groceries - Walmart")
    let total = 0;
    Object.entries(categorySpent).forEach(([cat, amount]) => {
      if (cat.toLowerCase().includes(categoryName.toLowerCase()) ||
          categoryName.toLowerCase().includes(cat.toLowerCase())) {
        total += amount;
      }
    });
    return total;
  };

  // Calculate summary data from local storage with currency conversion
  const calculateSummary = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Sum expenses for a specific month
    const sumExpensesForMonth = (month, year) => {
      const items = getExpenseItemsForMonth(month, year);
      return items.reduce((sum, i) => {
        let amount = i.amount;
        if (i.currency !== settings.currency) {
          amount = convertCurrency(amount, i.currency, settings.currency);
        }
        return sum + amount;
      }, 0);
    };

    const thisMonthExpenses = sumExpensesForMonth(currentMonth, currentYear);
    const lastMonthExpenses = sumExpensesForMonth(lastMonth, lastMonthYear);

    // Get budget total from budget categories
    const totalBudget = budgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

    // Load user's set budget amount (separate from categories)
    let userBudget = 0;
    try {
      const budgetData = localStorage.getItem('user_budget_v1');
      if (budgetData) {
        userBudget = parseFloat(budgetData) || 0;
      }
    } catch (_) {
      userBudget = 0;
    }

    // Load monthly salary (income)
    let monthlyIncome = 0;
    try {
      const salaryData = localStorage.getItem('user_salary_v1');
      if (salaryData) {
        const parsed = JSON.parse(salaryData);
        if (typeof parsed === 'object' && parsed.amount) {
          monthlyIncome = parseFloat(parsed.amount) || 0;
          const salCurrency = parsed.currency || 'USD';
          if (salCurrency !== settings.currency) {
            monthlyIncome = convertCurrency(monthlyIncome, salCurrency, settings.currency);
          }
        } else {
          monthlyIncome = parseFloat(salaryData) || 0;
        }
      }
    } catch (_) {
      monthlyIncome = 0;
    }

    // Budget Left = User Budget OR Budget Categories Total - Expenses
    // Priority: userBudget > totalBudget (categories) > monthlyIncome (salary)
    let effectiveBudget = 0;
    if (userBudget > 0) {
      effectiveBudget = userBudget;
    } else if (totalBudget > 0) {
      effectiveBudget = totalBudget;
    } else {
      effectiveBudget = monthlyIncome;
    }

    const budgetRemaining = effectiveBudget - thisMonthExpenses;

    // Monthly Balance = Salary - Expenses (this uses salary)
    const monthlyBalance = monthlyIncome - thisMonthExpenses;

    // Calculate net worth from local assets
    let netWorth = 0;
    try {
      const assets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
      netWorth = assets.reduce((sum, asset) => {
        let value = parseFloat(asset.currentMarketPrice || asset.purchasePrice) || 0;
        const assetCurrency = asset.currency || 'USD';
        if (assetCurrency !== settings.currency) {
          value = convertCurrency(value, assetCurrency, settings.currency);
        }
        return sum + value;
      }, 0);
    } catch (_) {
      netWorth = 0;
    }

    // Debug log to help troubleshoot
    console.log('Budget Calculation:', {
      userBudget,
      totalBudget,
      monthlyIncome,
      effectiveBudget,
      thisMonthExpenses,
      budgetRemaining,
      expectedRemaining: effectiveBudget - thisMonthExpenses,
      budgetCategories: budgets.map(b => ({ name: b.name, amount: b.amount }))
    });

    return {
      thisMonthExpenses,
      lastMonthExpenses,
      expenseChange: lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1) : 0,
      totalBudget: effectiveBudget,
      totalSpent: thisMonthExpenses,
      budgetRemaining,
      monthlyIncome,
      monthlyBalance,
      netWorth,
    };
  };

  const summary = calculateSummary();

  return (
    <div className="container-fluid py-4">
      <ReminderToast />

      {/* Tab Navigation */}
      <ul className="nav nav-pills mb-4 gap-2 flex-wrap">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'overview' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'assets' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            💎 Assets
            {dashboardData?.staleAssetsCount > 0 && (
              <span className="badge bg-warning text-dark ms-2">{dashboardData.staleAssetsCount}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'budget' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('budget')}
          >
            💰 Budget
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'reminders' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('reminders')}
          >
            🔔 Reminders
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'analytics' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'goals' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            🎯 Goals
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'investments' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('investments')}
          >
            📈 Invest
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'documents' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            📎 Docs
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'settings' ? 'active bg-danger' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </li>
      </ul>

      {/* ============ OVERVIEW TAB (READ-ONLY) ============ */}
      {activeTab === 'overview' && (
        <div>
          {/* Current Month Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-muted mb-0">📅 {currentMonth}</h5>
            <small className="text-muted">All data shown for current month</small>
          </div>

          {/* Quick Stats Row */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card h-100 text-center p-3">
                <small className="text-muted">Net Worth</small>
                <h4 className="text-danger mb-0">{settings.currencySymbol}{(summary.netWorth || 0).toLocaleString()}</h4>
                {summary.netWorth === 0 && (
                  <small className="text-muted">Add assets</small>
                )}
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100 text-center p-3">
                <small className="text-muted">{shortMonth} Expenses</small>
                <h4 className="text-danger mb-0">{settings.currencySymbol}{summary.thisMonthExpenses.toLocaleString()}</h4>
                <small className={summary.expenseChange > 0 ? 'text-danger' : 'text-success'}>
                  {summary.expenseChange > 0 ? '↑' : '↓'} {Math.abs(summary.expenseChange)}% vs last month
                </small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100 text-center p-3">
                <small className="text-muted">
                  {summary.totalBudget > 0 ? `${shortMonth} Budget Left` : `${shortMonth} Remaining`}
                </small>
                <h4 className={`mb-0 ${summary.budgetRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                  {summary.budgetRemaining >= 0
                    ? `${settings.currencySymbol}${summary.budgetRemaining.toLocaleString()}`
                    : `-${settings.currencySymbol}${Math.abs(summary.budgetRemaining).toLocaleString()}`
                  }
                </h4>
                {summary.budgetRemaining < 0 && (
                  <small className="text-danger">Over budget!</small>
                )}
                {summary.totalBudget === 0 && (
                  <small className="text-muted">Set salary/budget</small>
                )}
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card h-100 text-center p-3">
                <small className="text-muted">{shortMonth} Pending</small>
                <h4 className="text-warning mb-0">{dashboardData?.reminderCount || recurringItems.filter(r => r.active).length}</h4>
                <button
                  className="btn btn-link btn-sm p-0 text-decoration-none"
                  onClick={() => setActiveTab('reminders')}
                >
                  View All →
                </button>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Left Column - Charts */}
            <div className="col-lg-8">
              {/* Salary vs Expense Chart */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">💵 {shortMonth} - Salary vs Expenses</h5>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setActiveTab('analytics')}
                    >
                      Details →
                    </button>
                  </div>
                  <SalaryExpenseChart />
                </div>
              </div>

              {/* Month Comparison Chart */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">📊 {shortMonth} vs Last Month</h5>
                  </div>
                  <ExpenseComparisonChart
                    thisMonth={summary.thisMonthExpenses}
                    lastMonth={summary.lastMonthExpenses}
                  />
                </div>
              </div>

              {/* Budget Progress (Read-Only) */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">📋 {shortMonth} - Budget Status</h5>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setActiveTab('budget')}
                    >
                      Manage →
                    </button>
                  </div>

                  {(() => {
                    // Calculate spent by category from actual transactions
                    const categorySpent = getSpentByCategory();
                    const totalSpent = Object.values(categorySpent).reduce((sum, v) => sum + v, 0);

                    // Sort categories by amount spent (descending)
                    const sortedCategories = Object.entries(categorySpent)
                      .sort((a, b) => b[1] - a[1]);

                    if (sortedCategories.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <span style={{ fontSize: '32px' }}>📊</span>
                          <p className="text-muted mb-2 mt-2">No expenses this month</p>
                          <p className="small text-muted mb-3">Add transactions to see your spending breakdown</p>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setActiveTab('budget')}
                          >
                            + Add Expense
                          </button>
                        </div>
                      );
                    }

                    // Category icons/colors
                    const getCategoryStyle = (cat) => {
                      const catLower = cat.toLowerCase();
                      if (catLower.includes('grocer')) return { icon: '🛒', color: '#28a745' };
                      if (catLower.includes('shop')) return { icon: '🛍️', color: '#6f42c1' };
                      if (catLower.includes('entertain') || catLower.includes('subscript')) return { icon: '🎬', color: '#e83e8c' };
                      if (catLower.includes('health') || catLower.includes('medical')) return { icon: '🏥', color: '#17a2b8' };
                      if (catLower.includes('food') || catLower.includes('dining') || catLower.includes('restaurant')) return { icon: '🍔', color: '#fd7e14' };
                      if (catLower.includes('transport') || catLower.includes('gas') || catLower.includes('fuel') || catLower.includes('car')) return { icon: '🚗', color: '#20c997' };
                      if (catLower.includes('utility') || catLower.includes('electric') || catLower.includes('water') || catLower.includes('internet') || catLower.includes('phone')) return { icon: '💡', color: '#ffc107' };
                      if (catLower.includes('rent') || catLower.includes('hous')) return { icon: '🏠', color: '#6c757d' };
                      if (catLower.includes('education') || catLower.includes('school') || catLower.includes('child')) return { icon: '📚', color: '#007bff' };
                      if (catLower.includes('travel')) return { icon: '✈️', color: '#0dcaf0' };
                      if (catLower.includes('invest') || catLower.includes('saving')) return { icon: '💰', color: '#198754' };
                      if (catLower.includes('insurance')) return { icon: '🛡️', color: '#6610f2' };
                      if (catLower.includes('gym') || catLower.includes('fitness')) return { icon: '💪', color: '#dc3545' };
                      return { icon: '📦', color: '#6c757d' };
                    };

                    return (
                      <div>
                        {/* Total Summary */}
                        <div className="d-flex justify-content-between align-items-center p-2 mb-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
                          <span className="fw-bold">Total Spent</span>
                          <span className="fw-bold text-danger">{settings.currencySymbol}{totalSpent.toLocaleString()}</span>
                        </div>

                        {/* Category Breakdown */}
                        <div className="d-flex flex-column gap-2">
                          {sortedCategories.slice(0, 6).map(([cat, amount]) => {
                            const percent = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                            const style = getCategoryStyle(cat);

                            return (
                              <div key={cat} className="p-2 rounded border">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <div className="d-flex align-items-center gap-2">
                                    <span>{style.icon}</span>
                                    <span className="fw-medium">{cat}</span>
                                  </div>
                                  <div className="text-end">
                                    <span className="fw-bold text-danger">{settings.currencySymbol}{amount.toLocaleString()}</span>
                                    <span className="badge ms-2" style={{ backgroundColor: style.color }}>
                                      {percent.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                                <div className="progress" style={{ height: '6px' }}>
                                  <div
                                    className="progress-bar"
                                    style={{ width: `${percent}%`, backgroundColor: style.color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Show more link if more than 6 categories */}
                        {sortedCategories.length > 6 && (
                          <div className="text-center mt-2">
                            <button
                              className="btn btn-link btn-sm text-muted"
                              onClick={() => setActiveTab('analytics')}
                            >
                              +{sortedCategories.length - 6} more categories →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-lg-4">
              {/* Upcoming Reminders */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">🔔 {shortMonth} - Due Bills</h5>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setActiveTab('reminders')}
                    >
                      All →
                    </button>
                  </div>
                  <RecurringReminders readOnly={true} limit={5} onUpdate={handleRefresh} />
                </div>
              </div>

              {/* Recent Transactions (Read-Only) */}
              <div className="card mb-4">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">📝 {shortMonth} - Transactions</h5>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setActiveTab('budget')}
                    >
                      Add →
                    </button>
                  </div>
                  {transactions.length === 0 ? (
                    <p className="text-muted text-center py-3">No transactions yet</p>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {transactions.slice(0, 5).map((tx, idx) => {
                        // Convert to current display currency
                        let displayAmount = parseFloat(tx.amount) || 0;
                        const txCurrency = tx.currency || 'USD';
                        if (txCurrency !== settings.currency) {
                          displayAmount = convertCurrency(displayAmount, txCurrency, settings.currency);
                        }

                        return (
                          <div key={idx} className="d-flex justify-content-between align-items-center p-2 rounded border">
                            <div>
                              <small className="text-muted d-block">{tx.date}</small>
                              <span>{tx.category}</span>
                            </div>
                            <span className="fw-bold text-danger">-{settings.currencySymbol}{displayAmount.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Currency Rates */}
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title border-bottom pb-2 mb-3">💱 Currency Rates</h5>
                  <CurrencyRatesTable compact={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ASSETS TAB ============ */}
      {activeTab === 'assets' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0">💎 {t('whereIsIt') || "Where Is It?"}</h4>
            <button
              className={`btn ${showAddAsset ? 'btn-outline-secondary' : 'btn-danger'}`}
              onClick={() => setShowAddAsset(!showAddAsset)}
            >
              {showAddAsset ? '✕ Cancel' : '+ Add Asset'}
            </button>
          </div>

          {showAddAsset && (
            <div className="card mb-4">
              <div className="card-body">
                <AddAssetForm
                  editAsset={editAsset}
                  onSave={handleAssetSave}
                  onCancel={() => { setShowAddAsset(false); setEditAsset(null); }}
                />
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <AssetList
                onEdit={handleEditAsset}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ BUDGET TAB ============ */}
      {activeTab === 'budget' && (
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">➕ Add Transaction</h5>
                <p className="text-muted small mb-3">Add your expenses with custom date to track spending over time</p>
                <BudgetForm onSave={handleRefresh} />
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📝 {shortMonth} - {t("transactions")}</h5>
                <TransactionList limit={15} showFilters={true} refreshTrigger={refreshTrigger} onUpdate={handleRefresh} />
                <AddTransaction onAdd={handleRefresh} />
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📊 {shortMonth} - Summary</h5>
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-center p-3 rounded bg-success bg-opacity-10">
                    <span>{shortMonth} Income</span>
                    <span className="fw-bold text-success">
                      {summary.monthlyIncome > 0
                        ? `${settings.currencySymbol}${summary.monthlyIncome.toLocaleString()}`
                        : <small className="text-muted">Set salary in Analytics</small>
                      }
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center p-3 rounded bg-danger bg-opacity-10">
                    <span>{shortMonth} Expenses</span>
                    <span className="fw-bold text-danger">{settings.currencySymbol}{summary.thisMonthExpenses.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center p-3 rounded border">
                    <span>{shortMonth} Balance</span>
                    <span className={`fw-bold ${summary.monthlyBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {summary.monthlyIncome > 0
                        ? (summary.monthlyBalance >= 0
                            ? `${settings.currencySymbol}${summary.monthlyBalance.toLocaleString()}`
                            : `-${settings.currencySymbol}${Math.abs(summary.monthlyBalance).toLocaleString()}`
                          )
                        : <small className="text-muted">—</small>
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📈 {shortMonth} - {t("monthlyGraph")}</h5>
                <MonthlyGraph />
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">➕ {t("addExpense")}</h5>
                <AddMonthlyExpense onAdd={handleRefresh} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ REMINDERS TAB ============ */}
      {activeTab === 'reminders' && (
        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">🔔 {shortMonth} - Recurring Expenses</h5>
                <RecurringReminders readOnly={false} onUpdate={handleRefresh} />
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📅 Tax & Yearly Reminders</h5>
                <TaxReminders />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ ANALYTICS TAB ============ */}
      {activeTab === 'analytics' && (
        <div className="row g-4">
          {/* Main Analytics Section */}
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📊 Budget Analysis</h5>
                <BudgetAnalyzer />
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📈 Monthly Expense Trends</h5>
                <MonthlyGraph />
              </div>
            </div>

            {/* Period Comparison - Day/Week/Month/Year */}
            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📊 Compare Spending</h5>
                <TransactionComparison />
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="col-lg-4">
            {/* Income vs Expense Chart */}
            <div className="card">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">💵 Income vs Spending</h5>
                <SalaryExpenseChart />
              </div>
            </div>

            {/* This Month vs Last Month Quick View */}
            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📉 Month Comparison</h5>
                <ExpenseComparisonChart
                  thisMonth={summary.thisMonthExpenses}
                  lastMonth={summary.lastMonthExpenses}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">📋 Quick Stats</h5>
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between align-items-center p-2 rounded border">
                    <span>Transactions This Month</span>
                    <span className="badge bg-secondary">{transactions.filter(t => {
                      const d = new Date(t.date || t.createdAt);
                      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                    }).length}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center p-2 rounded border">
                    <span>Active Budget Categories</span>
                    <span className="badge bg-secondary">{budgets.length}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center p-2 rounded border">
                    <span>Recurring Expenses</span>
                    <span className="badge bg-secondary">{recurringItems.filter(r => r.active).length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Summary */}
            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">💎 Asset Summary</h5>
                {dashboardData?.assetsByType && Object.keys(dashboardData.assetsByType).length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {Object.entries(dashboardData.assetsByType).map(([type, count]) => (
                      <div key={type} className="d-flex justify-content-between align-items-center p-2 rounded border">
                        <span className="text-capitalize">{type.replace('_', ' ').toLowerCase()}</span>
                        <span className="badge bg-danger">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-muted mb-2">No assets tracked yet</p>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setActiveTab('assets')}
                    >
                      + Add Assets
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Currency Rates */}
            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title border-bottom pb-2 mb-3">💱 {t("currencyRates")}</h5>
                <CurrencyRatesTable compact={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ GOALS TAB ============ */}
      {activeTab === 'goals' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0">🎯 Savings Goals</h4>
          </div>
          <div className="card">
            <div className="card-body">
              <SavingsGoals />
            </div>
          </div>
        </div>
      )}

      {/* ============ INVESTMENTS TAB ============ */}
      {activeTab === 'investments' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0">📈 Investment Portfolio</h4>
          </div>
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="card">
                <div className="card-body">
                  <InvestmentTracker />
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title border-bottom pb-2 mb-3">💱 Multi-Currency View</h5>
                  <MultiCurrencyPortfolio />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DOCUMENTS TAB ============ */}
      {activeTab === 'documents' && (
        <div>
          <div className="card">
            <div className="card-body">
              <DocumentStorage />
            </div>
          </div>
        </div>
      )}

      {/* ============ SETTINGS TAB ============ */}
      {activeTab === 'settings' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0">⚙️ Settings & Data</h4>
          </div>
          <div className="row g-4">
            {/* Left Column */}
            <div className="col-lg-6">
              <DataBackup onImportComplete={handleRefresh} />

              <div className="card mt-4">
                <div className="card-body">
                  <h5 className="card-title border-bottom pb-2 mb-3">🔔 Notifications & Alerts</h5>
                  <NotificationCenter
                    budgets={budgets}
                    spentByCategory={getSpentByCategory()}
                    recurringItems={recurringItems}
                  />
                </div>
              </div>

              <div className="card mt-4">
                <div className="card-body">
                  <h5 className="card-title border-bottom pb-2 mb-3">👥 Family Mode</h5>
                  <FamilyMode onProfileChange={handleRefresh} />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="col-lg-6">
              <ThemeScheduler />

              <div className="card mt-4">
                <div className="card-body">
                  <h5 className="card-title border-bottom pb-2 mb-3">📄 Reports & Export</h5>
                  <ReportGenerator />
                </div>
              </div>

              <div className="card mt-4">
                <div className="card-header bg-danger text-white">
                  <strong>📊 App Statistics</strong>
                </div>
                <div className="card-body">
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between align-items-center p-2 rounded border">
                      <span>Total Transactions</span>
                      <span className="badge bg-secondary">{transactions.length}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center p-2 rounded border">
                      <span>Budget Categories</span>
                      <span className="badge bg-secondary">{budgets.length}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center p-2 rounded border">
                      <span>Recurring Reminders</span>
                      <span className="badge bg-secondary">{recurringItems.length}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center p-2 rounded border">
                      <span>Assets Tracked</span>
                      <span className="badge bg-secondary">
                        {JSON.parse(localStorage.getItem('assets_v1') || '[]').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card mt-4">
                <div className="card-header bg-danger text-white">
                  <strong>ℹ️ About</strong>
                </div>
                <div className="card-body">
                  <p className="mb-2"><strong>Budget Dashboard</strong> v1.0.0</p>
                  <p className="text-muted small mb-0">
                    A local-first personal finance app. All your data stays on your device -
                    no cloud, no tracking, complete privacy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
