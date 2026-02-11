import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { createBudgetItem } from '../api/api';

export default function BudgetForm({ onSave }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    category: 'OTHER_EXPENSE',
    transactionType: 'EXPENSE',
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
    recurring: false,
    recurrenceFrequency: 'MONTHLY'
  });
  const [loading, setLoading] = useState(false);

  const incomeCategories = [
    'SALARY', 'BONUS', 'RENTAL_INCOME', 'INTEREST', 'DIVIDENDS', 'GIFT', 'OTHER_INCOME'
  ];
  const expenseCategories = [
    'HOUSING', 'UTILITIES', 'FOOD', 'TRANSPORTATION', 'HEALTHCARE',
    'INSURANCE', 'ENTERTAINMENT', 'CLOTHING', 'EDUCATION', 'SAVINGS',
    'INVESTMENTS', 'DEBT_PAYMENT', 'OTHER_EXPENSE'
  ];

  const categories = formData.transactionType === 'INCOME' ? incomeCategories : expenseCategories;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'transactionType') {
      setFormData(prev => ({
        ...prev,
        transactionType: value,
        category: value === 'INCOME' ? 'SALARY' : 'OTHER_EXPENSE'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const budgetItem = {
      ...formData,
      amount: parseFloat(formData.amount),
      currency: settings.currency
    };

    try {
      await createBudgetItem(budgetItem);

      // Also save to localStorage for local tracking
      const TRANSACTIONS_KEY = 'transactions_v1';
      const MONTHLY_EXPENSES_KEY = 'monthly_expenses_v1';

      const localItem = {
        id: Date.now().toString(),
        date: formData.transactionDate,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.name,
        currency: settings.currency,
        type: formData.transactionType,
        createdAt: new Date().toISOString()
      };

      // Save to transactions
      const transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      transactions.unshift(localItem);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

      // Save to monthly expenses if it's an expense
      if (formData.transactionType === 'EXPENSE') {
        const monthlyExpenses = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || '[]');
        monthlyExpenses.unshift(localItem);
        localStorage.setItem(MONTHLY_EXPENSES_KEY, JSON.stringify(monthlyExpenses));
      }

      setFormData({
        name: '',
        category: 'OTHER_EXPENSE',
        transactionType: 'EXPENSE',
        amount: '',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: '',
        recurring: false,
        recurrenceFrequency: 'MONTHLY'
      });

      if (onSave) onSave();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-2">
      {/* Transaction Type Toggle */}
      <div className="btn-group w-100 mb-3" role="group">
        <input
          type="radio"
          className="btn-check"
          name="transactionType"
          id="income-btn"
          value="INCOME"
          checked={formData.transactionType === 'INCOME'}
          onChange={handleChange}
        />
        <label
          className={`btn ${formData.transactionType === 'INCOME' ? 'btn-success' : 'btn-outline-secondary'}`}
          htmlFor="income-btn"
        >
          + Income
        </label>

        <input
          type="radio"
          className="btn-check"
          name="transactionType"
          id="expense-btn"
          value="EXPENSE"
          checked={formData.transactionType === 'EXPENSE'}
          onChange={handleChange}
        />
        <label
          className={`btn ${formData.transactionType === 'EXPENSE' ? 'btn-danger' : 'btn-outline-secondary'}`}
          htmlFor="expense-btn"
        >
          - Expense
        </label>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Description *</label>
          <input
            type="text"
            className="form-control"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., Grocery shopping, Salary"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Amount ({settings.currencySymbol}) *</label>
          <div className="input-group">
            <span className="input-group-text">{settings.currencySymbol}</span>
            <input
              type="number"
              className="form-control"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <label className="form-label">Category</label>
          <select
            className="form-select"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-control"
            name="transactionDate"
            value={formData.transactionDate}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <div className="form-check mt-4">
            <input
              type="checkbox"
              className="form-check-input"
              id="recurring-check"
              name="recurring"
              checked={formData.recurring}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="recurring-check">
              Recurring transaction
            </label>
          </div>
        </div>
        {formData.recurring && (
          <div className="col-md-6">
            <label className="form-label">Frequency</label>
            <select
              className="form-select"
              name="recurrenceFrequency"
              value={formData.recurrenceFrequency}
              onChange={handleChange}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        )}
      </div>

      <div className="row g-3 mt-1">
        <div className="col-12">
          <label className="form-label">Notes</label>
          <input
            type="text"
            className="form-control"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional notes..."
          />
        </div>
      </div>

      <div className="d-grid mt-4">
        <button
          type="submit"
          disabled={loading}
          className={`btn ${formData.transactionType === 'INCOME' ? 'btn-success' : 'btn-danger'}`}
        >
          {loading ? 'Adding...' : `Add ${formData.transactionType === 'INCOME' ? 'Income' : 'Expense'}`}
        </button>
      </div>
    </form>
  );
}
