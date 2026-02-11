import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSettings } from '../contexts/SettingsContext';

const STORAGE_KEY = 'recurring_reminders_v1';
const TRANSACTIONS_KEY = 'transactions_v1';
const MONTHLY_EXPENSES_KEY = 'monthly_expenses_v1';

// Default recurring expense templates
const DEFAULT_REMINDERS = [
  { id: 'rent', name: 'Rent', amount: 0, dueDay: 1, category: 'HOUSING', active: true },
  { id: 'car_emi', name: 'Car EMI', amount: 0, dueDay: 5, category: 'TRANSPORTATION', active: false },
  { id: 'car_insurance', name: 'Car Insurance', amount: 0, dueDay: 15, category: 'INSURANCE', active: false },
  { id: 'phone_bill', name: 'Phone Bill', amount: 0, dueDay: 10, category: 'UTILITIES', active: false },
  { id: 'internet', name: 'Internet Bill', amount: 0, dueDay: 12, category: 'UTILITIES', active: false },
  { id: 'electricity', name: 'Electricity Bill', amount: 0, dueDay: 20, category: 'UTILITIES', active: false },
  { id: 'water', name: 'Water Bill', amount: 0, dueDay: 18, category: 'UTILITIES', active: false },
  { id: 'gas', name: 'Gas Bill', amount: 0, dueDay: 22, category: 'UTILITIES', active: false },
  { id: 'child_school', name: 'Child School Fees', amount: 0, dueDay: 5, category: 'EDUCATION', active: false },
  { id: 'child_tuition', name: 'Child Tuition', amount: 0, dueDay: 1, category: 'EDUCATION', active: false },
  { id: 'health_insurance', name: 'Health Insurance', amount: 0, dueDay: 1, category: 'INSURANCE', active: false },
  { id: 'life_insurance', name: 'Life Insurance', amount: 0, dueDay: 1, category: 'INSURANCE', active: false },
  { id: 'ott_subscriptions', name: 'OTT Subscriptions', amount: 0, dueDay: 1, category: 'ENTERTAINMENT', active: false },
  { id: 'gym', name: 'Gym Membership', amount: 0, dueDay: 1, category: 'HEALTHCARE', active: false },
  { id: 'maid', name: 'Maid/Helper Salary', amount: 0, dueDay: 1, category: 'HOUSING', active: false },
  { id: 'milk', name: 'Milk Bill', amount: 0, dueDay: 5, category: 'FOOD', active: false },
  { id: 'newspaper', name: 'Newspaper', amount: 0, dueDay: 1, category: 'OTHER_EXPENSE', active: false },
  { id: 'sip', name: 'SIP/Investment', amount: 0, dueDay: 5, category: 'INVESTMENTS', active: false },
  { id: 'credit_card', name: 'Credit Card Bill', amount: 0, dueDay: 15, category: 'DEBT_PAYMENT', active: false },
  { id: 'loan_emi', name: 'Home Loan EMI', amount: 0, dueDay: 5, category: 'DEBT_PAYMENT', active: false },
];

