import React, { useState } from "react";
import { addExpense } from "../api/api";
import BillScanner from "./BillScanner";
import { useSettings } from "../contexts/SettingsContext";

const CATEGORY_OPTIONS = [
  'Rent', 'Utilities', 'Car Insurance', 'Car EMI', 'Phone Bills', 'Internet Bill',
  'Groceries', 'Dining Out', 'Gas/Fuel', 'Health', 'Shopping', 'Entertainment',
  'Child School Fees', 'Maid/Helper', 'OTT Subscriptions', 'Gym', 'SIP/Investment',
  'Travel', 'Other'
];

const STORAGE_KEY = 'monthly_expenses_v1';
const TRANSACTIONS_KEY = 'transactions_v1';

const AddMonthlyExpense = ({ onAdd }) => {
  const { settings } = useSettings();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleScanComplete = (scanData) => {
    if (scanData.amount) {
      setAmount(scanData.amount.toString());
    }
    if (scanData.date) {
      setDate(scanData.date);
    }
    if (scanData.category && CATEGORY_OPTIONS.includes(scanData.category)) {
      setCategory(scanData.category);
    }
    if (scanData.merchant) {
      setDescription(scanData.merchant);
    }
    setShowScanner(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || !category) {
      alert('Please enter amount and category');
      return;
    }

    setLoading(true);

    const expenseData = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      date,
      description,
      currency: settings.currency,
      type: 'EXPENSE',
      createdAt: new Date().toISOString()
    };

    // Save to both localStorage keys (for compatibility)
    try {
      // Save to monthly_expenses_v1
      const monthlyStored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      monthlyStored.unshift(expenseData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(monthlyStored));

      // Also save to transactions_v1 (main transaction list)
      const txStored = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || "[]");
      txStored.unshift(expenseData);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txStored));

      console.log('Expense saved:', expenseData);
    } catch (err) {
      console.warn('Failed to write expense to localStorage', err);
    }

    // Try API call (optional - will work if backend is running)
    try {
      await addExpense(expenseData);
    } catch (error) {
      // Silently ignore API errors - data is already saved locally
      console.log('Backend not available, using local storage only');
    }

    // Reset form and notify parent
    setAmount("");
    setCategory("");
    setDescription("");
    setDate(new Date().toISOString().split('T')[0]);
    setLoading(false);
    if (onAdd) onAdd();
  };

  return (
    <div>
      {/* Toggle between manual entry and scanner */}
      <div className="btn-group w-100 mb-3" role="group">
        <button
          type="button"
          className={`btn ${!showScanner ? 'btn-danger' : 'btn-outline-secondary'}`}
          onClick={() => setShowScanner(false)}
        >
          ✏️ Manual Entry
        </button>
        <button
          type="button"
          className={`btn ${showScanner ? 'btn-danger' : 'btn-outline-secondary'}`}
          onClick={() => setShowScanner(true)}
        >
          📷 Scan Bill
        </button>
      </div>

      {showScanner ? (
        <BillScanner
          onScanComplete={handleScanComplete}
          currency={settings.currency}
        />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Amount ({settings.currencySymbol})</label>
            <div className="input-group">
              <span className="input-group-text">{settings.currencySymbol}</span>
              <input
                type="number"
                className="form-control"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-control"
              placeholder="Where did you spend?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-danger w-100" disabled={loading}>
            {loading ? 'Adding...' : '+ Add Expense'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AddMonthlyExpense;
