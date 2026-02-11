import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const EXPENSES_KEY = 'monthly_expenses_v1';
const TRANSACTIONS_KEY = 'transactions_v1';
const SALARY_KEY = 'user_salary_v1';
const ANNUAL_SALARY_KEY = 'user_annual_salary_v1';
const BUDGET_KEY = 'user_budget_v1';
const SALARY_TYPE_KEY = 'user_salary_type_v1';

export default function BudgetAnalyzer() {
  const { settings, convertCurrency } = useSettings();
  const [salary, setSalary] = useState('');
  const [annualSalary, setAnnualSalary] = useState('');
  const [salaryType, setSalaryType] = useState('monthly'); // 'monthly' or 'annual'
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [budget, setBudget] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSavedData();
  }, [settings.currency]); // Reload when currency changes

  const loadSavedData = () => {
    try {
      const savedSalaryData = localStorage.getItem(SALARY_KEY);
      const savedAnnualSalary = localStorage.getItem(ANNUAL_SALARY_KEY);
      const savedBudget = localStorage.getItem(BUDGET_KEY);
      const savedSalaryType = localStorage.getItem(SALARY_TYPE_KEY) || 'monthly';

      // Parse salary with currency info
      let savedSalary = '';
      let savedCurrency = 'USD';

      if (savedSalaryData) {
        try {
          const salaryData = JSON.parse(savedSalaryData);
          if (typeof salaryData === 'object' && salaryData.amount) {
            savedSalary = salaryData.amount.toString();
            savedCurrency = salaryData.currency || 'USD';
          } else {
            savedSalary = savedSalaryData;
          }
        } catch {
          savedSalary = savedSalaryData;
        }
      }

      setSalaryCurrency(savedCurrency);

      // Convert to current display currency if needed
      if (savedSalary && savedCurrency !== settings.currency) {
        const converted = convertCurrency(parseFloat(savedSalary), savedCurrency, settings.currency);
        setSalary(converted.toFixed(0));
      } else if (savedSalary) {
        setSalary(savedSalary);
      }

      if (savedAnnualSalary) setAnnualSalary(savedAnnualSalary);
      if (savedBudget) setBudget(savedBudget);
      setSalaryType(savedSalaryType);

      // Auto-analyze if we have salary data
      if (savedSalary) {
        setTimeout(() => compute(savedSalary, savedBudget || savedSalary), 100);
      }
    } catch (err) {
      console.error('Error loading saved data:', err);
    }
  };

  const handleSalaryTypeChange = (type) => {
    setSalaryType(type);
    if (type === 'annual' && salary && !annualSalary) {
      setAnnualSalary((parseFloat(salary) * 12).toString());
    } else if (type === 'monthly' && annualSalary && !salary) {
      setSalary((parseFloat(annualSalary) / 12).toFixed(0));
    }
  };

  const saveSalaryBudget = () => {
    let monthlySal = salary;

    if (salaryType === 'annual') {
      monthlySal = (parseFloat(annualSalary) / 12).toFixed(0);
      setSalary(monthlySal);
      localStorage.setItem(ANNUAL_SALARY_KEY, annualSalary);
    } else {
      const annualVal = (parseFloat(salary) * 12).toString();
      setAnnualSalary(annualVal);
      localStorage.setItem(ANNUAL_SALARY_KEY, annualVal);
    }

    // Save salary with currency info
    localStorage.setItem(SALARY_KEY, JSON.stringify({
      amount: parseFloat(monthlySal) || 0,
      currency: settings.currency
    }));

    // Save budget amount
    const budgetAmount = parseFloat(budget) || parseFloat(monthlySal) || 0;
    localStorage.setItem(BUDGET_KEY, budgetAmount.toString());

    localStorage.setItem(SALARY_TYPE_KEY, salaryType);
    setIsEditing(false);
    compute(monthlySal, budget || monthlySal);
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

  function compute(sal = salary, bud = budget) {
    // Load from both sources
    let monthlyExp = [];
    let transactions = [];
    try {
      monthlyExp = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]');
      transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
    } catch (err) {
      monthlyExp = [];
      transactions = [];
    }

    // Combine and dedupe by ID
    const allExpenses = [...transactions, ...monthlyExp];
    const seenIds = new Set();
    const stored = allExpenses.filter(e => {
      if (!e.id) return true;
      if (seenIds.has(e.id)) return false;
      seenIds.add(e.id);
      return true;
    });

    // Get current month expenses
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonthExpenses = stored.filter(e => {
      const rawDate = e.date || e.transactionDate || e.createdAt;
      if (!rawDate) return false;
      const d = parseLocalDate(rawDate);
      if (!d || isNaN(d.getTime())) return false;

      // Only count expenses (not income)
      const isExpense = !e.type || String(e.type).toUpperCase() === 'EXPENSE';
      const isExpenseTxType = !e.transactionType || String(e.transactionType).toUpperCase() === 'EXPENSE';

      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && isExpense && isExpenseTxType;
    });

    // Calculate total with currency conversion
    const totalExpenses = thisMonthExpenses.reduce((s, e) => {
      let amount = parseFloat(e.amount) || 0;
      const expCurrency = e.currency || 'USD';
      if (expCurrency !== settings.currency) {
        amount = convertCurrency(amount, expCurrency, settings.currency);
      }
      return s + amount;
    }, 0);

    const salNum = parseFloat(sal) || 0;
    const budNum = parseFloat(bud) || salNum;
    const annualSalNum = salNum * 12;

    const monthlySavings = salNum - totalExpenses;
    const withinBudget = totalExpenses <= budNum;
    const savingsRate = salNum > 0 ? ((monthlySavings / salNum) * 100).toFixed(1) : 0;
    const budgetUsed = budNum > 0 ? ((totalExpenses / budNum) * 100).toFixed(1) : 0;

    // Category breakdown with currency conversion
    const categoryBreakdown = {};
    thisMonthExpenses.forEach(e => {
      const cat = e.category || 'Other';
      let amount = parseFloat(e.amount) || 0;
      const expCurrency = e.currency || 'USD';
      if (expCurrency !== settings.currency) {
        amount = convertCurrency(amount, expCurrency, settings.currency);
      }
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amount;
    });

    setAnalysis({
      totalExpenses,
      monthlySavings,
      withinBudget,
      savingsRate,
      budgetUsed,
      budget: budNum,
      salary: salNum,
      annualSalary: annualSalNum,
      categoryBreakdown,
      transactionCount: thisMonthExpenses.length
    });
  }

  // Show setup prompt if no salary is set
  if (!salary && !isEditing) {
    return (
      <div className="text-center py-4">
        <div className="mb-3">
          <span style={{ fontSize: '48px' }}>💰</span>
        </div>
        <h5>Set Up Your Budget</h5>
        <p className="text-muted mb-3">
          Enter your salary (monthly or annual) and budget to get personalized insights
        </p>
        <button
          className="btn btn-danger"
          onClick={() => setIsEditing(true)}
        >
          + Set Salary & Budget
        </button>
      </div>
    );
  }

  // Show editing form
  if (isEditing || !analysis) {
    return (
      <div>
        {/* Salary Type Toggle */}
        <div className="btn-group w-100 mb-3" role="group">
          <button
            type="button"
            className={`btn ${salaryType === 'monthly' ? 'btn-danger' : 'btn-outline-secondary'}`}
            onClick={() => handleSalaryTypeChange('monthly')}
          >
            Monthly Salary
          </button>
          <button
            type="button"
            className={`btn ${salaryType === 'annual' ? 'btn-danger' : 'btn-outline-secondary'}`}
            onClick={() => handleSalaryTypeChange('annual')}
          >
            Annual Salary
          </button>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            {salaryType === 'monthly' ? (
              <>
                <label className="form-label">Monthly Salary ({settings.currencySymbol})</label>
                <div className="input-group">
                  <span className="input-group-text">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="e.g., 5000"
                  />
                </div>
                {salary && (
                  <small className="text-muted">
                    = {settings.currencySymbol}{(parseFloat(salary) * 12).toLocaleString()}/year
                  </small>
                )}
              </>
            ) : (
              <>
                <label className="form-label">Annual Salary ({settings.currencySymbol})</label>
                <div className="input-group">
                  <span className="input-group-text">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(e.target.value)}
                    placeholder="e.g., 60000"
                  />
                </div>
                {annualSalary && (
                  <small className="text-muted">
                    = {settings.currencySymbol}{(parseFloat(annualSalary) / 12).toLocaleString()}/month
                  </small>
                )}
              </>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label">Monthly Budget ({settings.currencySymbol})</label>
            <div className="input-group">
              <span className="input-group-text">{settings.currencySymbol}</span>
              <input
                type="number"
                className="form-control"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Same as salary if blank"
              />
            </div>
            <small className="text-muted">Leave blank to use monthly salary as budget</small>
          </div>
        </div>

        <button className="btn btn-danger w-100" onClick={saveSalaryBudget}>
          💾 Save & Analyze
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Quick Summary Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-baseline gap-2">
            <div>
              <small className="text-muted d-block">Monthly</small>
              <h5 className="mb-0">{settings.currencySymbol}{analysis.salary.toLocaleString()}</h5>
            </div>
            <span className="text-muted">|</span>
            <div>
              <small className="text-muted d-block">Annual</small>
              <h5 className="mb-0 text-success">{settings.currencySymbol}{analysis.annualSalary.toLocaleString()}</h5>
            </div>
          </div>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setIsEditing(true)}
        >
          ✏️ Edit
        </button>
      </div>

      {/* Main Stats */}
      <div className="row g-3 mb-3">
        <div className="col-6">
          <div className="p-3 rounded border text-center">
            <small className="text-muted d-block">Spent This Month</small>
            <span className="fs-4 fw-bold text-danger">
              {settings.currencySymbol}{analysis.totalExpenses.toLocaleString()}
            </span>
            <small className="text-muted d-block">{analysis.transactionCount} transactions</small>
          </div>
        </div>
        <div className="col-6">
          <div className="p-3 rounded border text-center">
            <small className="text-muted d-block">Savings</small>
            <span className={`fs-4 fw-bold ${analysis.monthlySavings >= 0 ? 'text-success' : 'text-danger'}`}>
              {settings.currencySymbol}{analysis.monthlySavings.toLocaleString()}
            </span>
            <small className={analysis.savingsRate >= 20 ? 'text-success' : 'text-warning'}>
              {analysis.savingsRate}% of income
            </small>
          </div>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="mb-3">
        <div className="d-flex justify-content-between mb-1">
          <span>Budget Used</span>
          <span className={analysis.withinBudget ? 'text-success' : 'text-danger'}>
            {settings.currencySymbol}{analysis.totalExpenses.toLocaleString()} / {settings.currencySymbol}{analysis.budget.toLocaleString()}
          </span>
        </div>
        <div className="progress" style={{ height: '12px' }}>
          <div
            className={`progress-bar ${analysis.budgetUsed > 100 ? 'bg-danger' : analysis.budgetUsed > 80 ? 'bg-warning' : 'bg-success'}`}
            style={{ width: `${Math.min(analysis.budgetUsed, 100)}%` }}
          />
        </div>
        <div className="d-flex justify-content-between mt-1">
          <small className="text-muted">{analysis.budgetUsed}% used</small>
          <small className={analysis.withinBudget ? 'text-success' : 'text-danger'}>
            {analysis.withinBudget
              ? `${settings.currencySymbol}${(analysis.budget - analysis.totalExpenses).toLocaleString()} remaining`
              : `${settings.currencySymbol}${(analysis.totalExpenses - analysis.budget).toLocaleString()} over budget`
            }
          </small>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(analysis.categoryBreakdown).length > 0 && (
        <div className="mb-3">
          <h6 className="mb-2">Spending by Category</h6>
          <div className="d-flex flex-column gap-1">
            {Object.entries(analysis.categoryBreakdown)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([cat, amount]) => (
                <div key={cat} className="d-flex justify-content-between align-items-center">
                  <span className="text-truncate" style={{ maxWidth: '60%' }}>{cat}</span>
                  <span className="fw-bold">{settings.currencySymbol}{amount.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Status Alert */}
      <div className={`alert ${analysis.withinBudget ? 'alert-success' : 'alert-danger'} mb-0 py-2`}>
        {analysis.withinBudget
          ? '✅ Great! You are within your budget.'
          : '⚠️ You have exceeded your budget this month.'}
      </div>
    </div>
  );
}
