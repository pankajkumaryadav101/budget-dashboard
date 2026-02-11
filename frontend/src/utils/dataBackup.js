// Data Backup Utility - Save and restore localStorage data to/from JSON file

const STORAGE_KEYS = [
  'transactions_v1',
  'monthly_expenses_v1',
  'assets_v1',
  'budgets_v1',
  'recurring_reminders_v1',
  'user_salary_v1',
  'user_budget_v1',
  'user_annual_salary_v1',
  'user_salary_type_v1',
  'app_settings_v1',
  'last_sync_time',
  'market_prices_cache'
];

// Export all localStorage data to a JSON object
export const exportAllData = () => {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {}
  };

  for (const key of STORAGE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        // Try to parse as JSON, otherwise store as string
        try {
          data.data[key] = JSON.parse(value);
        } catch {
          data.data[key] = value;
        }
      }
    } catch (e) {
      console.error(`Error exporting ${key}:`, e);
    }
  }

  return data;
};

// Import data from JSON object to localStorage
export const importAllData = (jsonData) => {
  if (!jsonData || !jsonData.data) {
    throw new Error('Invalid backup file format');
  }

  const results = { imported: 0, errors: [] };

  for (const [key, value] of Object.entries(jsonData.data)) {
    try {
      if (STORAGE_KEYS.includes(key)) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
        results.imported++;
      }
    } catch (e) {
      results.errors.push({ key, error: e.message });
    }
  }

  return results;
};

// Download data as JSON file
export const downloadBackup = () => {
  const data = exportAllData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const filename = `budget-backup-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
};

// Upload and restore from JSON file
export const uploadAndRestore = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        const results = importAllData(jsonData);
        resolve(results);
      } catch (error) {
        reject(new Error('Failed to parse backup file: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Auto-save to localStorage with backup timestamp
export const autoSaveBackup = () => {
  const data = exportAllData();
  localStorage.setItem('auto_backup_v1', JSON.stringify(data));
  localStorage.setItem('auto_backup_time', new Date().toISOString());
};

// Check if auto-backup exists and is recent
export const getAutoBackupInfo = () => {
  const backupTime = localStorage.getItem('auto_backup_time');
  if (!backupTime) return null;

  return {
    time: new Date(backupTime),
    ageMinutes: Math.floor((Date.now() - new Date(backupTime).getTime()) / 60000)
  };
};

// Restore from auto-backup
export const restoreFromAutoBackup = () => {
  const backup = localStorage.getItem('auto_backup_v1');
  if (!backup) return false;

  try {
    const data = JSON.parse(backup);
    importAllData(data);
    return true;
  } catch {
    return false;
  }
};

// Clear all app data
export const clearAllData = () => {
  for (const key of STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem('auto_backup_v1');
  localStorage.removeItem('auto_backup_time');
};
