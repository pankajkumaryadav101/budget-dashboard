import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const PROFILES_KEY = 'family_profiles_v1';
const ACTIVE_PROFILE_KEY = 'active_profile_v1';
const SHARED_EXPENSES_KEY = 'shared_expenses_v1';

export default function FamilyMode({ onProfileChange }) {
  const { settings } = useSettings();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);
  const [sharedExpenses, setSharedExpenses] = useState([]);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showAddShared, setShowAddShared] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', avatar: '👤', color: '#dc3545' });
  const [newSharedExpense, setNewSharedExpense] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitBetween: [],
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadProfiles();
    loadSharedExpenses();
  }, []);

  const loadProfiles = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
      const active = localStorage.getItem(ACTIVE_PROFILE_KEY);

      // Add default profile if none exist
      if (stored.length === 0) {
        const defaultProfile = { id: 'default', name: 'Me', avatar: '👤', color: '#dc3545', isDefault: true };
        stored.push(defaultProfile);
        localStorage.setItem(PROFILES_KEY, JSON.stringify(stored));
      }

      setProfiles(stored);
      setActiveProfile(stored.find(p => p.id === active) || stored[0]);
    } catch (e) {
      setProfiles([]);
    }
  };

  const loadSharedExpenses = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(SHARED_EXPENSES_KEY) || '[]');
      setSharedExpenses(stored);
    } catch (e) {
      setSharedExpenses([]);
    }
  };

  const saveProfiles = (profileList) => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profileList));
    setProfiles(profileList);
  };

  const saveSharedExpenses = (expenses) => {
    localStorage.setItem(SHARED_EXPENSES_KEY, JSON.stringify(expenses));
    setSharedExpenses(expenses);
  };

  const addProfile = () => {
    if (!newProfile.name) return;

    const profile = {
      id: Date.now().toString(),
      ...newProfile,
      createdAt: new Date().toISOString()
    };

    saveProfiles([...profiles, profile]);
    setNewProfile({ name: '', avatar: '👤', color: '#dc3545' });
    setShowAddProfile(false);
  };

  const deleteProfile = (id) => {
    const profile = profiles.find(p => p.id === id);
    if (profile?.isDefault) {
      alert('Cannot delete default profile');
      return;
    }
    if (!window.confirm(`Delete profile "${profile?.name}"?`)) return;

    saveProfiles(profiles.filter(p => p.id !== id));
    if (activeProfile?.id === id) {
      switchProfile(profiles[0]);
    }
  };

  const switchProfile = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    if (onProfileChange) onProfileChange(profile);
  };

  const addSharedExpense = () => {
    if (!newSharedExpense.description || !newSharedExpense.amount || !newSharedExpense.paidBy) return;

    const expense = {
      id: Date.now().toString(),
      ...newSharedExpense,
      amount: parseFloat(newSharedExpense.amount),
      splitBetween: newSharedExpense.splitBetween.length > 0
        ? newSharedExpense.splitBetween
        : profiles.map(p => p.id),
      createdAt: new Date().toISOString()
    };

    saveSharedExpenses([expense, ...sharedExpenses]);
    setNewSharedExpense({
      description: '',
      amount: '',
      paidBy: '',
      splitBetween: [],
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddShared(false);
  };

  const deleteSharedExpense = (id) => {
    saveSharedExpenses(sharedExpenses.filter(e => e.id !== id));
  };

  const toggleSplitMember = (profileId) => {
    setNewSharedExpense(prev => ({
      ...prev,
      splitBetween: prev.splitBetween.includes(profileId)
        ? prev.splitBetween.filter(id => id !== profileId)
        : [...prev.splitBetween, profileId]
    }));
  };

  // Calculate balances
  const calculateBalances = () => {
    const balances = {};
    profiles.forEach(p => { balances[p.id] = 0; });

    sharedExpenses.forEach(expense => {
      const splitCount = expense.splitBetween.length;
      if (splitCount === 0) return;

      const sharePerPerson = expense.amount / splitCount;

      // Payer gets credit
      if (balances[expense.paidBy] !== undefined) {
        balances[expense.paidBy] += expense.amount - sharePerPerson;
      }

      // Others owe their share
      expense.splitBetween.forEach(memberId => {
        if (memberId !== expense.paidBy && balances[memberId] !== undefined) {
          balances[memberId] -= sharePerPerson;
        }
      });
    });

    return balances;
  };

  const balances = calculateBalances();
  const avatars = ['👤', '👩', '👨', '👧', '👦', '👶', '🧓', '👵', '👴', '🐱', '🐶', '🏠'];

  return (
    <div>
      {/* Profile Selector */}
      <div className="mb-4">
        <h6 className="text-muted mb-3">👥 Family Profiles</h6>
        <div className="d-flex flex-wrap gap-2">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className={`d-flex align-items-center gap-2 px-3 py-2 rounded border ${activeProfile?.id === profile.id ? 'border-danger' : ''}`}
              style={{
                cursor: 'pointer',
                background: activeProfile?.id === profile.id ? 'rgba(220, 53, 69, 0.1)' : 'var(--bg-secondary)',
                borderColor: profile.color
              }}
              onClick={() => switchProfile(profile)}
            >
              <span style={{ fontSize: '20px' }}>{profile.avatar}</span>
              <span>{profile.name}</span>
              {!profile.isDefault && (
                <button
                  className="btn btn-link btn-sm text-danger p-0 ms-1"
                  onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => setShowAddProfile(!showAddProfile)}
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Add Profile Form */}
      {showAddProfile && (
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="mb-3">➕ Add Family Member</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small">Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Spouse, Kid"
                  value={newProfile.name}
                  onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Avatar</label>
                <div className="d-flex flex-wrap gap-1">
                  {avatars.map(avatar => (
                    <button
                      key={avatar}
                      className={`btn btn-sm ${newProfile.avatar === avatar ? 'btn-danger' : 'btn-outline-secondary'}`}
                      onClick={() => setNewProfile({ ...newProfile, avatar })}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Color</label>
                <input
                  type="color"
                  className="form-control form-control-color w-100"
                  value={newProfile.color}
                  onChange={(e) => setNewProfile({ ...newProfile, color: e.target.value })}
                />
              </div>
              <div className="col-12">
                <button className="btn btn-danger" onClick={addProfile}>✓ Add Member</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balance Summary */}
      {profiles.length > 1 && (
        <div className="card mb-4">
          <div className="card-header">
            <strong>💰 Who Owes Who?</strong>
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap gap-3">
              {profiles.map(profile => {
                const balance = balances[profile.id] || 0;
                return (
                  <div key={profile.id} className="text-center p-3 rounded" style={{ background: 'var(--bg-secondary)', minWidth: '100px' }}>
                    <span style={{ fontSize: '24px' }}>{profile.avatar}</span>
                    <div className="fw-bold">{profile.name}</div>
                    <div className={`fw-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {balance >= 0 ? '+' : ''}{settings.currencySymbol}{balance.toFixed(2)}
                    </div>
                    <small className="text-muted">
                      {balance > 0 ? 'is owed' : balance < 0 ? 'owes' : 'settled'}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shared Expenses */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="text-muted mb-0">🏠 Shared Household Expenses</h6>
        <button
          className={`btn btn-sm ${showAddShared ? 'btn-outline-secondary' : 'btn-danger'}`}
          onClick={() => setShowAddShared(!showAddShared)}
        >
          {showAddShared ? '✕ Cancel' : '+ Add Shared Expense'}
        </button>
      </div>

      {/* Add Shared Expense Form */}
      {showAddShared && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small">Description</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Groceries, Rent"
                  value={newSharedExpense.description}
                  onChange={(e) => setNewSharedExpense({ ...newSharedExpense, description: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">Amount</label>
                <div className="input-group">
                  <span className="input-group-text">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    className="form-control"
                    value={newSharedExpense.amount}
                    onChange={(e) => setNewSharedExpense({ ...newSharedExpense, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <label className="form-label small">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newSharedExpense.date}
                  onChange={(e) => setNewSharedExpense({ ...newSharedExpense, date: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small">Paid By</label>
                <select
                  className="form-select"
                  value={newSharedExpense.paidBy}
                  onChange={(e) => setNewSharedExpense({ ...newSharedExpense, paidBy: e.target.value })}
                >
                  <option value="">Select...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small">Split Between (select members)</label>
                <div className="d-flex flex-wrap gap-2">
                  {profiles.map(p => (
                    <button
                      key={p.id}
                      className={`btn btn-sm ${newSharedExpense.splitBetween.includes(p.id) ? 'btn-danger' : 'btn-outline-secondary'}`}
                      onClick={() => toggleSplitMember(p.id)}
                    >
                      {p.avatar} {p.name}
                    </button>
                  ))}
                </div>
                <small className="text-muted">Leave empty to split between all</small>
              </div>
              <div className="col-12">
                <button className="btn btn-danger" onClick={addSharedExpense}>✓ Add Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Expenses List */}
      {sharedExpenses.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <span style={{ fontSize: '48px' }}>🏠</span>
          <p className="mt-2">No shared expenses yet</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {sharedExpenses.slice(0, 10).map(expense => {
            const payer = profiles.find(p => p.id === expense.paidBy);
            const splitCount = expense.splitBetween.length || profiles.length;

            return (
              <div key={expense.id} className="card">
                <div className="card-body py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{expense.description}</strong>
                      <small className="text-muted d-block">
                        {expense.date} • Paid by {payer?.avatar} {payer?.name} • Split {splitCount} ways
                      </small>
                    </div>
                    <div className="text-end">
                      <strong className="text-danger">{settings.currencySymbol}{expense.amount.toLocaleString()}</strong>
                      <small className="text-muted d-block">
                        {settings.currencySymbol}{(expense.amount / splitCount).toFixed(2)} each
                      </small>
                      <button
                        className="btn btn-link btn-sm text-danger p-0"
                        onClick={() => deleteSharedExpense(expense.id)}
                      >
                        🗑️
                      </button>
                    </div>
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
