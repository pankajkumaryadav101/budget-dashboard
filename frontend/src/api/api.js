import axios from "axios";

// If REACT_APP_BACKEND_URL is explicitly set to empty string, use relative paths so CRA proxy can forward to backend.
const envUrl = process.env.REACT_APP_BACKEND_URL;
const BACKEND_URL = (typeof envUrl !== 'undefined' && envUrl !== '') ? envUrl : '';

// Set to true to skip all API calls and use only localStorage (no 404 errors)
const OFFLINE_MODE = false;

// Flag to track if we've already logged that backend is unavailable
let backendUnavailableLogged = false;

const url = (path) => (BACKEND_URL ? `${BACKEND_URL}${path}` : path);

// Helper to make API calls optional (returns null if backend unavailable or in offline mode)
const optionalApiCall = async (apiCall) => {
  // Skip API calls entirely in offline mode
  if (OFFLINE_MODE) {
    return null;
  }

  try {
    return await apiCall();
  } catch (error) {
    // Only log once to avoid console spam
    if (!backendUnavailableLogged) {
      console.log('Backend API unavailable - using local storage. This is normal if backend is not running.');
      backendUnavailableLogged = true;
    }
    return null;
  }
};

export async function getSymbols() {
  const res = await optionalApiCall(() => axios.get(url('/api/symbols')));
  return res?.data || [];
}

export async function getRates(base = "USD") {
  const res = await optionalApiCall(() => axios.get(url('/api/rates'), { params: { base } }));
  return res?.data || {};
}

export async function convert(from, to, amount) {
  const res = await optionalApiCall(() => axios.get(url('/api/convert'), { params: { from, to, amount } }));
  return res?.data || { result: amount };
}

export async function addExpense(expenseData) {
  // Try API, but don't fail if backend is down
  await optionalApiCall(() => axios.post(url('/api/expenses'), expenseData));
  return expenseData;
}

export async function getMonthlyData() {
  const res = await optionalApiCall(() => axios.get(url('/api/monthly-data')));
  return res?.data || [];
}

export async function getForecast() {
  const res = await optionalApiCall(() => axios.get(url('/api/forecast')));
  return res?.data || {};
}

// ========== DASHBOARD API ==========
export async function getDashboardSummary() {
  const res = await optionalApiCall(() => axios.get(url('/api/dashboard/summary')));
  return res?.data || { netWorth: 0, reminderCount: 0, staleAssetsCount: 0, assetsByType: {} };
}

// ========== ASSET API ==========
export async function getAllAssets() {
  const res = await optionalApiCall(() => axios.get(url('/api/assets')));
  if (res?.data) return res.data;
  // Fallback to local storage
  return JSON.parse(localStorage.getItem('assets_v1') || '[]');
}

export async function getAssetById(id) {
  const res = await optionalApiCall(() => axios.get(url(`/api/assets/${id}`)));
  if (res?.data) return res.data;
  // Fallback to local storage
  const assets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
  return assets.find(a => a.id === id) || null;
}

export async function createAsset(asset) {
  await optionalApiCall(() => axios.post(url('/api/assets'), asset));
  return asset;
}

export async function updateAsset(id, asset) {
  await optionalApiCall(() => axios.put(url(`/api/assets/${id}`), asset));
  return asset;
}

export async function deleteAsset(id) {
  await optionalApiCall(() => axios.delete(url(`/api/assets/${id}`)));
}

export async function searchAssets(query) {
  const res = await optionalApiCall(() => axios.get(url('/api/assets/search'), { params: { query } }));
  if (res?.data) return res.data;
  // Fallback to local storage search
  const assets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
  return assets.filter(a =>
    a.name?.toLowerCase().includes(query.toLowerCase()) ||
    a.storageLocation?.toLowerCase().includes(query.toLowerCase())
  );
}

export async function verifyAssetLocation(id) {
  const res = await optionalApiCall(() => axios.post(url(`/api/assets/${id}/verify`)));
  return res?.data || { id, lastVerifiedDate: new Date().toISOString() };
}

export async function updateAssetPrice(id, price) {
  const res = await optionalApiCall(() => axios.patch(url(`/api/assets/${id}/price`), { price }));
  return res?.data || { id, currentMarketPrice: price };
}

