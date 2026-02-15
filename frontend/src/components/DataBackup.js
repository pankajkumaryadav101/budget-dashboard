import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';

const STORAGE_KEYS = {
  transactions: 'transactions_v1',
  assets: 'assets_v1',
  budgets: 'budgets_v1',
  recurringExpenses: 'recurring_expenses_v1',
  monthlyExpenses: 'monthly_expenses_v1',
  settings: 'user_settings_v1',
  taxReminders: 'tax_reminders_v1',
};

export default function DataBackup({ onImportComplete }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(Object.keys(STORAGE_KEYS));

  const toggleKey = (key) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const exportData = (format = 'json') => {
    setExporting(true);
    setMessage(null);

    try {
      const exportObj = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        data: {}
      };

      selectedKeys.forEach(key => {
        const storageKey = STORAGE_KEYS[key];
        const data = localStorage.getItem(storageKey);
        if (data) {
          exportObj.data[key] = JSON.parse(data);
        }
      });

      const dateStr = new Date().toISOString().split('T')[0];

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `budget-backup-${dateStr}.json`);
      } else if (format === 'csv') {
        // Export transactions as CSV
        const transactions = exportObj.data.transactions || [];
        const csvContent = convertToCSV(transactions);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        downloadBlob(blob, `transactions-${dateStr}.csv`);
      }

      setMessage({ type: 'success', text: `Data exported successfully!` });
    } catch (err) {
      console.error('Export error:', err);
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data.length) return 'No data';

    const headers = ['Date', 'Category', 'Description', 'Amount', 'Type', 'Currency'];
    const rows = data.map(tx => [
      tx.date || tx.createdAt || '',
      tx.category || '',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.amount || 0,
      tx.type || 'expense',
      tx.currency || 'USD'
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let importObj;

        if (file.name.endsWith('.json')) {
          importObj = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV for transactions
          importObj = { data: { transactions: parseCSV(content) } };
        } else {
          throw new Error('Unsupported file format');
        }

        // Validate structure
        if (!importObj.data) {
          throw new Error('Invalid backup file structure');
        }

        // Import each data type
        let importedCount = 0;
        Object.entries(importObj.data).forEach(([key, value]) => {
          const storageKey = STORAGE_KEYS[key];
          if (storageKey && selectedKeys.includes(key)) {
            // Merge with existing data for transactions/assets
            if (['transactions', 'assets'].includes(key)) {
              const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
              const merged = mergeArrays(existing, value);
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } else {
              localStorage.setItem(storageKey, JSON.stringify(value));
            }
            importedCount++;
          }
        });

        setMessage({ type: 'success', text: `Imported ${importedCount} data categories successfully!` });

        if (onImportComplete) {
          onImportComplete();
        }
      } catch (err) {
        console.error('Import error:', err);
        setMessage({ type: 'error', text: `Import failed: ${err.message}` });
      } finally {
        setImporting(false);
        e.target.value = ''; // Reset file input
      }
    };

    reader.readAsText(file);
  };

  const parseCSV = (content) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const tx = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        date: values[headers.indexOf('date')] || new Date().toISOString().split('T')[0],
        category: values[headers.indexOf('category')] || 'Other',
        description: (values[headers.indexOf('description')] || '').replace(/"/g, ''),
        amount: parseFloat(values[headers.indexOf('amount')]) || 0,
        type: values[headers.indexOf('type')] || 'expense',
        currency: values[headers.indexOf('currency')] || 'USD',
      };
      transactions.push(tx);
    }

    return transactions;
  };

  const mergeArrays = (existing, incoming) => {
    const existingIds = new Set(existing.map(item => item.id));
    const newItems = incoming.filter(item => !existingIds.has(item.id));
    return [...existing, ...newItems];
  };

  const clearAllData = () => {
    if (!window.confirm('⚠️ This will permanently delete ALL your data. Are you sure?')) {
      return;
    }
    if (!window.confirm('This action cannot be undone. Type "DELETE" in the next prompt to confirm.')) {
      return;
    }
    const confirmation = window.prompt('Type DELETE to confirm:');
    if (confirmation !== 'DELETE') {
      setMessage({ type: 'error', text: 'Deletion cancelled' });
      return;
    }

    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    setMessage({ type: 'success', text: 'All data cleared. Refresh the page.' });

    if (onImportComplete) {
      onImportComplete();
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <strong>💾 Data Backup & Restore</strong>
      </div>
      <div className="card-body">
        {/* Message */}
        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} py-2`}>
            {message.text}
          </div>
        )}

        {/* Data Selection */}
        <div className="mb-4">
          <label className="form-label small text-muted">Select data to export/import:</label>
          <div className="d-flex flex-wrap gap-2">
            {Object.keys(STORAGE_KEYS).map(key => (
              <button
                key={key}
                className={`btn btn-sm ${selectedKeys.includes(key) ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => toggleKey(key)}
              >
                {selectedKeys.includes(key) ? '✓ ' : ''}{key}
              </button>
            ))}
          </div>
        </div>

        {/* Export Section */}
        <div className="mb-4 p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
          <h6 className="mb-3">📤 Export Data</h6>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-danger"
              onClick={() => exportData('json')}
              disabled={exporting || selectedKeys.length === 0}
            >
              {exporting ? '⏳ Exporting...' : '💾 Export as JSON'}
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => exportData('csv')}
              disabled={exporting}
            >
              📊 Export Transactions as CSV
            </button>
          </div>
          <small className="text-muted d-block mt-2">
            JSON includes all selected data. CSV exports only transactions.
          </small>
        </div>

        {/* Import Section */}
        <div className="mb-4 p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
          <h6 className="mb-3">📥 Import Data</h6>
          <input
            type="file"
            className="form-control"
            accept=".json,.csv"
            onChange={importData}
            disabled={importing}
          />
          <small className="text-muted d-block mt-2">
            Supports JSON backup files or CSV transaction lists. Existing data will be merged (not replaced).
          </small>
        </div>

        {/* Danger Zone */}
        <div className="p-3 rounded border border-danger">
          <h6 className="text-danger mb-3">⚠️ Danger Zone</h6>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={clearAllData}
          >
            🗑️ Clear All Data
          </button>
          <small className="text-muted d-block mt-2">
            This will permanently delete all your transactions, assets, budgets, and settings.
          </small>
        </div>
      </div>
    </div>
  );
}
