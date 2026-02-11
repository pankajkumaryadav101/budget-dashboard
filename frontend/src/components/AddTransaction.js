import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSettings } from "../contexts/SettingsContext";

const STORAGE_KEY = "transactions_v1";

const CATEGORY_OPTIONS = [
  'Rent', 'Utilities', 'Car Insurance', 'Car EMI', 'Phone Bills', 'Internet Bill',
  'Groceries', 'Health', 'Child Education', 'Entertainment', 'Shopping', 'Travel',
  'Dining Out', 'Gas/Fuel', 'Gym', 'Subscriptions', 'Salary', 'Bonus', 'Investment', 'Other'
];

export default function AddTransaction({ onAdd }) {
  const { settings } = useSettings();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  const submit = (e) => {
    e.preventDefault();
    const tx = {
      id: uuidv4(),
      date: transactionDate,
      displayDate: new Date(transactionDate).toLocaleDateString(),
      amount: parseFloat(amount),
      category,
      description,
      currency: settings.currency,
      createdAt: new Date().toISOString()
    };
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const next = [tx, ...stored];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAmount("");
    setCategory("");
    setDescription("");
    setTransactionDate(new Date().toISOString().split('T')[0]);
    if (onAdd) onAdd();
  };

  return (
    <form onSubmit={submit} className="mt-4 pt-3 border-top">
      <div className="row g-2">
        <div className="col-6 col-md-2">
          <label className="form-label small text-muted mb-1">Date</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        <div className="col-6 col-md-2">
          <label className="form-label small text-muted mb-1">Amount</label>
          <div className="input-group input-group-sm">
            <span className="input-group-text">{settings.currencySymbol}</span>
            <input
              type="number"
              className="form-control"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small text-muted mb-1">Category</label>
          <select
            className="form-select form-select-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select...</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-3">
          <label className="form-label small text-muted mb-1">Description</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Optional note"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-2 d-flex align-items-end">
          <button className="btn btn-danger btn-sm w-100" type="submit">+ Add</button>
        </div>
      </div>
    </form>
  );
}