export async function getStaleAssets() {
  const res = await optionalApiCall(() => axios.get(url('/api/assets/stale')));
  if (res?.data) return res.data;
  // Fallback: find stale assets locally
  const assets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  return assets.filter(a => !a.lastVerifiedDate || new Date(a.lastVerifiedDate).getTime() < thirtyDaysAgo);
}

export async function getNetWorth() {
  const res = await optionalApiCall(() => axios.get(url('/api/assets/net-worth')));
  if (res?.data) return res.data;
  // Fallback: calculate from local assets
  const assets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
  const total = assets.reduce((sum, a) => sum + (parseFloat(a.currentMarketPrice || a.purchasePrice) || 0), 0);
  return { netWorth: total };
}

// ========== BUDGET API ==========
export async function getAllBudgetItems() {
  const res = await optionalApiCall(() => axios.get(url('/api/budget')));
  if (res?.data) return res.data;
  return JSON.parse(localStorage.getItem('budgets_v1') || '[]');
}

export async function createBudgetItem(item) {
  await optionalApiCall(() => axios.post(url('/api/budget'), item));
  return item;
}

export async function updateBudgetItem(id, item) {
  await optionalApiCall(() => axios.put(url(`/api/budget/${id}`), item));
  return item;
}

export async function deleteBudgetItem(id) {
  await optionalApiCall(() => axios.delete(url(`/api/budget/${id}`)));
}

export async function getBudgetSummary() {
  const res = await optionalApiCall(() => axios.get(url('/api/budget/summary')));
  return res?.data || { totalBudget: 0, totalSpent: 0, remaining: 0 };
}

export async function getMonthlyBudget(year, month) {
  const res = await optionalApiCall(() => axios.get(url('/api/budget/monthly'), { params: { year, month } }));
  return res?.data || { budget: 0, spent: 0, categories: [] };
}

export async function getExpenseCategoryBreakdown() {
  const res = await optionalApiCall(() => axios.get(url('/api/budget/categories/expenses')));
  return res?.data || [];
}

// ========== NOTIFICATIONS API ==========
export async function getReminders() {
  const res = await optionalApiCall(() => axios.get(url('/api/notifications/reminders')));
  if (res?.data) return res.data;
  return JSON.parse(localStorage.getItem('recurring_reminders_v1') || '[]');
}

export async function getReminderCount() {
  const res = await optionalApiCall(() => axios.get(url('/api/notifications/count')));
  if (res?.data) return res.data;
  const reminders = JSON.parse(localStorage.getItem('recurring_reminders_v1') || '[]');
  return { count: reminders.filter(r => r.active).length };
}

// ========== BACKUP API ==========
export async function exportDatabase() {
  const res = await optionalApiCall(() => axios.post(url('/api/backup/export')));
  if (res?.data) return res.data;
  // Fallback: export from localStorage
  return {
    transactions: JSON.parse(localStorage.getItem('transactions_v1') || '[]'),
    monthlyExpenses: JSON.parse(localStorage.getItem('monthly_expenses_v1') || '[]'),
    assets: JSON.parse(localStorage.getItem('assets_v1') || '[]'),
    budgets: JSON.parse(localStorage.getItem('budgets_v1') || '[]'),
    recurringReminders: JSON.parse(localStorage.getItem('recurring_reminders_v1') || '[]'),
    exportedAt: new Date().toISOString()
  };
}

export async function importDatabase(jsonContent) {
  const res = await optionalApiCall(() => axios.post(url('/api/backup/import'), jsonContent, {
    headers: { 'Content-Type': 'application/json' }
  }));
  return res?.data || { success: true };
}

export async function listBackups() {
  const res = await optionalApiCall(() => axios.get(url('/api/backup/list')));
  return res?.data || [];
}

// ========== SYNC API ==========
// Push all localStorage data to backend
export async function syncPushToBackend() {
  const data = {
    transactions: JSON.parse(localStorage.getItem('transactions_v1') || '[]'),
    monthlyExpenses: JSON.parse(localStorage.getItem('monthly_expenses_v1') || '[]'),
    assets: JSON.parse(localStorage.getItem('assets_v1') || '[]'),
    budgets_v1: localStorage.getItem('budgets_v1'),
    user_salary_v1: localStorage.getItem('user_salary_v1'),
    user_budget_v1: localStorage.getItem('user_budget_v1'),
    recurring_reminders_v1: localStorage.getItem('recurring_reminders_v1'),
    user_annual_salary_v1: localStorage.getItem('user_annual_salary_v1'),
    user_salary_type_v1: localStorage.getItem('user_salary_type_v1'),
    app_settings_v1: localStorage.getItem('app_settings_v1')
  };

  const res = await optionalApiCall(() => axios.post(url('/api/sync/push'), data));
  return res?.data || { success: false };
}

