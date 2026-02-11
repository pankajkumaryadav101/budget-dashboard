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
      setTransactions(JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]'));

      // Load budgets and remove duplicates
      const storedBudgets = JSON.parse(localStorage.getItem(BUDGETS_KEY) || '[]');
      const uniqueBudgets = storedBudgets.filter((b, index, self) =>
        index === self.findIndex(t => t.name === b.name)
      );
      // Save deduplicated list back if there were duplicates
      if (uniqueBudgets.length !== storedBudgets.length) {
        localStorage.setItem(BUDGETS_KEY, JSON.stringify(uniqueBudgets));
      }
      setBudgets(uniqueBudgets);

      setMonthlyExpenses(JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || '[]'));
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

  // Calculate spent for each category from transactions
  const getSpentByCategory = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Combine all expense sources
    const allExpenses = [...transactions, ...monthlyExpenses];

    // Filter for current month
    const thisMonthExpenses = allExpenses.filter(tx => {
      if (!tx.date && !tx.createdAt) return false;
      const d = new Date(tx.date || tx.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Group by category with currency conversion
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
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Helper to get converted amount
    const getConvertedAmount = (expense) => {
      let amount = parseFloat(expense.amount) || 0;
      const expCurrency = expense.currency || 'USD';
      if (expCurrency !== settings.currency) {
        amount = convertCurrency(amount, expCurrency, settings.currency);
      }
      return amount;
    };

    const thisMonthExpenses = monthlyExpenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, e) => sum + getConvertedAmount(e), 0);

    const lastMonthExpenses = monthlyExpenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).reduce((sum, e) => sum + getConvertedAmount(e), 0);

    const totalBudget = budgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

    // Calculate actual spent from transactions (not from stored spent value)
    const categorySpent = getSpentByCategory();
    const totalSpent = Object.values(categorySpent).reduce((sum, v) => sum + v, 0);

    return {
      thisMonthExpenses,
      lastMonthExpenses,
      expenseChange: lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1) : 0,
      totalBudget,
      totalSpent,
      budgetRemaining: totalBudget - totalSpent
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
                <h4 className="text-danger mb-0">{settings.currencySymbol}{(dashboardData?.netWorth || 0).toLocaleString()}</h4>
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
                <small className="text-muted">{shortMonth} Budget Left</small>
                <h4 className={`mb-0 ${summary.budgetRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                  {settings.currencySymbol}{summary.budgetRemaining.toLocaleString()}
                </h4>
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
                  {budgets.length === 0 ? (
                    <div className="text-center py-4">
                      <span style={{ fontSize: '32px' }}>📊</span>
                      <p className="text-muted mb-2 mt-2">No budgets set yet</p>
                      <p className="small text-muted mb-3">Create budget categories to track your spending</p>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setActiveTab('budget')}
                      >
                        + Create Budget
                      </button>
                    </div>
                  ) : (() => {
                    // Calculate spent by category from actual transactions
                    const categorySpent = getSpentByCategory();

                    return (
                      <div className="d-flex flex-column gap-3">
                        {/* Remove duplicates by name and show unique budgets */}
                        {budgets
                          .filter((b, index, self) =>
                            index === self.findIndex(t => t.name === b.name || t.id === b.id)
                          )
                          .slice(0, 4)
                          .map((b) => {
                            // Get spent from actual transactions, not stored value
                            const spent = getSpentForBudgetCategory(b.name, categorySpent);
                            const amount = parseFloat(b.amount) || 1;
                            const percent = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
                            const remaining = amount - spent;
                            const isOverBudget = spent > amount;

                            return (
                              <div key={`budget-${b.id || b.name}`} className="p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="fw-medium">{b.name || 'Unnamed Budget'}</span>
                                  <span className={isOverBudget || percent >= 90 ? 'text-danger' : percent >= 70 ? 'text-warning' : 'text-success'}>
                                    {isOverBudget ? `${((spent / amount) * 100).toFixed(0)}%` : `${percent.toFixed(0)}%`}
                                  </span>
                                </div>
                                <div className="progress mb-1" style={{ height: '8px' }}>
                                  <div
                                    className={`progress-bar ${isOverBudget || percent >= 90 ? 'bg-danger' : percent >= 70 ? 'bg-warning' : 'bg-success'}`}
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                  />
                                </div>
                                <div className="d-flex justify-content-between">
                                  <small className="text-muted">
                                    {settings.currencySymbol}{spent.toLocaleString()} spent
                                  </small>
                                  <small className={remaining >= 0 ? 'text-success' : 'text-danger'}>
                                    {remaining >= 0
                                      ? `${settings.currencySymbol}${remaining.toLocaleString()} left`
                                      : `${settings.currencySymbol}${Math.abs(remaining).toLocaleString()} over`
                                    }
                                  </small>
                                </div>
                              </div>
                            );
                          })}
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
                <TransactionList limit={15} showFilters={true} />
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
                    <span className="fw-bold text-success">{settings.currencySymbol}{(dashboardData?.monthlyIncome || 0).toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center p-3 rounded bg-danger bg-opacity-10">
                    <span>{shortMonth} Expenses</span>
                    <span className="fw-bold text-danger">{settings.currencySymbol}{summary.thisMonthExpenses.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center p-3 rounded border">
                    <span>{shortMonth} Balance</span>
                    <span className={`fw-bold ${(dashboardData?.monthlyBalance || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {settings.currencySymbol}{(dashboardData?.monthlyBalance || 0).toLocaleString()}
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
    </div>
  );
}