export default function RecurringReminders({ readOnly = false, limit = null, onUpdate }) {
  const { settings, convertCurrency } = useSettings();
  const [reminders, setReminders] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newReminder, setNewReminder] = useState({ name: '', amount: '', dueDay: 1, category: 'OTHER_EXPENSE' });

  useEffect(() => {
    loadReminders();
  }, []);

  // Helper to get display amount in current currency
  const getDisplayAmount = (reminder) => {
    let amount = parseFloat(reminder.amount) || 0;
    const reminderCurrency = reminder.currency || 'USD';
    if (reminderCurrency !== settings.currency) {
      amount = convertCurrency(amount, reminderCurrency, settings.currency);
    }
    return amount;
  };

  const loadReminders = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && stored.length > 0) {
        setReminders(stored);
      } else {
        // Initialize with defaults
        setReminders(DEFAULT_REMINDERS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REMINDERS));
      }
    } catch (err) {
      setReminders(DEFAULT_REMINDERS);
    }
  };

  const saveReminders = (updated) => {
    setReminders(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (onUpdate) onUpdate();
  };

  const toggleActive = (id) => {
    const updated = reminders.map(r => r.id === id ? { ...r, active: !r.active } : r);
    saveReminders(updated);
  };

  const updateAmount = (id, amount) => {
    const updated = reminders.map(r => r.id === id ? { ...r, amount: parseFloat(amount) || 0 } : r);
    saveReminders(updated);
  };

  const updateDueDay = (id, day) => {
    const updated = reminders.map(r => r.id === id ? { ...r, dueDay: parseInt(day) || 1 } : r);
    saveReminders(updated);
  };

  const markPaid = (id) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    // Update the reminder with lastPaid date
    const updated = reminders.map(r => r.id === id ? { ...r, lastPaid: new Date().toISOString() } : r);
    saveReminders(updated);

    // Add as a transaction
    const transaction = {
      id: uuidv4(),
      date: new Date().toISOString().split('T')[0],
      displayDate: new Date().toLocaleDateString(),
      amount: parseFloat(reminder.amount) || 0,
      category: reminder.category || reminder.name,
      description: `${reminder.name} - Recurring Payment`,
      currency: settings.currency,
      isRecurring: true,
      recurringId: id,
      createdAt: new Date().toISOString()
    };

    // Save to transactions
    try {
      const transactions = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || '[]');
      transactions.unshift(transaction);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

      // Also save to monthly expenses for budget tracking
      const monthlyExpenses = JSON.parse(localStorage.getItem(MONTHLY_EXPENSES_KEY) || '[]');
      monthlyExpenses.unshift({
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        isRecurring: true
      });
      localStorage.setItem(MONTHLY_EXPENSES_KEY, JSON.stringify(monthlyExpenses));
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  };

  const markUnpaid = (id) => {
    // Remove the lastPaid date (set to last month to make it unpaid for this month)
    const updated = reminders.map(r => r.id === id ? { ...r, lastPaid: null } : r);
    saveReminders(updated);
  };

  const addCustomReminder = () => {
    if (!newReminder.name) return;
    const updated = [...reminders, {
      id: uuidv4(),
      ...newReminder,
      amount: parseFloat(newReminder.amount) || 0,
      active: true,
      custom: true
    }];
    saveReminders(updated);
    setNewReminder({ name: '', amount: '', dueDay: 1, category: 'OTHER_EXPENSE' });
    setShowAdd(false);
  };

  const deleteReminder = (id) => {
    const updated = reminders.filter(r => r.id !== id);
    saveReminders(updated);
  };

  // Check if due this month
  const isDueThisMonth = (reminder) => {
    const today = new Date();
    const currentDay = today.getDate();
    return reminder.active && reminder.dueDay >= currentDay;
  };

  const isPastDue = (reminder) => {
    if (!reminder.active) return false;
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Check if already paid this month
    if (reminder.lastPaid) {
      const lastPaid = new Date(reminder.lastPaid);
      if (lastPaid.getMonth() === currentMonth && lastPaid.getFullYear() === currentYear) {
        return false;
      }
    }

    return currentDay > reminder.dueDay;
  };

  const isPaidThisMonth = (reminder) => {
    if (!reminder.lastPaid) return false;
    const lastPaid = new Date(reminder.lastPaid);
    const today = new Date();
    return lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear();
  };

  // Filter and sort reminders
  let displayReminders = reminders.filter(r => r.active);
  displayReminders.sort((a, b) => a.dueDay - b.dueDay);

  if (limit) {
    displayReminders = displayReminders.slice(0, limit);
  }

  // Read-only view for overview
  if (readOnly) {
    if (displayReminders.length === 0) {
      return <p className="text-muted text-center py-3">No recurring expenses set</p>;
    }

    return (
      <div className="d-flex flex-column gap-2">
        {displayReminders.map(reminder => {
          const displayAmount = getDisplayAmount(reminder);

          return (
            <div
              key={reminder.id}
              className={`d-flex justify-content-between align-items-center p-2 rounded border ${
                isPastDue(reminder) ? 'border-danger bg-danger bg-opacity-10' :
                isPaidThisMonth(reminder) ? 'border-success bg-success bg-opacity-10' : ''
              }`}
            >
              <div>
                <span className="d-block">{reminder.name}</span>
                <small className="text-muted">
                  Due: {reminder.dueDay}th
                  {isPastDue(reminder) && <span className="text-danger ms-1">(Overdue!)</span>}
                </small>
              </div>
              <div className="text-end d-flex align-items-center gap-2">
                <span className="fw-bold text-danger">{settings.currencySymbol}{displayAmount.toLocaleString()}</span>
                {isPaidThisMonth(reminder) ? (
                  <button
                    className="btn btn-success btn-sm py-0 px-2"
                    onClick={() => markUnpaid(reminder.id)}
                    title="Click to undo"
                  >
                    ✓ Paid
                  </button>
                ) : (
                  <button
                    className="btn btn-outline-success btn-sm py-0 px-2"
                    onClick={() => markPaid(reminder.id)}
                    title="Mark as paid and add transaction"
                  >
                    Pay
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Calculate totals for summary with currency conversion
  const activeReminders = reminders.filter(r => r.active);
  const paidThisMonth = activeReminders.filter(r => isPaidThisMonth(r));
  const unpaidThisMonth = activeReminders.filter(r => !isPaidThisMonth(r));
  const overdueItems = activeReminders.filter(r => isPastDue(r));
  const totalMonthly = activeReminders.reduce((sum, r) => sum + getDisplayAmount(r), 0);
  const totalPaid = paidThisMonth.reduce((sum, r) => sum + getDisplayAmount(r), 0);
  const totalUnpaid = unpaidThisMonth.reduce((sum, r) => sum + getDisplayAmount(r), 0);

  // Full editable view
  return (
    <div>
      {/* Summary Cards */}
      <div className="row g-2 mb-4">
        <div className="col-4">
          <div className="p-2 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Total Monthly</small>
            <strong className="text-danger">{settings.currencySymbol}{totalMonthly.toLocaleString()}</strong>
          </div>
        </div>
        <div className="col-4">
          <div className="p-2 rounded text-center bg-success bg-opacity-10">
            <small className="text-muted d-block">Paid ({paidThisMonth.length})</small>
            <strong className="text-success">{settings.currencySymbol}{totalPaid.toLocaleString()}</strong>
          </div>
        </div>
        <div className="col-4">
          <div className="p-2 rounded text-center bg-danger bg-opacity-10">
            <small className="text-muted d-block">Pending ({unpaidThisMonth.length})</small>
            <strong className="text-danger">{settings.currencySymbol}{totalUnpaid.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueItems.length > 0 && (
        <div className="alert alert-danger py-2 mb-3">
          ⚠️ <strong>{overdueItems.length}</strong> payment{overdueItems.length > 1 ? 's are' : ' is'} overdue!
        </div>
      )}

      {/* Active Reminders */}
      <h6 className="text-muted mb-3">Active ({activeReminders.length})</h6>
      <div className="d-flex flex-column gap-2 mb-4">
        {activeReminders.sort((a, b) => a.dueDay - b.dueDay).map(reminder => (
          <div
            key={reminder.id}
            className={`p-3 rounded border ${
              isPastDue(reminder) ? 'border-danger bg-danger bg-opacity-10' :
              isPaidThisMonth(reminder) ? 'border-success bg-success bg-opacity-10' : ''
            }`}
          >
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>{reminder.name}</strong>
                <span className="badge bg-secondary ms-2">{reminder.category}</span>
                {isPastDue(reminder) && <span className="badge bg-danger ms-1">Overdue!</span>}
              </div>
              <div>
                {isPaidThisMonth(reminder) ? (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => markUnpaid(reminder.id)}
                    title="Click to undo payment"
                  >
                    ✓ Paid
                  </button>
                ) : (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => markPaid(reminder.id)}
                  >
                    💰 Mark Paid
                  </button>
                )}
              </div>
            </div>
            <div className="row g-2">
              <div className="col-6">
                <label className="form-label small">Amount ({settings.currencySymbol})</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={reminder.amount || ''}
                  onChange={(e) => updateAmount(reminder.id, e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-4">
                <label className="form-label small">Due Day</label>
                <select
                  className="form-select form-select-sm"
                  value={reminder.dueDay}
                  onChange={(e) => updateDueDay(reminder.id, e.target.value)}
                >
                  {[...Array(28)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <div className="col-2 d-flex align-items-end">
                <button
                  className="btn btn-outline-danger btn-sm w-100"
                  onClick={() => toggleActive(reminder.id)}
                  title="Deactivate"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inactive/Available Reminders */}
      <h6 className="text-muted mb-3">Available to Add</h6>
      <div className="d-flex flex-wrap gap-2 mb-4">
        {reminders.filter(r => !r.active && !r.custom).map(reminder => (
          <button
            key={reminder.id}
            className="btn btn-outline-secondary btn-sm"
            onClick={() => toggleActive(reminder.id)}
          >
            + {reminder.name}
          </button>
        ))}
      </div>

      {/* Add Custom */}
      <div className="border-top pt-3">
        {!showAdd ? (
          <button className="btn btn-outline-danger btn-sm" onClick={() => setShowAdd(true)}>
            + Add Custom Expense
          </button>
        ) : (
          <div className="row g-2">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Name"
                value={newReminder.name}
                onChange={(e) => setNewReminder({ ...newReminder, name: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Amount"
                value={newReminder.amount}
                onChange={(e) => setNewReminder({ ...newReminder, amount: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-select form-select-sm"
                value={newReminder.dueDay}
                onChange={(e) => setNewReminder({ ...newReminder, dueDay: parseInt(e.target.value) })}
              >
                {[...Array(28)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <div className="btn-group w-100">
                <button className="btn btn-danger btn-sm" onClick={addCustomReminder}>Add</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