// Pull all data from backend to localStorage
export async function syncPullFromBackend() {
  const res = await optionalApiCall(() => axios.get(url('/api/sync/pull')));

  if (res?.data) {
    const data = res.data;

    // Replace transactions (deduplicated)
    if (data.transactions && Array.isArray(data.transactions)) {
      const existing = JSON.parse(localStorage.getItem('transactions_v1') || '[]');
      const merged = deduplicateById([...existing, ...data.transactions]);
      localStorage.setItem('transactions_v1', JSON.stringify(merged));
    }

    // Replace assets (deduplicated)
    if (data.assets && Array.isArray(data.assets)) {
      const existing = JSON.parse(localStorage.getItem('assets_v1') || '[]');
      const merged = deduplicateById([...existing, ...data.assets]);
      localStorage.setItem('assets_v1', JSON.stringify(merged));
    }

    // Restore settings
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        if (value) {
          localStorage.setItem(key, value);
        }
      }
    }

    return { success: true, ...data };
  }

  return { success: false };
}

// Full sync - push local changes then pull from backend
export async function syncFull() {
  // First deduplicate local data before syncing
  cleanupLocalStorage();

  const data = {
    transactions: JSON.parse(localStorage.getItem('transactions_v1') || '[]'),
    monthlyExpenses: JSON.parse(localStorage.getItem('monthly_expenses_v1') || '[]'),
    assets: JSON.parse(localStorage.getItem('assets_v1') || '[]'),
    budgets_v1: localStorage.getItem('budgets_v1'),
    user_salary_v1: localStorage.getItem('user_salary_v1'),
    user_budget_v1: localStorage.getItem('user_budget_v1'),
    recurring_reminders_v1: localStorage.getItem('recurring_reminders_v1'),
    user_annual_salary_v1: localStorage.getItem('user_annual_salary_v1'),
    user_salary_type_v1: localStorage.getItem('user_salary_type_v1'),
    app_settings_v1: localStorage.getItem('app_settings_v1')
  };

  const res = await optionalApiCall(() => axios.post(url('/api/sync/full'), data));

  if (res?.data) {
    return { success: true, ...res.data };
  }

  return { success: false };
}

// Helper to deduplicate by ID (keeps last occurrence)
function deduplicateById(items) {
  const map = new Map();
  for (const item of items) {
    if (item.id) {
      map.set(item.id.toString(), item);
    }
  }
  return Array.from(map.values());
}

// Cleanup localStorage to remove duplicates
function cleanupLocalStorage() {
  try {
    // Clean transactions
    const transactions = JSON.parse(localStorage.getItem('transactions_v1') || '[]');
    const uniqueTransactions = deduplicateById(transactions);
    if (uniqueTransactions.length !== transactions.length) {
      localStorage.setItem('transactions_v1', JSON.stringify(uniqueTransactions));
    }

    // Clean assets
    const assets = JSON.parse(localStorage.getItem('assets_v1') || '[]');
    const uniqueAssets = deduplicateById(assets);
    if (uniqueAssets.length !== assets.length) {
      localStorage.setItem('assets_v1', JSON.stringify(uniqueAssets));
    }

    // Clean monthly expenses
    const expenses = JSON.parse(localStorage.getItem('monthly_expenses_v1') || '[]');
    const uniqueExpenses = deduplicateById(expenses);
    if (uniqueExpenses.length !== expenses.length) {
      localStorage.setItem('monthly_expenses_v1', JSON.stringify(uniqueExpenses));
    }
  } catch (e) {
    console.error('Error cleaning localStorage:', e);
  }
}

// Check if backend is available
export async function checkBackendHealth() {
  try {
    const res = await axios.get(url('/api/symbols'), { timeout: 3000 });
    return res.status === 200;
  } catch (error) {
    return false;
  }
}

