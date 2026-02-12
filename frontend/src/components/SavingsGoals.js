import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';

const STORAGE_KEY = 'savings_goals_v1';

const GOAL_ICONS = {
  vacation: '🏖️',
  car: '🚗',
  house: '🏠',
  emergency: '🆘',
  education: '🎓',
  wedding: '💒',
  gadget: '📱',
  retirement: '👴',
  other: '🎯'
};

export default function SavingsGoals() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [goals, setGoals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    savedAmount: 0,
    deadline: '',
    category: 'other',
    notes: ''
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setGoals(stored);
    } catch (err) {
      setGoals([]);
    }
  };

  const saveGoals = (updatedGoals) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGoals));
    setGoals(updatedGoals);
  };

  const addGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount) return;

    const goal = {
      id: Date.now().toString(),
      ...newGoal,
      targetAmount: parseFloat(newGoal.targetAmount),
      savedAmount: parseFloat(newGoal.savedAmount) || 0,
      createdAt: new Date().toISOString()
    };

    saveGoals([...goals, goal]);
    setNewGoal({ name: '', targetAmount: '', savedAmount: 0, deadline: '', category: 'other', notes: '' });
    setShowAddForm(false);
  };

  const updateGoal = (id, updates) => {
    const updated = goals.map(g => g.id === id ? { ...g, ...updates } : g);
    saveGoals(updated);
    setEditingGoal(null);
  };

  const deleteGoal = (id) => {
    if (!window.confirm('Delete this goal?')) return;
    saveGoals(goals.filter(g => g.id !== id));
  };

  const addToSavings = (id, amount) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const newSaved = Math.min(goal.savedAmount + amount, goal.targetAmount);
    updateGoal(id, { savedAmount: newSaved });
  };

  const getProgress = (goal) => {
    return Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  };

  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getMonthlyTarget = (goal) => {
    const daysLeft = getDaysRemaining(goal.deadline);
    if (!daysLeft || daysLeft <= 0) return null;
    const remaining = goal.targetAmount - goal.savedAmount;
    const monthsLeft = Math.max(daysLeft / 30, 1);
    return remaining / monthsLeft;
  };

  const formatCurrency = (amount) => {
    return `${settings.currencySymbol}${Number(amount).toLocaleString()}`;
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <div>
      {/* Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Total Saved</small>
            <h4 className="text-success mb-0">{formatCurrency(totalSaved)}</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Total Target</small>
            <h4 className="text-danger mb-0">{formatCurrency(totalTarget)}</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 rounded text-center" style={{ background: 'var(--bg-secondary)' }}>
            <small className="text-muted d-block">Active Goals</small>
            <h4 className="mb-0">{goals.length}</h4>
          </div>
        </div>
      </div>

      {/* Add Goal Button */}
      <div className="mb-4">
        <button
          className="btn btn-danger"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add New Goal'}
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="mb-3">🎯 Create New Savings Goal</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small">Goal Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Vacation to Hawaii"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Target Amount *</label>
                <div className="input-group">
                  <span className="input-group-text">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="5000"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Already Saved</label>
                <div className="input-group">
                  <span className="input-group-text">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={newGoal.savedAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, savedAmount: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label small">Category</label>
                <select
                  className="form-select"
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                >
                  {Object.entries(GOAL_ICONS).map(([key, icon]) => (
                    <option key={key} value={key}>{icon} {key.charAt(0).toUpperCase() + key.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small">Target Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small">Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional notes"
                  value={newGoal.notes}
                  onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
                />
              </div>
              <div className="col-12">
                <button className="btn btn-danger" onClick={addGoal}>
                  ✓ Create Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-5">
          <span style={{ fontSize: '64px' }}>🎯</span>
          <h5 className="mt-3">No Savings Goals Yet</h5>
          <p className="text-muted">Create your first goal to start tracking your savings progress!</p>
        </div>
      ) : (
        <div className="row g-3">
          {goals.map(goal => {
            const progress = getProgress(goal);
            const daysLeft = getDaysRemaining(goal.deadline);
            const monthlyTarget = getMonthlyTarget(goal);
            const isCompleted = progress >= 100;
            const isOverdue = daysLeft !== null && daysLeft < 0;

            return (
              <div key={goal.id} className="col-md-6">
                <div className={`card h-100 ${isCompleted ? 'border-success' : isOverdue ? 'border-danger' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: '28px' }}>{GOAL_ICONS[goal.category] || '🎯'}</span>
                        <div>
                          <h5 className="mb-0">{goal.name}</h5>
                          {goal.notes && <small className="text-muted">{goal.notes}</small>}
                        </div>
                      </div>
                      {isCompleted && <span className="badge bg-success">✓ Completed!</span>}
                      {isOverdue && !isCompleted && <span className="badge bg-danger">Overdue</span>}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-success">{formatCurrency(goal.savedAmount)}</span>
                        <span className="text-muted">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <div className="progress" style={{ height: '12px' }}>
                        <div
                          className={`progress-bar ${isCompleted ? 'bg-success' : 'bg-danger'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-center small text-muted mt-1">
                        {progress.toFixed(1)}% complete
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="text-center p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                          <small className="text-muted d-block">Remaining</small>
                          <strong className="text-danger">{formatCurrency(goal.targetAmount - goal.savedAmount)}</strong>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-center p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                          <small className="text-muted d-block">
                            {daysLeft !== null ? 'Days Left' : 'No Deadline'}
                          </small>
                          <strong className={daysLeft !== null && daysLeft < 30 ? 'text-warning' : ''}>
                            {daysLeft !== null ? daysLeft : '—'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Target */}
                    {monthlyTarget && !isCompleted && (
                      <div className="alert alert-info py-2 mb-3">
                        <small>💡 Save <strong>{formatCurrency(monthlyTarget)}/month</strong> to reach your goal on time!</small>
                      </div>
                    )}

                    {/* Actions */}
                    {!isCompleted && (
                      <div className="d-flex gap-2">
                        <div className="input-group input-group-sm flex-grow-1">
                          <span className="input-group-text">{settings.currencySymbol}</span>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Add amount"
                            id={`add-${goal.id}`}
                          />
                          <button
                            className="btn btn-success"
                            onClick={() => {
                              const input = document.getElementById(`add-${goal.id}`);
                              const amount = parseFloat(input.value) || 0;
                              if (amount > 0) {
                                addToSavings(goal.id, amount);
                                input.value = '';
                              }
                            }}
                          >
                            + Add
                          </button>
                        </div>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="text-center">
                        <span className="text-success">🎉 Congratulations! Goal achieved!</span>
                        <button
                          className="btn btn-outline-danger btn-sm ms-2"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
